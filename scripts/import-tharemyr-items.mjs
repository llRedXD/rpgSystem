import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const sourceDir = path.join(root, "Itens");
const dbPath = path.join(root, "data", "rpg.sqlite");
const campaignName = "Tharemyr";

const itemOverrides = new Map([
  ["Adaga Diacrônica.md", { category: "Arma", subcategory: "Adaga", rarity: "Magico", tags: ["Arma", "Adaga", "Fogo", "Runa"] }],
  ["Adagas Angelicais.md", { category: "Arma", subcategory: "Adaga / Arma de fogo", rarity: "Magico", tags: ["Arma", "Adaga", "Angelical", "Transformavel"] }],
  ["Adagas de Gemas.md", { category: "Arma", subcategory: "Adaga", rarity: "Magico", tags: ["Arma", "Adaga", "Gema"] }],
  ["Adagas Negras.md", { category: "Arma", subcategory: "Adaga", rarity: "Magico", tags: ["Arma", "Adaga", "Telepatia"] }],
  ["Armadura De Anjo.md", { category: "Armadura", subcategory: "Armadura leve", rarity: "Magico", tags: ["Armadura", "Angelical", "Destreza"] }],
  ["Blades of Fragments from Eclipsys's Golden Star and Tsukhin's Moon Reflection.md", { category: "Arma", subcategory: "Laminas", rarity: "Lendario", tags: ["Arma", "Lendario", "Alma"] }],
  ["Bolsa Equipe.md", { category: "Inventario", subcategory: "Bolsa", rarity: "Comum", quantity: 1, tags: ["Inventario", "Recursos", "Grupo"] }],
  ["Cristais de Ether.md", { category: "Material", subcategory: "Cristal", rarity: "Raro", tags: ["Material", "Ether", "Cristal"] }],
  ["Espada Anti Magia.md", { category: "Arma", subcategory: "Espada", rarity: "Magico", tags: ["Arma", "Espada", "Antimagia"] }],
  ["Espada Longa Negra.md", { category: "Arma", subcategory: "Espada longa", rarity: "Magico", tags: ["Arma", "Espada", "Resistente"] }],
  ["Fangs of Terramoth Leviathan.md", { category: "Arma", subcategory: "Presas / Adagas", rarity: "Lendario", tags: ["Arma", "Leviathan", "Veneno", "Necrotico"] }],
  ["Lança Draconica.md", { category: "Arma", subcategory: "Lanca / Glaive", rarity: "Magico", tags: ["Arma", "Lanca", "Draconico"] }],
  ["Luvas de Luz.md", { category: "Equipamento", subcategory: "Luvas", rarity: "Magico", tags: ["Equipamento", "Luz"] }],
  ["Medalhão de Aguia.md", { category: "Acessorio", subcategory: "Medalhao", rarity: "Comum", tags: ["Acessorio", "Familia", "Aguia"] }],
  ["Pulseira De Luz.md", { category: "Acessorio", subcategory: "Pulseira", rarity: "Magico", tags: ["Acessorio", "Luz", "Orbe"] }],
  ["🕸️ Veil of the Silent Step.md", { category: "Vestimenta", subcategory: "Manto", rarity: "Rare", charges: 3, maxCharges: 3, recharge: "Descanso Longo", tags: ["Vestimenta", "Manto", "Furtividade", "Invisibilidade"] }],
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
  database.prepare("DELETE FROM entities WHERE source_path LIKE 'manual/tharemyr/item/%'").run();
  for (const fileName of files) {
    const raw = await readFile(path.join(sourceDir, fileName), "utf8");
    const entity = buildItemEntity(fileName, raw);
    upsertItem(entity);
    imported.push({
      id: entity.id,
      name: entity.name,
      category: entity.category,
      subcategory: entity.frontmatter.subcategoria,
      rarity: entity.frontmatter.raridade,
      damage: entity.damage,
      image: entity.frontmatter.image,
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
console.log(`Importados ${imported.length} itens para ${campaignName}.`);

function buildItemEntity(fileName, raw) {
  const override = itemOverrides.get(fileName) ?? {};
  const fileTitle = path.basename(fileName, ".md");
  const icon = extractIcon(fileTitle);
  const name = stripIcon(fileTitle);
  const info = parseInlineInfo(raw);
  const image = resolveImage(extractFirstImage(raw));
  const damage = override.damage ?? inferDamage(raw);
  const category = override.category ?? inferCategory(name, raw);
  const subcategory = override.subcategory ?? inferSubcategory(name, raw);
  const rarity = override.rarity ?? info.Raridade ?? inferRarity(raw);
  const quantity = override.quantity ?? inferQuantity(raw);
  const charges = override.charges ?? inferCharges(raw);
  const maxCharges = override.maxCharges ?? charges;
  const recharge = override.recharge ?? inferRecharge(raw);
  const tags = unique([
    campaignName,
    "Item",
    category,
    subcategory,
    rarity,
    ...inferTags(name, raw),
    ...(override.tags ?? []),
  ]);
  const body = normalizeBody(raw);
  const frontmatter = {
    tipo: "item",
    nome: name,
    categoria: category,
    subcategoria: subcategory,
    raridade: rarity,
    origem: campaignName,
    peso: info.Peso ?? "",
    equipado: false,
    sintonizado: false,
    consumivel: category === "Consumivel",
    quantidade: quantity,
    cargas: charges,
    cargas_maximas: maxCharges,
    recarga: recharge,
    efeito_tipo: inferEffectType(raw),
    requisitos: [],
    homebrew: true,
    icone: icon,
    image,
    status: "",
    tags,
    aliases: [],
  };

  return {
    id: `tharemyr-item-${slugify(name)}`,
    kind: "item",
    name,
    icon,
    category,
    source: campaignName,
    damage,
    range: "",
    sourcePath: `manual/tharemyr/item/${slugify(name)}`,
    body,
    frontmatter,
    tags,
  };
}

function parseInlineInfo(raw) {
  const info = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*\**([^:*]+):\**\s*(.+?)\s*$/);
    if (!match) continue;
    info[cleanValue(match[1])] = cleanValue(match[2]);
  }
  return info;
}

function inferCategory(name, raw) {
  const text = normalizeText(`${name} ${raw}`);
  if (text.includes("armadura")) return "Armadura";
  if (text.includes("bolsa") || text.includes("lingote") || text.includes("pocoes")) return "Inventario";
  if (text.includes("cristal") || text.includes("fragmento")) return "Material";
  if (text.includes("medalhao") || text.includes("pulseira") || text.includes("colar") || text.includes("anel")) return "Acessorio";
  if (text.includes("manto") || text.includes("cloak")) return "Vestimenta";
  if (text.includes("adaga") || text.includes("espada") || text.includes("lanca") || text.includes("glaive") || text.includes("fang") || text.includes("blade")) return "Arma";
  return "Item";
}

function inferSubcategory(name, raw) {
  const text = normalizeText(`${name} ${raw}`);
  if (text.includes("adaga")) return "Adaga";
  if (text.includes("espada longa")) return "Espada longa";
  if (text.includes("espada")) return "Espada";
  if (text.includes("lanca") || text.includes("glaive")) return "Lanca";
  if (text.includes("armadura")) return "Armadura";
  if (text.includes("manto") || text.includes("cloak")) return "Manto";
  if (text.includes("pulseira")) return "Pulseira";
  if (text.includes("medalhao")) return "Medalhao";
  if (text.includes("cristal")) return "Cristal";
  if (text.includes("bolsa")) return "Bolsa";
  return "";
}

function inferRarity(raw) {
  const text = normalizeText(raw);
  if (text.includes("lendario") || text.includes("legendary")) return "Lendario";
  if (text.includes("rare") || text.includes("raro")) return "Raro";
  if (text.includes("magico") || text.includes("magia") || text.includes("encantad")) return "Magico";
  return "";
}

function inferTags(name, raw) {
  const text = normalizeText(`${name} ${raw}`);
  const tags = [];
  const checks = [
    ["adaga", "Adaga"],
    ["espada", "Espada"],
    ["lanca", "Lanca"],
    ["armadura", "Armadura"],
    ["luz", "Luz"],
    ["ether", "Ether"],
    ["anj", "Angelical"],
    ["draconic", "Draconico"],
    ["dracon", "Draconico"],
    ["magia", "Magia"],
    ["anti magia", "Antimagia"],
    ["furtividade", "Furtividade"],
    ["invisivel", "Invisibilidade"],
    ["venen", "Veneno"],
    ["necrotico", "Necrotico"],
    ["fogo", "Fogo"],
    ["runa", "Runa"],
  ];

  for (const [needle, tag] of checks) {
    if (text.includes(needle)) tags.push(tag);
  }
  return tags;
}

function inferDamage(raw) {
  const lines = raw.split(/\r?\n/);
  const dicePattern = /(?:\d+|\?+)d\d+(?:\s*[+]\s*\d+)?/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!normalizeText(line).includes("dano")) continue;
    const sameLine = line.match(dicePattern);
    if (sameLine) return sameLine[0];

    for (const nextLine of lines.slice(index + 1, index + 5)) {
      const nextMatch = nextLine.match(dicePattern);
      if (nextMatch) return nextMatch[0];
    }
  }

  const match = raw.match(dicePattern);
  return match?.[0] ?? "";
}

function inferQuantity(raw) {
  const text = normalizeText(raw);
  if (text.includes("bolsa equipe")) return 1;
  return 1;
}

function inferCharges(raw) {
  const match = raw.match(/(\d+)\s+cargas?/i);
  return match ? Number(match[1]) : null;
}

function inferRecharge(raw) {
  const text = normalizeText(raw);
  if (text.includes("descanso longo")) return "Descanso Longo";
  if (text.includes("descanso curto")) return "Descanso Curto";
  return "";
}

function inferEffectType(raw) {
  const text = normalizeText(raw);
  if (text.includes("dano")) return "Dano";
  if (text.includes("invisivel") || text.includes("furtividade")) return "Furtividade";
  if (text.includes("orbe") || text.includes("luz")) return "Utilidade";
  if (text.includes("cura") || text.includes("pocoes")) return "Cura";
  return "";
}

function extractFirstImage(raw) {
  const match = raw.match(/!\[\[([^\]]+)\]\]/);
  return match?.[1]?.trim() ?? "";
}

function resolveImage(imageName) {
  if (!imageName) return "";
  if (imageName.includes("/")) return imageName;
  return `image/${imageName}`;
}

function normalizeBody(raw) {
  const withoutImageOnlyLines = raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().match(/^!\[\[[^\]]+\]\]$/))
    .join("\n")
    .trim();

  if (/^##\s+/m.test(withoutImageOnlyLines)) return withoutImageOnlyLines;
  return `## Efeitos\n\n${withoutImageOnlyLines}`;
}

function upsertItem(entity) {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO entities (
        id, kind, name, campaign_name, original_name, icon, level, category, action, cost, source, damage, range,
        source_path, frontmatter_json, markdown_body, is_manual, imported_at
      )
      VALUES (?, 'item', ?, ?, NULL, ?, NULL, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = 'item',
        name = excluded.name,
        campaign_name = excluded.campaign_name,
        icon = excluded.icon,
        category = excluded.category,
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
      entity.name,
      campaignName,
      entity.icon || null,
      entity.category || null,
      entity.source,
      entity.damage || null,
      entity.range || null,
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

function cleanValue(value) {
  return String(value ?? "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
