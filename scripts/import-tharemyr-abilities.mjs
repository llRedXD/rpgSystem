import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const sourceDir = path.join(root, "Habilidades");
const dbPath = path.join(root, "data", "rpg.sqlite");
const campaignName = "Tharemyr";

const manualClassification = new Map([
  ["Alert.md", { kind: "habilidade", category: "Talento", tags: ["Talento", "Iniciativa", "Percepcao"] }],
  ["Ataque Furtivo.md", { kind: "habilidade", category: "Ladino", action: "Ataque", damage: "3d6", tags: ["Ladino", "Furtividade", "Dano"] }],
  ["Fire Hand.md", { kind: "magia", category: "Evocacao", action: "Acao", damage: "Fogo", tags: ["Fogo", "Cone", "Evocacao"] }],
  ["Light Orb.md", { kind: "magia", category: "Luz", action: "Acao", range: "5 m", tags: ["Luz", "Utilidade"] }],
  ["Light Projection.md", { kind: "magia", category: "Luz", action: "Acao", tags: ["Luz", "Clone", "Conjuracao"] }],
  ["Light Step.md", { kind: "habilidade", category: "Teleporte", action: "Acao", range: "15 m", tags: ["Luz", "Teleporte", "Movimento"] }],
  ["Lightarrow.md", { kind: "magia", category: "Luz", action: "Acao", tags: ["Luz", "Dano", "Distancia"] }],
  ["Lightdagger.md", { kind: "magia", category: "Luz", action: "Acao", damage: "1d4", tags: ["Luz", "Dano", "Adaga"] }],
  ["Pierce.md", { kind: "habilidade", category: "Talento", tags: ["Talento", "Perfurante", "Critico"] }],
  ["War Caster.md", { kind: "habilidade", category: "Talento", tags: ["Talento", "Concentracao", "Conjuracao"] }],
  ["🔥 Flame (Pequena Chama).md", { kind: "magia", category: "Fogo", tags: ["Fogo", "Luz", "Utilidade"] }],
  ["🌈 Sacrifício Divino.md", { kind: "habilidade", category: "Protecao", tags: ["Meio-anjo", "Divino", "Protecao"] }],
  ["🔍 Detect Evil and Good (Detectar Bem e Mal).md", { kind: "magia", category: "Deteccao", tags: ["Deteccao", "Concentracao"] }],
]);

const database = new DatabaseSync(dbPath);
database.exec("PRAGMA foreign_keys = ON");
database.exec("PRAGMA busy_timeout = 5000");
ensureSchema();

const files = (await readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "pt-BR"));

const imported = [];

database.exec("BEGIN");
try {
  database.prepare("DELETE FROM entities WHERE source_path LIKE 'manual/tharemyr/%'").run();
  for (const fileName of files) {
    const filePath = path.join(sourceDir, fileName);
    const raw = await readFile(filePath, "utf8");
    const entity = buildEntity(fileName, raw);
    upsertEntity(entity);
    imported.push({
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      category: entity.category,
    });
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
} finally {
  database.close();
}

console.log(JSON.stringify(imported, null, 2));
console.log(`Importados ${imported.length} registros para ${campaignName}.`);

function buildEntity(fileName, raw) {
  const manual = manualClassification.get(fileName) ?? {};
  const info = parseInfo(raw);
  const fileTitle = path.basename(fileName, ".md");
  const icon = extractIcon(fileTitle);
  const cleanName = stripIcon(fileTitle);
  const typeText = info.Tipo ?? "";
  const kind = manual.kind ?? inferKind(typeText, raw);
  const name = cleanName;
  const category = manual.category ?? inferCategory(kind, typeText, raw);
  const action = manual.action ?? cleanAction(info["Ação"] ?? info.Acao);
  const cost = manual.cost ?? cleanValue(info.Custo);
  const range = manual.range ?? cleanValue(info.Alcance);
  const level = parseLevel(info["Nível"] ?? info.Nivel);
  const damage = manual.damage ?? inferDamage(raw);
  const source = inferSource(raw, typeText);
  const tags = unique([
    campaignName,
    "Akai",
    kind === "magia" ? "Magia" : "Habilidade",
    category,
    ...inferTags(raw, typeText),
    ...(manual.tags ?? []),
  ]);
  const body = normalizeBody(raw);
  const frontmatter =
    kind === "magia"
      ? buildSpellFrontmatter({ name, icon, level, category, action, cost, range, damage, source, tags, raw, info })
      : buildAbilityFrontmatter({ name, icon, category, action, cost, range, damage, source, tags, raw, info });

  return {
    id: `tharemyr-${kind}-${slugify(name)}`,
    kind,
    name,
    originalName: extractOriginalName(cleanName),
    icon,
    level,
    category,
    action,
    cost,
    source,
    damage,
    range,
    sourcePath: `manual/tharemyr/${kind}/${slugify(name)}`,
    frontmatter,
    body,
    tags,
  };
}

function parseInfo(raw) {
  const info = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/-\s+\*\*([^:*]+):\*\*\s*(.+)$/);
    if (!match) continue;
    info[normalizeLabel(match[1])] = cleanValue(match[2]);
  }

  return info;
}

