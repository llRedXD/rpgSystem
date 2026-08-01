import { Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { catalogTabs, type EntityForm } from "../app/config";
import type { Entity, EntityKind, TagSummary } from "../types";
import { apiPost, readFileAsDataURL } from "../lib/api";
import { shouldShowEditorField, splitTags } from "../lib/entity-utils";
import { GroupEditorFields } from "./entity-editor/GroupEditorFields";
import { ItemEditorFields } from "./entity-editor/ItemEditorFields";
import { LocalEditorFields } from "./entity-editor/LocalEditorFields";
import { NpcEditorFields } from "./entity-editor/NpcEditorFields";
import { QuestEditorFields } from "./entity-editor/QuestEditorFields";
import { SessionEditorFields } from "./entity-editor/SessionEditorFields";

export function EntityEditor({
  availableTags,
  apiOnline,
  groupOptions,
  npcOptions,
  sessionOptions,
  form,
  onCancel,
  onChange,
  onStatus,
  onSubmit,
}: {
  availableTags: TagSummary[];
  apiOnline: boolean;
  groupOptions: Entity[];
  npcOptions: Entity[];
  sessionOptions: Entity[];
  form: EntityForm;
  onCancel: () => void;
  onChange: (form: EntityForm) => void;
  onStatus: (message: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  function patch(values: Partial<EntityForm>) {
    onChange({ ...form, ...values });
  }

  async function handleImageUpload(file: File) {
    const dataUrl = await readFileAsDataURL(file);
    const result = await apiPost<{ path: string }>("/uploads", {
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
    });
    patch({ image: result.path });
    onStatus("Imagem enviada.");
  }

  return (
    <form className="detail editor" onSubmit={onSubmit}>
      <header className="editor-header">
        <h1>{form.id ? "Editar registro" : "Novo registro"}</h1>
        <div className="entity-buttons">
          <button className="command-button" type="submit">
            <Save size={16} />
            Salvar
          </button>
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancelar
          </button>
        </div>
      </header>

      <section className="form-grid">
        <CommonIdentityFields form={form} patch={patch} />
        <EntitySpecificFields apiOnline={apiOnline} form={form} groupOptions={groupOptions} npcOptions={npcOptions} onImageUpload={handleImageUpload} patch={patch} sessionOptions={sessionOptions} />
        <CommonCatalogFields form={form} patch={patch} />
      </section>

      <TagPicker availableTags={availableTags} onChange={(tags) => patch({ tags: tags.join(", ") })} value={splitTags(form.tags)} />

      <label className="body-field">
        Corpo Markdown
        <textarea onChange={(event) => patch({ body: event.target.value })} rows={12} value={form.body} />
      </label>
    </form>
  );
}

function CommonIdentityFields({ form, patch }: { form: EntityForm; patch: (values: Partial<EntityForm>) => void }) {
  return (
    <>
      <label>
        Tipo
        <select onChange={(event) => patch({ kind: event.target.value as EntityKind })} value={form.kind}>
          {catalogTabs.map((tab) => (
            <option key={tab.kind} value={tab.kind}>
              {tab.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nome
        <input onChange={(event) => patch({ name: event.target.value })} required value={form.name} />
      </label>
    </>
  );
}

function EntitySpecificFields({
  apiOnline,
  form,
  groupOptions,
  npcOptions,
  onImageUpload,
  patch,
  sessionOptions,
}: {
  apiOnline: boolean;
  form: EntityForm;
  groupOptions: Entity[];
  npcOptions: Entity[];
  onImageUpload: (file: File) => Promise<void>;
  patch: (values: Partial<EntityForm>) => void;
  sessionOptions: Entity[];
}) {
  if (form.kind === "npc") {
    return <NpcEditorFields apiOnline={apiOnline} form={form} groupOptions={groupOptions} onImageUpload={onImageUpload} patch={patch} sessionOptions={sessionOptions} />;
  }

  if (form.kind === "item") {
    return <ItemEditorFields apiOnline={apiOnline} form={form} onImageUpload={onImageUpload} patch={patch} />;
  }

  if (form.kind === "grupo") {
    return <GroupEditorFields apiOnline={apiOnline} form={form} onImageUpload={onImageUpload} patch={patch} />;
  }

  if (form.kind === "local") {
    return <LocalEditorFields apiOnline={apiOnline} form={form} npcOptions={npcOptions} onImageUpload={onImageUpload} patch={patch} />;
  }

  if (form.kind === "sessao") {
    return <SessionEditorFields form={form} patch={patch} />;
  }

  if (form.kind === "quest") {
    return <QuestEditorFields form={form} patch={patch} />;
  }

  return <BaseCatalogFields form={form} patch={patch} />;
}

function BaseCatalogFields({ form, patch }: { form: EntityForm; patch: (values: Partial<EntityForm>) => void }) {
  return (
    <>
      {shouldShowEditorField(form.kind, "level") && (
        <label>
          Nivel
          <input onChange={(event) => patch({ level: event.target.value })} type="number" value={form.level} />
        </label>
      )}
      {shouldShowEditorField(form.kind, "action") && (
        <label>
          Acao
          <input onChange={(event) => patch({ action: event.target.value })} value={form.action} />
        </label>
      )}
      {shouldShowEditorField(form.kind, "cost") && (
        <label>
          Custo
          <input onChange={(event) => patch({ cost: event.target.value })} value={form.cost} />
        </label>
      )}
    </>
  );
}

function CommonCatalogFields({ form, patch }: { form: EntityForm; patch: (values: Partial<EntityForm>) => void }) {
  return (
    <>
      <label>
        Origem
        <input onChange={(event) => patch({ source: event.target.value })} value={form.source} />
      </label>
      {form.kind !== "npc" && shouldShowEditorField(form.kind, "damage") && (
        <label>
          Dano
          <input onChange={(event) => patch({ damage: event.target.value })} value={form.damage} />
        </label>
      )}
      {form.kind === "magia" && (
        <label>
          Escalonamento
          <input onChange={(event) => patch({ scaling: event.target.value })} placeholder="+1d6 por nivel acima do 1" value={form.scaling} />
        </label>
      )}
      {form.kind !== "npc" && shouldShowEditorField(form.kind, "range") && (
        <label>
          Alcance
          <input onChange={(event) => patch({ range: event.target.value })} value={form.range} />
        </label>
      )}
    </>
  );
}

function TagPicker({
  availableTags,
  onChange,
  value,
}: {
  availableTags: TagSummary[];
  onChange: (tags: string[]) => void;
  value: string[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const selected = new Set(value.map((tag) => tag.toLowerCase()));
  const suggestions = availableTags
    .filter((tag) => !selected.has(tag.name.toLowerCase()))
    .filter((tag) => !normalizedQuery || tag.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 10);
  const canCreate = query.trim() && !availableTags.some((tag) => tag.name.toLowerCase() === query.trim().toLowerCase()) && !selected.has(query.trim().toLowerCase());

  function addTag(tag: string) {
    const normalized = tag.trim();
    if (!normalized) return;
    onChange([...value, normalized]);
    setQuery("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  return (
    <section className="tag-picker">
      <label>
        Tags
        <input
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim()) {
              event.preventDefault();
              addTag(query);
            }
          }}
          placeholder="Buscar ou criar tag"
          value={query}
        />
      </label>

      {value.length > 0 && (
        <div className="selected-tags">
          {value.map((tag) => (
            <button key={tag} onClick={() => removeTag(tag)} title={`Remover tag ${tag}`} type="button">
              {tag}
              <Trash2 size={13} />
            </button>
          ))}
        </div>
      )}

      <div className="tag-suggestions">
        {suggestions.map((tag) => (
          <button key={tag.id} onClick={() => addTag(tag.name)} type="button">
            <span>{tag.name}</span>
            <small>{tag.entityCount}</small>
          </button>
        ))}
        {canCreate && (
          <button onClick={() => addTag(query)} type="button">
            <span>Criar "{query.trim()}"</span>
            <small>nova</small>
          </button>
        )}
      </div>
    </section>
  );
}
