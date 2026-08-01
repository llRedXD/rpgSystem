import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "rpg.sqlite");
const port = Number(process.env.RPG_API_PORT ?? 8787);

await mkdir(dataDir, { recursive: true });

const database = new DatabaseSync(dbPath);
database.exec("PRAGMA foreign_keys = ON");
database.exec("PRAGMA busy_timeout = 5000");
database.exec("UPDATE entities SET kind = 'local' WHERE kind = 'localidade'");
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
    PRIMARY KEY (source_entity_id, relation_type, target_entity_id),
    FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
  )
`);
database.exec(`
  CREATE TABLE IF NOT EXISTS character_fields (
    character_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (character_id, field_key),
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  )
`);
ensureColumn("characters", "campaign_name", "TEXT NOT NULL DEFAULT 'Terra'");
ensureColumn("entities", "campaign_name", "TEXT NOT NULL DEFAULT 'Terra'");
ensureEntityRelationsSchema();

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      send(response, 204, null);
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
      await sendAsset(response, decodeURIComponent(url.pathname.replace(/^\/assets\//, "")));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      send(response, 201, await uploadImage(await readJson(request)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/bootstrap") {
      send(response, 200, getBootstrap());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/characters") {
      send(response, 201, createCharacter(await readJson(request)));
      return;
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/characters/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      send(response, 200, updateCharacter(id, await readJson(request)));
      return;
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/characters/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      deleteCharacter(id);
      send(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/entities") {
      send(response, 201, createEntity(await readJson(request)));
      return;
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/entities/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      send(response, 200, updateEntity(id, await readJson(request)));
      return;
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/entities/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      deleteEntity(id);
      send(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/relations") {
      send(response, 200, addRelation(await readJson(request)));
      return;
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/relations/")) {
      const [, , , sourceEntityId, relationType, targetEntityId] = url.pathname.split("/");
      deleteRelation(decodeURIComponent(sourceEntityId ?? ""), decodeURIComponent(relationType ?? ""), decodeURIComponent(targetEntityId ?? ""));
      send(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/state") {
      send(response, 200, setState(await readJson(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/resources") {
      send(response, 200, setResource(await readJson(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/character-fields") {
      send(response, 200, setCharacterField(await readJson(request)));
      return;
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/resources/")) {
      const [, , , characterId, resourceKey] = url.pathname.split("/");
      deleteResource(decodeURIComponent(characterId ?? ""), decodeURIComponent(resourceKey ?? ""));
      send(response, 200, { ok: true });
      return;
    }

    send(response, 404, { error: "Rota nao encontrada." });
  } catch (error) {
    send(response, 500, { error: error.message ?? "Erro interno." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`RPG API em http://127.0.0.1:${port}`);
});

process.on("SIGINT", () => {
  database.close();
  server.close(() => process.exit(0));
});

