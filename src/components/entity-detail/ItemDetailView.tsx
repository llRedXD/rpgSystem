import type { Entity } from "../../types";
import {
  getChargesText,
  getItemField,
  getRechargeText,
  getUsageControls,
} from "../../lib/entity-utils";
import { Fact } from "../common";
import {
  ChargeControls,
  DetailActions,
  EntityHeader,
  EntityImage,
  EntityMarkdown,
  EntityTags,
  SourcePath,
  StateControls,
  type EntityDetailActions,
} from "./DetailShared";

export function ItemDetailView({
  actions,
  entity,
}: {
  actions: EntityDetailActions;
  entity: Entity;
}) {
  const usageControls = getUsageControls(entity);

  return (
    <article className="detail item-detail">
      <div>
        <EntityImage entity={entity} />
        <EntityHeader entity={entity} />
        <StateControls {...actions} entity={entity} />
        {usageControls.showCharges ? (
          <ChargeControls
            disabled={!actions.apiOnline || !actions.character}
            entity={entity}
            onChange={(currentCharges) =>
              actions.onStateChange({ currentCharges })
            }
            value={actions.state?.currentCharges}
          />
        ) : null}
        <DetailActions actions={actions} entity={entity} />
      </div>
      <div>
        <section className="facts">
          <ItemFacts entity={entity} />
        </section>

        <EntityTags entity={entity} />
        <EntityMarkdown entity={entity} />
        <SourcePath entity={entity} />
      </div>
    </article>
  );
}

function ItemFacts({ entity }: { entity: Entity }) {
  return (
    <>
      <Fact
        label="Categoria"
        value={getItemField(entity, "categoria") ?? entity.category}
      />
      <Fact label="Subcategoria" value={getItemField(entity, "subcategoria")} />
      <Fact label="Raridade" value={getItemField(entity, "raridade")} />
      <Fact label="Quantidade" value={getItemField(entity, "quantidade")} />
      <Fact label="Cargas" value={getChargesText(entity)} />
      <Fact label="Recarga" value={getRechargeText(entity)} />
      <Fact label="Origem" value={entity.source} />
    </>
  );
}
