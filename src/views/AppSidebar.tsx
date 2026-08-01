import { BookOpen } from "lucide-react";
import type { FormEvent } from "react";
import { CharacterPanel } from "../components/CharacterPanel";
import { tabs, type ViewKind } from "../app/config";
import type { Character, Entity } from "../types";

export function AppSidebar({
  activeCharacter,
  activeCharacterId,
  activeView,
  apiOnline,
  campaignNames,
  characters,
  entities,
  newCharacterName,
  onCampaignCreate,
  onCampaignSelect,
  onCharacterCreate,
  onCharacterDelete,
  onCharacterNpcLink,
  onCharacterNameChange,
  onCharacterSelect,
  onViewChange,
  npcEntities,
  selectedCampaignName,
  visibleCharacters,
}: {
  activeCharacter?: Character;
  activeCharacterId: string;
  activeView: ViewKind;
  apiOnline: boolean;
  campaignNames: string[];
  characters: Character[];
  entities: Entity[];
  newCharacterName: string;
  onCampaignCreate: (name: string) => void;
  onCampaignSelect: (name: string) => void;
  onCharacterCreate: (event: FormEvent) => void;
  onCharacterDelete: (character: Character) => void;
  onCharacterNpcLink: (sourceEntityId: string) => void;
  onCharacterNameChange: (value: string) => void;
  onCharacterSelect: (id: string) => void;
  onViewChange: (kind: ViewKind) => void;
  npcEntities: Entity[];
  selectedCampaignName: string;
  visibleCharacters: Character[];
}) {
  return (
    <aside className="sidebar">
      <header className="brand">
        <BookOpen size={24} />
        <div>
          <strong>Ficha TTRPG</strong>
          <span>{apiOnline ? "Banco local conectado" : "Banco local desconectado"}</span>
        </div>
      </header>

      <CharacterPanel
        activeCharacterId={activeCharacter?.id ?? activeCharacterId}
        campaignNames={campaignNames}
        characters={visibleCharacters}
        disabled={!apiOnline}
        newCharacterName={newCharacterName}
        onCampaignCreate={onCampaignCreate}
        onCampaignSelect={onCampaignSelect}
        onCreate={onCharacterCreate}
        onDelete={onCharacterDelete}
        onNpcLink={onCharacterNpcLink}
        onNameChange={onCharacterNameChange}
        onSelect={onCharacterSelect}
        npcEntities={npcEntities}
        selectedCampaignName={selectedCampaignName}
        totalCharacters={characters.length}
      />

      <nav className="tabs" aria-label="Categorias">
        {tabs.map((tab) => {
          const count = tab.kind === "sheet" ? 0 : entities.filter((entity) => entity.kind === tab.kind).length;
          return (
            <button className={tab.kind === activeView ? "tab active" : "tab"} key={tab.kind} onClick={() => onViewChange(tab.kind)} type="button">
              <span>{tab.label}</span>
              <small>{tab.kind === "sheet" ? "" : count}</small>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
