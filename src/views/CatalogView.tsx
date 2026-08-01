import { Plus, Search } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { EntityDetail } from "../components/EntityDetail";
import { EntityEditor } from "../components/EntityEditor";
import { EntityList } from "../components/EntityList";
import type { EntityForm } from "../app/config";
import type { Character, CharacterEntityState, Entity, EntityRelation, TagSummary } from "../types";

export function CatalogView({
  activeCharacter,
  allEntities,
  apiOnline,
  availableTags,
  entities,
  form,
  groupOptions,
  isEditing,
  npcOptions,
  onCancelEdit,
  onCreateStart,
  onDelete,
  onEdit,
  onEntitySelect,
  onFormChange,
  onQueryChange,
  onRelationAdd,
  onRelationDelete,
  onSave,
  onStateChange,
  onStatus,
  query,
  relations,
  selected,
  selectedState,
  sessionOptions,
  states,
}: {
  activeCharacter?: Character;
  allEntities: Entity[];
  apiOnline: boolean;
  availableTags: TagSummary[];
  entities: Entity[];
  form: EntityForm;
  groupOptions: Entity[];
  isEditing: boolean;
  npcOptions: Entity[];
  onCancelEdit: () => void;
  onCreateStart: () => void;
  onDelete: (entity: Entity) => void;
  onEdit: (entity: Entity) => void;
  onEntitySelect: (id: string) => void;
  onFormChange: (form: EntityForm) => void;
  onQueryChange: (value: string) => void;
  onRelationAdd: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onRelationDelete: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onSave: (event: FormEvent) => void;
  onStateChange: (state: Partial<CharacterEntityState>) => void;
  onStatus: (message: string) => void;
  query: string;
  relations: EntityRelation[];
  selected: Entity | null;
  selectedState?: CharacterEntityState;
  sessionOptions: Entity[];
  states: CharacterEntityState[];
}) {
  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input aria-label="Buscar" onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)} placeholder="Buscar por nome, tag, custo..." value={query} />
        </div>
        <button className="command-button" disabled={!apiOnline} onClick={onCreateStart} type="button">
          <Plus size={17} />
          Novo
        </button>
        <div className="stats">
          <strong>{entities.length}</strong>
          <span>resultado(s)</span>
        </div>
      </div>

      <div className="workspace">
        <EntityList activeCharacterId={activeCharacter?.id} activeId={selected?.id ?? null} entities={entities} states={states} onSelect={onEntitySelect} />
        {isEditing ? (
          <EntityEditor
            availableTags={availableTags}
            apiOnline={apiOnline}
            groupOptions={groupOptions}
            npcOptions={npcOptions}
            sessionOptions={sessionOptions}
            form={form}
            onCancel={onCancelEdit}
            onChange={onFormChange}
            onStatus={onStatus}
            onSubmit={onSave}
          />
        ) : (
          <EntityDetail
            apiOnline={apiOnline}
            character={activeCharacter}
            entities={allEntities}
            entity={selected}
            onDelete={onDelete}
            onEdit={onEdit}
            onRelationAdd={onRelationAdd}
            onRelationDelete={onRelationDelete}
            onStateChange={onStateChange}
            relations={relations}
            state={selectedState}
          />
        )}
      </div>
    </>
  );
}
