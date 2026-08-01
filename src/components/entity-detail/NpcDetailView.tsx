import { useMemo } from "react";
import type { Entity, EntityRelation } from "../../types";
import { boolText, getNpcField, stringField } from "../../lib/entity-utils";
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

const npcQuestRelationType = "npc_related_quest";
const npcSessionRelationType = "npc_related_session";

export function NpcDetailView({
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
    <article className="detail npc-detail">
      <div>
        <EntityImage entity={entity} />
        <EntityHeader entity={entity} />
        <StateControls {...actions} entity={entity} />
        <DetailActions actions={actions} entity={entity} />
      </div>

      <div>
        <NpcRelationshipPanel entity={entity} />
        <section className="facts">
          <Fact label="Origem" value={entity.source} />
        </section>

        <EntityTags entity={entity} />
        <NpcRelations
          disabled={!actions.apiOnline}
          entities={entities}
          npc={entity}
          onAdd={onRelationAdd}
          onDelete={onRelationDelete}
          relations={relations}
        />
        <EntityMarkdown entity={entity} />
        <SourcePath entity={entity} />
      </div>
    </article>
  );
}

function NpcRelations({
  disabled,
  entities,
  npc,
  onAdd,
  onDelete,
  relations,
}: {
  disabled: boolean;
  entities: Entity[];
  npc: Entity;
  onAdd: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  onDelete: (sourceEntityId: string, relationType: string, targetEntityId: string) => void;
  relations: EntityRelation[];
}) {
  const npcRelations = relations.filter((relation) => relation.sourceEntityId === npc.id);
  const questRelations = npcRelations.filter((relation) => relation.relationType === npcQuestRelationType);
  const sessionRelations = npcRelations.filter((relation) => relation.relationType === npcSessionRelationType);
  const quests = useMemo(
    () => entities.filter((entity) => entity.kind === "quest").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [entities],
  );
  const sessions = useMemo(
    () => entities.filter((entity) => entity.kind === "sessao").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [entities],
  );

  return (
    <section className="relation-manager">
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma quest relacionada."
        items={quests}
        label="Quests"
        onAdd={(targetEntityId) => onAdd(npc.id, npcQuestRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(npc.id, npcQuestRelationType, targetEntityId)}
        relations={questRelations}
      />
      <RelationPanel
        disabled={disabled}
        emptyText="Nenhuma sessao relacionada."
        items={sessions}
        label="Sessoes"
        onAdd={(targetEntityId) => onAdd(npc.id, npcSessionRelationType, targetEntityId)}
        onDelete={(targetEntityId) => onDelete(npc.id, npcSessionRelationType, targetEntityId)}
        relations={sessionRelations}
      />
    </section>
  );
}

function NpcRelationshipPanel({ entity }: { entity: Entity }) {
  const npcTitle = stringField(entity.frontmatter.titulo);

  return (
    <section className="npc-panel">
      {npcTitle && <p className="npc-subtitle">{npcTitle}</p>}
      <div className="npc-summary">
        <Fact label="Raca" value={getNpcField(entity, "raca")} />
        <Fact label="Classe" value={getNpcField(entity, "classe")} />
        <Fact label="Status" value={getNpcField(entity, "status")} />
        <Fact label="Relacao" value={getNpcField(entity, "relacao")} />
        <Fact label="Localizacao" value={getNpcField(entity, "localizacao")} />
        <Fact label="Faccao" value={getNpcField(entity, "faccao")} />
        <Fact label="Importancia" value={getNpcField(entity, "importancia")} />
        <Fact label="Vivo" value={boolText(entity.frontmatter.vivo)} />
        <Fact label="Hostil" value={boolText(entity.frontmatter.hostil)} />
        <Fact label="Aliado" value={boolText(entity.frontmatter.aliado)} />
        <Fact
          label="Primeira sessao"
          value={
            getNpcField(entity, "primeiro_encontro") ??
            getNpcField(entity, "primeiro_encontro_id")
          }
        />
        <Fact
          label="Ultima sessao"
          value={
            getNpcField(entity, "ultima_aparicao") ??
            getNpcField(entity, "ultima_interacao")
          }
        />
      </div>
    </section>
  );
}