function getBootstrap() {
  const entities = database
    .prepare(
      `SELECT id, kind, name, campaign_name AS campaignName, original_name AS originalName, icon, level, category, action, cost, source,
              damage, range, source_path AS sourcePath, frontmatter_json AS frontmatterJson,
              is_manual AS isManual
       FROM entities
       ORDER BY campaign_name, kind, name`,
    )
    .all()
    .map((entity) => ({
      ...entity,
      isManual: Boolean(entity.isManual),
      tags: database
        .prepare(
          `SELECT t.name
           FROM tags t
           JOIN entity_tags et ON et.tag_id = t.id
           WHERE et.entity_id = ?
           ORDER BY t.name`,
        )
        .all(entity.id)
        .map((row) => row.name),
      frontmatter: parseJson(entity.frontmatterJson),
      sections: database
        .prepare(
          `SELECT title, content
           FROM entity_sections
           WHERE entity_id = ?
           ORDER BY position`,
        )
        .all(entity.id),
    }));

  const characters = database
    .prepare(
      `SELECT id, name, campaign_name AS campaignName, source_entity_id AS sourceEntityId, is_active AS isActive
       FROM characters
       ORDER BY campaign_name, is_active DESC, name`,
    )
    .all()
    .map((character) => ({ ...character, isActive: Boolean(character.isActive) }));

  const states = database
    .prepare(
      `SELECT character_id AS characterId, entity_id AS entityId, relation_type AS relationType,
              is_favorite AS isFavorite, is_active AS isActive, is_equipped AS isEquipped,
              is_prepared AS isPrepared, is_known AS isKnown, is_unlocked AS isUnlocked,
              current_charges AS currentCharges, current_uses AS currentUses, notes
       FROM character_entity_state`,
    )
    .all()
    .map(mapState);

  const resources = database
    .prepare(
      `SELECT character_id AS characterId, resource_key AS resourceKey, label, current_value AS currentValue,
              max_value AS maxValue, reset_on AS resetOn
       FROM character_resources
       ORDER BY label`,
    )
    .all();

  const fields = database
    .prepare(
      `SELECT character_id AS characterId, field_key AS fieldKey, value
       FROM character_fields
       ORDER BY field_key`,
    )
    .all();

  const tags = database
    .prepare(
      `SELECT t.id, t.name, COUNT(et.entity_id) AS entityCount
       FROM tags t
       LEFT JOIN entity_tags et ON et.tag_id = t.id
       GROUP BY t.id, t.name
       ORDER BY t.name`,
    )
    .all();

  const relations = database
    .prepare(
      `SELECT source_entity_id AS sourceEntityId, relation_type AS relationType,
              target_entity_id AS targetEntityId, created_at AS createdAt, updated_at AS updatedAt
       FROM entity_relations
       ORDER BY relation_type, source_entity_id, target_entity_id`,
    )
    .all();

  return {
    importedAt: database.prepare("SELECT value FROM metadata WHERE key = 'last_imported_at'").get()?.value ?? "",
    entities,
    characters,
    states,
    resources,
    fields,
    relations,
    tags,
    warnings: [],
  };
}

