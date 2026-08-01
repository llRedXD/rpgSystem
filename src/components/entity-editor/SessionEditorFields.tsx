import type { EntityForm } from "../../app/config";
import type { EntityFormPatch } from "./EditorShared";

export function SessionEditorFields({
  form,
  patch,
}: {
  form: EntityForm;
  patch: EntityFormPatch<EntityForm>;
}) {
  return (
    <>
      <label>
        Data
        <input onChange={(event) => patch({ sessionDate: event.target.value })} type="date" value={form.sessionDate} />
      </label>
      <label>
        Status
        <input onChange={(event) => patch({ npcStatus: event.target.value })} value={form.npcStatus} />
      </label>
      <label>
        Localizacao
        <input onChange={(event) => patch({ location: event.target.value })} value={form.location} />
      </label>
      <label>
        Icone
        <input onChange={(event) => patch({ icon: event.target.value })} value={form.icon} />
      </label>
    </>
  );
}
