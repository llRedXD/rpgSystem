import type { Character, CharacterEntityState, Entity, EntityRelation } from "../types";
import { DefaultEntityDetailView } from "./entity-detail/DefaultEntityDetailView";
import { GroupDetailView } from "./entity-detail/GroupDetailView";
import { ItemDetailView } from "./entity-detail/ItemDetailView";
import { LocalDetailView } from "./entity-detail/LocalDetailView";
import { NpcDetailView } from "./entity-detail/NpcDetailView";
import { QuestDetailView } from "./entity-detail/QuestDetailView";
import { SessionDetailView } from "./entity-detail/SessionDetailView";

export function EntityDetail({
  apiOnline,
  character,
  entities,
  entity,
  onDelete,
  onEdit,
  onRelationAdd,
  onRelationDelete,
  onStateChange,
  relations,
  state,
}: {
  apiOnline: boolean;
  character?: Character;
  entities: Entity[];
  entity: Entity | null;
  onDelete: (entity: Entity) => void;
  onEdit: (entity: Entity) => void;
  onRelationAdd: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onRelationDelete: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onStateChange: (state: Partial<CharacterEntityState>) => void;
  relations: EntityRelation[];
  state?: CharacterEntityState;
}) {
  if (!entity) {
    return <article className="detail empty">Selecione um registro.</article>;
  }

  const actions = { apiOnline, character, onDelete, onEdit, onStateChange, state };

  if (entity.kind === "npc") {
    return (
      <NpcDetailView
        actions={actions}
        entities={entities}
        entity={entity}
        onRelationAdd={onRelationAdd}
        onRelationDelete={onRelationDelete}
        relations={relations}
      />
    );
  }
  if (entity.kind === "item") return <ItemDetailView actions={actions} entity={entity} />;
  if (entity.kind === "grupo") {
    return (
      <GroupDetailView
        actions={actions}
        entities={entities}
        entity={entity}
        onRelationAdd={onRelationAdd}
        onRelationDelete={onRelationDelete}
        relations={relations}
      />
    );
  }
  if (entity.kind === "local") {
    return (
      <LocalDetailView
        actions={actions}
        entities={entities}
        entity={entity}
        onRelationAdd={onRelationAdd}
        onRelationDelete={onRelationDelete}
        relations={relations}
      />
    );
  }
  if (entity.kind === "quest") {
    return (
      <QuestDetailView
        actions={actions}
        entities={entities}
        entity={entity}
        onRelationAdd={onRelationAdd}
        onRelationDelete={onRelationDelete}
        relations={relations}
      />
    );
  }
  if (entity.kind === "sessao") {
    return (
      <SessionDetailView
        actions={actions}
        entities={entities}
        entity={entity}
        onRelationAdd={onRelationAdd}
        onRelationDelete={onRelationDelete}
        relations={relations}
      />
    );
  }

  return <DefaultEntityDetailView actions={actions} entity={entity} />;
}