function createCharacter(input) {
  requireField(input, "name");
  const now = new Date().toISOString();
  const id = input.id || `character-${slugify(input.name)}`;
  const campaignName = normalizeCampaignName(input.campaignName);

  if (input.isActive) {
    database.prepare("UPDATE characters SET is_active = 0").run();
  }

  database
    .prepare(
      `INSERT INTO characters (id, name, campaign_name, source_entity_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.name, campaignName, input.sourceEntityId ?? null, input.isActive ? 1 : 0, now, now);

  return { id, name: input.name, campaignName, sourceEntityId: input.sourceEntityId, isActive: Boolean(input.isActive) };
}

function updateCharacter(id, input) {
  const current = database.prepare("SELECT * FROM characters WHERE id = ?").get(id);
  if (!current) throw new Error(`Personagem nao encontrado: ${id}`);

  if (input.isActive) {
    database.prepare("UPDATE characters SET is_active = 0 WHERE id <> ?").run(id);
  }

  database
    .prepare("UPDATE characters SET name = ?, campaign_name = ?, source_entity_id = ?, is_active = ?, updated_at = ? WHERE id = ?")
    .run(
      input.name ?? current.name,
      input.campaignName === undefined ? current.campaign_name : normalizeCampaignName(input.campaignName),
      input.sourceEntityId === undefined ? current.source_entity_id : input.sourceEntityId || null,
      input.isActive === undefined ? current.is_active : input.isActive ? 1 : 0,
      new Date().toISOString(),
      id,
    );

  return { ok: true };
}

function deleteCharacter(id) {
  const total = database.prepare("SELECT COUNT(*) AS total FROM characters").get().total;
  if (Number(total) <= 1) throw new Error("Nao e possivel remover o ultimo personagem.");

  const current = database.prepare("SELECT is_active AS isActive FROM characters WHERE id = ?").get(id);
  if (!current) throw new Error(`Personagem nao encontrado: ${id}`);

  database.prepare("DELETE FROM characters WHERE id = ?").run(id);

  if (current.isActive) {
    const next = database.prepare("SELECT id FROM characters ORDER BY name LIMIT 1").get();
    if (next) database.prepare("UPDATE characters SET is_active = 1 WHERE id = ?").run(next.id);
  }
}

function createEntity(input) {
  requireField(input, "kind");
  requireField(input, "name");
  const now = new Date().toISOString();
  const id = input.id || `manual-${input.kind}-${slugify(input.name)}`;
  const campaignName = normalizeCampaignName(input.campaignName);

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
      input.kind,
      input.name,
      campaignName,
      input.originalName ?? null,
      input.icon ?? null,
      nullableNumber(input.level),
      input.category ?? null,
      input.action ?? null,
      input.cost ?? null,
      input.source ?? null,
      input.damage ?? null,
      input.range ?? null,
      `manual/${id}`,
      JSON.stringify(buildFrontmatter(input)),
      input.body ?? "",
      now,
    );

  saveManualSections(id, input.body ?? "");
  saveEntityTags(id, input.tags ?? []);
  saveEntityRelations(id, input, now);
  return { id };
}

function updateEntity(id, input) {
  const current = database.prepare("SELECT * FROM entities WHERE id = ?").get(id);
  if (!current) throw new Error(`Entidade nao encontrada: ${id}`);

  const nextFrontmatter = {
    ...parseJson(current.frontmatter_json),
    ...buildFrontmatter(input),
  };

  database
    .prepare(
      `UPDATE entities
       SET kind = ?, name = ?, campaign_name = ?, original_name = ?, icon = ?, level = ?, category = ?, action = ?, cost = ?,
           source = ?, damage = ?, range = ?, frontmatter_json = ?, markdown_body = ?, is_manual = 1
       WHERE id = ?`,
    )
    .run(
      input.kind ?? current.kind,
      input.name ?? current.name,
      input.campaignName === undefined ? current.campaign_name : normalizeCampaignName(input.campaignName),
      input.originalName ?? current.original_name,
      input.icon ?? current.icon,
      input.level === undefined ? current.level : nullableNumber(input.level),
      input.category ?? current.category,
      input.action ?? current.action,
      input.cost ?? current.cost,
      input.source ?? current.source,
      input.damage ?? current.damage,
      input.range ?? current.range,
      JSON.stringify(nextFrontmatter),
      input.body ?? current.markdown_body,
      id,
    );

  saveManualSections(id, input.body ?? current.markdown_body ?? "");
  if (input.tags !== undefined) saveEntityTags(id, input.tags);
  saveEntityRelations(id, { ...current, ...input }, new Date().toISOString());
  return { ok: true };
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

function saveEntityRelations(entityId, input, now) {
  const kind = input.kind ?? input.tipo;
  database
    .prepare(
    "DELETE FROM entity_relations WHERE source_entity_id = ? AND relation_type IN ('faction', 'first_session', 'last_session', 'local_governor')",
    )
    .run(entityId);

  const relations =
    kind === "npc"
      ? [
          { relationType: "faction", targetEntityId: input.factionEntityId },
          { relationType: "first_session", targetEntityId: input.firstSessionId },
          { relationType: "last_session", targetEntityId: input.lastSessionId },
        ]
      : kind === "local"
        ? [{ relationType: "local_governor", targetEntityId: input.governorEntityId }]
        : [];

  if (relations.length === 0) return;

  const upsert = database.prepare(
    `INSERT INTO entity_relations (source_entity_id, relation_type, target_entity_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(source_entity_id, relation_type, target_entity_id) DO UPDATE SET
       updated_at = excluded.updated_at`,
  );
  const remove = database.prepare("DELETE FROM entity_relations WHERE source_entity_id = ? AND relation_type = ?");

  for (const relation of relations) {
    if (!relation.targetEntityId) {
      remove.run(entityId, relation.relationType);
      continue;
    }
    upsert.run(entityId, relation.relationType, relation.targetEntityId, now, now);
  }
}

function addRelation(input) {
  requireField(input, "sourceEntityId");
  requireField(input, "relationType");
  requireField(input, "targetEntityId");

  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO entity_relations (source_entity_id, relation_type, target_entity_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(source_entity_id, relation_type, target_entity_id) DO UPDATE SET
         updated_at = excluded.updated_at`,
    )
    .run(input.sourceEntityId, input.relationType, input.targetEntityId, now, now);

  return { ok: true };
}

function deleteRelation(sourceEntityId, relationType, targetEntityId) {
  requireField({ sourceEntityId, relationType, targetEntityId }, "sourceEntityId");
  requireField({ sourceEntityId, relationType, targetEntityId }, "relationType");
  requireField({ sourceEntityId, relationType, targetEntityId }, "targetEntityId");
  database
    .prepare("DELETE FROM entity_relations WHERE source_entity_id = ? AND relation_type = ? AND target_entity_id = ?")
    .run(sourceEntityId, relationType, targetEntityId);
}

function setState(input) {
  requireField(input, "characterId");
  requireField(input, "entityId");
  const now = new Date().toISOString();
  const current =
    database
      .prepare("SELECT * FROM character_entity_state WHERE character_id = ? AND entity_id = ?")
      .get(input.characterId, input.entityId) ?? {};

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
      input.characterId,
      input.entityId,
      input.relationType ?? current.relation_type ?? "available",
      boolNumber(input.isFavorite, current.is_favorite),
      boolNumber(input.isActive, current.is_active),
      boolNumber(input.isEquipped, current.is_equipped),
      boolNumber(input.isPrepared, current.is_prepared),
      boolNumber(input.isKnown, current.is_known),
      boolNumber(input.isUnlocked, current.is_unlocked),
      input.currentCharges ?? current.current_charges ?? null,
      input.currentUses ?? current.current_uses ?? null,
      input.notes ?? current.notes ?? null,
      current.created_at ?? now,
      now,
    );

  return mapState(
    database
      .prepare(
        `SELECT character_id AS characterId, entity_id AS entityId, relation_type AS relationType,
                is_favorite AS isFavorite, is_active AS isActive, is_equipped AS isEquipped,
                is_prepared AS isPrepared, is_known AS isKnown, is_unlocked AS isUnlocked,
                current_charges AS currentCharges, current_uses AS currentUses, notes
         FROM character_entity_state
         WHERE character_id = ? AND entity_id = ?`,
      )
      .get(input.characterId, input.entityId),
  );
}

