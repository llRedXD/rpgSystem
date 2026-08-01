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

const localNpcRelationType = "local_related_npc";
const localGroupRelationType = "local_related_group";
const localQuestRelationType = "local_related_quest";
const localSessionRelationType = "local_related_session";
const localLocalRelationType = "local_related_local";

export function LocalDetailView({
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
    <article className="detail local-detail">
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
          label="Regiao"
          value={stringField(entity.frontmatter.localizacao)}
        />
        <Fact label="Status" value={stringField(entity.frontmatter.status)} />
        <Fact
          label="Governante"
          value={stringField(entity.frontmatter.governante)}
        />
        <Fact
          label="Faccao principal"
          value={stringField(entity.frontmatter.faccao_principal)}
        />
        <Fact
          label="Populacao"
          value={stringField(entity.frontmatter.populacao)}
        />
        <Fact
          label="Local pai"
          value={stringField(entity.frontmatter.local_pai)}
        />
        <Fact
          label="Importancia"
          value={stringField(entity.frontmatter.importancia)}
        />
        <Fact label="Aliados" value={stringField(entity.frontmatter.aliados)} />
        <Fact label="Inimigos" value={stringField(entity.frontmatter.inimigos)} />
        <Fact
          label="NPCs importantes"
          value={stringField(entity.frontmatter.npcs_importantes)}
        />
        <Fact label="Origem" value={entity.source} />
      </section>

      <EntityTags entity={entity} />
      <LocalRelations
        disabled={!actions.apiOnline}
        entities={entities}
        local={entity}
        onAdd={onRelationAdd}
        onDelete={onRelationDelete}
        relations={relations}
      />
      <EntityMarkdown entity={entity} />
      <SourcePath entity={entity} />
    </article>
  );
}

function LocalRelations({
  disabled,
  entities,
  local,
  onAdd,
  onDelete,
  relations,
}: {
  disabled: boolean;
  entities: Entity[];
  local: Entity;
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
  const localRelations = relations.filter(
    (relation) => relation.sourceEntityId === local.id,
  );
  const npcRelations = localRelations.filter(
    (relation) => relation.relationType === localNpcRelationType,
  );
  const groupRelations = localRelations.filter(
    (relation) => relation.relationType === localGroupRelationType,
  );
  const questRelations = localRelations.filter(
    (relation) => relation.relationType === localQuestRelationType,
  );
  const sessionRelations = localRelations.filter(
    (relation) => relation.relationType === localSessionRelationType,
  );
  const relatedLocalRelations = localRelations.filter(
    (relation) => relation.relationType === localLocalRelationType,
  );

  const npcs = useMemo(
    () => entities.filter((entity) => entity.kind === "npc").sort(sortByName),
    [entities],
  );
  const groups = useMemo(
    () => entities.filter((entity) => entity.kind === "grupo").sort(sortByName),
    [entities],
  );
  const quests = useMemo(
    () => entities.filter((entity) => entity.kind === "quest").sort(sortByName),
    [entities],
  );
  const sessions = useMemo(
    () =>
      entities.filter((entity) => entity.kind === "sessao").sort(sortByName),
    [entities],
  );
  const locals = useMemo(
    () =>
      entities
        .filter((entity) => entity.kind === "local" && entity.id !== local.id)
        .sort(sortByName),
    [entities, local.id],
  );

  return (
    <section className="relation-manager">
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum NPC relacionado."
        items={npcs}
        label="NPCs"
        onAdd={(targetEntityId) =>
          onAdd(local.id, localNpcRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(local.id, localNpcRelationType, targetEntityId)
        }
        relations={npcRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhum grupo relacionado."
        items={groups}
        label="Grupos"
        onAdd={(targetEntityId) =>
          onAdd(local.id, localGroupRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(local.id, localGroupRelationType, targetEntityId)
        }
        relations={groupRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma quest relacionada."
        items={quests}
        label="Quests"
        onAdd={(targetEntityId) =>
          onAdd(local.id, localQuestRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(local.id, localQuestRelationType, targetEntityId)
        }
        relations={questRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma sessao relacionada."
        items={sessions}
        label="Sessoes"
        onAdd={(targetEntityId) =>
          onAdd(local.id, localSessionRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(local.id, localSessionRelationType, targetEntityId)
        }
        relations={sessionRelations}
      />
      {/*<RelationPanel
        disabled={disabled}
        emptyText="Nenhum local relacionado."
        items={locals}
        label="Locais"
        onAdd={(targetEntityId) =>
          onAdd(local.id, localLocalRelationType, targetEntityId)
        }
        onDelete={(targetEntityId) =>
          onDelete(local.id, localLocalRelationType, targetEntityId)
        }
        relations={relatedLocalRelations}
      />*/}
    </section>
  );
}

function sortByName(a: Entity, b: Entity) {
  return a.name.localeCompare(b.name, "pt-BR");
}
