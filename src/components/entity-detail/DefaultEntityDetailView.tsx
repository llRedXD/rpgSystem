import type { Entity } from "../../types";
import { getRechargeText, getScalingDamage } from "../../lib/entity-utils";
import { Fact } from "../common";
import {
  DetailActions,
  EntityHeader,
  EntityMarkdown,
  EntityTags,
  SourcePath,
  StateControls,
  type EntityDetailActions,
} from "./DetailShared";

export function DefaultEntityDetailView({ actions, entity }: { actions: EntityDetailActions; entity: Entity }) {
  return (
    <article className="detail">
      <EntityHeader entity={entity} />
      <StateControls {...actions} entity={entity} />
      <DetailActions actions={actions} entity={entity} />

      <section className="facts">
        <DefaultFacts entity={entity} />
      </section>

      <EntityTags entity={entity} />
      <EntityMarkdown entity={entity} />
      <SourcePath entity={entity} />
    </article>
  );
}

function DefaultFacts({ entity }: { entity: Entity }) {
  if (entity.kind === "magia") {
    return (
      <>
        <Fact label="Nivel" value={entity.level?.toString()} />
        <Fact label="Acao" value={entity.action} />
        <Fact label="Custo" value={entity.cost} />
        <Fact label="Dano" value={entity.damage} />
        <Fact label="Escala" value={getScalingDamage(entity)} />
        <Fact label="Alcance" value={entity.range} />
        <Fact label="Origem" value={entity.source} />
      </>
    );
  }

  if (entity.kind === "habilidade") {
    return (
      <>
        <Fact label="Nivel" value={entity.level?.toString()} />
        <Fact label="Acao" value={entity.action} />
        <Fact label="Custo" value={entity.cost} />
        <Fact label="Dano" value={entity.damage} />
        <Fact label="Alcance" value={entity.range} />
        <Fact label="Recarga" value={getRechargeText(entity)} />
        <Fact label="Origem" value={entity.source} />
      </>
    );
  }

  return <Fact label="Origem" value={entity.source} />;
}
