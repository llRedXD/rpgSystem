import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Entity, EntityRelation } from "../../types";

export function RelationPanel({
  disabled,
  emptyText,
  items,
  label,
  onAdd,
  onDelete,
  relations,
}: {
  disabled: boolean;
  emptyText: string;
  items: Entity[];
  label: string;
  onAdd: (targetEntityId: string) => void;
  onDelete: (targetEntityId: string) => void;
  relations: EntityRelation[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const relatedIds = new Set(relations.map((relation) => relation.targetEntityId));
  const availableItems = items.filter((item) => !relatedIds.has(item.id));
  const relatedItems = relations
    .map((relation) => items.find((item) => item.id === relation.targetEntityId))
    .filter((item): item is Entity => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  function addSelected() {
    if (!selectedId) return;
    onAdd(selectedId);
    setSelectedId("");
  }

  return (
    <div className="relation-panel">
      <div className="relation-panel-header">
        <h2>{label}</h2>
        <div className="relation-add">
          <select disabled={disabled || availableItems.length === 0} onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
            <option value="">Adicionar</option>
            {availableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="command-button" disabled={disabled || !selectedId} onClick={addSelected} title="Adicionar relacao" type="button">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {relatedItems.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="relation-list">
          {relatedItems.map((item) => (
            <div className="relation-row" key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>{item.source}</small>
              </span>
              <button className="danger-button" disabled={disabled} onClick={() => onDelete(item.id)} title="Remover relacao" type="button">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
