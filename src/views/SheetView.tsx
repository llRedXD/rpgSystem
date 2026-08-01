import {
  Badge,
  ChevronDown,
  ChevronRight,
  Coins,
  Hammer,
  HeartPulse,
  Eye,
  EyeOff,
  Languages,
  Plus,
  Shield,
  Swords,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type {
  Character,
  CharacterEntityState,
  CharacterField,
  CharacterResource,
  Entity,
} from "../types";
import { Fact, Toggle } from "../components/common";
import {
  buildSubtitle,
  collectStateEntities,
  nullableNumber,
  slugify,
  stringField,
} from "../lib/entity-utils";

type ManagedResourceDefinition = {
  label: string;
  resetOn: CharacterResource["resetOn"];
  resourceKey: string;
};

const combatResources = [
  { resourceKey: "armor_class", label: "CA", resetOn: "manual" },
  { resourceKey: "initiative", label: "Iniciativa", resetOn: "manual" },
  { resourceKey: "speed", label: "Deslocamento", resetOn: "manual" },
] satisfies ManagedResourceDefinition[];

const sheetResources = [
  { resourceKey: "hp", label: "Vida", resetOn: "long_rest" },
  {
    resourceKey: "sorcery_points",
    label: "Pontos de feiticaria",
    resetOn: "long_rest",
  },
] satisfies ManagedResourceDefinition[];

const retiredTharemyrResourceKeys = ["mana", "ether", "charges"];

const sheetCounters = [
  { resourceKey: "souls", label: "Souls", resetOn: "manual" },
  { resourceKey: "radiant_souls", label: "Souls Radiante", resetOn: "manual" },
  { resourceKey: "insanity", label: "Insanidade", resetOn: "manual" },
  { resourceKey: "inspiration", label: "Inspiracao", resetOn: "manual" },
] satisfies ManagedResourceDefinition[];

const tharemyrSheetCounters = [
  { resourceKey: "inspiration", label: "Inspiracao", resetOn: "manual" },
] satisfies ManagedResourceDefinition[];

const legacySpellcastingResourceKeys = ["known_spells", "known_cantrips"];
const spellSlotResources = Array.from({ length: 9 }, (_, index) => ({
  resourceKey: `spell_slot_${index + 1}`,
  label: `Nivel ${index + 1}`,
  resetOn: "long_rest",
})) satisfies ManagedResourceDefinition[];

const proficiencyGroups = [
  { fieldKey: "proficiency_weapons", icon: "weapons", label: "Armas" },
  { fieldKey: "proficiency_armor", icon: "armor", label: "Armaduras" },
  { fieldKey: "proficiency_tools", icon: "tools", label: "Ferramentas" },
  { fieldKey: "proficiency_languages", icon: "languages", label: "Idiomas" },
] satisfies Array<{
  fieldKey: string;
  icon: "armor" | "languages" | "tools" | "weapons";
  label: string;
}>;

const currencyResources = [
  { resourceKey: "currency_copper", label: "Cobre", resetOn: "manual" },
  { resourceKey: "currency_silver", label: "Prata", resetOn: "manual" },
  { resourceKey: "currency_gold", label: "Ouro", resetOn: "manual" },
  { resourceKey: "currency_platinum", label: "Platina", resetOn: "manual" },
] satisfies Array<{
  label: string;
  resetOn: CharacterResource["resetOn"];
  resourceKey: string;
}>;

const identityFields = [
  { fieldKey: "identity_name", label: "Nome", source: "name" },
  { fieldKey: "identity_race", label: "Raca", source: "race" },
  { fieldKey: "identity_class", label: "Classe", source: "class" },
  { fieldKey: "identity_origin", label: "Origem", source: "origin" },
  { fieldKey: "identity_level", label: "Nivel", source: "level" },
  {
    fieldKey: "identity_background",
    label: "Antecedente",
    source: "background",
  },
  { fieldKey: "identity_alignment", label: "Alinhamento", source: "alignment" },
  { fieldKey: "identity_age", label: "Idade", source: "age" },
  { fieldKey: "identity_height", label: "Altura", source: "height" },
  { fieldKey: "identity_weight", label: "Peso", source: "weight" },
  { fieldKey: "identity_eyes", label: "Olhos", source: "eyes" },
  { fieldKey: "identity_skin", label: "Pele", source: "skin" },
] satisfies Array<{ fieldKey: string; label: string; source: string }>;

const spellcastingAbilityOptions = [
  "Forca",
  "Destreza",
  "Constituicao",
  "Inteligencia",
  "Sabedoria",
  "Carisma",
];
const spellcastingAbilityFieldKey = "spellcasting_ability";
const spellcastingAbilityResourceByLabel = new Map([
  ["Forca", "ability_strength"],
  ["Destreza", "ability_dexterity"],
  ["Constituicao", "ability_constitution"],
  ["Inteligencia", "ability_intelligence"],
  ["Sabedoria", "ability_wisdom"],
  ["Carisma", "ability_charisma"],
]);
const proficiencyBonusResource = {
  resourceKey: "proficiency_bonus",
  label: "Bonus de proficiencia",
  resetOn: "manual",
} satisfies {
  label: string;
  resetOn: CharacterResource["resetOn"];
  resourceKey: string;
};

const abilityScores = [
  { resourceKey: "ability_strength", label: "Forca", skills: ["Atletismo"] },
  {
    resourceKey: "ability_dexterity",
    label: "Destreza",
    skills: ["Acrobacia", "Furtividade", "Prestidigitacao"],
  },
  { resourceKey: "ability_constitution", label: "Constituicao", skills: [] },
  {
    resourceKey: "ability_intelligence",
    label: "Inteligencia",
    skills: ["Arcanismo", "Historia", "Investigacao", "Natureza", "Religiao"],
  },
  {
    resourceKey: "ability_wisdom",
    label: "Sabedoria",
    skills: [
      "Adestrar Animais",
      "Intuicao",
      "Medicina",
      "Percepcao",
      "Sobrevivencia",
    ],
  },
  {
    resourceKey: "ability_charisma",
    label: "Carisma",
    skills: ["Atuacao", "Enganacao", "Intimidacao", "Persuasao"],
  },
] satisfies Array<{ label: string; resourceKey: string; skills: string[] }>;

const combatResourceKeys = new Set(
  combatResources.map((resource) => resource.resourceKey),
);
const sheetResourceKeys = new Set(
  sheetResources.map(
    (resource) => resource.resourceKey,
  ),
);
const sheetCounterKeys = new Set(
  [...sheetCounters, ...tharemyrSheetCounters].map(
    (resource) => resource.resourceKey,
  ),
);
const spellcastingResourceKeys = new Set([
  ...legacySpellcastingResourceKeys,
  ...spellSlotResources.map((resource) => resource.resourceKey),
]);
const abilityScoreKeys = new Set(
  abilityScores.map((resource) => resource.resourceKey),
);
const currencyResourceKeys = new Set(
  currencyResources.map((resource) => resource.resourceKey),
);
const managedResourceKeys = new Set([
  proficiencyBonusResource.resourceKey,
  ...combatResourceKeys,
  ...sheetResourceKeys,
  ...sheetCounterKeys,
  ...retiredTharemyrResourceKeys,
  ...spellcastingResourceKeys,
  ...abilityScoreKeys,
  ...currencyResourceKeys,
]);

const sheetVisibilityFieldKey = "sheet_hidden_blocks";
const spellCustomFiltersFieldKey = "spell_custom_filters";
const abilityCustomFiltersFieldKey = "ability_custom_filters";
const spellHiddenFiltersFieldKey = "spell_hidden_filters";
const abilityHiddenFiltersFieldKey = "ability_hidden_filters";
const sheetBlockDefinitions = [
  { id: "summary", label: "Resumo" },
  { id: "attributes", label: "Atributos" },
  { id: "mechanics", label: "Recursos e combate" },
  { id: "profile", label: "Perfil" },
  { id: "spells", label: "Magias" },
  { id: "abilities", label: "Habilidades" },
  { id: "items", label: "Itens" },
  { id: "favorites", label: "Favoritos" },
  { id: "custom_resources", label: "Outros recursos" },
] as const;
type SheetBlockId = (typeof sheetBlockDefinitions)[number]["id"];
type SheetCustomFilter = {
  id: string;
  label: string;
  query: string;
};
type SheetFilterTab = SheetCustomFilter & {
  isCustom: boolean;
};

export function SheetView({
  activeCharacter,
  apiOnline,
  entities,
  fields,
  onCharacterFieldSave,
  onEntitySelect,
  onResourceDelete,
  onResourceSave,
  onStateChange,
  resources,
  states,
}: {
  activeCharacter?: Character;
  apiOnline: boolean;
  entities: Entity[];
  fields: CharacterField[];
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
  onEntitySelect: (entity: Entity) => void;
  onResourceDelete: (resource: CharacterResource) => void;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  onStateChange: (entity: Entity, state: Partial<CharacterEntityState>) => void;
  resources: CharacterResource[];
  states: CharacterEntityState[];
}) {
  const [draftResource, setDraftResource] = useState({
    label: "",
    currentValue: "",
    maxValue: "",
  });
  const [showMechanicsGroup, setShowMechanicsGroup] = useState(true);
  const [showProfileGroup, setShowProfileGroup] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<
    "habilidade" | "magia" | null
  >(null);

  if (!activeCharacter) {
    return (
      <section className="sheet empty">
        Crie ou selecione um personagem.
      </section>
    );
  }

  const sourceEntity = activeCharacter.sourceEntityId
    ? entities.find((entity) => entity.id === activeCharacter.sourceEntityId)
    : undefined;
  const characterStates = states.filter(
    (state) => state.characterId === activeCharacter.id,
  );
  const characterResources = resources.filter(
    (resource) => resource.characterId === activeCharacter.id,
  );
  const characterFields = fields.filter(
    (field) => field.characterId === activeCharacter.id,
  );
  const characterClassName = getCharacterClassValue(
    activeCharacter,
    sourceEntity,
    characterFields,
  );
  const showSorceryPoints = isSorcererClass(characterClassName);
  const hiddenBlockIds = parseHiddenSheetBlocks(
    characterFields.find((field) => field.fieldKey === sheetVisibilityFieldKey)
      ?.value,
  );
  const genericResources = characterResources.filter(
    (resource) => !managedResourceKeys.has(resource.resourceKey),
  );
  const knownSpells = collectStateEntities(
    characterStates,
    entities,
    (state, entity) =>
      entity.kind === "magia" && (state.isKnown || state.isPrepared),
  );
  const activeAbilities = collectStateEntities(
    characterStates,
    entities,
    (state, entity) =>
      entity.kind === "habilidade" && (state.isUnlocked || state.isFavorite),
  );
  const equippedItems = collectStateEntities(
    characterStates,
    entities,
    (state, entity) =>
      entity.kind === "item" && (state.isEquipped || state.isFavorite),
  );
  const favorites = collectStateEntities(
    characterStates,
    entities,
    (state) => state.isFavorite,
  );

  function updateResource(
    resource: CharacterResource,
    patch: Partial<CharacterResource>,
  ) {
    onResourceSave({ ...resource, ...patch });
  }

  function createResource(event: FormEvent) {
    event.preventDefault();
    if (!draftResource.label.trim()) return;
    onResourceSave({
      resourceKey: `manual-${slugify(draftResource.label)}`,
      label: draftResource.label.trim(),
      currentValue: Number(draftResource.currentValue || 0),
      maxValue: draftResource.maxValue
        ? Number(draftResource.maxValue)
        : undefined,
      resetOn: "manual",
    });
    setDraftResource({ label: "", currentValue: "", maxValue: "" });
  }

  function isBlockVisible(blockId: SheetBlockId) {
    return !hiddenBlockIds.has(blockId);
  }

  function toggleSheetBlock(blockId: SheetBlockId) {
    const nextHidden = new Set(hiddenBlockIds);
    if (nextHidden.has(blockId)) {
      nextHidden.delete(blockId);
    } else {
      nextHidden.add(blockId);
    }

    onCharacterFieldSave({
      fieldKey: sheetVisibilityFieldKey,
      value: Array.from(nextHidden).join(","),
    });
  }

  return (
    <section className="sheet">
      <SheetHeader
        character={activeCharacter}
        sourceEntity={sourceEntity}
        totals={{
          abilities: activeAbilities.length,
          items: equippedItems.length,
          spells: knownSpells.length,
        }}
      />

      <SheetBlockControls
        hiddenBlockIds={hiddenBlockIds}
        onToggleBlock={toggleSheetBlock}
      />

      {sourceEntity && isBlockVisible("summary") && (
        <CharacterSummary entity={sourceEntity} />
      )}

      <section className="sheet-grid">
        {isBlockVisible("attributes") && (
          <AbilityScoresPanel
            apiOnline={apiOnline}
            fields={characterFields}
            onCharacterFieldSave={onCharacterFieldSave}
            onResourceSave={onResourceSave}
            resources={characterResources}
          />
        )}

        {isBlockVisible("mechanics") && (
          <CollapsibleSheetGroup
            isOpen={showMechanicsGroup}
            onToggle={() => setShowMechanicsGroup((current) => !current)}
            title="Recursos, combate e conjuracao"
          >
            <div className="sheet-mechanics-grid">
              <SheetResourcePanel
                apiOnline={apiOnline}
                campaignName={activeCharacter.campaignName}
                onResourceSave={onResourceSave}
                resources={characterResources}
                showSorceryPoints={showSorceryPoints}
              />

              <CombatPanel
                apiOnline={apiOnline}
                onResourceSave={onResourceSave}
                resources={characterResources}
              />

              <SpellcastingPanel
                apiOnline={apiOnline}
                fields={characterFields}
                knownSpells={knownSpells.map(({ entity }) => entity)}
                onCharacterFieldSave={onCharacterFieldSave}
                resources={characterResources}
              />
            </div>

            <SpellSlotPanel
              apiOnline={apiOnline}
              onResourceSave={onResourceSave}
              resources={characterResources}
            />
          </CollapsibleSheetGroup>
        )}

        {isBlockVisible("profile") && (
          <CollapsibleSheetGroup
            isOpen={showProfileGroup}
            onToggle={() => setShowProfileGroup((current) => !current)}
            title="Identidade, proficiencias e moedas"
          >
            <div className="sheet-profile-grid">
              <IdentityPanel
                activeCharacter={activeCharacter}
                apiOnline={apiOnline}
                fields={characterFields}
                onCharacterFieldSave={onCharacterFieldSave}
                sourceEntity={sourceEntity}
              />

              <ProficienciesPanel
                apiOnline={apiOnline}
                fields={characterFields}
                onCharacterFieldSave={onCharacterFieldSave}
              />

              <CurrencyPanel
                apiOnline={apiOnline}
                onResourceSave={onResourceSave}
                resources={characterResources}
              />
            </div>
          </CollapsibleSheetGroup>
        )}

        {isBlockVisible("spells") && (
          <SpellSheetList
            actionLabel="Adicionar magia"
            characterStates={characterStates}
            fields={characterFields}
            apiOnline={apiOnline}
            entities={entities}
            emptyText="Nenhuma magia marcada."
            items={knownSpells}
            onAction={() => setQuickAddKind("magia")}
            onCharacterFieldSave={onCharacterFieldSave}
            onEntitySelect={onEntitySelect}
            onStateChange={onStateChange}
          />
        )}
        {isBlockVisible("abilities") && (
          <AbilitySheetList
            actionLabel="Adicionar habilidade"
            characterStates={characterStates}
            fields={characterFields}
            apiOnline={apiOnline}
            entities={entities}
            emptyText="Nenhuma habilidade marcada."
            items={activeAbilities}
            onAction={() => setQuickAddKind("habilidade")}
            onCharacterFieldSave={onCharacterFieldSave}
            onEntitySelect={onEntitySelect}
            onStateChange={onStateChange}
          />
        )}
        {isBlockVisible("items") && (
          <SheetList
            emptyText="Nenhum item equipado ou favorito."
            items={equippedItems}
            onEntitySelect={onEntitySelect}
            onStateChange={onStateChange}
            title="Itens"
          />
        )}
        {isBlockVisible("favorites") && (
          <SheetList
            emptyText="Nada favoritado."
            items={favorites}
            onEntitySelect={onEntitySelect}
            onStateChange={onStateChange}
            title="Favoritos"
          />
        )}
        {isBlockVisible("custom_resources") && (
          <ResourcePanel
            apiOnline={apiOnline}
            draftResource={draftResource}
            onDraftChange={setDraftResource}
            onResourceCreate={createResource}
            onResourceDelete={onResourceDelete}
            onResourceUpdate={updateResource}
            resources={genericResources}
          />
        )}
      </section>

      {quickAddKind && (
        <SheetAddModal
          abilityItems={activeAbilities}
          entities={entities}
          kind={quickAddKind}
          onClose={() => setQuickAddKind(null)}
          onStateChange={onStateChange}
          spellItems={knownSpells}
        />
      )}
    </section>
  );
}

function SheetResourcePanel({
  apiOnline,
  campaignName,
  onResourceSave,
  resources,
  showSorceryPoints,
}: {
  apiOnline: boolean;
  campaignName: string;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resources: CharacterResource[];
  showSorceryPoints: boolean;
}) {
  const isTharemyr = normalizeSearchText(campaignName) === "tharemyr";
  const resourceDefinitions = isTharemyr
    ? sheetResources.filter(
        (definition) => definition.resourceKey !== "sorcery_points",
      )
    : sheetResources;
  const counterDefinitions = isTharemyr
    ? tharemyrSheetCounters
    : sheetCounters;
  const visibleSheetResources = resourceDefinitions.filter(
    (definition) =>
      definition.resourceKey !== "sorcery_points" || showSorceryPoints,
  );
  const useCompactResources = visibleSheetResources.length === 1;
  const hasSingleCounter = counterDefinitions.length === 1;

  return (
    <div className="sheet-panel wide resource-pools-panel">
      <div className="panel-title">
        <div>
          <p>Controle do personagem</p>
          <h2>Recursos</h2>
        </div>
        <HeartPulse size={22} />
      </div>

      <div
        className={[
          "resource-pool-grid",
          useCompactResources ? "compact-resources" : "",
          hasSingleCounter ? "single-counter" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {visibleSheetResources.map((definition) => (
          <ResourcePoolCard
            apiOnline={apiOnline}
            definition={definition}
            key={definition.resourceKey}
            onResourceSave={onResourceSave}
            resource={findManagedResource(resources, definition.resourceKey)}
          />
        ))}
        {counterDefinitions.map((definition) => (
          <ResourceCounterCard
            apiOnline={apiOnline}
            definition={definition}
            key={definition.resourceKey}
            onResourceSave={onResourceSave}
            resource={findManagedResource(resources, definition.resourceKey)}
          />
        ))}
      </div>
    </div>
  );
}

function CollapsibleSheetGroup({
  children,
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section className="sheet-collapse-group">
      <button
        aria-expanded={isOpen}
        className="sheet-collapse-trigger"
        onClick={onToggle}
        type="button"
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && children}
    </section>
  );
}

function SheetBlockControls({
  hiddenBlockIds,
  onToggleBlock,
}: {
  hiddenBlockIds: Set<SheetBlockId>;
  onToggleBlock: (blockId: SheetBlockId) => void;
}) {
  return (
    <section className="sheet-visibility-panel">
      <div>
        <p>Personalizacao da ficha</p>
        <h2>Blocos visiveis</h2>
      </div>
      <div className="sheet-visibility-actions">
        {sheetBlockDefinitions.map((block) => {
          const isVisible = !hiddenBlockIds.has(block.id);
          return (
            <button
              className={isVisible ? "visibility-toggle active" : "visibility-toggle"}
              key={block.id}
              onClick={() => onToggleBlock(block.id)}
              title={
                isVisible
                  ? `Ocultar ${block.label}`
                  : `Mostrar ${block.label}`
              }
              type="button"
            >
              {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
              {block.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function parseHiddenSheetBlocks(value?: string) {
  const validBlockIds = new Set<string>(
    sheetBlockDefinitions.map((block) => block.id),
  );
  return new Set<SheetBlockId>(
    String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is SheetBlockId => validBlockIds.has(item)),
  );
}

function SheetAddModal({
  abilityItems,
  entities,
  kind,
  onClose,
  onStateChange,
  spellItems,
}: {
  abilityItems: Array<{ entity: Entity; state: CharacterEntityState }>;
  entities: Entity[];
  kind: "habilidade" | "magia";
  onClose: () => void;
  onStateChange: (entity: Entity, state: Partial<CharacterEntityState>) => void;
  spellItems: Array<{ entity: Entity; state: CharacterEntityState }>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const knownSpellIds = new Set(spellItems.map(({ entity }) => entity.id));
  const unlockedAbilityIds = new Set(
    abilityItems.map(({ entity }) => entity.id),
  );
  const availableSpells = entities
    .filter(
      (entity) => entity.kind === "magia" && !knownSpellIds.has(entity.id),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const availableAbilities = entities
    .filter(
      (entity) =>
        entity.kind === "habilidade" && !unlockedAbilityIds.has(entity.id),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const options = kind === "magia" ? availableSpells : availableAbilities;
  const title = kind === "magia" ? "Adicionar magia" : "Adicionar habilidade";
  const description =
    kind === "magia"
      ? "Marcar uma magia existente como conhecida."
      : "Marcar uma habilidade existente como desbloqueada.";

  function submit(event: FormEvent) {
    event.preventDefault();
    const selected = options.find((entity) => entity.id === selectedId);
    if (!selected) return;
    onStateChange(
      selected,
      kind === "magia" ? { isKnown: true } : { isUnlocked: true },
    );
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div aria-modal="true" className="sheet-add-modal" role="dialog">
        <header>
          <div>
            <p>Catalogo do personagem</p>
            <h2>{title}</h2>
            <span>{description}</span>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Fechar
          </button>
        </header>

        <form onSubmit={submit}>
          <label>
            {kind === "magia" ? "Magia conhecida" : "Habilidade desbloqueada"}
            <select
              onChange={(event) => setSelectedId(event.target.value)}
              value={selectedId}
            >
              <option value="">
                {kind === "magia"
                  ? "Selecionar magia"
                  : "Selecionar habilidade"}
              </option>
              {options.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="command-button"
            disabled={!selectedId}
            type="submit"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
}

function IdentityPanel({
  activeCharacter,
  apiOnline,
  fields,
  onCharacterFieldSave,
  sourceEntity,
}: {
  activeCharacter: Character;
  apiOnline: boolean;
  fields: CharacterField[];
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
  sourceEntity?: Entity;
}) {
  return (
    <div className="sheet-panel wide identity-panel">
      <div className="panel-title">
        <div>
          <p>Dados do personagem</p>
          <h2>Identidade</h2>
        </div>
        <Badge size={22} />
      </div>

      <div className="identity-list">
        {identityFields.map((field) => {
          const savedValue =
            fields.find(
              (characterField) => characterField.fieldKey === field.fieldKey,
            )?.value ?? "";
          const fallbackValue = getIdentityFallbackValue(
            activeCharacter,
            sourceEntity,
            field.source,
          );
          return (
            <label className="identity-row" key={field.fieldKey}>
              <span>{field.label}</span>
              <input
                disabled={!apiOnline}
                onChange={(event) =>
                  onCharacterFieldSave({
                    fieldKey: field.fieldKey,
                    value: event.target.value,
                  })
                }
                placeholder={fallbackValue || "Nao definido"}
                value={savedValue}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function AbilityScoresPanel({
  apiOnline,
  fields,
  onCharacterFieldSave,
  onResourceSave,
  resources,
}: {
  apiOnline: boolean;
  fields: CharacterField[];
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resources: CharacterResource[];
}) {
  function saveAbilityScore(
    definition: (typeof abilityScores)[number],
    currentValue: number,
  ) {
    const current = findManagedResource(resources, definition.resourceKey);
    onResourceSave({
      resourceKey: definition.resourceKey,
      label: current?.label ?? definition.label,
      currentValue,
      resetOn: "manual",
    });
  }

  const proficiencyBonusResourceValue = findManagedResource(
    resources,
    proficiencyBonusResource.resourceKey,
  );
  const proficiencyBonus = proficiencyBonusResourceValue?.currentValue ?? 2;

  function saveProficiencyBonus(currentValue: number) {
    onResourceSave({
      resourceKey: proficiencyBonusResource.resourceKey,
      label:
        proficiencyBonusResourceValue?.label ?? proficiencyBonusResource.label,
      currentValue,
      resetOn:
        proficiencyBonusResourceValue?.resetOn ??
        proficiencyBonusResource.resetOn,
    });
  }

  return (
    <div className="sheet-panel wide ability-panel">
      <div className="panel-title">
        <div>
          <p>Base do personagem</p>
          <h2>Atributos</h2>
        </div>
        <Shield size={22} />
      </div>

      <div className="proficiency-bonus-card">
        <strong>Bonus de proficiencia</strong>
        <input
          disabled={!apiOnline}
          min="0"
          onChange={(event) =>
            saveProficiencyBonus(Number(event.target.value || 0))
          }
          type="number"
          value={proficiencyBonus}
        />
      </div>

      <div className="ability-grid">
        {abilityScores.map((definition) => {
          const resource = findManagedResource(
            resources,
            definition.resourceKey,
          );
          const score = resource?.currentValue ?? 10;
          const proficiencyKey = `${definition.resourceKey}_proficient`;
          const isProficient =
            fields.find((field) => field.fieldKey === proficiencyKey)?.value ===
            "true";
          const abilityModifier = getAbilityModifier(score);
          const abilityTotal =
            abilityModifier + (isProficient ? proficiencyBonus : 0);
          const passivePerception =
            10 +
            abilityModifier +
            (definition.resourceKey === "ability_wisdom" && isProficient
              ? proficiencyBonus
              : 0);
          return (
            <div className="ability-card" key={definition.resourceKey}>
              <strong>{definition.label}</strong>
              <input
                disabled={!apiOnline}
                min="1"
                onChange={(event) =>
                  saveAbilityScore(definition, Number(event.target.value || 0))
                }
                type="number"
                value={score}
              />
              <span>{formatModifier(abilityTotal)}</span>
              <button
                className={
                  isProficient
                    ? "proficiency-toggle active"
                    : "proficiency-toggle"
                }
                disabled={!apiOnline}
                onClick={() =>
                  onCharacterFieldSave({
                    fieldKey: proficiencyKey,
                    value: isProficient ? "false" : "true",
                  })
                }
                type="button"
              >
                {isProficient ? "Prof. no atributo" : "Sem prof. atributo"}
              </button>
              {definition.resourceKey === "ability_wisdom" && (
                <div className="passive-stat">
                  <small>Percepcao passiva</small>
                  <strong>{passivePerception}</strong>
                </div>
              )}
              <div className="skill-list">
                {definition.skills.length === 0 ? (
                  <small>Nenhuma pericia padrao.</small>
                ) : (
                  definition.skills.map((skill) => {
                    const skillKey = `skill_${slugify(skill)}_proficient`;
                    const isSkillProficient =
                      fields.find((field) => field.fieldKey === skillKey)
                        ?.value === "true";
                    const skillTotal =
                      abilityModifier +
                      (isSkillProficient ? proficiencyBonus : 0);
                    return (
                      <label className="skill-check" key={skillKey}>
                        <input
                          checked={isSkillProficient}
                          disabled={!apiOnline}
                          onChange={() =>
                            onCharacterFieldSave({
                              fieldKey: skillKey,
                              value: isSkillProficient ? "false" : "true",
                            })
                          }
                          type="checkbox"
                        />
                        <span>{skill}</span>
                        <strong>{formatModifier(skillTotal)}</strong>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResourcePoolCard({
  apiOnline,
  definition,
  onResourceSave,
  resource,
}: {
  apiOnline: boolean;
  definition: ManagedResourceDefinition;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resource?: CharacterResource;
}) {
  function saveResourceValue(patch: Partial<CharacterResource>) {
    onResourceSave({
      resourceKey: definition.resourceKey,
      label: resource?.label ?? definition.label,
      currentValue: patch.currentValue ?? resource?.currentValue ?? 0,
      maxValue: patch.maxValue ?? resource?.maxValue,
      resetOn: patch.resetOn ?? resource?.resetOn ?? definition.resetOn,
    });
  }

  return (
    <div className="resource-pool-card">
      <div className="resource-card-header">
        <strong>{definition.label}</strong>
      </div>
      <div className="combat-values">
        <label>
          Atual
          <input
            disabled={!apiOnline}
            min="0"
            onChange={(event) =>
              saveResourceValue({
                currentValue: Number(event.target.value || 0),
              })
            }
            type="number"
            value={resource?.currentValue ?? 0}
          />
        </label>
        <span>/</span>
        <label>
          Max
          <input
            disabled={!apiOnline}
            min="0"
            onChange={(event) =>
              saveResourceValue({
                maxValue: nullableNumber(event.target.value),
              })
            }
            type="number"
            value={resource?.maxValue ?? ""}
          />
        </label>
      </div>
      <div className="combat-actions">
        <button
          className="secondary-button"
          disabled={!apiOnline}
          onClick={() =>
            saveResourceValue({
              currentValue: Math.max((resource?.currentValue ?? 0) - 1, 0),
            })
          }
          type="button"
        >
          -1
        </button>
        <button
          className="secondary-button"
          disabled={!apiOnline}
          onClick={() =>
            saveResourceValue({
              currentValue: (resource?.currentValue ?? 0) + 1,
            })
          }
          type="button"
        >
          +1
        </button>
        <button
          className="secondary-button"
          disabled={!apiOnline || resource?.maxValue === undefined}
          onClick={() =>
            saveResourceValue({ currentValue: resource?.maxValue ?? 0 })
          }
          type="button"
        >
          Max
        </button>
      </div>
    </div>
  );
}

function ResourceCounterCard({
  apiOnline,
  definition,
  onResourceSave,
  resource,
}: {
  apiOnline: boolean;
  definition: ManagedResourceDefinition;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resource?: CharacterResource;
}) {
  function saveCounterValue(currentValue: number) {
    onResourceSave({
      resourceKey: definition.resourceKey,
      label: resource?.label ?? definition.label,
      currentValue,
      resetOn: resource?.resetOn ?? definition.resetOn,
    });
  }

  return (
    <div className="resource-counter-card full-row">
      <div className="resource-card-header">
        <strong>{definition.label}</strong>
      </div>
      <label>
        Valor
        <input
          disabled={!apiOnline}
          onChange={(event) =>
            saveCounterValue(Number(event.target.value || 0))
          }
          type="number"
          value={resource?.currentValue ?? 0}
        />
      </label>
    </div>
  );
}

function CombatPanel({
  apiOnline,
  onResourceSave,
  resources,
}: {
  apiOnline: boolean;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resources: CharacterResource[];
}) {
  const armorClass = findManagedResource(resources, "armor_class");
  const initiative = findManagedResource(resources, "initiative");
  const speed = findManagedResource(resources, "speed");

  function saveCombatValue(
    resourceKey: string,
    patch: Partial<CharacterResource>,
  ) {
    const definition = combatResources.find(
      (resource) => resource.resourceKey === resourceKey,
    );
    if (!definition) return;
    const current = findManagedResource(resources, resourceKey);
    onResourceSave({
      resourceKey,
      label: current?.label ?? definition.label,
      currentValue: patch.currentValue ?? current?.currentValue ?? 0,
      maxValue: patch.maxValue ?? current?.maxValue,
      resetOn: patch.resetOn ?? current?.resetOn ?? definition.resetOn,
    });
  }

  return (
    <div className="sheet-panel wide combat-panel">
      <div className="panel-title">
        <div>
          <p>Valores de combate</p>
          <h2>Combate</h2>
        </div>
        <Swords size={22} />
      </div>

      <div className="combat-grid compact">
        <CombatStatCard
          apiOnline={apiOnline}
          icon={<Shield size={19} />}
          label="CA"
          onSave={(value) =>
            saveCombatValue("armor_class", { currentValue: value })
          }
          value={armorClass?.currentValue ?? 0}
        />
        <CombatStatCard
          apiOnline={apiOnline}
          icon={<Swords size={19} />}
          label="Iniciativa"
          onSave={(value) =>
            saveCombatValue("initiative", { currentValue: value })
          }
          value={initiative?.currentValue ?? 0}
        />
        <CombatStatCard
          apiOnline={apiOnline}
          icon={<Swords size={19} />}
          label="Deslocamento"
          onSave={(value) => saveCombatValue("speed", { currentValue: value })}
          value={speed?.currentValue ?? 0}
        />
      </div>
    </div>
  );
}

function CombatStatCard({
  apiOnline,
  icon,
  label,
  onSave,
  value,
}: {
  apiOnline: boolean;
  icon: ReactNode;
  label: string;
  onSave: (value: number) => void;
  value: number;
}) {
  return (
    <div className="combat-card">
      <div className="combat-card-header">
        {icon}
        <strong>{label}</strong>
      </div>
      <input
        disabled={!apiOnline}
        onChange={(event) => onSave(Number(event.target.value || 0))}
        type="number"
        value={value}
      />
    </div>
  );
}

function SpellcastingPanel({
  apiOnline,
  fields,
  knownSpells,
  onCharacterFieldSave,
  resources,
}: {
  apiOnline: boolean;
  fields: CharacterField[];
  knownSpells: Entity[];
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
  resources: CharacterResource[];
}) {
  const spellcastingAbility =
    fields.find((field) => field.fieldKey === spellcastingAbilityFieldKey)
      ?.value ?? "";
  const spellcastingAbilityResourceKey =
    spellcastingAbilityResourceByLabel.get(spellcastingAbility) ?? "";
  const spellcastingScore = spellcastingAbilityResourceKey
    ? (findManagedResource(resources, spellcastingAbilityResourceKey)
        ?.currentValue ?? 10)
    : 10;
  const spellcastingModifier = getAbilityModifier(spellcastingScore);
  const proficiencyBonus =
    findManagedResource(resources, proficiencyBonusResource.resourceKey)
      ?.currentValue ?? 2;
  const spellSaveDc = 8 + proficiencyBonus + spellcastingModifier;
  const spellAttackModifier = proficiencyBonus + spellcastingModifier;
  const knownCantripsCount = knownSpells.filter(
    (spell) => Number(spell.level ?? 0) === 0,
  ).length;
  const knownLeveledSpellsCount = knownSpells.length - knownCantripsCount;

  return (
    <div className="sheet-panel wide spellcasting-panel">
      <div className="panel-title">
        <div>
          <p>Magia</p>
          <h2>Conjuracao</h2>
        </div>
        <Swords size={22} />
      </div>

      <div className="spellcasting-grid">
        <div className="spellcasting-field-card">
          <strong>Atributo para conjuracao</strong>
          <select
            disabled={!apiOnline}
            onChange={(event) =>
              onCharacterFieldSave({
                fieldKey: spellcastingAbilityFieldKey,
                value: event.target.value,
              })
            }
            value={spellcastingAbility}
          >
            <option value="">Selecionar</option>
            {spellcastingAbilityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <ReadonlyStatCard
          label="Modificador"
          value={formatModifier(spellcastingModifier)}
        />
        <ReadonlyStatCard label="CD da magia" value={spellSaveDc.toString()} />
        <ReadonlyStatCard
          label="Modificador de ataque de magia"
          value={formatModifier(spellAttackModifier)}
        />
        <ReadonlyStatCard
          label="Magias conhecidas"
          value={knownLeveledSpellsCount.toString()}
        />
        <ReadonlyStatCard
          label="Truques conhecidos"
          value={knownCantripsCount.toString()}
        />
      </div>
    </div>
  );
}

function ReadonlyStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="spellcasting-field-card readonly">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function SpellSlotPanel({
  apiOnline,
  onResourceSave,
  resources,
}: {
  apiOnline: boolean;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resources: CharacterResource[];
}) {
  function saveSlot(
    definition: ManagedResourceDefinition,
    patch: Partial<CharacterResource>,
  ) {
    const current = findManagedResource(resources, definition.resourceKey);
    onResourceSave({
      resourceKey: definition.resourceKey,
      label: current?.label ?? definition.label,
      currentValue: patch.currentValue ?? current?.currentValue ?? 0,
      maxValue: patch.maxValue ?? current?.maxValue ?? 0,
      resetOn: current?.resetOn ?? definition.resetOn,
    });
  }

  return (
    <div className="sheet-panel wide spell-slots-panel">
      <div className="panel-title">
        <div>
          <p>Recursos de conjuracao</p>
          <h2>Espacos de magia</h2>
        </div>
        <Swords size={22} />
      </div>

      <div className="spell-slots-heading">
        <span>Controle por nivel</span>
        <button
          className="secondary-button"
          disabled={!apiOnline}
          onClick={() =>
            spellSlotResources.forEach((definition) =>
              saveSlot(definition, { currentValue: 0 }),
            )
          }
          type="button"
        >
          Restaurar todos
        </button>
      </div>

      <div className="spell-slot-grid">
        {spellSlotResources.map((definition) => {
          const resource = findManagedResource(
            resources,
            definition.resourceKey,
          );
          const used = resource?.currentValue ?? 0;
          const total = resource?.maxValue ?? 0;
          const remaining = Math.max(total - used, 0);

          return (
            <div className="spell-slot-card" key={definition.resourceKey}>
              <div className="spell-slot-title">
                <strong>{definition.label}</strong>
                <span>
                  {remaining}/{total}
                </span>
              </div>
              <div className="spell-slot-values">
                <label>
                  T
                  <input
                    disabled={!apiOnline}
                    min="0"
                    onChange={(event) =>
                      saveSlot(definition, {
                        maxValue: Number(event.target.value || 0),
                      })
                    }
                    type="number"
                    value={total}
                  />
                </label>
                <label>
                  U
                  <input
                    disabled={!apiOnline}
                    min="0"
                    onChange={(event) =>
                      saveSlot(definition, {
                        currentValue: Number(event.target.value || 0),
                      })
                    }
                    type="number"
                    value={used}
                  />
                </label>
              </div>
              <div className="spell-slot-actions">
                <button
                  className="secondary-button"
                  disabled={!apiOnline || used >= total}
                  onClick={() =>
                    saveSlot(definition, {
                      currentValue: Math.min(used + 1, total),
                    })
                  }
                  type="button"
                >
                  +
                </button>
                <button
                  className="secondary-button"
                  disabled={!apiOnline || used <= 0}
                  onClick={() =>
                    saveSlot(definition, {
                      currentValue: Math.max(used - 1, 0),
                    })
                  }
                  type="button"
                >
                  -1
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProficienciesPanel({
  apiOnline,
  fields,
  onCharacterFieldSave,
}: {
  apiOnline: boolean;
  fields: CharacterField[];
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
}) {
  return (
    <div className="sheet-panel wide proficiencies-panel">
      <div className="panel-title">
        <div>
          <p>Treinamentos</p>
          <h2>Proficiencias</h2>
        </div>
        <Shield size={22} />
      </div>

      <div className="proficiency-groups">
        {proficiencyGroups.map((group) => {
          const value =
            fields.find((field) => field.fieldKey === group.fieldKey)?.value ??
            "";
          return (
            <label className="proficiency-group" key={group.fieldKey}>
              <span>
                {renderProficiencyIcon(group.icon)}
                <strong>{group.label}</strong>
              </span>
              <textarea
                disabled={!apiOnline}
                onChange={(event) =>
                  onCharacterFieldSave({
                    fieldKey: group.fieldKey,
                    value: event.target.value,
                  })
                }
                placeholder="Nenhuma"
                rows={2}
                value={value}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function renderProficiencyIcon(
  icon: (typeof proficiencyGroups)[number]["icon"],
) {
  if (icon === "armor") return <Shield size={18} />;
  if (icon === "tools") return <Hammer size={18} />;
  if (icon === "languages") return <Languages size={18} />;
  return <Swords size={18} />;
}

function CurrencyPanel({
  apiOnline,
  onResourceSave,
  resources,
}: {
  apiOnline: boolean;
  onResourceSave: (
    resource: Partial<CharacterResource> & {
      resourceKey: string;
      label: string;
    },
  ) => void;
  resources: CharacterResource[];
}) {
  function saveCurrency(
    definition: (typeof currencyResources)[number],
    currentValue: number,
  ) {
    const current = findManagedResource(resources, definition.resourceKey);
    onResourceSave({
      resourceKey: definition.resourceKey,
      label: current?.label ?? definition.label,
      currentValue,
      resetOn: current?.resetOn ?? definition.resetOn,
    });
  }

  return (
    <div className="sheet-panel wide currency-panel">
      <div className="panel-title">
        <div>
          <p>Inventario</p>
          <h2>Moedas</h2>
        </div>
        <Coins size={22} />
      </div>

      <div className="currency-grid full-row">
        {currencyResources.map((definition) => {
          const resource = findManagedResource(
            resources,
            definition.resourceKey,
          );
          return (
            <label
              className="currency-card full-row"
              key={definition.resourceKey}
            >
              <span>
                <Coins size={16} />
                {definition.label}
              </span>
              <input
                disabled={!apiOnline}
                min="0"
                onChange={(event) =>
                  saveCurrency(definition, Number(event.target.value || 0))
                }
                type="number"
                value={resource?.currentValue ?? 0}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function findManagedResource(
  resources: CharacterResource[],
  resourceKey: string,
) {
  return resources.find((resource) => resource.resourceKey === resourceKey);
}

function getCharacterClassValue(
  character: Character,
  entity: Entity | undefined,
  fields: CharacterField[],
) {
  const savedClass = fields.find((field) => field.fieldKey === "identity_class")
    ?.value;
  return savedClass || getIdentityFallbackValue(character, entity, "class");
}

function isSorcererClass(value?: string) {
  return normalizeSearchText(value).includes("feiticeiro");
}

function normalizeSearchText(value?: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getIdentityFallbackValue(
  character: Character,
  entity: Entity | undefined,
  source: string,
) {
  if (source === "name") return character.name;
  if (!entity) return "";

  const frontmatter = entity.frontmatter;
  if (source === "race")
    return firstStringField(frontmatter, ["raca", "raça", "race"]);
  if (source === "class")
    return firstStringField(frontmatter, ["classe", "class"]);
  if (source === "origin")
    return (
      firstStringField(frontmatter, ["origem", "source"]) || entity.source || ""
    );
  if (source === "level")
    return stringField(entity.level ?? frontmatter.nivel ?? frontmatter.level);
  if (source === "background")
    return firstStringField(frontmatter, ["antecedente", "background"]);
  if (source === "alignment")
    return firstStringField(frontmatter, ["alinhamento", "alignment"]);
  if (source === "age") return firstStringField(frontmatter, ["idade", "age"]);
  if (source === "height")
    return firstStringField(frontmatter, ["altura", "height"]);
  if (source === "weight")
    return firstStringField(frontmatter, ["peso", "weight"]);
  if (source === "eyes")
    return firstStringField(frontmatter, ["olhos", "eyes"]);
  if (source === "skin") return firstStringField(frontmatter, ["pele", "skin"]);
  return "";
}

function firstStringField(
  frontmatter: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = stringField(frontmatter[key]);
    if (value) return value;
  }
  return "";
}

function getSpellLevel(entity: Entity) {
  return Number(
    entity.level ?? entity.frontmatter.nivel ?? entity.frontmatter.level ?? 0,
  );
}

function matchesAbilityGroup(entity: Entity, group: string) {
  const normalizedGroup = group.toLowerCase();
  const values = [
    entity.source,
    entity.category,
    entity.kind,
    ...entity.tags,
    stringField(entity.frontmatter.origem),
    stringField(entity.frontmatter.fonte),
    stringField(entity.frontmatter.tipo),
    stringField(entity.frontmatter.arvore),
    stringField(entity.frontmatter["árvore"]),
    stringField(entity.frontmatter.categoria),
  ];

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedGroup),
  );
}

function matchesAbilityMode(entity: Entity, mode: "ativa" | "passiva") {
  const normalizedMode = mode.toLowerCase();
  const values = [
    entity.category,
    entity.source,
    ...entity.tags,
    stringField(entity.frontmatter.modo),
    stringField(entity.frontmatter.tipo_uso),
    stringField(entity.frontmatter.tipoUso),
    stringField(entity.frontmatter.tipo),
    stringField(entity.frontmatter.categoria),
    stringField(entity.frontmatter.ativa),
    stringField(entity.frontmatter.passiva),
  ];

  if (normalizedMode === "ativa" && entity.frontmatter.ativa === true)
    return true;
  if (normalizedMode === "passiva" && entity.frontmatter.passiva === true)
    return true;

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedMode),
  );
}

function createEmptyEntityState(entityId: string): CharacterEntityState {
  return {
    characterId: "",
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

function getAbilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function formatModifier(modifier: number) {
  return modifier >= 0 ? `+${modifier}` : modifier.toString();
}

function SheetHeader({
  character,
  sourceEntity,
  totals,
}: {
  character: Character;
  sourceEntity?: Entity;
  totals: { abilities: number; items: number; spells: number };
}) {
  return (
    <header className="sheet-header">
      <div>
        <p>Ficha ativa</p>
        <h1>{character.name}</h1>
        {sourceEntity && (
          <span>
            {sourceEntity.kind} vinculado: {sourceEntity.name}
          </span>
        )}
      </div>
      <div className="sheet-totals">
        <Fact label="Magias" value={totals.spells.toString()} />
        <Fact label="Habilidades" value={totals.abilities.toString()} />
        <Fact label="Itens" value={totals.items.toString()} />
      </div>
    </header>
  );
}

function CharacterSummary({ entity }: { entity: Entity }) {
  return (
    <section className="sheet-band">
      <h2>Resumo</h2>
      <div className="facts compact">
        <Fact label="Origem" value={entity.source} />
        <Fact label="Classe" value={stringField(entity.frontmatter.classe)} />
        <Fact label="Raca" value={stringField(entity.frontmatter.raca)} />
        <Fact label="Status" value={stringField(entity.frontmatter.status)} />
      </div>
    </section>
  );
}

function ResourcePanel({
  apiOnline,
  draftResource,
  onDraftChange,
  onResourceCreate,
  onResourceDelete,
  onResourceUpdate,
  resources,
}: {
  apiOnline: boolean;
  draftResource: { currentValue: string; label: string; maxValue: string };
  onDraftChange: (draft: {
    currentValue: string;
    label: string;
    maxValue: string;
  }) => void;
  onResourceCreate: (event: FormEvent) => void;
  onResourceDelete: (resource: CharacterResource) => void;
  onResourceUpdate: (
    resource: CharacterResource,
    patch: Partial<CharacterResource>,
  ) => void;
  resources: CharacterResource[];
}) {
  return (
    <div className="sheet-panel wide">
      <h2>Outros recursos</h2>
      <div className="resource-grid">
        {resources.map((resource) => (
          <div className="resource-card" key={resource.resourceKey}>
            <div className="resource-card-header">
              <strong>{resource.label}</strong>
              <button
                disabled={!apiOnline}
                onClick={() => onResourceDelete(resource)}
                title="Excluir recurso"
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div>
              <input
                disabled={!apiOnline}
                min="0"
                onChange={(event) =>
                  onResourceUpdate(resource, {
                    currentValue: Number(event.target.value || 0),
                  })
                }
                type="number"
                value={resource.currentValue}
              />
              <span>/</span>
              <input
                disabled={!apiOnline}
                min="0"
                onChange={(event) =>
                  onResourceUpdate(resource, {
                    maxValue: nullableNumber(event.target.value),
                  })
                }
                type="number"
                value={resource.maxValue ?? ""}
              />
            </div>
          </div>
        ))}
      </div>
      <form className="resource-form" onSubmit={onResourceCreate}>
        <input
          disabled={!apiOnline}
          onChange={(event) =>
            onDraftChange({ ...draftResource, label: event.target.value })
          }
          placeholder="Novo recurso"
          value={draftResource.label}
        />
        <input
          disabled={!apiOnline}
          min="0"
          onChange={(event) =>
            onDraftChange({
              ...draftResource,
              currentValue: event.target.value,
            })
          }
          placeholder="Atual"
          type="number"
          value={draftResource.currentValue}
        />
        <input
          disabled={!apiOnline}
          min="0"
          onChange={(event) =>
            onDraftChange({ ...draftResource, maxValue: event.target.value })
          }
          placeholder="Max"
          type="number"
          value={draftResource.maxValue}
        />
        <button
          className="command-button"
          disabled={!apiOnline || !draftResource.label.trim()}
          type="submit"
        >
          <Plus size={16} />
          Recurso
        </button>
      </form>
    </div>
  );
}

function SpellSheetList({
  actionLabel,
  apiOnline,
  characterStates,
  emptyText,
  entities,
  fields,
  items,
  onAction,
  onCharacterFieldSave,
  onEntitySelect,
  onStateChange,
}: {
  actionLabel: string;
  apiOnline: boolean;
  characterStates: CharacterEntityState[];
  emptyText: string;
  entities: Entity[];
  fields: CharacterField[];
  items: Array<{ entity: Entity; state: CharacterEntityState }>;
  onAction: () => void;
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
  onEntitySelect: (entity: Entity) => void;
  onStateChange: (entity: Entity, state: Partial<CharacterEntityState>) => void;
}) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("known");
  const [draftFilter, setDraftFilter] = useState({ label: "", query: "" });
  const allSpells = entities
    .filter((entity) => entity.kind === "magia")
    .sort(
      (left, right) =>
        getSpellLevel(left) - getSpellLevel(right) ||
        left.name.localeCompare(right.name),
    );
  const knownSpellIds = new Set(items.map(({ entity }) => entity.id));
  const stateByEntityId = new Map(
    characterStates.map((state) => [state.entityId, state]),
  );
  const customFilters = parseCustomFilters(
    fields.find((field) => field.fieldKey === spellCustomFiltersFieldKey)
      ?.value,
  );
  const hiddenFilterIds = parseHiddenFilterIds(
    fields.find((field) => field.fieldKey === spellHiddenFiltersFieldKey)
      ?.value,
  );
  const groupTabs = buildEntityFilterTabs(
    allSpells,
    collectSpellFilterValues,
    customFilters,
    hiddenFilterIds,
  );
  const statusTabs = [
    { key: "known", label: "Conhecidas" },
    { key: "prepared", label: "Preparadas" },
    { key: "favorite", label: "Favoritas" },
    { key: "all", label: "Todas" },
  ];

  const visibleItems = allSpells
    .filter((entity) => {
      const state = stateByEntityId.get(entity.id);
      const matchesGroup = matchesEntityFilterTab(entity, groupFilter, groupTabs);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "known" && knownSpellIds.has(entity.id)) ||
        (statusFilter === "prepared" && Boolean(state?.isPrepared)) ||
        (statusFilter === "favorite" && Boolean(state?.isFavorite));

      return matchesGroup && matchesStatus;
    })
    .map((entity) => ({
      entity,
      state:
        stateByEntityId.get(entity.id) ?? createEmptyEntityState(entity.id),
    }));

  function saveCustomFilters(nextFilters: SheetCustomFilter[]) {
    onCharacterFieldSave({
      fieldKey: spellCustomFiltersFieldKey,
      value: JSON.stringify(nextFilters),
    });
  }

  function createCustomFilter(event: FormEvent) {
    event.preventDefault();
    const label = draftFilter.label.trim();
    const query = draftFilter.query.trim() || label;
    if (!label || !query) return;
    saveCustomFilters([
      ...customFilters,
      { id: `custom-${slugify(label)}-${Date.now()}`, label, query },
    ]);
    setDraftFilter({ label: "", query: "" });
  }

  function saveHiddenFilters(nextHiddenFilterIds: Set<string>) {
    onCharacterFieldSave({
      fieldKey: spellHiddenFiltersFieldKey,
      value: Array.from(nextHiddenFilterIds).join(","),
    });
  }

  function deleteGroupFilter(filterId: string) {
    const isCustomFilter = customFilters.some((filter) => filter.id === filterId);
    if (isCustomFilter) {
      saveCustomFilters(customFilters.filter((filter) => filter.id !== filterId));
    } else {
      saveHiddenFilters(new Set([...hiddenFilterIds, filterId]));
    }
    if (groupFilter === filterId) setGroupFilter("all");
  }

  function restoreHiddenFilters() {
    saveHiddenFilters(new Set());
  }

  return (
    <div className="sheet-panel spell-sheet-panel">
      <div className="sheet-panel-heading">
        <h2>Magias</h2>
        <button className="secondary-button" onClick={onAction} type="button">
          <Plus size={15} />
          {actionLabel}
        </button>
      </div>

      <div className="spell-filter-tabs">
        <FilterTabs
          activeFilter={groupFilter}
          filters={groupTabs}
          onDelete={deleteGroupFilter}
          onSelect={setGroupFilter}
        />
      </div>

      <form className="filter-form" onSubmit={createCustomFilter}>
        <label className="filter-field">
          <span>Filtro</span>
          <input
            disabled={!apiOnline}
            onChange={(event) =>
              setDraftFilter({ ...draftFilter, label: event.target.value })
            }
            placeholder="Ex: Sombras"
            value={draftFilter.label}
          />
        </label>
        <label className="filter-field">
          <span>Busca</span>
          <input
            disabled={!apiOnline}
            onChange={(event) =>
              setDraftFilter({ ...draftFilter, query: event.target.value })
            }
            placeholder="tag, escola, classe..."
            value={draftFilter.query}
          />
        </label>
        <div className="filter-actions">
          <button
            className="secondary-button"
            disabled={!apiOnline || !draftFilter.label.trim()}
            type="submit"
          >
            <Plus size={15} />
            Criar
          </button>
          {hiddenFilterIds.size > 0 && (
            <button
              className="secondary-button"
              disabled={!apiOnline}
              onClick={restoreHiddenFilters}
              type="button"
            >
              Restaurar
            </button>
          )}
        </div>
      </form>

      <div className="spell-filter-tabs secondary">
        {statusTabs.map((tab) => (
          <button
            className={statusFilter === tab.key ? "active" : ""}
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="sheet-list scrollable">
          {visibleItems.map(({ entity, state }) => (
            <div className="sheet-row" key={entity.id}>
              <button onClick={() => onEntitySelect(entity)} type="button">
                <strong>{entity.name}</strong>
                <small>{buildSubtitle(entity)}</small>
              </button>
              <div className="sheet-actions">
                <Toggle
                  label="F"
                  checked={state.isFavorite}
                  disabled={false}
                  onChange={(value) =>
                    onStateChange(entity, { isFavorite: value })
                  }
                />
                <Toggle
                  label="C"
                  checked={state.isKnown}
                  disabled={false}
                  onChange={(value) =>
                    onStateChange(entity, { isKnown: value })
                  }
                />
                <Toggle
                  label="P"
                  checked={state.isPrepared}
                  disabled={false}
                  onChange={(value) =>
                    onStateChange(entity, { isPrepared: value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbilitySheetList({
  actionLabel,
  apiOnline,
  characterStates,
  emptyText,
  entities,
  fields,
  items,
  onAction,
  onCharacterFieldSave,
  onEntitySelect,
  onStateChange,
}: {
  actionLabel: string;
  apiOnline: boolean;
  characterStates: CharacterEntityState[];
  emptyText: string;
  entities: Entity[];
  fields: CharacterField[];
  items: Array<{ entity: Entity; state: CharacterEntityState }>;
  onAction: () => void;
  onCharacterFieldSave: (
    field: Pick<CharacterField, "fieldKey" | "value">,
  ) => void;
  onEntitySelect: (entity: Entity) => void;
  onStateChange: (entity: Entity, state: Partial<CharacterEntityState>) => void;
}) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("unlocked");
  const [draftFilter, setDraftFilter] = useState({ label: "", query: "" });
  const allAbilities = entities
    .filter(
      (entity) =>
        entity.kind === "habilidade" || entity.kind === "caracteristica",
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const stateByEntityId = new Map(
    characterStates.map((state) => [state.entityId, state]),
  );
  const customFilters = parseCustomFilters(
    fields.find((field) => field.fieldKey === abilityCustomFiltersFieldKey)
      ?.value,
  );
  const hiddenFilterIds = parseHiddenFilterIds(
    fields.find((field) => field.fieldKey === abilityHiddenFiltersFieldKey)
      ?.value,
  );
  const groupTabs = buildEntityFilterTabs(
    allAbilities,
    collectAbilityFilterValues,
    customFilters,
    hiddenFilterIds,
  );
  const legacyGroupTabs = [
    { key: "all", label: "All" },
    { key: "kindred", label: "Kindred" },
    { key: "shadow-magic", label: "Shadow Magic" },
    { key: "feiticeiro", label: "Feiticeiro" },
    { key: "caracteristica", label: "Característica" },
  ];
  const statusTabs = [
    { key: "all", label: "All" },
    { key: "passive", label: "Passivas" },
    { key: "active", label: "Ativas" },
    { key: "unlocked", label: "Desbloqueadas" },
    { key: "locked", label: "Bloqueadas" },
  ];

  const visibleItems = allAbilities
    .filter((entity) => {
      const state = stateByEntityId.get(entity.id);
      const matchesGroup = matchesEntityFilterTab(entity, groupFilter, groupTabs);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "passive" && matchesAbilityMode(entity, "passiva")) ||
        (statusFilter === "active" && matchesAbilityMode(entity, "ativa")) ||
        (statusFilter === "unlocked" && Boolean(state?.isUnlocked)) ||
        (statusFilter === "locked" && !state?.isUnlocked);

      return matchesGroup && matchesStatus;
    })
    .map((entity) => ({
      entity,
      state:
        stateByEntityId.get(entity.id) ?? createEmptyEntityState(entity.id),
    }));

  function saveCustomFilters(nextFilters: SheetCustomFilter[]) {
    onCharacterFieldSave({
      fieldKey: abilityCustomFiltersFieldKey,
      value: JSON.stringify(nextFilters),
    });
  }

  function createCustomFilter(event: FormEvent) {
    event.preventDefault();
    const label = draftFilter.label.trim();
    const query = draftFilter.query.trim() || label;
    if (!label || !query) return;
    saveCustomFilters([
      ...customFilters,
      { id: `custom-${slugify(label)}-${Date.now()}`, label, query },
    ]);
    setDraftFilter({ label: "", query: "" });
  }

  function saveHiddenFilters(nextHiddenFilterIds: Set<string>) {
    onCharacterFieldSave({
      fieldKey: abilityHiddenFiltersFieldKey,
      value: Array.from(nextHiddenFilterIds).join(","),
    });
  }

  function deleteGroupFilter(filterId: string) {
    const isCustomFilter = customFilters.some((filter) => filter.id === filterId);
    if (isCustomFilter) {
      saveCustomFilters(customFilters.filter((filter) => filter.id !== filterId));
    } else {
      saveHiddenFilters(new Set([...hiddenFilterIds, filterId]));
    }
    if (groupFilter === filterId) setGroupFilter("all");
  }

  function restoreHiddenFilters() {
    saveHiddenFilters(new Set());
  }

  return (
    <div className="sheet-panel ability-sheet-panel">
      <div className="sheet-panel-heading">
        <h2>Habilidades</h2>
        <button className="secondary-button" onClick={onAction} type="button">
          <Plus size={15} />
          {actionLabel}
        </button>
      </div>

      <div className="spell-filter-tabs">
        <FilterTabs
          activeFilter={groupFilter}
          filters={groupTabs}
          onDelete={deleteGroupFilter}
          onSelect={setGroupFilter}
        />
      </div>

      <form className="filter-form" onSubmit={createCustomFilter}>
        <label className="filter-field">
          <span>Filtro</span>
          <input
            disabled={!apiOnline}
            onChange={(event) =>
              setDraftFilter({ ...draftFilter, label: event.target.value })
            }
            placeholder="Ex: Metamagia"
            value={draftFilter.label}
          />
        </label>
        <label className="filter-field">
          <span>Busca</span>
          <input
            disabled={!apiOnline}
            onChange={(event) =>
              setDraftFilter({ ...draftFilter, query: event.target.value })
            }
            placeholder="tag, origem, arvore..."
            value={draftFilter.query}
          />
        </label>
        <div className="filter-actions">
          <button
            className="secondary-button"
            disabled={!apiOnline || !draftFilter.label.trim()}
            type="submit"
          >
            <Plus size={15} />
            Criar
          </button>
          {hiddenFilterIds.size > 0 && (
            <button
              className="secondary-button"
              disabled={!apiOnline}
              onClick={restoreHiddenFilters}
              type="button"
            >
              Restaurar
            </button>
          )}
        </div>
      </form>

      <div className="spell-filter-tabs secondary">
        {statusTabs.map((tab) => (
          <button
            className={statusFilter === tab.key ? "active" : ""}
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="sheet-list scrollable">
          {visibleItems.map(({ entity, state }) => (
            <div className="sheet-row" key={entity.id}>
              <button onClick={() => onEntitySelect(entity)} type="button">
                <strong>{entity.name}</strong>
                <small>{buildSubtitle(entity)}</small>
              </button>
              <div className="sheet-actions">
                <Toggle
                  label="F"
                  checked={state.isFavorite}
                  disabled={false}
                  onChange={(value) =>
                    onStateChange(entity, { isFavorite: value })
                  }
                />
                <Toggle
                  label="D"
                  checked={state.isUnlocked}
                  disabled={false}
                  onChange={(value) =>
                    onStateChange(entity, { isUnlocked: value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTabs({
  activeFilter,
  filters,
  onDelete,
  onSelect,
}: {
  activeFilter: string;
  filters: SheetFilterTab[];
  onDelete: (filterId: string) => void;
  onSelect: (filterId: string) => void;
}) {
  return (
    <>
      {filters.map((filter) => (
        <span
          className={[
            "filter-tab",
            filter.id !== "all" ? "removable" : "",
            filter.isCustom ? "custom" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={filter.id}
        >
          <button
            className={activeFilter === filter.id ? "active" : ""}
            onClick={() => onSelect(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
          {filter.id !== "all" && (
            <button
              className="filter-delete-button"
              onClick={() => onDelete(filter.id)}
              title={
                filter.isCustom
                  ? `Excluir filtro ${filter.label}`
                  : `Ocultar filtro ${filter.label}`
              }
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}
        </span>
      ))}
    </>
  );
}

function parseCustomFilters(value?: string): SheetCustomFilter[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((filter) => ({
        id: stringField(filter?.id) ?? "",
        label: stringField(filter?.label) ?? "",
        query: stringField(filter?.query) ?? "",
      }))
      .filter((filter) => filter.id && filter.label && filter.query);
  } catch {
    return [];
  }
}

function parseHiddenFilterIds(value?: string) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function buildEntityFilterTabs(
  entities: Entity[],
  collectValues: (entity: Entity) => string[],
  customFilters: SheetCustomFilter[],
  hiddenFilterIds: Set<string>,
): SheetFilterTab[] {
  const generated = new Map<string, string>();

  entities.forEach((entity) => {
    collectValues(entity).forEach((value) => {
      const label = value.trim();
      const normalized = normalizeSearchText(label);
      if (!label || generated.has(normalized)) return;
      generated.set(normalized, label);
    });
  });

  return [
    { id: "all", label: "Todos", query: "", isCustom: false },
    ...Array.from(generated.entries())
      .sort((left, right) => left[1].localeCompare(right[1], "pt-BR"))
      .filter(([id]) => !hiddenFilterIds.has(`auto-${id}`))
      .map(([id, label]) => ({
        id: `auto-${id}`,
        label,
        query: label,
        isCustom: false,
      })),
    ...customFilters
      .filter((filter) => !hiddenFilterIds.has(filter.id))
      .map((filter) => ({ ...filter, isCustom: true })),
  ];
}

function matchesEntityFilterTab(
  entity: Entity,
  filterId: string,
  filters: SheetFilterTab[],
) {
  if (filterId === "all") return true;
  const filter = filters.find((candidate) => candidate.id === filterId);
  if (!filter) return true;
  return getEntitySearchText(entity).includes(normalizeSearchText(filter.query));
}

function collectSpellFilterValues(entity: Entity) {
  const level = getSpellLevel(entity);
  return [
    level === 0 ? "Truque" : level > 0 ? `Nivel ${level}` : "",
  ].filter(Boolean);
}

function collectAbilityFilterValues(entity: Entity) {
  void entity;
  return [];
}

function frontmatterValues(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => stringField(item)).filter(Boolean) as string[];
  }
  return String(stringField(value) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEntitySearchText(entity: Entity) {
  const values = [
    entity.name,
    entity.originalName,
    entity.kind,
    entity.category,
    entity.action,
    entity.cost,
    entity.source,
    entity.damage,
    entity.range,
    ...entity.tags,
    ...Object.values(entity.frontmatter).flatMap(frontmatterValues),
  ];

  return normalizeSearchText(values.filter(Boolean).join(" "));
}

function SheetList({
  actionLabel,
  emptyText,
  items,
  onAction,
  onEntitySelect,
  onStateChange,
  title,
}: {
  actionLabel?: string;
  emptyText: string;
  items: Array<{ entity: Entity; state: CharacterEntityState }>;
  onAction?: () => void;
  onEntitySelect: (entity: Entity) => void;
  onStateChange: (entity: Entity, state: Partial<CharacterEntityState>) => void;
  title: string;
}) {
  return (
    <div className="sheet-panel">
      <div className="sheet-panel-heading">
        <h2>{title}</h2>
        {onAction && (
          <button className="secondary-button" onClick={onAction} type="button">
            <Plus size={15} />
            {actionLabel ?? "Adicionar"}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="sheet-list">
          {items.map(({ entity, state }) => (
            <div className="sheet-row" key={entity.id}>
              <button onClick={() => onEntitySelect(entity)} type="button">
                <strong>{entity.name}</strong>
                <small>{buildSubtitle(entity)}</small>
              </button>
              <div className="sheet-actions">
                <Toggle
                  label="F"
                  checked={state.isFavorite}
                  disabled={false}
                  onChange={(value) =>
                    onStateChange(entity, { isFavorite: value })
                  }
                />
                {entity.kind === "magia" && (
                  <Toggle
                    label="P"
                    checked={state.isPrepared}
                    disabled={false}
                    onChange={(value) =>
                      onStateChange(entity, { isPrepared: value })
                    }
                  />
                )}
                {entity.kind === "habilidade" && (
                  <Toggle
                    label="D"
                    checked={state.isUnlocked}
                    disabled={false}
                    onChange={(value) =>
                      onStateChange(entity, { isUnlocked: value })
                    }
                  />
                )}
                {entity.kind === "item" && (
                  <Toggle
                    label="E"
                    checked={state.isEquipped}
                    disabled={false}
                    onChange={(value) =>
                      onStateChange(entity, { isEquipped: value })
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
