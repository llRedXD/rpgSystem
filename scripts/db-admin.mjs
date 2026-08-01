import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "rpg.sqlite");

const command = process.argv[2];
const options = parseOptions(process.argv.slice(3));

await mkdir(dataDir, { recursive: true });

const database = new DatabaseSync(dbPath);
database.exec("PRAGMA foreign_keys = ON");
database.exec("PRAGMA busy_timeout = 5000");
database.exec(`
  CREATE TABLE IF NOT EXISTS deleted_entities (
    entity_id TEXT PRIMARY KEY,
    source_path TEXT,
    deleted_at TEXT NOT NULL
  )
`);
database.exec(`
  CREATE TABLE IF NOT EXISTS entity_relations (
    source_entity_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (source_entity_id, relation_type),
    FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
  )
`);
ensureColumn("characters", "campaign_name", "TEXT NOT NULL DEFAULT 'Terra'");
ensureColumn("entities", "campaign_name", "TEXT NOT NULL DEFAULT 'Terra'");

try {
  run(command, options);
} finally {
  database.close();
}

function run(name, opts) {
  switch (name) {
    case "characters:list":
      printRows(
        database
          .prepare("SELECT id, name, campaign_name AS campaignName, source_entity_id AS sourceEntityId, is_active AS isActive FROM characters ORDER BY campaign_name, name")
          .all(),
      );
      break;

    case "characters:create":
      createCharacter(opts);
      break;

    case "characters:update":
      updateCharacter(opts);
      break;

    case "characters:delete":
      requireOption(opts, "id");
      database.prepare("DELETE FROM characters WHERE id = ?").run(opts.id);
      console.log(`Personagem removido: ${opts.id}`);
      break;

    case "entities:list":
      listEntities(opts);
      break;

    case "entities:show":
      requireOption(opts, "id");
      printRows([selectEntity(opts.id)]);
      break;

    case "entities:create":
      createEntity(opts);
      break;

    case "entities:update":
      updateEntity(opts);
      break;

    case "entities:delete":
      requireOption(opts, "id");
      deleteEntity(opts.id);
      console.log(`Entidade removida: ${opts.id}`);
      break;

    case "state:list":
      listState(opts);
      break;

    case "state:set":
      setState(opts);
      break;

    case "state:clear":
      requireOption(opts, "character");
      requireOption(opts, "entity");
      database
        .prepare("DELETE FROM character_entity_state WHERE character_id = ? AND entity_id = ?")
        .run(opts.character, opts.entity);
      console.log(`Estado removido: ${opts.character} -> ${opts.entity}`);
      break;

    case "resources:list":
      listResources(opts);
      break;

    case "resources:set":
      setResource(opts);
      break;

    case "resources:delete":
      requireOption(opts, "character");
      requireOption(opts, "resourceKey");
      database.prepare("DELETE FROM character_resources WHERE character_id = ? AND resource_key = ?").run(opts.character, opts.resourceKey);
      console.log(`Recurso removido: ${opts.character} -> ${opts.resourceKey}`);
      break;

    default:
      printHelp();
      process.exitCode = name ? 1 : 0;
  }
}

function createCharacter(opts) {
  requireOption(opts, "name");
  const now = new Date().toISOString();
  const id = opts.id ?? `character-${slugify(opts.name)}`;
  const campaignName = normalizeCampaignName(opts.campaign ?? opts.campaignName);

  if (toBoolean(opts.active, false)) {
    database.prepare("UPDATE characters SET is_active = 0").run();
  }

  database
    .prepare(
      `INSERT INTO characters (id, name, campaign_name, source_entity_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, opts.name, campaignName, opts.sourceEntity ?? null, toBoolean(opts.active, false) ? 1 : 0, now, now);

  console.log(`Personagem criado: ${id}`);
}

function updateCharacter(opts) {
  requireOption(opts, "id");
  const current = database.prepare("SELECT * FROM characters WHERE id = ?").get(opts.id);
  if (!current) throw new Error(`Personagem nao encontrado: ${opts.id}`);

  const now = new Date().toISOString();
  const active = opts.active === undefined ? current.is_active : toBoolean(opts.active, false) ? 1 : 0;

  if (active === 1) {
    database.prepare("UPDATE characters SET is_active = 0 WHERE id <> ?").run(opts.id);
  }

  database
    .prepare(
      `UPDATE characters
       SET name = ?, campaign_name = ?, source_entity_id = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      opts.name ?? current.name,
      opts.campaign === undefined && opts.campaignName === undefined ? current.campaign_name : normalizeCampaignName(opts.campaign ?? opts.campaignName),
      opts.sourceEntity ?? current.source_entity_id,
      active,
      now,
      opts.id,
    );

  console.log(`Personagem atualizado: ${opts.id}`);
}

