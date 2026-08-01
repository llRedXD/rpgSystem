import type { EntityForm } from "../../app/config";
import type { Entity } from "../../types";
import { ImageField, type EntityFormPatch } from "./EditorShared";

export function LocalEditorFields({
  apiOnline,
  form,
  npcOptions,
  onImageUpload,
  patch,
}: {
  apiOnline: boolean;
  form: EntityForm;
  npcOptions: Entity[];
  onImageUpload: (file: File) => Promise<void>;
  patch: EntityFormPatch<EntityForm>;
}) {
  return (
    <>
      <ImageField apiOnline={apiOnline} onImageUpload={onImageUpload} onPathChange={(image) => patch({ image })} placeholder="image/local.png" value={form.image} />
      <label>
        Icone
        <input onChange={(event) => patch({ icon: event.target.value })} value={form.icon} />
      </label>
      <label>
        Categoria
        <input onChange={(event) => patch({ category: event.target.value })} value={form.category} />
      </label>
      <label>
        Regiao / Localizacao
        <input onChange={(event) => patch({ location: event.target.value })} value={form.location} />
      </label>
      <label>
        Status
        <input onChange={(event) => patch({ npcStatus: event.target.value })} value={form.npcStatus} />
      </label>
      <label>
        Governante
        <select
          onChange={(event) => {
            const selected = npcOptions.find((npc) => npc.id === event.target.value);
            patch({
              governorEntityId: selected?.id ?? "",
              governorEntityName: selected?.name ?? "",
            });
          }}
          value={form.governorEntityId}
        >
          <option value="">Nao vinculado</option>
          {npcOptions.map((npc) => (
            <option key={npc.id} value={npc.id}>
              {npc.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Faccao principal
        <input onChange={(event) => patch({ mainFaction: event.target.value })} value={form.mainFaction} />
      </label>
      <label>
        Populacao
        <input onChange={(event) => patch({ population: event.target.value })} value={form.population} />
      </label>
      <label>
        Local pai
        <input onChange={(event) => patch({ parentLocation: event.target.value })} value={form.parentLocation} />
      </label>
      <label>
        Importancia
        <input onChange={(event) => patch({ importance: event.target.value })} value={form.importance} />
      </label>
      <label>
        Aliados
        <input onChange={(event) => patch({ allies: event.target.value })} placeholder="Separar por virgula" value={form.allies} />
      </label>
      <label>
        Inimigos
        <input onChange={(event) => patch({ enemies: event.target.value })} placeholder="Separar por virgula" value={form.enemies} />
      </label>
      <label>
        NPCs importantes
        <input onChange={(event) => patch({ importantNpcs: event.target.value })} placeholder="Separar por virgula" value={form.importantNpcs} />
      </label>
    </>
  );
}