function inferKind(typeText, raw) {
  const normalizedType = normalizeText(typeText);
  const normalizedRaw = normalizeText(raw);
  const declaredType = normalizedType.split("(")[0].trim();

  if (declaredType.startsWith("habilidade")) return "habilidade";
  if (declaredType.startsWith("magia")) return "magia";
  if (normalizedType.includes("magia / habilidade")) return "magia";
  if (normalizedType.includes("habilidade / magia")) return "habilidade";
  if (normalizedType.includes("skill / spell")) return "habilidade";
  if (normalizedType.includes("spell / skill")) return "magia";
  if (normalizedType.includes("magia") || normalizedType.includes("spell")) return "magia";
  if (normalizedType.includes("habilidade") || normalizedType.includes("skill")) return "habilidade";
  if (normalizedRaw.includes("slot de magia") || normalizedRaw.includes("conjura")) return "magia";
  return "habilidade";
}

function inferCategory(kind, typeText, raw) {
  const text = normalizeText(`${typeText} ${raw}`);
  if (text.includes("passiva") || text.includes("passive")) return "Passiva";
  if (text.includes("teleporte")) return "Teleporte";
  if (/\bcura\b|\bcurativa\b|\bcurar\b/.test(text)) return "Cura";
  if (text.includes("radiante") || text.includes("luz") || text.includes("eterea") || text.includes("ether")) return "Ethereal";
  if (text.includes("fogo") || text.includes("fire") || text.includes("flame")) return "Fogo";
  if (text.includes("furtiv")) return "Furtividade";
  return kind === "magia" ? "Arcana" : "Geral";
}

function inferSource(raw, typeText) {
  const text = normalizeText(`${typeText} ${raw}`);
  if (text.includes("meio-anjo") || text.includes("angelical") || text.includes("divino")) return "Meio-anjo";
  if (text.includes("ladrao") || text.includes("ladino") || text.includes("sneak")) return "Ladino";
  if (text.includes("ether") || text.includes("eterea") || text.includes("etereo")) return "Ether";
  return "Tharemyr";
}

function inferTags(raw, typeText) {
  const text = normalizeText(`${typeText} ${raw}`);
  const tags = [];
  const checks = [
    ["ether", "Ether"],
    ["eterea", "Ethereal"],
    ["etereo", "Ethereal"],
    ["luz", "Luz"],
    ["radiante", "Radiante"],
    ["fogo", "Fogo"],
    ["teleporte", "Teleporte"],
    ["clone", "Clone"],
    ["furtiv", "Furtividade"],
    ["ladino", "Ladino"],
    ["ladrao", "Ladino"],
    ["meio-anjo", "Meio-anjo"],
    ["passiva", "Passiva"],
    ["reaction", "Reacao"],
    ["reacao", "Reacao"],
    ["cura", "Cura"],
    ["concentracao", "Concentracao"],
  ];

  for (const [needle, tag] of checks) {
    if (text.includes(needle)) tags.push(tag);
  }

  return tags;
}

