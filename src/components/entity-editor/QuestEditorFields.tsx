import type { EntityForm } from "../../app/config";
import type { EntityFormPatch } from "./EditorShared";

export function QuestEditorFields({
  form,
  patch,
}: {
  form: EntityForm;
  patch: EntityFormPatch<EntityForm>;
}) {
  return (
    <>
      <label>
        Status
        <input onChange={(event) => patch({ npcStatus: event.target.value })} value={form.npcStatus} />
      </label>
      <label>
        Prioridade
        <input onChange={(event) => patch({ priority: event.target.value })} value={form.priority} />
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
