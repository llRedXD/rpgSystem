import { Briefcase, Sparkles, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import type { CharacterEntityState, Entity, EntityKind } from "../types";
import { buildSubtitle, findState } from "../lib/entity-utils";

const iconByKind: Partial<Record<EntityKind, ReactNode>> = {
  magia: <Wand2 size={18} />,
  habilidade: <Sparkles size={18} />,
  item: <Briefcase size={18} />,
};

export function EntityList({
  activeCharacterId,
  activeId,
  entities,
  states,
  onSelect,
}: {
  activeCharacterId?: string;
  activeId: string | null;
  entities: Entity[];
  states: CharacterEntityState[];
  onSelect: (id: string) => void;
}) {
  if (entities.length === 0) {
    return <section className="list empty">Nenhum registro encontrado.</section>;
  }

  return (
    <section className="list" aria-label="Resultados">
      {entities.map((entity) => {
        const state = activeCharacterId ? findState(states, activeCharacterId, entity.id) : undefined;
        return (
          <button className={entity.id === activeId ? "entity-row active" : "entity-row"} key={entity.id} onClick={() => onSelect(entity.id)} type="button">
            <span className="row-icon">{entity.icon || iconByKind[entity.kind] || "-"}</span>
            <span className="row-main">
              <strong>{entity.name}</strong>
              <small>{buildSubtitle(entity)}</small>
            </span>
            <span className="row-badges">
              {entity.isManual && <span>M</span>}
              {state?.isFavorite && <span>F</span>}
              {state?.isPrepared && <span>P</span>}
              {state?.isEquipped && <span>E</span>}
            </span>
          </button>
        );
      })}
    </section>
  );
}
