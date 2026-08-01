export type EntityKind =
  | "magia"
  | "habilidade"
  | "item"
  | "npc"
  | "grupo"
  | "quest"
  | "diario"
  | "sessao"
  | "caracteristica"
  | "local"
  | "unknown";

export type EntitySection = {
  title: string;
  content: string;
};

export type Entity = {
  id: string;
  kind: EntityKind;
  name: string;
  campaignName: string;
  originalName?: string;
  icon?: string;
  level?: number;
  category?: string;
  action?: string;
  cost?: string;
  source?: string;
  damage?: string;
  range?: string;
  tags: string[];
  sourcePath: string;
  isManual?: boolean;
  frontmatter: Record<string, unknown>;
  sections: EntitySection[];
};

export type Character = {
  id: string;
  name: string;
  campaignName: string;
  sourceEntityId?: string;
  isActive: boolean;
};

export type CharacterEntityState = {
  characterId: string;
  entityId: string;
  relationType: "available" | "known" | "owned" | "linked";
  isFavorite: boolean;
  isActive: boolean;
  isEquipped: boolean;
  isPrepared: boolean;
  isKnown: boolean;
  isUnlocked: boolean;
  currentCharges?: number;
  currentUses?: number;
  notes?: string;
};

export type CharacterResource = {
  characterId: string;
  resourceKey: string;
  label: string;
  currentValue: number;
  maxValue?: number;
  resetOn?: "short_rest" | "long_rest" | "manual";
};

export type CharacterField = {
  characterId: string;
  fieldKey: string;
  value: string;
};

export type EntityRelation = {
  sourceEntityId: string;
  relationType: string;
  targetEntityId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TagSummary = {
  id: number;
  name: string;
  entityCount: number;
};

export type VaultData = {
  importedAt: string;
  entities: Entity[];
  warnings: string[];
  characters?: Character[];
  states?: CharacterEntityState[];
  resources?: CharacterResource[];
  fields?: CharacterField[];
  relations?: EntityRelation[];
  tags?: TagSummary[];
};
