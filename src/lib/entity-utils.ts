import type { CharacterEntityState, Entity, EntityKind } from "../types";

export function matchesEntityQuery(entity: Entity, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  return [entity.name, entity.originalName, entity.category, entity.source, entity.action, entity.cost, ...entity.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function sortByName(a: Entity, b: Entity) {
  return a.name.localeCompare(b.name, "pt-BR");
}

export function findState(states: CharacterEntityState[], characterId: string, entityId: string) {
  return states.find((state) => state.characterId === characterId && state.entityId === entityId);
}

export function collectStateEntities(
  states: CharacterEntityState[],
  entities: Entity[],
  predicate: (state: CharacterEntityState, entity: Entity) => boolean,
) {
  return states
    .map((state) => {
      const entity = entities.find((candidate) => candidate.id === state.entityId);
      return entity ? { entity, state } : null;
    })
    .filter((item): item is { entity: Entity; state: CharacterEntityState } => Boolean(item))
    .filter(({ entity, state }) => predicate(state, entity))
    .sort((a, b) => a.entity.name.localeCompare(b.entity.name, "pt-BR"));
}

export function defaultState(characterId: string, entityId: string): CharacterEntityState {
  return {
    characterId,
    entityId,
    relationType: "available",
    isFavorite: false,
    isActive: false,
    isEquipped: false,
    isPrepared: false,
    isKnown: false,
    isUnlocked: false,
  };
}

export function nullableNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

export function numberField(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function getUsageControls(entity: Entity) {
  const frontmatter = entity.frontmatter ?? {};
  const hasCharges = hasMeaningfulValue(frontmatter.cargas) || hasMeaningfulValue(frontmatter.cargas_maximas);

  return {
    showCharges: hasCharges,
  };
}

export function hasMeaningfulValue(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function stringField(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function getScalingDamage(entity: Entity) {
  if (entity.kind !== "magia") return undefined;
  return stringField(
    entity.frontmatter.escala_nivel_superior ??
      entity.frontmatter.dano_escalonado ??
      entity.frontmatter.escalonamento ??
      entity.frontmatter.em_niveis_superiores,
  );
}

export function getItemField(entity: Entity, key: string) {
  if (entity.kind !== "item") return undefined;
  return stringField(entity.frontmatter[key]);
}

export function getNpcField(entity: Entity, key: string) {
  if (entity.kind !== "npc") return undefined;
  const value = entity.frontmatter[key];
  if (Array.isArray(value)) {
    return value.map((item) => stringField(item)).filter(Boolean).join(", ") || undefined;
  }
  return stringField(value);
}

export function boolText(value: unknown) {
  if (value === true) return "Sim";
  if (value === false) return "Nao";
  return undefined;
}

export function booleanFieldToForm(value: unknown) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

export function parseBooleanField(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function getChargesText(entity: Entity) {
  if (entity.kind !== "item") return undefined;
  const charges = stringField(entity.frontmatter.cargas);
  const maxCharges = stringField(entity.frontmatter.cargas_maximas);
  if (!charges && !maxCharges) return undefined;
  if (charges && maxCharges) return `${charges}/${maxCharges}`;
  return charges ?? maxCharges;
}

export function getRechargeText(entity: Entity) {
  if (!["habilidade", "item"].includes(entity.kind)) return undefined;
  return stringField(entity.frontmatter.recarga);
}

export function getEntityImageUrl(entity: Entity) {
  const image = stringField(entity.frontmatter.image);
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  return `http://127.0.0.1:8787/assets/${encodeURI(image.replaceAll("\\", "/"))}`;
}

export function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function shouldShowEditorField(kind: EntityKind, field: "level" | "action" | "cost" | "damage" | "range") {
  if (kind === "item") return false;
  if (kind === "grupo") return false;
  if (kind === "quest") return false;
  if (kind === "sessao") return false;
  if (kind === "local") return false;
  if (kind === "magia") return true;
  if (kind === "habilidade") return ["level", "action", "cost", "damage", "range"].includes(field);
  return ["action", "range"].includes(field);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSubtitle(entity: Entity) {
  return [entity.level ? `Nivel ${entity.level}` : null, entity.action, entity.cost, entity.source].filter(Boolean).join(" - ");
}