function inferDamage(raw) {
  const match = raw.match(/\b\d+d\d+(?:\s*[+]\s*\d+)?\b/i);
  return match?.[0];
}

function parseLevel(value) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function buildSpellFrontmatter({ name, icon, level, category, action, cost, range, damage, source, tags, raw, info }) {
  return {
    tipo: "magia",
    nome: name,
    nivel: level ?? 1,
    circulo: level ?? "",
    escola: category,
    origem: source,
    classe: ["Tharemyr"],
    acao: action,
    custo: cost || "Nenhum",
    recurso: cost?.toLowerCase().includes("slot") ? "Espacos de Magia" : "",
    execucao: cleanValue(info["Execução"] ?? info.Execucao),
    duracao: cleanValue(info["Duração"] ?? info.Duracao),
    alcance_texto: range,
    concentracao: normalizeText(raw).includes("concentracao"),
    ritual: false,
    componentes: [],
    dano_base: damage ?? "",
    dano_tipo: inferDamageType(raw),
    escala_nivel_superior: inferScaling(raw),
    conhecida: false,
    preparada: false,
    favorita: false,
    homebrew: true,
    icone: icon,
    tags,
    aliases: [],
  };
}

function buildAbilityFrontmatter({ name, icon, category, action, cost, range, damage, source, tags, raw, info }) {
  return {
    tipo: "habilidade",
    nome: name,
    fonte: campaignName,
    origem: source,
    arvore: inferTree(raw, source),
    categoria: [category],
    acao: action,
    custo: cost || "Nenhum",
    recurso: "",
    execucao: cleanValue(info["Execução"] ?? info.Execucao),
    duracao: cleanValue(info["Duração"] ?? info.Duracao),
    alcance_texto: range,
    usos: cleanValue(info.Usos),
    recarga: cleanValue(info.Recarga),
    salvaguarda: inferSave(raw),
    dano_base: damage ?? "",
    dano_tipo: inferDamageType(raw),
    ativa: !normalizeText(`${category} ${action}`).includes("passiva"),
    desbloqueada: false,
    equipada: false,
    favorita: false,
    homebrew: true,
    icone: icon,
    requisitos: extractRequirements(info.Requisitos),
    tags,
    aliases: [],
  };
}