function listEntities(opts) {
  const limit = Number(opts.limit ?? 50);
  const kindFilter = opts.kind ? "WHERE kind = ?" : "";
  const statement = database.prepare(
    `SELECT id, kind, name, campaign_name AS campaignName, source_path AS sourcePath, is_manual AS isManual
     FROM entities
     ${kindFilter}
     ORDER BY campaign_name, kind, name
     LIMIT ?`,
  );
  const rows = opts.kind ? statement.all(opts.kind, limit) : statement.all(limit);
  printRows(rows);
}

function selectEntity(id) {
  const row = database
    .prepare(
      `SELECT id, kind, name, campaign_name AS campaignName, original_name AS originalName, category, action, cost, source_path AS sourcePath, is_manual AS isManual
       FROM entities
       WHERE id = ?`,
    )
    .get(id);
  if (!row) throw new Error(`Entidade nao encontrada: ${id}`);
  return row;
}

function createEntity(opts) {
  requireOption(opts, "kind");
  requireOption(opts, "name");
  const now = new Date().toISOString();
  const id = opts.id ?? `manual-${opts.kind}-${slugify(opts.name)}`;
  const sourcePath = opts.sourcePath ?? `manual/${id}`;
  const campaignName = normalizeCampaignName(opts.campaign ?? opts.campaignName);

  database
    .prepare(
      `INSERT INTO entities (
        id, kind, name, campaign_name, original_name, icon, level, category, action, cost, source, damage, range,
        source_path, frontmatter_json, markdown_body, is_manual, imported_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      id,
      opts.kind,
      opts.name,
      campaignName,
      opts.originalName ?? null,
      opts.icon ?? null,
      parseNullableNumber(opts.level),
      opts.category ?? null,
      opts.action ?? null,
      opts.cost ?? null,
      opts.source ?? null,
      opts.damage ?? null,
      opts.range ?? null,
      sourcePath,
      JSON.stringify({ tipo: opts.kind, nome: opts.name, origem: opts.source ?? "" }),
      opts.body ?? "",
      now,
    );

  console.log(`Entidade manual criada: ${id}`);
}

function updateEntity(opts) {
  requireOption(opts, "id");
  const current = database.prepare("SELECT * FROM entities WHERE id = ?").get(opts.id);
  if (!current) throw new Error(`Entidade nao encontrada: ${opts.id}`);

  database
    .prepare(
      `UPDATE entities
       SET kind = ?, name = ?, campaign_name = ?, original_name = ?, icon = ?, level = ?, category = ?, action = ?, cost = ?,
           source = ?, damage = ?, range = ?, markdown_body = ?, is_manual = 1
       WHERE id = ?`,
    )
    .run(
      opts.kind ?? current.kind,
      opts.name ?? current.name,
      opts.campaign === undefined && opts.campaignName === undefined ? current.campaign_name : normalizeCampaignName(opts.campaign ?? opts.campaignName),
      opts.originalName ?? current.original_name,
      opts.icon ?? current.icon,
      opts.level === undefined ? current.level : parseNullableNumber(opts.level),
      opts.category ?? current.category,
      opts.action ?? current.action,
      opts.cost ?? current.cost,
      opts.source ?? current.source,
      opts.damage ?? current.damage,
      opts.range ?? current.range,
      opts.body ?? current.markdown_body,
      opts.id,
    );

  console.log(`Entidade manual atualizada: ${opts.id}`);
}

function deleteEntity(id) {
  const entity = database.prepare("SELECT id, source_path AS sourcePath FROM entities WHERE id = ?").get(id);
  if (!entity) throw new Error(`Entidade nao encontrada: ${id}`);

  if (!String(entity.sourcePath).startsWith("manual/")) {
    database
      .prepare(
        `INSERT INTO deleted_entities (entity_id, source_path, deleted_at)
         VALUES (?, ?, ?)
         ON CONFLICT(entity_id) DO UPDATE SET deleted_at = excluded.deleted_at`,
      )
      .run(id, entity.sourcePath, new Date().toISOString());
  }

  database.prepare("DELETE FROM entities WHERE id = ?").run(id);
}

function listState(opts) {
  const where = opts.character ? "WHERE ces.character_id = ?" : "";
  const statement = database.prepare(
    `SELECT ces.character_id AS characterId, c.name AS characterName, ces.entity_id AS entityId, e.name AS entityName,
            ces.relation_type AS relationType, ces.is_favorite AS isFavorite, ces.is_active AS isActive,
            ces.is_equipped AS isEquipped, ces.is_prepared AS isPrepared, ces.is_known AS isKnown,
            ces.is_unlocked AS isUnlocked, ces.current_charges AS currentCharges, ces.current_uses AS currentUses
     FROM character_entity_state ces
     JOIN characters c ON c.id = ces.character_id
     JOIN entities e ON e.id = ces.entity_id
     ${where}
     ORDER BY c.name, e.name`,
  );
  printRows(opts.character ? statement.all(opts.character) : statement.all());
}

function setState(opts) {
  requireOption(opts, "character");
  requireOption(opts, "entity");
  assertExists("characters", opts.character);
  assertExists("entities", opts.entity);

  const now = new Date().toISOString();
  const current =
    database
      .prepare("SELECT * FROM character_entity_state WHERE character_id = ? AND entity_id = ?")
      .get(opts.character, opts.entity) ?? {};

  database
    .prepare(
      `INSERT INTO character_entity_state (
        character_id, entity_id, relation_type, is_favorite, is_active, is_equipped, is_prepared, is_known,
        is_unlocked, current_charges, current_uses, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_id, entity_id) DO UPDATE SET
        relation_type = excluded.relation_type,
        is_favorite = excluded.is_favorite,
        is_active = excluded.is_active,
        is_equipped = excluded.is_equipped,
        is_prepared = excluded.is_prepared,
        is_known = excluded.is_known,
        is_unlocked = excluded.is_unlocked,
        current_charges = excluded.current_charges,
        current_uses = excluded.current_uses,
        notes = excluded.notes,
        updated_at = excluded.updated_at`,
    )
    .run(
      opts.character,
      opts.entity,
      opts.relation ?? current.relation_type ?? "available",
      toBooleanNumber(opts.favorite, current.is_favorite ?? 0),
      toBooleanNumber(opts.active, current.is_active ?? 0),
      toBooleanNumber(opts.equipped, current.is_equipped ?? 0),
      toBooleanNumber(opts.prepared, current.is_prepared ?? 0),
      toBooleanNumber(opts.known, current.is_known ?? 0),
      toBooleanNumber(opts.unlocked, current.is_unlocked ?? 0),
      opts.charges === undefined ? current.current_charges ?? null : parseNullableNumber(opts.charges),
      opts.uses === undefined ? current.current_uses ?? null : parseNullableNumber(opts.uses),
      opts.notes ?? current.notes ?? null,
      current.created_at ?? now,
      now,
    );

  console.log(`Estado salvo: ${opts.character} -> ${opts.entity}`);
}

function listResources(opts) {
  const where = opts.character ? "WHERE cr.character_id = ?" : "";
  const statement = database.prepare(
    `SELECT cr.character_id AS characterId, c.name AS characterName, cr.resource_key AS resourceKey,
            cr.label, cr.current_value AS currentValue, cr.max_value AS maxValue, cr.reset_on AS resetOn
     FROM character_resources cr
     JOIN characters c ON c.id = cr.character_id
     ${where}
     ORDER BY c.name, cr.label`,
  );
  printRows(opts.character ? statement.all(opts.character) : statement.all());
}

function setResource(opts) {
  requireOption(opts, "character");
  opts.resourceKey ??= opts.key;
  requireOption(opts, "resourceKey");
  requireOption(opts, "label");
  assertExists("characters", opts.character);

  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO character_resources (character_id, resource_key, label, current_value, max_value, reset_on, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(character_id, resource_key) DO UPDATE SET
         label = excluded.label,
         current_value = excluded.current_value,
         max_value = excluded.max_value,
         reset_on = excluded.reset_on,
         updated_at = excluded.updated_at`,
    )
    .run(
      opts.character,
      opts.resourceKey,
      opts.label,
      Number(opts.current ?? 0),
      opts.maxValue === undefined ? null : Number(opts.maxValue),
      opts.resetOn ?? null,
      now,
    );

  console.log(`Recurso salvo: ${opts.character} -> ${opts.resourceKey}`);
}

