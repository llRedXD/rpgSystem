import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "./lib/api";
import { defaultState, findState, matchesEntityQuery, sortByName } from "./lib/entity-utils";
import { buildEntityPayload, entityToForm } from "./lib/entity-form";
import { emptyForm, type EntityForm, type ViewKind } from "./app/config";
import type { Character, CharacterEntityState, CharacterField, CharacterResource, Entity, VaultData } from "./types";
import { AppSidebar } from "./views/AppSidebar";
import { CatalogView } from "./views/CatalogView";
import { SheetView } from "./views/SheetView";

const emptyData: VaultData = {
  importedAt: "",
  entities: [],
  warnings: [],
  characters: [],
  states: [],
  resources: [],
  fields: [],
  relations: [],
  tags: [],
};

export function App() {
  const [data, setData] = useState<VaultData>(emptyData);
  const [apiOnline, setApiOnline] = useState(false);
  const [activeView, setActiveView] = useState<ViewKind>("sheet");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeCampaignName, setActiveCampaignName] = useState("Terra");
  const [newCharacterName, setNewCharacterName] = useState("");
  const [form, setForm] = useState<EntityForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");

  async function refresh() {
    try {
      const next = await apiGet<VaultData>("/bootstrap");
      setData(next);
      setApiOnline(true);
      const nextCharacters = next.characters ?? [];
      const nextActive = nextCharacters.find((character) => character.isActive) ?? nextCharacters[0];
      setActiveCampaignName((current) => current || nextActive?.campaignName || "Terra");
      setActiveCharacterId((current) => current || nextActive?.id || "");
    } catch {
      setApiOnline(false);
      setData(emptyData);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (apiOnline) return;
    const interval = window.setInterval(() => {
      void refresh();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [apiOnline]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const characters = data.characters ?? [];
  const states = data.states ?? [];
  const resources = data.resources ?? [];
  const fields = data.fields ?? [];
  const relations = data.relations ?? [];
  const campaignNames = Array.from(
    new Set([
      "Terra",
      ...characters.map((character) => character.campaignName || "Terra"),
      ...data.entities.map((entity) => entity.campaignName || "Terra"),
    ]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const visibleCharacters = characters.filter((character) => (character.campaignName || "Terra") === activeCampaignName);
  const campaignEntities = data.entities.filter((entity) => (entity.campaignName || "Terra") === activeCampaignName);
  const campaignEntityIds = new Set(campaignEntities.map((entity) => entity.id));
  const campaignRelations = relations.filter((relation) => campaignEntityIds.has(relation.sourceEntityId) && campaignEntityIds.has(relation.targetEntityId));
  const campaignStates = states.filter((state) => campaignEntityIds.has(state.entityId));
  const campaignTags = Array.from(
    campaignEntities
      .flatMap((entity) => entity.tags)
      .reduce((tagMap, tag) => tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1), new Map<string, number>()),
  )
    .map(([name, entityCount], index) => ({ id: index + 1, name, entityCount }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  const groupEntities = campaignEntities.filter((entity) => entity.kind === "grupo").sort(sortByName);
  const npcEntities = campaignEntities.filter((entity) => entity.kind === "npc").sort(sortByName);
  const sessionEntities = campaignEntities.filter((entity) => entity.kind === "sessao").sort(sortByName);
  const activeCharacter = visibleCharacters.find((character) => character.id === activeCharacterId) ?? visibleCharacters[0];

  useEffect(() => {
    if (!characters.length) return;
    if (activeCharacter && (activeCharacter.campaignName || "Terra") === activeCampaignName) return;
    setActiveCharacterId(visibleCharacters[0]?.id ?? "");
  }, [activeCampaignName, activeCharacter, characters.length, visibleCharacters]);

  const entities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return campaignEntities
      .filter((entity) => activeView !== "sheet" && entity.kind === activeView)
      .filter((entity) => matchesEntityQuery(entity, normalizedQuery))
      .sort(sortByName);
  }, [activeView, campaignEntities, query]);

  const selected = useMemo(() => {
    if (selectedId) {
      const found = campaignEntities.find((entity) => entity.id === selectedId);
      if (found && found.kind === activeView) return found;
    }

    return entities[0] ?? null;
  }, [activeView, campaignEntities, entities, selectedId]);

  const selectedState = selected && activeCharacter ? findState(campaignStates, activeCharacter.id, selected.id) : undefined;

  function changeTab(kind: ViewKind) {
    setActiveView(kind);
    setSelectedId(null);
    setIsEditing(false);
    if (kind !== "sheet") setForm({ ...emptyForm, kind });
  }

  async function createCharacter(event: FormEvent) {
    event.preventDefault();
    if (!newCharacterName.trim()) return;
    await apiPost("/characters", { name: newCharacterName.trim(), campaignName: activeCampaignName, isActive: characters.length === 0 });
    setNewCharacterName("");
    await refresh();
  }

  async function deleteCharacter(character: Character) {
    if (!window.confirm(`Excluir personagem "${character.name}"?`)) return;
    await apiDelete(`/characters/${encodeURIComponent(character.id)}`);
    setActiveCharacterId("");
    setStatus("Personagem removido.");
    await refresh();
  }

  async function linkCharacterNpc(sourceEntityId: string) {
    if (!activeCharacter) return;
    await apiPatch(`/characters/${encodeURIComponent(activeCharacter.id)}`, {
      sourceEntityId: sourceEntityId || null,
    });
    setStatus(sourceEntityId ? "NPC vinculado a ficha." : "Vinculo de NPC removido.");
    await refresh();
  }

  async function saveState(next: Partial<CharacterEntityState>) {
    if (!selected || !activeCharacter) return;
    await saveStateForEntity(selected, next);
  }

  async function saveStateForEntity(entity: Entity, next: Partial<CharacterEntityState>) {
    if (!activeCharacter) return;
    const current = findState(states, activeCharacter.id, entity.id) ?? defaultState(activeCharacter.id, entity.id);
    await apiPost("/state", { ...current, ...next, characterId: activeCharacter.id, entityId: entity.id });
    await refresh();
  }

  async function saveResource(resource: Partial<CharacterResource> & { resourceKey: string; label: string }) {
    if (!activeCharacter) return;
    await apiPost("/resources", {
      characterId: activeCharacter.id,
      currentValue: resource.currentValue ?? 0,
      maxValue: resource.maxValue,
      resetOn: resource.resetOn ?? "manual",
      resourceKey: resource.resourceKey,
      label: resource.label,
    });
    await refresh();
  }

  async function saveCharacterField(field: Pick<CharacterField, "fieldKey" | "value">) {
    if (!activeCharacter) return;
    await apiPost("/character-fields", {
      characterId: activeCharacter.id,
      fieldKey: field.fieldKey,
      value: field.value,
    });
    await refresh();
  }

  async function deleteResource(resource: CharacterResource) {
    if (!activeCharacter) return;
    await apiDelete(`/resources/${encodeURIComponent(activeCharacter.id)}/${encodeURIComponent(resource.resourceKey)}`);
    setStatus("Recurso removido.");
    await refresh();
  }

  async function saveEntity(event: FormEvent) {
    event.preventDefault();
    const payload = { ...buildEntityPayload(form), campaignName: activeCampaignName };

    if (isEditing && form.id) {
      await apiPatch(`/entities/${encodeURIComponent(form.id)}`, payload);
      setStatus("Registro atualizado.");
    } else {
      const created = await apiPost<{ id: string }>("/entities", payload);
      setSelectedId(created.id);
      setStatus("Registro criado.");
    }

    setIsEditing(false);
    setForm({ ...emptyForm, campaignName: activeCampaignName, kind: activeView === "sheet" ? "magia" : activeView });
    await refresh();
  }

  async function deleteEntity(entity: Entity) {
    if (!window.confirm(`Excluir "${entity.name}" do app?`)) return;
    await apiDelete(`/entities/${encodeURIComponent(entity.id)}`);
    setSelectedId(null);
    setStatus("Registro removido.");
    await refresh();
  }

  async function addRelation(sourceEntityId: string, relationType: string, targetEntityId: string) {
    await apiPost("/relations", { sourceEntityId, relationType, targetEntityId });
    setStatus("Relacao adicionada.");
    await refresh();
  }

  async function deleteRelation(sourceEntityId: string, relationType: string, targetEntityId: string) {
    await apiDelete(`/relations/${encodeURIComponent(sourceEntityId)}/${encodeURIComponent(relationType)}/${encodeURIComponent(targetEntityId)}`);
    setStatus("Relacao removida.");
    await refresh();
  }

  function startCreate() {
    setIsEditing(true);
    setForm({ ...emptyForm, campaignName: activeCampaignName, kind: activeView === "sheet" ? "magia" : activeView });
  }

  function startEdit(entity: Entity) {
    setIsEditing(true);
    setForm(entityToForm(entity, groupEntities));
  }

  return (
    <main className="app-shell">
      <AppSidebar
        activeCharacter={activeCharacter}
        activeCharacterId={activeCharacterId}
        activeView={activeView}
        apiOnline={apiOnline}
        campaignNames={campaignNames}
        characters={characters}
        entities={campaignEntities}
        newCharacterName={newCharacterName}
        onCampaignCreate={(name) => setActiveCampaignName(name)}
        onCampaignSelect={setActiveCampaignName}
        onCharacterCreate={createCharacter}
        onCharacterDelete={deleteCharacter}
        onCharacterNpcLink={linkCharacterNpc}
        onCharacterNameChange={setNewCharacterName}
        onCharacterSelect={setActiveCharacterId}
        onViewChange={changeTab}
        npcEntities={npcEntities}
        selectedCampaignName={activeCampaignName}
        visibleCharacters={visibleCharacters}
      />

      <section className="content">
        {status && <div className="status-line">{status}</div>}

        {activeView === "sheet" ? (
          <SheetView
            apiOnline={apiOnline}
            activeCharacter={activeCharacter}
            entities={campaignEntities}
            fields={fields}
            onCharacterFieldSave={saveCharacterField}
            onEntitySelect={(entity) => {
              setActiveView(entity.kind);
              setSelectedId(entity.id);
            }}
            onResourceDelete={deleteResource}
            onResourceSave={saveResource}
            onStateChange={saveStateForEntity}
            resources={resources}
            states={campaignStates}
          />
        ) : (
          <CatalogView
            activeCharacter={activeCharacter}
            allEntities={campaignEntities}
            apiOnline={apiOnline}
            availableTags={campaignTags}
            entities={entities}
            form={form}
            groupOptions={groupEntities}
            isEditing={isEditing}
            npcOptions={npcEntities}
            onCancelEdit={() => setIsEditing(false)}
            onCreateStart={startCreate}
            onDelete={deleteEntity}
            onEdit={startEdit}
            onEntitySelect={setSelectedId}
            onFormChange={setForm}
            onQueryChange={setQuery}
            onRelationAdd={addRelation}
            onRelationDelete={deleteRelation}
            onSave={saveEntity}
            onStateChange={saveState}
            onStatus={setStatus}
            query={query}
            relations={campaignRelations}
            selected={selected}
            selectedState={selectedState}
            sessionOptions={sessionEntities}
            states={campaignStates}
          />
        )}
      </section>
    </main>
  );
}
