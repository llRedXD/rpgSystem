import { useMemo } from "react";
import type { Entity, EntityRelation } from "../../types";
import { stringField } from "../../lib/entity-utils";
import { Fact } from "../common";
import { RelationPanel } from "./RelationPanel";
import {
  DetailActions,
  EntityHeader,
  EntityMarkdown,
  EntityTags,
  SourcePath,
  StateControls,
  type EntityDetailActions,
} from "./DetailShared";

const sessionNpcRelationType = "session_related_npc";
const sessionGroupRelationType = "session_related_group";
const sessionQuestRelationType = "session_related_quest";

export function SessionDetailView({
  actions,
  entities,
  entity,
  onRelationAdd,
  onRelationDelete,
  relations,
}: {
  actions: EntityDetailActions;
  entities: Entity[];
  entity: Entity;
  onRelationAdd: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onRelationDelete: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  relations: EntityRelation[];
}) {
  return (
    <article className="detail session-detail">
      <section className="session-identity">
        <EntityHeader entity={entity} />
        <StateControls {...actions} entity={entity} />
        <DetailActions actions={actions} entity={entity} />
      </section>

      <section className="facts">
        <Fact label="Data" value={stringField(entity.frontmatter.data)} />
        <Fact label="Status" value={stringField(entity.frontmatter.status)} />
        <Fact label="Localizacao" value={stringField(entity.frontmatter.localizacao)} />
        <Fact label="Origem" value={entity.source} />
      </section>

      <EntityTags entity={entity} />
      <SessionRelations
        disabled={!actions.apiOnline}
        entities={entities}
        onAdd={onRelationAdd}
        onDelete={onRelationDelete}
        relations={relations}
        session={entity}
      />
      <EntityMarkdown entity={entity} />
      <SourcePath entity={entity} />
    </article>
  );
}

function SessionRelations({
  disabled,
  entities,
  onAdd,
  onDelete,
  relations,
  session,
}: {
  disabled: boolean;
  entities: Entity[];
  onAdd: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onDelete: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  relations: EntityRelation[];
  session: Entity;
}) {
  const sessionRelations = relations.filter((relation) => relation.sourceEntityId === session.id);
  const npcRelations = sessionRelations.filter((relation) => relation.relationType === sessionNpcRelationType);
  const groupRelations = sessionRelations.filter((relation) => relation.relationType === sessionGroupRelationType);
  const questRelations = sessionRelations.filter((relation) => relation.relationType === sessionQuestRelationType);
  const npcs = useMemo(() => entities.filter((entity) => entity.kind === "npc").sort(sortByName), [entities]);
  const groups = useMemo(() => entities.filter((entity) => entity.kind === "grupo").sort(sortByName), [entities]);
  const quests = useMemo(() => entities.filter((entity) => entity.kind === "quest").sort(sortByName), [entities]);

  return (
    <section className="relation-manager">
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum NPC relacionado."
        items={npcs}
        label="NPCs"
        onAdd={(targetEntityId) => onAdd(session.id, sessionNpcRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(session.id, sessionNpcRelationType, targetEntityId)}
        relations={npcRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum grupo relacionado."
        items={groups}
        label="Grupos"
        onAdd={(targetEntityId) => onAdd(session.id, sessionGroupRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(session.id, sessionGroupRelationType, targetEntityId)}
        relations={groupRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma quest relacionada."
        items={quests}
        label="Quests"
        onAdd={(targetEntityId) => onAdd(session.id, sessionQuestRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(session.id, sessionQuestRelationType, targetEntityId)}
        relations={questRelations}
      />
    </section>
  );
}

function sortByName(a: Entity, b: Entity) {
  return a.name.localeCompare(b.name, "pt-BR");
}