function assertExists(table, id) {
  const row = database.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!row) throw new Error(`Registro nao encontrado em ${table}: ${id}`);
}

function parseOptions(args) {
  const opts = {};
  const allowedEnvOptions = new Set([
    "id",
    "name",
    "sourceEntity",
    "sourceentity",
    "sourcePath",
    "sourcepath",
    "active",
    "kind",
    "limit",
    "originalName",
    "originalname",
    "icon",
    "level",
    "category",
    "action",
    "cost",
    "source",
    "damage",
    "range",
    "body",
    "character",
    "campaign",
    "campaignName",
    "campaignname",
    "entity",
    "relation",
    "favorite",
    "equipped",
    "prepared",
    "known",
    "unlocked",
    "charges",
    "uses",
    "notes",
    "key",
    "resourceKey",
    "resourcekey",
    "label",
    "current",
    "max",
    "maxValue",
    "maxvalue",
    "resetOn",
    "reseton",
  ]);

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    const separator = raw.indexOf("=");
    if (separator === -1) {
      opts[raw] = "true";
      continue;
    }

    opts[raw.slice(0, separator)] = raw.slice(separator + 1);
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("npm_config_")) continue;
    const optionKey = key.slice("npm_config_".length).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!allowedEnvOptions.has(optionKey)) continue;
    opts[optionKey] ??= value;
  }

  opts.sourceEntity ??= opts.sourceentity;
  opts.campaignName ??= opts.campaignname;
  opts.sourcePath ??= opts.sourcepath;
  opts.originalName ??= opts.originalname;
  opts.resetOn ??= opts.reseton;
  opts.resourceKey ??= opts.resourcekey;
  opts.maxValue ??= opts.maxvalue ?? opts.max;

  return opts;
}

