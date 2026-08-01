import { Pencil, Trash2 } from "lucide-react";
import type { Character, CharacterEntityState, Entity } from "../../types";
import { getEntityImageUrl, numberField } from "../../lib/entity-utils";
import { Toggle, renderSectionContent } from "../common";

export type EntityDetailActions = {
  apiOnline: boolean;
  character?: Character;
  onDelete: (entity: Entity) => void;
  onEdit: (entity: Entity) => void;
  onStateChange: (state: Partial<CharacterEntityState>) => void;
  state?: CharacterEntityState;
};

export function EntityImage({ entity }: { entity: Entity }) {
  const imageUrl = getEntityImageUrl(entity);
  if (!imageUrl) return null;

  return (
    <div className="entity-image">
      <img alt={entity.name} src={imageUrl} />
    </div>
  );
}

export function EntityHeader({ entity }: { entity: Entity }) {
  return (
    <header className="detail-header">
      <div>
        <p>{entity.kind}{entity.isManual ? entity.sourcePath.startsWith("manual/") ? " - manual" : " - editado localmente" : ""}</p>
        <h1>{entity.name}</h1>
        {entity.originalName && <span>{entity.originalName}</span>}
      </div>
      {entity.icon && <div className="detail-icon">{entity.icon}</div>}
    </header>
  );
}

export function DetailActions({ actions, entity }: { actions: EntityDetailActions; entity: Entity }) {
  return (
    <section className="entity-buttons">
      <button className="command-button" disabled={!actions.apiOnline} onClick={() => actions.onEdit(entity)} type="button">
        <Pencil size={16} />
        Editar
      </button>
      <button className="danger-button" disabled={!actions.apiOnline} onClick={() => actions.onDelete(entity)} type="button">
        <Trash2 size={16} />
        Excluir
      </button>
    </section>
  );
}

export function EntityTags({ entity }: { entity: Entity }) {
  if (entity.tags.length === 0) return null;

  return (
    <section className="tags">
      {entity.tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </section>
  );
}

export function EntityMarkdown({ entity }: { entity: Entity }) {
  return (
    <section className="markdown">
      {entity.sections.map((section) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          <div className="markdown-content">{renderSectionContent(section.content)}</div>
        </div>
      ))}
    </section>
  );
}

export function SourcePath({ entity }: { entity: Entity }) {
  return <footer className="source-path">{entity.sourcePath}</footer>;
}

export function ChargeControls({
  disabled,
  entity,
  onChange,
  value,
}: {
  disabled: boolean;
  entity: Entity;
  onChange: (value: number) => void;
  value?: number;
}) {
  const baseCharges = numberField(entity.frontmatter.cargas);
  const maxCharges = numberField(entity.frontmatter.cargas_maximas) ?? baseCharges ?? 0;
  const current = value ?? baseCharges ?? maxCharges;

  return (
    <section className="charge-controls" aria-label="Cargas">
      <span>Cargas</span>
      <div>
        <button disabled={disabled || current <= 0} onClick={() => onChange(Math.max(0, current - 1))} type="button">
          -
        </button>
        <strong>{current}</strong>
        <small>/ {maxCharges}</small>
        <button disabled={disabled || current >= maxCharges} onClick={() => onChange(Math.min(maxCharges, current + 1))} type="button">
          +
        </button>
        <button disabled={disabled} onClick={() => onChange(maxCharges)} type="button">
          Reset
        </button>
      </div>
    </section>
  );
}

export function StateControls({
  apiOnline,
  character,
  entity,
  onStateChange,
  state,
}: EntityDetailActions & { entity: Entity }) {
  const disabled = !apiOnline || !character;

  if (!["magia", "habilidade", "item"].includes(entity.kind)) {
    return (
      <section className="action-bar">
        <Toggle label="Favorita" checked={Boolean(state?.isFavorite)} disabled={disabled} onChange={(value) => onStateChange({ isFavorite: value })} />
      </section>
    );
  }

  if (entity.kind === "magia") {
    return (
      <section className="action-bar">
        <Toggle label="Favorita" checked={Boolean(state?.isFavorite)} disabled={disabled} onChange={(value) => onStateChange({ isFavorite: value })} />
        <Toggle label="Conhecida" checked={Boolean(state?.isKnown)} disabled={disabled} onChange={(value) => onStateChange({ isKnown: value })} />
        <Toggle label="Preparada" checked={Boolean(state?.isPrepared)} disabled={disabled} onChange={(value) => onStateChange({ isPrepared: value })} />
      </section>
    );
  }

  if (entity.kind === "habilidade") {
    return (
      <section className="action-bar">
        <Toggle label="Favorita" checked={Boolean(state?.isFavorite)} disabled={disabled} onChange={(value) => onStateChange({ isFavorite: value })} />
        <Toggle label="Desbloqueada" checked={Boolean(state?.isUnlocked)} disabled={disabled} onChange={(value) => onStateChange({ isUnlocked: value })} />
      </section>
    );
  }

  return (
    <section className="action-bar">
      <Toggle label="Favorita" checked={Boolean(state?.isFavorite)} disabled={disabled} onChange={(value) => onStateChange({ isFavorite: value })} />
      <Toggle label="Equipado" checked={Boolean(state?.isEquipped)} disabled={disabled} onChange={(value) => onStateChange({ isEquipped: value })} />
    </section>
  );
}
