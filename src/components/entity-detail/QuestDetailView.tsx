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

const questNpcRelationType = "quest_related_npc";
const questGroupRelationType = "quest_related_group";
const questSessionRelationType = "quest_related_session";

export function QuestDetailView({
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
    <article className="detail quest-detail">
      <section className="quest-identity">
        <EntityHeader entity={entity} />
        <StateControls {...actions} entity={entity} />
        <DetailActions actions={actions} entity={entity} />
      </section>

      <section className="facts">
        <Fact label="Status" value={stringField(entity.frontmatter.status)} />
        <Fact label="Prioridade" value={stringField(entity.frontmatter.prioridade)} />
        <Fact label="Localizacao" value={stringField(entity.frontmatter.localizacao)} />
        <Fact label="Origem" value={entity.source} />
      </section>

      <EntityTags entity={entity} />
      <QuestRelations
        disabled={!actions.apiOnline}
        entities={entities}
        onAdd={onRelationAdd}
        onDelete={onRelationDelete}
        quest={entity}
        relations={relations}
      />
      <EntityMarkdown entity={entity} />
      <SourcePath entity={entity} />
    </article>
  );
}

function QuestRelations({
  disabled,
  entities,
  onAdd,
  onDelete,
  quest,
  relations,
}: {
  disabled: boolean;
  entities: Entity[];
  onAdd: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onDelete: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  quest: Entity;
  relations: EntityRelation[];
}) {
  const questRelations = relations.filter((relation) => relation.sourceEntityId === quest.id);
  const npcRelations = questRelations.filter((relation) => relation.relationType === questNpcRelationType);
  const groupRelations = questRelations.filter((relation) => relation.relationType === questGroupRelationType);
  const sessionRelations = questRelations.filter((relation) => relation.relationType === questSessionRelationType);
  const npcs = useMemo(() => entities.filter((entity) => entity.kind === "npc").sort(sortByName), [entities]);
  const groups = useMemo(() => entities.filter((entity) => entity.kind === "grupo").sort(sortByName), [entities]);
  const sessions = useMemo(() => entities.filter((entity) => entity.kind === "sessao").sort(sortByName), [entities]);

  return (
    <section className="relation-manager">
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum NPC relacionado."
        items={npcs}
        label="NPCs"
        onAdd={(targetEntityId) => onAdd(quest.id, questNpcRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(quest.id, questNpcRelationType, targetEntityId)}
        relations={npcRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum grupo relacionado."
        items={groups}
        label="Grupos"
        onAdd={(targetEntityId) => onAdd(quest.id, questGroupRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(quest.id, questGroupRelationType, targetEntityId)}
        relations={groupRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma sessao relacionada."
        items={sessions}
        label="Sessoes"
        onAdd={(targetEntityId) => onAdd(quest.id, questSessionRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(quest.id, questSessionRelationType, targetEntityId)}
        relations={sessionRelations}
      />
    </section>
  );
}

function sortByName(a: Entity, b: Entity) {
  return a.name.localeCompare(b.name, "pt-BR");
}
