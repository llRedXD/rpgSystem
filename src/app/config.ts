import type { EntityKind } from "../types";

export type ViewKind = EntityKind | "sheet";

export const catalogTabs: Array<{ kind: EntityKind; label: string }> = [
  { kind: "magia", label: "Magias" },
  { kind: "habilidade", label: "Habilidades" },
  { kind: "item", label: "Itens" },
  { kind: "npc", label: "NPCs" },
  { kind: "grupo", label: "Grupos" },
  { kind: "local", label: "Locais" },
  { kind: "quest", label: "Quests" },
  { kind: "sessao", label: "Diario" },
];

export const tabs: Array<{ kind: ViewKind; label: string }> = [{ kind: "sheet", label: "Ficha" }, ...catalogTabs];

export const emptyForm = {
  id: "",
  kind: "magia" as EntityKind,
  name: "",
  campaignName: "Terra",
  level: "",
  title: "",
  race: "",
  npcClass: "",
  factionEntityId: "",
  factionEntityName: "",
  governorEntityId: "",
  governorEntityName: "",
  mainFaction: "",
  population: "",
  parentLocation: "",
  allies: "",
  enemies: "",
  importantNpcs: "",
  location: "",
  relation: "",
  npcStatus: "",
  importance: "",
  priority: "",
  sessionDate: "",
  firstSessionId: "",
  firstSessionName: "",
  lastSessionId: "",
  lastSessionName: "",
  image: "",
  icon: "",
  isAlive: "",
  isHostile: "",
  isAlly: "",
  category: "",
  action: "",
  cost: "",
  source: "",
  damage: "",
  scaling: "",
  range: "",
  tags: "",
  subcategory: "",
  rarity: "",
  quantity: "",
  charges: "",
  maxCharges: "",
  recharge: "",
  body: "",
};

export type EntityForm = typeof emptyForm;
