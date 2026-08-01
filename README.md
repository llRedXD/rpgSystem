# Ficha TTRPG Interativa

Base inicial para transformar as notas do Obsidian em uma ficha interativa.

## Como rodar

Instale as dependencias:

```bash
npm install
```

Importe as notas Markdown direto para JSON:

```bash
npm run import:vault
```

Importe as notas Markdown para SQLite e atualize o JSON usado pela UI:

```bash
npm run db:import
```

Inicie o servidor local:

```bash
npm run dev
```

Inicie a API local para usar a tela com escrita no banco:

```bash
npm run api
```

Com a API em `http://127.0.0.1:8787`, a interface consegue criar personagens, criar/editar/remover entidades manuais e salvar estado por personagem. Sem a API, a interface abre em modo leitura usando `src/data/vault-data.json`.

## Tela de ficha

A aba `Ficha` mostra o personagem ativo e consolida dados por personagem:

- Resumo do personagem vinculado.
- Contadores de magias, habilidades e itens marcados.
- Recursos editaveis, como vida, slots, pontos de feiticaria ou qualquer contador manual.
- Magias conhecidas/preparadas.
- Habilidades ativas/desbloqueadas/favoritas.
- Itens equipados/favoritos.
- Favoritos gerais.

Para preencher a ficha, marque registros nas abas de catalogo usando os controles da tela de detalhe. A ficha usa `character_entity_state`, entao cada personagem pode ter estados diferentes para a mesma magia, item ou habilidade.

Excluir um registro importado remove ele do app e cria uma entrada em `deleted_entities`, sem apagar o arquivo `.md` original. O importador respeita essa remocao local e nao recria o registro no proximo `npm run db:import`.

Use a ferramenta administrativa do banco:

```bash
npm run db:admin -- characters:list
npm run db:admin -- entities:list --kind=magia --limit=10
```

## Estrutura

- `_Magias`, `_Habilidades`, `_Itens`, `_Personagens` etc.: notas originais do Obsidian.
- `scripts/vault-core.mjs`: le os arquivos `.md`, extrai frontmatter e secoes Markdown, e normaliza entidades.
- `scripts/import-vault.mjs`: gera apenas o JSON usado pela UI.
- `scripts/import-vault-db.mjs`: gera o banco SQLite local e atualiza o JSON da UI.
- `scripts/db-admin.mjs`: ferramenta CLI para criar, listar, editar e deletar dados controlados no banco.
- `scripts/db-api.mjs`: API local usada pela interface para escrever no SQLite.
- `data/rpg.sqlite`: banco SQLite local gerado a partir das notas.
- `src/data/vault-data.json`: snapshot gerado para a interface web atual.
- `src/App.tsx`: interface inicial da ficha.
- `src/types.ts`: tipos principais do modelo interno.

## Fluxo atual recomendado

```txt
Notas Obsidian
  -> npm run db:import
  -> data/rpg.sqlite
  -> src/data/vault-data.json
  -> interface React
```

O app web ainda consome `src/data/vault-data.json` porque o navegador nao acessa SQLite local diretamente. O banco ja passa a existir como fonte estruturada para a proxima etapa, especialmente Tauri ou uma API local.

Com `npm run api`, a interface passa a ler e escrever por HTTP local:

```txt
Interface React
  -> http://127.0.0.1:8787/api
  -> data/rpg.sqlite
```

## Tabelas iniciais

- `entities`
- `entity_sections`
- `tags`
- `entity_tags`
- `entity_links`
- `deleted_entities`
- `characters`
- `character_entity_state`
- `character_resources`
- `metadata`
- `import_runs`
- `import_warnings`

## Modelo multi-personagem

O projeto usa um unico banco para todos os personagens.

- `entities` guarda conteudo global importado das notas: magias, habilidades, itens, NPCs, grupos, quests e sessoes.
- `characters` guarda os personagens jogaveis ou fichas ativas.
- `character_entity_state` guarda o estado de uma entidade para um personagem especifico: favorito, ativo, equipado, preparado, conhecido, desbloqueado, cargas e usos atuais.
- `character_resources` guarda recursos por personagem: vida, espacos de magia, pontos de feiticaria e outros contadores.

Esse desenho permite que a mesma magia ou item exista uma vez no catalogo global, mas tenha estados diferentes para cada personagem.

## CRUD via CLI

Personagens:

```bash
npm run db:admin -- characters:list
npm run db:admin -- characters:create --name=Lyra --active=true
npm run db:admin -- characters:update --id=character-lyra --name="Lyra Moonfall"
npm run db:admin -- characters:delete --id=character-lyra
```

Entidades manuais:

```bash
npm run db:admin -- entities:list --kind=magia --limit=20
npm run db:admin -- entities:create --kind=magia --name="Chama Cinerea" --level=1
npm run db:admin -- entities:update --id=manual-magia-chama-cinerea --cost=slot_1
npm run db:admin -- entities:delete --id=manual-magia-chama-cinerea
```

Entidades criadas pelas notas podem ser editadas pelo app ou pela CLI. Quando isso acontece, elas viram uma edicao local no banco e recebem `is_manual = 1`, entao nao sao sobrescritas por `npm run db:import`.

Na interface, registros importados tambem podem ser editados. Quando isso acontece, o registro vira uma edicao local no banco e passa a ser preservado por `npm run db:import`. Excluir continua limitado a registros criados manualmente, para evitar apagar conteudo que veio das notas.

Estado por personagem:

```bash
npm run db:admin -- state:set --character=character-personagens-npcs-umbrael-md --entity=magias-abraco-da-morte-embrace-of-death-md --known=true --prepared=true
npm run db:admin -- state:list --character=character-personagens-npcs-umbrael-md
npm run db:admin -- state:clear --character=character-personagens-npcs-umbrael-md --entity=magias-abraco-da-morte-embrace-of-death-md
```

Recursos:

```bash
npm run db:admin -- resources:set --character=character-personagens-npcs-umbrael-md --resourceKey=sorcery_points --label="Pontos de Feiticaria" --current=4 --maxValue=4 --resetOn=long_rest
npm run db:admin -- resources:list --character=character-personagens-npcs-umbrael-md
npm run db:admin -- resources:delete --character=character-personagens-npcs-umbrael-md --resourceKey=sorcery_points
```

## Proximos passos

- Melhorar o parser para cobrir mais variacoes de YAML.
- Conectar a UI ao CRUD e ao estado por personagem.
- Adicionar painel de recursos na interface.
- Melhorar layout da ficha com atributos numericos dedicados.
- Fazer a UI ler direto do SQLite via Tauri ou API local.
- Migrar para Tauri quando a UI principal estiver estavel.
