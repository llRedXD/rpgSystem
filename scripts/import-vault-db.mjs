import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createVaultData, normalizePath, parseVault } from "./vault-core.mjs";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "rpg.sqlite");
const jsonOutputPath = path.join(root, "src", "data", "vault-data.json");

async function main() {
  await mkdir(dataDir, { recursive: true });

  const { entities, warnings } = await parseVault(root);
  const database = new DatabaseSync(dbPath);

  try {
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA busy_timeout = 5000");
    createSchema(database);
    importEntities(database, entities, warnings);
  } finally {
    database.close();
  }

  const vaultData = createVaultData(entities, warnings);
  await writeFile(jsonOutputPath, `${JSON.stringify(vaultData, null, 2)}\n`, "utf8");

  console.log(`Banco atualizado em ${normalizePath(path.relative(root, dbPath))}`);
  console.log(`Snapshot JSON atualizado em ${normalizePath(path.relative(root, jsonOutputPath))}`);
  console.log(`Importados ${entities.length} registros.`);
  if (warnings.length > 0) {
    console.log(`${warnings.length} aviso(s) gerado(s).`);
  }
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imported_at TEXT NOT NULL,
      entity_count INTEGER NOT NULL,
      warning_count INTEGER NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS deleted_entities (
      entity_id TEXT PRIMARY KEY,
      source_path TEXT,
      deleted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      campaign_name TEXT NOT NULL DEFAULT 'Terra',
      source_entity_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS character_entity_state (
      character_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'available',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_equipped INTEGER NOT NULL DEFAULT 0,
      is_prepared INTEGER NOT NULL DEFAULT 0,
      is_known INTEGER NOT NULL DEFAULT 0,
      is_unlocked INTEGER NOT NULL DEFAULT 0,
      current_charges INTEGER,
      current_uses INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (character_id, entity_id),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS character_resources (
      character_id TEXT NOT NULL,
      resource_key TEXT NOT NULL,
      label TEXT NOT NULL,
      current_value INTEGER NOT NULL DEFAULT 0,
      max_value INTEGER,
      reset_on TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (character_id, resource_key),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS character_fields (
      character_id TEXT NOT NULL,
      field_key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (character_id, field_key),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS entity_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_entity_id TEXT NOT NULL,
      target_ref TEXT NOT NULL,
      FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entity_relations (
      source_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (source_entity_id, relation_type, target_entity_id),
      FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS import_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES import_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities(kind);
    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
    CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(is_active);
    CREATE INDEX IF NOT EXISTS idx_character_entity_state_entity_id ON character_entity_state(entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_sections_entity_id ON entity_sections(entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_links_source_entity_id ON entity_links(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_relations_source_entity_id ON entity_relations(source_entity_id);
  `);

  ensureColumn(database, "entities", "is_manual", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "characters", "campaign_name", "TEXT NOT NULL DEFAULT 'Terra'");
  ensureColumn(database, "entities", "campaign_name", "TEXT NOT NULL DEFAULT 'Terra'");
  ensureEntityRelationsSchema(database);
}

function importEntities(database, entities, warnings) {
  const importedAt = new Date().toISOString();

  database.exec("BEGIN");

  try {
    const run = database
      .prepare("INSERT INTO import_runs (imported_at, entity_count, warning_count) VALUES (?, ?, ?)")
      .run(importedAt, entities.length, warnings.length);
    const runId = Number(run.lastInsertRowid);
    const deletedEntityIds = new Set(
      database
        .prepare("SELECT entity_id FROM deleted_entities")
        .all()
        .map((row) => row.entity_id),
    );
    const manualEntityIds = new Set(
      database
        .prepare("SELECT id FROM entities WHERE is_manual = 1")
        .all()
        .map((row) => row.id),
    );

    database.prepare("DELETE FROM entity_links WHERE source_entity_id IN (SELECT id FROM entities WHERE is_manual = 0)").run();
    database.prepare("DELETE FROM entity_tags WHERE entity_id IN (SELECT id FROM entities WHERE is_manual = 0)").run();
    database.prepare("DELETE FROM entity_sections WHERE entity_id IN (SELECT id FROM entities WHERE is_manual = 0)").run();
    database.prepare("DROP TABLE IF EXISTS current_import_entity_ids").run();
    database.prepare("CREATE TEMP TABLE current_import_entity_ids (id TEXT PRIMARY KEY)").run();

    const insertEntity = database.prepare(`
      INSERT INTO entities (
        id,
        kind,
        name,
        campaign_name,
        original_name,
        icon,
        level,
        category,
        action,
        cost,
        source,
        damage,
        range,
        source_path,
        frontmatter_json,
        markdown_body,
        is_manual,
        imported_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        is_manual = 0,
        imported_at = excluded.imported_at
      WHERE entities.is_manual = 0
    `);
    const insertCurrentEntityId = database.prepare(`
      INSERT INTO current_import_entity_ids (id)
      VALUES (?)
    `);
    const insertSection = database.prepare(`
      INSERT INTO entity_sections (entity_id, position, title, content)
      VALUES (?, ?, ?, ?)
    `);
    const insertTag = database.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
    const selectTag = database.prepare("SELECT id FROM tags WHERE name = ?");
    const insertEntityTag = database.prepare(`
      INSERT OR IGNORE INTO entity_tags (entity_id, tag_id)
      VALUES (?, ?)
    `);
    const insertLink = database.prepare(`
      INSERT INTO entity_links (source_entity_id, target_ref)
      VALUES (?, ?)
    `);
    const insertWarning = database.prepare(`
      INSERT INTO import_warnings (run_id, message)
      VALUES (?, ?)
    `);
    const upsertMetadata = database.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const entity of entities) {
      if (deletedEntityIds.has(entity.id)) continue;

      insertCurrentEntityId.run(entity.id);
      insertEntity.run(
        entity.id,
        entity.kind,
        entity.name,
        "Terra",
        entity.originalName ?? null,
        entity.icon ?? null,
        entity.level ?? null,
        entity.category ?? null,
        entity.action ?? null,
        entity.cost ?? null,
        entity.source ?? null,
        entity.damage ?? null,
        entity.range ?? null,
        entity.sourcePath,
        JSON.stringify(entity.frontmatter),
        entity.markdownBody,
        0,
        importedAt,
      );

      if (!manualEntityIds.has(entity.id)) {
        entity.sections.forEach((section, index) => {
          insertSection.run(entity.id, index, section.title, section.content);
        });

        for (const tag of entity.tags) {
          insertTag.run(tag);
          const row = selectTag.get(tag);
          if (row) insertEntityTag.run(entity.id, row.id);
        }

        for (const link of entity.links) {
          insertLink.run(entity.id, link);
        }
      }
    }

    seedDefaultCharacter(database, entities, importedAt);

    database.prepare(`
      DELETE FROM entities
      WHERE id NOT IN (SELECT id FROM current_import_entity_ids)
        AND is_manual = 0
    `).run();
    database.prepare("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM entity_tags)").run();
    database.prepare("DROP TABLE current_import_entity_ids").run();

    for (const warning of warnings) {
      insertWarning.run(runId, warning);
    }

    upsertMetadata.run("last_imported_at", importedAt);
    upsertMetadata.run("entity_count", String(entities.length));

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function seedDefaultCharacter(database, entities, timestamp) {
  const existing = database.prepare("SELECT COUNT(*) AS total FROM characters").get();
  if (Number(existing.total) > 0) return;

  const preferredEntity =
    entities.find((entity) => entity.name.toLowerCase() === "umbrael") ??
    entities.find((entity) => entity.kind === "npc");
  const characterId = preferredEntity ? `character-${preferredEntity.id}` : "character-main";
  const characterName = preferredEntity?.name ?? "Personagem Principal";

  database
    .prepare(
      `INSERT INTO characters (
        id,
        name,
        campaign_name,
        source_entity_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'Terra', ?, 1, ?, ?)`,
    )
    .run(characterId, characterName, preferredEntity?.id ?? null, timestamp, timestamp);
}

function ensureColumn(database, table, column, definition) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((row) => row.name === column)) return;

  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function ensureEntityRelationsSchema(database) {
  const indexes = database.prepare("PRAGMA index_list(entity_relations)").all();
  const primaryKeyIndex = indexes.find((index) => index.origin === "pk");
  if (!primaryKeyIndex) return;

  const columns = database.prepare(`PRAGMA index_info(${primaryKeyIndex.name})`).all().map((column) => column.name);
  if (columns.includes("target_entity_id")) return;

  database.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE entity_relations_next (
      source_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (source_entity_id, relation_type, target_entity_id),
      FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
    INSERT OR IGNORE INTO entity_relations_next (source_entity_id, relation_type, target_entity_id, created_at, updated_at)
    SELECT source_entity_id, relation_type, target_entity_id, created_at, updated_at
    FROM entity_relations;
    DROP TABLE entity_relations;
    ALTER TABLE entity_relations_next RENAME TO entity_relations;
    CREATE INDEX IF NOT EXISTS idx_entity_relations_source_entity_id ON entity_relations(source_entity_id);
    PRAGMA foreign_keys = ON;
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