function upsertEntity(entity) {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO entities (
        id, kind, name, campaign_name, original_name, icon, level, category, action, cost, source, damage, range,
        source_path, frontmatter_json, markdown_body, is_manual, imported_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        name = excluded.name,
        campaign_name = excluded.campaign_name,
        original_name = excluded.original_name,
        icon = excluded.icon,
        level = excluded.level,
        category = excluded.category,
        action = excluded.action,
        cost = excluded.cost,
        source = excluded.source,
        damage = excluded.damage,
        range = excluded.range,
        source_path = excluded.source_path,
        frontmatter_json = excluded.frontmatter_json,
        markdown_body = excluded.markdown_body,
        is_manual = 1,
        imported_at = excluded.imported_at`,
    )
    .run(
      entity.id,
      entity.kind,
      entity.name,
      campaignName,
      entity.originalName ?? null,
      entity.icon ?? null,
      entity.level,
      entity.category,
      entity.action,
      entity.cost,
      entity.source,
      entity.damage ?? null,
      entity.range ?? null,
      entity.sourcePath,
      JSON.stringify(entity.frontmatter),
      entity.body,
      now,
    );

  database.prepare("DELETE FROM entity_sections WHERE entity_id = ?").run(entity.id);
  const insertSection = database.prepare("INSERT INTO entity_sections (entity_id, position, title, content) VALUES (?, ?, ?, ?)");
  extractSections(entity.body).forEach((section, index) => {
    insertSection.run(entity.id, index, section.title, section.content);
  });

  database.prepare("DELETE FROM entity_tags WHERE entity_id = ?").run(entity.id);
  const insertTag = database.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  const selectTag = database.prepare("SELECT id FROM tags WHERE name = ?");
  const insertEntityTag = database.prepare("INSERT OR IGNORE INTO entity_tags (entity_id, tag_id) VALUES (?, ?)");

  for (const tag of entity.tags) {
    insertTag.run(tag);
    const row = selectTag.get(tag);
    if (row) insertEntityTag.run(entity.id, row.id);
  }
}

function ensureSchema() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      campaign_name TEXT NOT NULL DEFAULT 'Terra',
      original_name TEXT,
      icon TEXT,
      level INTEGER,
      category TEXT,
      action TEXT,
      cost TEXT,
      source TEXT,
      damage TEXT,
      range TEXT,
      source_path TEXT NOT NULL UNIQUE,
      frontmatter_json TEXT NOT NULL,
      markdown_body TEXT NOT NULL,
      is_manual INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entity_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS entity_tags (
      entity_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (entity_id, tag_id),
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
}

function normalizeBody(raw) {
  const trimmed = raw.trim();
  if (/^##\s+/m.test(trimmed)) return trimmed;
  return `## Efeitos\n\n${trimmed}`;
}

function extractSections(body) {
  const trimmed = body.trim();
  const matches = [...trimmed.matchAll(/^##\s+(.+)$/gm)];
  if (matches.length === 0) return trimmed ? [{ title: "Conteudo", content: trimmed }] : [];

  return matches
    .map((match, index) => {
      const next = matches[index + 1];
      const start = match.index + match[0].length;
      const end = next?.index ?? trimmed.length;
      return {
        title: stripEmojiPrefix(match[1].trim()),
        content: trimmed.slice(start, end).replace(/^---$/gm, "").trim(),
      };
    })
    .filter((section) => section.content);
}

function inferDamageType(raw) {
  const text = normalizeText(raw);
  if (text.includes("radiante")) return "Radiante";
  if (text.includes("force") || text.includes("forca")) return "Forca";
  if (text.includes("fogo") || text.includes("fire")) return "Fogo";
  if (text.includes("perfurante")) return "Perfurante";
  return "";
}

function inferScaling(raw) {
  const lines = raw.split(/\r?\n/).filter((line) => normalizeText(line).includes("nivel"));
  return lines.slice(0, 8).join("\n");
}

function inferTree(raw, source) {
  const text = normalizeText(raw);
  if (text.includes("ether") || text.includes("eterea") || text.includes("etereo")) return "Ether";
  if (text.includes("meio-anjo") || text.includes("angelical") || text.includes("divino")) return "Meio-anjo";
  if (text.includes("ladino") || text.includes("ladrao") || text.includes("furtiv")) return "Ladino";
  return source;
}

function inferSave(raw) {
  const text = normalizeText(raw);
  if (text.includes("constituicao")) return "Constituicao";
  if (text.includes("destreza")) return "Destreza";
  if (text.includes("inteligencia")) return "Inteligencia";
  return "";
}

function extractRequirements(value) {
  const text = cleanValue(value);
  return text ? [text] : [];
}

function extractIcon(value) {
  const match = value.match(/^[^\p{L}\p{N}\s]+/u);
  return match?.[0]?.trim() || "";
}

function stripIcon(value) {
  return value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function stripEmojiPrefix(value) {
  return value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function extractOriginalName(value) {
  const match = value.match(/\(([^)]+)\)/);
  return match?.[1] ?? "";
}

function cleanAction(value) {
  return cleanValue(value)?.replace(/\s*\([^)]*\)/g, "").trim() ?? "";
}

function cleanValue(value) {
  return String(value ?? "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeLabel(value) {
  return cleanValue(value).normalize("NFC");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const tag = cleanValue(value);
    const key = normalizeText(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
