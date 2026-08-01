import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import type { Character, Entity } from "../types";

export function CharacterPanel({
  activeCharacterId,
  campaignNames,
  characters,
  disabled,
  newCharacterName,
  onCampaignCreate,
  onCampaignSelect,
  onCreate,
  onDelete,
  onNameChange,
  onNpcLink,
  onSelect,
  npcEntities,
  selectedCampaignName,
  totalCharacters,
}: {
  activeCharacterId: string;
  campaignNames: string[];
  characters: Character[];
  disabled: boolean;
  newCharacterName: string;
  onCampaignCreate: (name: string) => void;
  onCampaignSelect: (name: string) => void;
  onCreate: (event: FormEvent) => void;
  onDelete: (character: Character) => void;
  onNameChange: (value: string) => void;
  onNpcLink: (sourceEntityId: string) => void;
  onSelect: (id: string) => void;
  npcEntities: Entity[];
  selectedCampaignName: string;
  totalCharacters: number;
}) {
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);
  const linkedNpc = npcEntities.find((entity) => entity.id === activeCharacter?.sourceEntityId);

  return (
    <section className="character-panel">
      <label>
        Campanha / mundo
        <select disabled={disabled} onChange={(event) => onCampaignSelect(event.target.value)} value={selectedCampaignName}>
          {campaignNames.map((campaignName) => (
            <option key={campaignName} value={campaignName}>
              {campaignName}
            </option>
          ))}
        </select>
      </label>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const name = String(form.get("campaignName") ?? "").trim();
          if (!name) return;
          onCampaignCreate(name);
          event.currentTarget.reset();
        }}
      >
        <input disabled={disabled} name="campaignName" placeholder="Nova campanha ou mundo" />
        <button disabled={disabled} title="Criar campanha" type="submit">
          <Plus size={16} />
        </button>
      </form>
      <label>
        Personagem
        <select disabled={disabled || characters.length === 0} onChange={(event) => onSelect(event.target.value)} value={activeCharacterId}>
          {characters.length === 0 && <option value="">Nenhum personagem nesta campanha</option>}
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        NPC vinculado
        <select
          disabled={disabled || !activeCharacter}
          onChange={(event) => onNpcLink(event.target.value)}
          value={activeCharacter?.sourceEntityId ?? ""}
        >
          <option value="">Nenhum NPC</option>
          {activeCharacter?.sourceEntityId && !linkedNpc && (
            <option value={activeCharacter.sourceEntityId}>NPC atual indisponivel</option>
          )}
          {npcEntities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="danger-button compact-button"
        disabled={disabled || !activeCharacter || totalCharacters <= 1}
        onClick={() => activeCharacter && onDelete(activeCharacter)}
        type="button"
      >
        <Trash2 size={15} />
        Excluir personagem
      </button>
      <form className="inline-form" onSubmit={onCreate}>
        <input disabled={disabled} onChange={(event) => onNameChange(event.target.value)} placeholder={`Novo personagem em ${selectedCampaignName}`} value={newCharacterName} />
        <button disabled={disabled || !newCharacterName.trim()} title="Criar personagem" type="submit">
          <Plus size={16} />
        </button>
      </form>
    </section>
  );
}
