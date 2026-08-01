import type { Entity } from "../../types";
import type { EntityForm } from "../../app/config";
import { BooleanSelect, ImageField, SessionSelect, type EntityFormPatch } from "./EditorShared";

export function NpcEditorFields({
  apiOnline,
  form,
  groupOptions,
  onImageUpload,
  patch,
  sessionOptions,
}: {
  apiOnline: boolean;
  form: EntityForm;
  groupOptions: Entity[];
  onImageUpload: (file: File) => Promise<void>;
  patch: EntityFormPatch<EntityForm>;
  sessionOptions: Entity[];
}) {
  return (
    <>
      <label>
        Titulo
        <input onChange={(event) => patch({ title: event.target.value })} value={form.title} />
      </label>
      <label>
        Raca
        <input onChange={(event) => patch({ race: event.target.value })} value={form.race} />
      </label>
      <label>
        Classe
        <input onChange={(event) => patch({ npcClass: event.target.value })} value={form.npcClass} />
      </label>
      <label>
        Faccao
        <select
          onChange={(event) => {
            const selected = groupOptions.find((group) => group.id === event.target.value);
            patch({ factionEntityId: selected?.id ?? "", factionEntityName: selected?.name ?? "" });
          }}
          value={form.factionEntityId}
        >
          <option value="">Nao vinculada</option>
          {groupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Localizacao
        <input onChange={(event) => patch({ location: event.target.value })} value={form.location} />
      </label>
      <label>
        Relacao
        <input onChange={(event) => patch({ relation: event.target.value })} value={form.relation} />
      </label>
      <label>
        Status
        <input onChange={(event) => patch({ npcStatus: event.target.value })} value={form.npcStatus} />
      </label>
      <label>
        Importancia
        <input onChange={(event) => patch({ importance: event.target.value })} value={form.importance} />
      </label>
      <SessionSelect label="Primeira sessao" options={sessionOptions} selectedId={form.firstSessionId} onChange={(entity) => patch({ firstSessionId: entity?.id ?? "", firstSessionName: entity?.name ?? "" })} />
      <SessionSelect label="Ultima sessao" options={sessionOptions} selectedId={form.lastSessionId} onChange={(entity) => patch({ lastSessionId: entity?.id ?? "", lastSessionName: entity?.name ?? "" })} />
      <ImageField apiOnline={apiOnline} onImageUpload={onImageUpload} onPathChange={(image) => patch({ image })} placeholder="image/Umbrael.png" value={form.image} />
      <label>
        Icone
        <input onChange={(event) => patch({ icon: event.target.value })} value={form.icon} />
      </label>
      <BooleanSelect label="Vivo" onChange={(isAlive) => patch({ isAlive })} value={form.isAlive} />
      <BooleanSelect label="Hostil" onChange={(isHostile) => patch({ isHostile })} value={form.isHostile} />
      <BooleanSelect label="Aliado" onChange={(isAlly) => patch({ isAlly })} value={form.isAlly} />
    </>
  );
}
