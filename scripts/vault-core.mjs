import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ignoredDirs = new Set([".git", "node_modules", "dist", "src", "scripts", "data", ".space"]);
const vaultRoots = new Set([
  "_Caracteristica",
  "_Diario",
  "_Habilidades",
  "_Itens",
  "_Magias",
  "_Personagens",
  "_Quests",
]);

const kindByDirectory = new Map([
  ["_Caracteristica", "caracteristica"],
  ["_Diario", "diario"],
  ["_Habilidades", "habilidade"],
  ["_Itens", "item"],
  ["_Magias", "magia"],
  ["_Personagens", "npc"],
  ["_Quests", "quest"],
]);

export async function parseVault(root) {
  const warnings = [];
  const files = await collectMarkdownFiles(root);
  const entities = [];

  for (const filePath of files) {
    const relativePath = normalizePath(path.relative(root, filePath));
    if (relativePath.startsWith("_Template/")) continue;
    if (!vaultRoots.has(relativePath.split("/")[0])) continue;
    if (path.basename(filePath, ".md").startsWith("_")) continue;

    const raw = await readFile(filePath, "utf8");
    const parsed = parseMarkdownNote(raw, warnings);
    const frontmatter = parsed.frontmatter;
    const kind = normalizeKind(frontmatter.tipo, relativePath);
    const name = normalizeString(frontmatter.nome) || cleanFileName(filePath);

    if (!name || name.startsWith("_")) continue;

    entities.push({
      id: slugify(relativePath),
      kind,
      name,
      originalName: normalizeString(frontmatter.nome_original),
      icon: normalizeString(frontmatter.icone),
      level: normalizeNumber(frontmatter.nivel ?? frontmatter.nivel_desbloqueio),
      category: normalizeString(frontmatter.categoria ?? frontmatter.escola ?? frontmatter.subcategoria),
      action: normalizeString(frontmatter.acao),
      cost: normalizeString(frontmatter.custo),
      source: normalizeString(frontmatter.origem ?? frontmatter.fonte),
      damage: normalizeString(frontmatter.dano_base),
      range: normalizeString(frontmatter.alcance_texto),
      tags: normalizeStringArray(frontmatter.tags),
      sourcePath: relativePath,
      markdownBody: parsed.body,
      frontmatter,
      sections: extractSections(parsed.body),
      links: extractObsidianLinks(`${parsed.yaml}\n${parsed.body}`),
    });
  }

  return { entities, warnings };
}

export function createVaultData(entities, warnings) {
  return {
    importedAt: new Date().toLocaleString("pt-BR"),
    entities: entities.map(({ links, markdownBody, ...entity }) => entity),
    warnings,
  };
}

export function normalizePath(value) {
  return value.replaceAll(path.sep, "/");
}

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      files.push(...(await collectMarkdownFiles(path.join(directory, entry.name))));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function parseMarkdownNote(raw, warnings) {
  if (!raw.startsWith("---")) {
    return { frontmatter: {}, yaml: "", body: raw };
  }

  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    warnings.push("Frontmatter sem fechamento encontrado.");
    return { frontmatter: {}, yaml: "", body: raw };
  }

  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();

  return {
    frontmatter: parseSimpleYaml(yaml),
    yaml,
    body,
  };
}

function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const arrayMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      result[currentKey].push(parseScalar(arrayMatch[1]));
      continue;
    }

    const keyValue = line.match(/^([^:]+):\s*(.*)$/);
    if (!keyValue) continue;

    const key = keyValue[1].trim();
    const rawValue = keyValue[2].trim();
    currentKey = key;

    if (rawValue === "[]") {
      result[key] = [];
    } else if (rawValue === "") {
      result[key] = "";
    } else {
      result[key] = parseScalar(rawValue);
    }
  }

  return result;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

function extractSections(body) {
  const cleaned = body
    .replace(/> \[!tip\][\s\S]*?(?=\n# |\n## |$)/g, "")
    .replace(/# `= this\.file\.name`\s*/g, "")
    .trim();

  const sections = [];
  const matches = [...cleaned.matchAll(/^##\s+(.+)$/gm)];

  if (matches.length === 0) {
    const content = stripObsidianSyntax(cleaned);
    return content ? [{ title: "Conteudo", content }] : [];
  }

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const nextMatch = matches[index + 1];
    const title = stripEmojiPrefix(match[1].trim());
    const start = match.index + match[0].length;
    const end = nextMatch?.index ?? cleaned.length;
    const content = stripObsidianSyntax(cleaned.slice(start, end));

    if (content) {
      sections.push({ title, content });
    }
  }

  return sections;
}

function stripObsidianSyntax(text) {
  return text
    .replace(/`= ?[^`]+`/g, "")
    .replace(/`INPUT\[[^`]+`/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^---$/gm, "")
    .trim();
}

function extractObsidianLinks(text) {
  const links = new Set();
  const matches = text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);

  for (const match of matches) {
    links.add(match[1].trim());
  }

  return [...links];
}

function stripEmojiPrefix(value) {
  return value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function normalizeKind(value, relativePath) {
  const direct = normalizeString(value)?.toLowerCase();
  if (direct) return normalizeKindAlias(direct);

  const directory = relativePath.split("/")[0];
  return kindByDirectory.get(directory) ?? "unknown";
}

function normalizeKindAlias(kind) {
  if (kind === "localidade") return "local";
  return kind;
}

function normalizeString(value) {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [String(value)];
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function cleanFileName(filePath) {
  return path.basename(filePath, ".md").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function slugify(value) {
  return normalizePath(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
