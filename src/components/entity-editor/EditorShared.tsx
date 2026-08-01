import { Upload } from "lucide-react";
import type { Entity } from "../../types";

export type EntityFormPatch<TForm> = (values: Partial<TForm>) => void;

export function ImageField({
  apiOnline,
  onImageUpload,
  onPathChange,
  placeholder,
  value,
}: {
  apiOnline: boolean;
  onImageUpload: (file: File) => Promise<void>;
  onPathChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="field-group">
      <span>Imagem</span>
      <div className="image-input-row">
        <input onChange={(event) => onPathChange(event.target.value)} placeholder={placeholder} value={value} />
        <label className="upload-trigger" title="Enviar imagem">
          <Upload size={16} />
          <input
            disabled={!apiOnline}
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                await onImageUpload(file);
              } finally {
                event.target.value = "";
              }
            }}
            type="file"
          />
        </label>
      </div>
    </div>
  );
}

export function BooleanSelect({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label>
      {label}
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Nao informado</option>
        <option value="true">Sim</option>
        <option value="false">Nao</option>
      </select>
    </label>
  );
}

export function SessionSelect({
  label,
  onChange,
  options,
  selectedId,
}: {
  label: string;
  onChange: (entity?: Entity) => void;
  options: Entity[];
  selectedId: string;
}) {
  return (
    <label>
      {label}
      <select onChange={(event) => onChange(options.find((session) => session.id === event.target.value))} value={selectedId}>
        <option value="">Nao vinculada</option>
        {options.map((session) => (
          <option key={session.id} value={session.id}>
            {session.name}
          </option>
        ))}
      </select>
    </label>
  );
}