function requireOption(opts, key) {
  if (!opts[key]) throw new Error(`Parametro obrigatorio ausente: --${key}=...`);
}

function toBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return ["1", "true", "sim", "yes"].includes(String(value).toLowerCase());
}

function toBooleanNumber(value, fallback) {
  return toBoolean(value, Boolean(fallback)) ? 1 : 0;
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Numero invalido: ${value}`);
  return number;
}

function ensureColumn(table, column, definition) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((row) => row.name === column)) return;

  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function normalizeCampaignName(value) {
  const campaignName = String(value ?? "").trim();
  return campaignName || "Terra";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function printRows(rows) {
  console.log(JSON.stringify(rows, null, 2));
}

function printHelp() {
  console.log(`Uso:
  npm run db:admin -- characters:list
  npm run db:admin -- characters:create --name=Nome --campaign=Terra --active=true
  npm run db:admin -- characters:update --id=character-id --name=NovoNome --campaign=Terra
  npm run db:admin -- characters:delete --id=character-id

  npm run db:admin -- entities:list --kind=magia --limit=20
  npm run db:admin -- entities:show --id=entity-id
  npm run db:admin -- entities:create --kind=magia --name=Nome
  npm run db:admin -- entities:update --id=entity-id --name=NovoNome
  npm run db:admin -- entities:delete --id=entity-id

  npm run db:admin -- state:list --character=character-id
  npm run db:admin -- state:set --character=character-id --entity=entity-id --known=true --prepared=true
  npm run db:admin -- state:clear --character=character-id --entity=entity-id

  npm run db:admin -- resources:list --character=character-id
  npm run db:admin -- resources:set --character=character-id --resourceKey=sorcery_points --label="Pontos de Feiticaria" --current=4 --maxValue=4
  npm run db:admin -- resources:delete --character=character-id --resourceKey=sorcery_points`);
}
