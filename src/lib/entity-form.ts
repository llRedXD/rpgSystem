import type { Entity } from "../types";
import type { EntityForm } from "../app/config";
import { booleanFieldToForm, getScalingDamage, parseBooleanField, splitTags, stringField } from "./entity-utils";

export function buildEntityPayload(form: EntityForm) {
  return {
    ...form,
    level: form.level ? Number(form.level) : undefined,
    factionEntityId: form.factionEntityId || undefined,
    factionEntityName: form.factionEntityName || undefined,
    firstSessionId: form.firstSessionId || undefined,
    firstSessionName: form.firstSessionName || undefined,
    lastSessionId: form.lastSessionId || undefined,
    lastSessionName: form.lastSessionName || undefined,
    isAlive: parseBooleanField(form.isAlive),
    isHostile: parseBooleanField(form.isHostile),
    isAlly: parseBooleanField(form.isAlly),
    tags: splitTags(form.tags),
  };
}

export function entityToForm(entity: Entity, groupEntities: Entity[]): EntityForm {
  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    campaignName: entity.campaignName || "Terra",
    level: entity.level?.toString() ?? "",
    title: stringField(entity.frontmatter.titulo) ?? "",
    race: stringField(entity.frontmatter.raca) ?? "",
    npcClass: stringField(entity.frontmatter.classe) ?? "",
    factionEntityId: stringField(entity.frontmatter.faccao_id) ?? "",
    factionEntityName:
      stringField(entity.frontmatter.faccao) ??
      groupEntities.find((candidate) => candidate.id === stringField(entity.frontmatter.faccao_id))?.name ??
      "",
    governorEntityId: stringField(entity.frontmatter.governante_id) ?? "",
    governorEntityName: stringField(entity.frontmatter.governante) ?? "",
    mainFaction: stringField(entity.frontmatter.faccao_principal) ?? "",
    population: stringField(entity.frontmatter.populacao) ?? "",
    parentLocation: stringField(entity.frontmatter.local_pai) ?? "",
    allies: stringField(entity.frontmatter.aliados) ?? "",
    enemies: stringField(entity.frontmatter.inimigos) ?? "",
    importantNpcs: stringField(entity.frontmatter.npcs_importantes) ?? "",
    location: stringField(entity.frontmatter.localizacao) ?? "",
    relation: stringField(entity.frontmatter.relacao) ?? "",
    npcStatus: stringField(entity.frontmatter.status) ?? "",
    importance: stringField(entity.frontmatter.importancia) ?? "",
    priority: stringField(entity.frontmatter.prioridade) ?? "",
    sessionDate: stringField(entity.frontmatter.data) ?? "",
    firstSessionId: stringField(entity.frontmatter.primeiro_encontro_id) ?? "",
    firstSessionName: stringField(entity.frontmatter.primeiro_encontro) ?? "",
    lastSessionId: stringField(entity.frontmatter.ultima_aparicao_id) ?? stringField(entity.frontmatter.ultima_interacao_id) ?? "",
    lastSessionName: stringField(entity.frontmatter.ultima_aparicao) ?? stringField(entity.frontmatter.ultima_interacao) ?? "",
    image: stringField(entity.frontmatter.image) ?? "",
    icon: entity.icon ?? stringField(entity.frontmatter.icone) ?? "",
    isAlive: booleanFieldToForm(entity.frontmatter.vivo),
    isHostile: booleanFieldToForm(entity.frontmatter.hostil),
    isAlly: booleanFieldToForm(entity.frontmatter.aliado),
    category: entity.category ?? stringField(entity.frontmatter.categoria) ?? "",
    action: entity.action ?? "",
    cost: entity.cost ?? "",
    source: entity.source ?? "",
    damage: entity.damage ?? "",
    scaling: getScalingDamage(entity) ?? "",
    range: entity.range ?? "",
    tags: entity.tags.join(", "),
    subcategory: stringField(entity.frontmatter.subcategoria) ?? "",
    rarity: stringField(entity.frontmatter.raridade) ?? "",
    quantity: stringField(entity.frontmatter.quantidade) ?? "",
    charges: stringField(entity.frontmatter.cargas) ?? "",
    maxCharges: stringField(entity.frontmatter.cargas_maximas) ?? "",
    recharge: stringField(entity.frontmatter.recarga) ?? "",
    body: entity.sections.map((section) => `## ${section.title}\n${section.content}`).join("\n\n"),
  };
}