function setResource(input) {
  requireField(input, "characterId");
  requireField(input, "resourceKey");
  requireField(input, "label");

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
      input.characterId,
      input.resourceKey,
      input.label,
      Number(input.currentValue ?? 0),
      input.maxValue ?? null,
      input.resetOn ?? null,
      new Date().toISOString(),
    );

  return { ok: true };
}

function deleteResource(characterId, resourceKey) {
  if (!characterId || !resourceKey) throw new Error("Personagem e recurso sao obrigatorios.");
  database.prepare("DELETE FROM character_resources WHERE character_id = ? AND resource_key = ?").run(characterId, resourceKey);
}

function setCharacterField(input) {
  requireField(input, "characterId");
  requireField(input, "fieldKey");

  database
    .prepare(
      `INSERT INTO character_fields (character_id, field_key, value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(character_id, field_key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .run(input.characterId, input.fieldKey, String(input.value ?? ""), new Date().toISOString());

  return { ok: true };
}

function saveManualSections(entityId, body) {
  database.prepare("DELETE FROM entity_sections WHERE entity_id = ?").run(entityId);
  const sections = extractSections(body);
  const insert = database.prepare("INSERT INTO entity_sections (entity_id, position, title, content) VALUES (?, ?, ?, ?)");
  sections.forEach((section, index) => insert.run(entityId, index, section.title, section.content));
}

function buildFrontmatter(input) {
  const frontmatter = {
    tipo: input.kind,
    nome: input.name,
  };

  if (input.image) frontmatter.image = input.image;
  if (input.icon) frontmatter.icone = input.icon;
  if (input.scaling) frontmatter.escala_nivel_superior = input.scaling;
  if (input.kind === "npc") {
    if (input.title) frontmatter.titulo = input.title;
    if (input.race) frontmatter.raca = input.race;
    if (input.npcClass) frontmatter.classe = input.npcClass;
    if (input.factionEntityId) frontmatter.faccao_id = input.factionEntityId;
    if (input.factionEntityName) frontmatter.faccao = input.factionEntityName;
    if (input.location) frontmatter.localizacao = input.location;
    if (input.relation) frontmatter.relacao = input.relation;
    if (input.npcStatus) frontmatter.status = input.npcStatus;
    if (input.importance) frontmatter.importancia = input.importance;
    if (input.firstSessionId) frontmatter.primeiro_encontro_id = input.firstSessionId;
    if (input.firstSessionName) frontmatter.primeiro_encontro = input.firstSessionName;
    if (input.lastSessionId) frontmatter.ultima_aparicao_id = input.lastSessionId;
    if (input.lastSessionName) {
      frontmatter.ultima_aparicao = input.lastSessionName;
      frontmatter.ultima_interacao = input.lastSessionName;
    }
    if (input.isAlive !== undefined && input.isAlive !== "") frontmatter.vivo = Boolean(input.isAlive);
    if (input.isHostile !== undefined && input.isHostile !== "") frontmatter.hostil = Boolean(input.isHostile);
    if (input.isAlly !== undefined && input.isAlly !== "") frontmatter.aliado = Boolean(input.isAlly);
  }
  if (input.kind === "grupo") {
    if (input.category) frontmatter.categoria = input.category;
    if (input.location) frontmatter.localizacao = input.location;
    if (input.npcStatus) frontmatter.status = input.npcStatus;
  }
  if (input.kind === "sessao") {
    if (input.sessionDate) frontmatter.data = input.sessionDate;
    if (input.location) frontmatter.localizacao = input.location;
    if (input.npcStatus) frontmatter.status = input.npcStatus;
  }
  if (input.kind === "quest") {
    if (input.location) frontmatter.localizacao = input.location;
    if (input.npcStatus) frontmatter.status = input.npcStatus;
    if (input.priority) frontmatter.prioridade = input.priority;
  }
  if (input.kind === "local") {
    if (input.category) frontmatter.categoria = input.category;
    if (input.location) frontmatter.localizacao = input.location;
    if (input.npcStatus) frontmatter.status = input.npcStatus;
    if (input.governorEntityId) frontmatter.governante_id = input.governorEntityId;
    if (input.governorEntityName) frontmatter.governante = input.governorEntityName;
    if (input.mainFaction) frontmatter.faccao_principal = input.mainFaction;
    if (input.population) frontmatter.populacao = input.population;
    if (input.parentLocation) frontmatter.local_pai = input.parentLocation;
    if (input.importance) frontmatter.importancia = input.importance;
    if (input.allies) frontmatter.aliados = normalizeTags(input.allies);
    if (input.enemies) frontmatter.inimigos = normalizeTags(input.enemies);
    if (input.importantNpcs) frontmatter.npcs_importantes = normalizeTags(input.importantNpcs);
  }
  if (input.kind === "item") {
    if (input.category) frontmatter.categoria = input.category;
    if (input.subcategory) frontmatter.subcategoria = input.subcategory;
    if (input.rarity) frontmatter.raridade = input.rarity;
    if (input.quantity !== undefined && input.quantity !== "") frontmatter.quantidade = Number(input.quantity);
    if (input.charges !== undefined && input.charges !== "") frontmatter.cargas = Number(input.charges);
    if (input.maxCharges !== undefined && input.maxCharges !== "") frontmatter.cargas_maximas = Number(input.maxCharges);
    if (input.recharge) frontmatter.recarga = input.recharge;
  }
  if (input.tags !== undefined) frontmatter.tags = normalizeTags(input.tags);

  return frontmatter;
}

function saveEntityTags(entityId, tags) {
  const normalizedTags = normalizeTags(tags);
  database.prepare("DELETE FROM entity_tags WHERE entity_id = ?").run(entityId);
  const insertTag = database.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  const selectTag = database.prepare("SELECT id FROM tags WHERE name = ?");
  const insertEntityTag = database.prepare("INSERT OR IGNORE INTO entity_tags (entity_id, tag_id) VALUES (?, ?)");

  for (const tag of normalizedTags) {
    insertTag.run(tag);
    const row = selectTag.get(tag);
    if (row) insertEntityTag.run(entityId, row.id);
  }

  database.prepare("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM entity_tags)").run();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function extractSections(body) {
  const trimmed = String(body ?? "").trim();
  if (!trimmed) return [];

  const matches = [...trimmed.matchAll(/^##\s+(.+)$/gm)];
  if (matches.length === 0) return [{ title: "Conteudo", content: trimmed }];

  return matches
    .map((match, index) => {
      const next = matches[index + 1];
      const start = match.index + match[0].length;
      const end = next?.index ?? trimmed.length;
      return {
        title: match[1].trim(),
        content: trimmed.slice(start, end).trim(),
      };
    })
    .filter((section) => section.content);
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function send(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(payload === null ? "" : JSON.stringify(payload));
}

async function sendAsset(response, relativePath) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root)) {
    send(response, 403, { error: "Acesso negado." });
    return;
  }

  const buffer = await readFile(resolved);
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": getContentType(resolved),
  });
  response.end(buffer);
}

async function uploadImage(input) {
  if (!input?.dataUrl || !input?.fileName) throw new Error("Arquivo de imagem invalido.");

  const match = String(input.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Formato de imagem invalido.");

  const mimeType = match[1];
  const base64 = match[2];
  const ext = getExtensionForMimeType(mimeType) || path.extname(String(input.fileName)).toLowerCase() || ".png";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = slugify(path.basename(String(input.fileName), path.extname(String(input.fileName)))) || "image";
  const relativePath = path.join("image", "uploads", `${timestamp}-${safeName}${ext}`).replaceAll("\\", "/");
  const resolved = path.resolve(root, relativePath);

  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, Buffer.from(base64, "base64"));
  return { path: relativePath };
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function getExtensionForMimeType(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/svg+xml") return ".svg";
  return "";
}

function mapState(row) {
  return {
    ...row,
    isFavorite: Boolean(row.isFavorite),
    isActive: Boolean(row.isActive),
    isEquipped: Boolean(row.isEquipped),
    isPrepared: Boolean(row.isPrepared),
    isKnown: Boolean(row.isKnown),
    isUnlocked: Boolean(row.isUnlocked),
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value ?? "{}");
  } catch {
    return {};
  }
}

function ensureEntityRelationsSchema() {
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

function ensureColumn(table, column, definition) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((row) => row.name === column)) return;

  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function normalizeCampaignName(value) {
  const campaignName = String(value ?? "").trim();
  return campaignName || "Terra";
}

function requireField(input, key) {
  if (!input?.[key]) throw new Error(`Campo obrigatorio ausente: ${key}`);
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
}

function boolNumber(value, fallback) {
  if (value === undefined) return fallback ? 1 : 0;
  return value ? 1 : 0;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
