import type { EntityForm } from "../../app/config";
import { ImageField, type EntityFormPatch } from "./EditorShared";

export function ItemEditorFields({
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
      <ImageField apiOnline={apiOnline} onImageUpload={onImageUpload} onPathChange={(image) => patch({ image })} placeholder="image/Colar de Espelho.png" value={form.image} />
      <label>
        Categoria
        <input onChange={(event) => patch({ category: event.target.value })} value={form.category} />
      </label>
      <label>
        Subcategoria
        <input onChange={(event) => patch({ subcategory: event.target.value })} value={form.subcategory} />
      </label>
      <label>
        Raridade
        <input onChange={(event) => patch({ rarity: event.target.value })} value={form.rarity} />
      </label>
      <label>
        Quantidade
        <input min="0" onChange={(event) => patch({ quantity: event.target.value })} type="number" value={form.quantity} />
      </label>
      <label>
        Cargas
        <input min="0" onChange={(event) => patch({ charges: event.target.value })} type="number" value={form.charges} />
      </label>
      <label>
        Cargas maximas
        <input min="0" onChange={(event) => patch({ maxCharges: event.target.value })} type="number" value={form.maxCharges} />
      </label>
      <label>
        Recarga
        <input onChange={(event) => patch({ recharge: event.target.value })} placeholder="descanso_longo" value={form.recharge} />
      </label>
    </>
  );
}
