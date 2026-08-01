import type { EntityForm } from "../../app/config";
import { ImageField, type EntityFormPatch } from "./EditorShared";

export function GroupEditorFields({
  apiOnline,
  form,
  onImageUpload,
  patch,
}: {
  apiOnline: boolean;
  form: EntityForm;
  onImageUpload: (file: File) => Promise<void>;
  patch: EntityFormPatch<EntityForm>;
}) {
  return (
    <>
      <ImageField apiOnline={apiOnline} onImageUpload={onImageUpload} onPathChange={(image) => patch({ image })} placeholder="image/grupo.png" value={form.image} />
      <label>
        Icone
        <input onChange={(event) => patch({ icon: event.target.value })} value={form.icon} />
      </label>
      <label>
        Categoria
        <input onChange={(event) => patch({ category: event.target.value })} value={form.category} />
      </label>
      <label>
        Localizacao
        <input onChange={(event) => patch({ location: event.target.value })} value={form.location} />
      </label>
      <label>
        Status
        <input onChange={(event) => patch({ npcStatus: event.target.value })} value={form.npcStatus} />
      </label>
    </>
  );
}
