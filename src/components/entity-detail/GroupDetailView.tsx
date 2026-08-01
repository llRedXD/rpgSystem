import { useMemo } from "react";
import type { Entity, EntityRelation } from "../../types";
import { stringField } from "../../lib/entity-utils";
import { Fact } from "../common";
import { RelationPanel } from "./RelationPanel";
import {
  DetailActions,
  EntityHeader,
  EntityImage,
  EntityMarkdown,
  EntityTags,
  SourcePath,
  StateControls,
  type EntityDetailActions,
} from "./DetailShared";

const groupNpcRelationType = "group_member_npc";
const groupGroupRelationType = "group_related_group";
const groupQuestRelationType = "group_related_quest";
const groupSessionRelationType = "group_related_session";

export function GroupDetailView({
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
  onRelationAdd: (
    sourceEntityId: string,
    relationType: string,
    targetEntityId: string,
  ) => void;
  onRelationDelete: (
    sourceEntityId: string,
    relationType: string,
    targetEntityId: string,
  ) => void;
  relations: EntityRelation[];
}) {
  return (
    <article className="detail group-detail">
      <section className="group-identity">
        <EntityImage entity={entity} />
        <EntityHeader entity={entity} />
        <StateControls {...actions} entity={entity} />
        <DetailActions actions={actions} entity={entity} />
      </section>

      <section className="facts">
        <Fact
          label="Categoria"
          value={entity.category ?? stringField(entity.frontmatter.categoria)}
        />
        <Fact
          label="Localizacao"
          value={stringField(entity.frontmatter.localizacao)}
        />
        <Fact label="Status" value={stringField(entity.frontmatter.status)} />
        <Fact label="Origem" value={entity.source} />
      </section>

      <EntityTags entity={entity} />
      <GroupRelations
        disabled={!actions.apiOnline}
        entities={entities}
        group={entity}
        onAdd={onRelationAdd}
        onDelete={onRelationDelete}
        relations={relations}
      />

      <EntityMarkdown entity={entity} />
      <SourcePath entity={entity} />
    </article>
  );
}

function GroupRelations({
  disabled,
  entities,
  group,
  onAdd,
  onDelete,
  relations,
}: {
  disabled: boolean;
  entities: Entity[];
  group: Entity;
  onAdd: (
    sourceEntityId: string,
    relationType: string,
    targetEntityId: string,
  ) => void;
  onDelete: (
    sourceEntityId: string,
    relationType: string,
    targetEntityId: string,
  ) => void;
  relations: EntityRelation[];
}) {
  const groupRelations = relations.filter(
    (relation) => relation.sourceEntityId === group.id,
  );
  const npcRelations = groupRelations.filter(
    (relation) => relation.relationType === groupNpcRelationType,
  );
  const relatedGroupRelations = groupRelations.filter(
    (relation) => relation.relationType === groupGroupRelationType,
  );
  const questRelations = groupRelations.filter(
    (relation) => relation.relationType === groupQuestRelationType,
  );
  const sessionRelations = groupRelations.filter(
    (relation) => relation.relationType === groupSessionRelationType,
  );

  const npcs = useMemo(
    () =>
      entities
        .filter((entity) => entity.kind === "npc")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [entities],
  );
  const groups = useMemo(
    () =>
      entities
        .filter((entity) => entity.kind === "grupo" && entity.id !== group.id)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [entities, group.id],
  );
  const quests = useMemo(
    () =>
      entities
        .filter((entity) => entity.kind === "quest")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [entities],
  );
  const sessions = useMemo(
    () =>
      entities
        .filter((entity) => entity.kind === "sessao")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [entities],
  );

  return (
    <section className="relation-manager">
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum NPC relacionado."
        items={npcs}
        label="NPCs"
        onAdd={(targetEntityId) =>
          onAdd(group.id, groupNpcRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(group.id, groupNpcRelationType, targetEntityId)
        }
        relations={npcRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum grupo relacionado."
        items={groups}
        label="Grupos"
        onAdd={(targetEntityId) =>
          onAdd(group.id, groupGroupRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(group.id, groupGroupRelationType, targetEntityId)
        }
        relations={relatedGroupRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma quest relacionada."
        items={quests}
        label="Quests"
        onAdd={(targetEntityId) =>
          onAdd(group.id, groupQuestRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(group.id, groupQuestRelationType, targetEntityId)
        }
        relations={questRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma sessao relacionada."
        items={sessions}
        label="Sessoes"
        onAdd={(targetEntityId) =>
          onAdd(group.id, groupSessionRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(group.id, groupSessionRelationType, targetEntityId)
        }
        relations={sessionRelations}
      />
    </section>
  );
}
