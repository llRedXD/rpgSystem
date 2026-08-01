# TODO - Ficha TTRPG Interativa

## Objetivo

Criar uma ficha interativa de TTRPG usando as notas existentes do Obsidian como fonte inicial de dados. O projeto deve importar magias, habilidades, itens, NPCs, grupos, quests e diarios a partir dos arquivos Markdown, transformar esses dados em entidades estruturadas e oferecer uma interface mais pratica do que o Obsidian para uso em mesa.

## Progresso atual

- [x] Criada base Vite + React + TypeScript.
- [x] Criado `package.json` com scripts:
  - [x] `npm run dev`
  - [x] `npm run build`
  - [x] `npm run import:vault`
  - [x] `npm run db:import`
- [x] Criado importador inicial em `scripts/import-vault.mjs`.
- [x] Parser extraido para `scripts/vault-core.mjs`.
- [x] Criado importador SQLite em `scripts/import-vault-db.mjs`.
- [x] Criada ferramenta CRUD em `scripts/db-admin.mjs`.
- [x] Criada API local em `scripts/db-api.mjs`.
- [x] Criada rota local de assets para imagens em `scripts/db-api.mjs`.
- [x] Adicionado script `npm run api`.
- [x] Criado banco local `data/rpg.sqlite`.
- [x] Criado arquivo gerado `src/data/vault-data.json`.
- [x] Importadas 65 entidades das notas atuais.
- [x] Populadas tabelas iniciais do SQLite:
  - [x] `entities`
  - [x] `entity_sections`
  - [x] `tags`
  - [x] `entity_tags`
  - [x] `entity_links`
  - [x] `deleted_entities`
  - [x] `characters`
  - [x] `character_entity_state`
  - [x] `character_resources`
  - [x] `metadata`
  - [x] `import_runs`
  - [x] `import_warnings`
- [x] Ajustada estrutura para multiplos personagens em um unico banco.
- [x] Definido modelo com entidades globais e estado separado por personagem.
- [x] Adicionada coluna `is_manual` para proteger entidades criadas diretamente no banco.
- [x] Permitida edicao local de entidades importadas pela tela.
- [x] Adicionado script `npm run db:admin`.
- [x] Criada UI inicial em `src/App.tsx`.
- [x] UI conectada a API local para leitura/escrita no SQLite.
- [x] Criada aba `Ficha` para o personagem ativo.
- [x] Criada folha de estilo inicial em `src/styles.css`.
- [x] Criados tipos base em `src/types.ts`.
- [x] Criado `README.md` com instrucoes de uso.
- [x] Instaladas dependencias npm.
- [x] Build validado com `npm run build`.
- [x] Servidor local iniciado em `http://127.0.0.1:5173`.
- [x] `.gitignore` atualizado para ignorar `node_modules/`, `dist/` e `_Quests/`.

## Decisoes iniciais recomendadas

- Stack principal: TypeScript + React.
- Primeira versao: Vite + React + TypeScript. `[feito como base inicial]`
- Evolucao desktop: Tauri.
- Persistencia inicial: JSON local ou SQLite. `[SQLite iniciado em data/rpg.sqlite; JSON ainda usado como snapshot para a UI web]`
- Persistencia recomendada para evoluir: SQLite primeiro, PostgreSQL/Supabase depois.
- Parser de notas:
  - Parser simples proprio. `[feito temporariamente em scripts/import-vault.mjs]`
  - `gray-matter` para frontmatter YAML. `[pendente para robustez]`
  - `react-markdown` ou `markdown-it` para renderizar corpo Markdown. `[pendente para renderizacao completa]`
  - `zod` para validar e normalizar dados importados. `[pendente]`

## Fase 1 - Levantamento das notas

- [x] Mapear todos os diretorios relevantes:
  - [x] `_Caracteristica`
  - [x] `_Diario`
  - [x] `_Habilidades`
  - [x] `_Itens`
  - [x] `_Magias`
  - [x] `_Personagens`
  - [x] `_Quest`
  - [x] `_Quests`
  - [x] `_Template`
- [x] Ignorar metadados que nao devem entrar no app:
  - [x] Pastas `.space`
  - [x] Arquivos fora das pastas do vault
  - [x] Arquivos de indice iniciados com `_`
  - [ ] Arquivos vazios sem frontmatter util
- [x] Listar tipos principais encontrados no frontmatter:
  - [x] `magia`
  - [x] `habilidade`
  - [x] `item`
  - [x] `npc`
  - [x] `grupo`
  - [x] `local`
  - [x] `quest`
  - [x] `sessao`
  - [ ] Outros tipos encontrados
- [ ] Comparar os arquivos reais com os templates em `_Template`.
- [ ] Registrar campos obrigatorios e opcionais por tipo.
- [ ] Identificar campos inconsistentes ou com nomes duplicados.

## Fase 2 - Modelo interno de dados

- [x] Criar tipos TypeScript base:
  - [x] `Entity`
  - [x] `EntityKind`
  - [x] `EntitySection`
  - [x] `VaultData`
- [ ] Criar tipos TypeScript especificos:
  - [ ] `Spell`
  - [ ] `Ability`
  - [ ] `Item`
  - [x] `Character`
  - [x] `CharacterEntityState`
  - [x] `CharacterResource`
  - [ ] `Npc`
  - [ ] `Group`
  - [ ] `Quest`
  - [ ] `JournalEntry`
- [x] Separar conteudo estatico de estado interativo no modelo do banco.
- [x] Definir um identificador estavel por nota:
  - [x] Caminho do arquivo
  - [x] Slug gerado a partir do caminho
  - [ ] Campo `id` futuro, se necessario
- [x] Preservar o caminho original da nota em `sourcePath`.
- [x] Preservar o corpo Markdown original em `markdownBody` no importador/banco.
- [x] Normalizar links Obsidian `[[...]]` no texto exibido.
- [x] Normalizar tags.
- [ ] Normalizar aliases.

## Fase 3 - Parser/importador das notas

- [x] Criar rotina para varrer recursivamente arquivos `.md`.
- [x] Ler arquivos sempre como UTF-8.
- [x] Extrair frontmatter YAML com parser simples inicial.
- [x] Extrair corpo Markdown.
- [x] Remover ou ignorar blocos especificos do Obsidian quando necessario:
  - [x] `INPUT[...]`
  - [x] Dataview inline como `` `= this.nome` ``
  - [x] Parte dos callouts de controle que nao fazem sentido no app
- [x] Preservar secoes uteis:
  - [x] Efeitos
  - [x] Efeitos adicionais
  - [x] Aparencia
  - [x] Personalidade
  - [x] Historico
  - [x] Notas de roleplay
- [ ] Trocar parser YAML simples por biblioteca robusta.
- [ ] Criar validacoes com `zod`.
- [x] Gerar relatorio basico de importacao:
  - [x] Quantidade de registros importados
  - [x] Avisos basicos
- [ ] Expandir relatorio de importacao:
  - [ ] Arquivos lidos
  - [ ] Arquivos ignorados
  - [ ] Erros de YAML
  - [ ] Campos ausentes
  - [ ] Links nao resolvidos

## Fase 4 - Persistencia inicial

- [x] Escolher persistencia do MVP:
  - [x] JSON local para prototipo rapido
  - [x] SQLite para estrutura mais duravel
- [x] Criar estrutura para dados importados.
- [x] Criar estrutura separada para estado interativo.
- [x] Garantir que reimportar notas nao apague estado do personagem existente.
- [x] Guardar data da ultima importacao.
- [ ] Guardar hash ou timestamp de cada arquivo importado.

## Fase 5 - Modelo de banco local

Tabelas candidatas:

- [x] `entities`
- [ ] `spells`
- [ ] `abilities`
- [ ] `items`
- [x] `characters`
- [ ] `npcs`
- [ ] `groups`
- [ ] `quests`
- [ ] `journal_entries`
- [x] `tags`
- [x] `entity_tags`
- [x] `entity_links`
- [x] `deleted_entities`
- [ ] `character_spells`
- [ ] `character_abilities`
- [ ] `character_items`
- [ ] `resources`
- [ ] `resource_state`
- [x] `character_entity_state`
- [x] `character_resources`

Tabelas auxiliares ja criadas:

- [x] `entity_sections`
- [x] `deleted_entities`
- [x] `metadata`
- [x] `import_runs`
- [x] `import_warnings`

Decisao de estrutura:

- [x] Usar um unico banco para todos os personagens.
- [x] Manter `entities` como catalogo global importado das notas.
- [x] Manter estado por personagem em tabelas separadas.
- [x] Preservar entidades manuais em reimportacoes das notas.
- [x] Preservar entidades importadas que foram editadas localmente.
- [x] Preservar exclusoes locais de entidades importadas.
- [ ] Avaliar no futuro se estados especificos merecem tabelas dedicadas, como `character_spells`, `character_items` e `character_abilities`.

Ferramentas de administracao:

- [x] Listar personagens.
- [x] Criar personagens.
- [x] Editar personagens.
- [x] Remover personagens.
- [x] Listar entidades.
- [x] Criar entidades manuais.
- [x] Editar entidades manuais.
- [x] Remover entidades manuais.
- [x] Definir estado de entidade por personagem.
- [x] Limpar estado de entidade por personagem.
- [x] Definir recursos por personagem.
- [x] Remover recursos por personagem.

Separacao importante:

- Conteudo da nota:
  - Nome
  - Nivel
  - Escola
  - Custo
  - Dano
  - Texto Markdown
  - Tags
  - Fonte
- Estado do personagem:
  - Preparada
  - Conhecida
  - Favorita
  - Equipada
  - Cargas atuais
  - Usos atuais
  - Vida atual
  - Recursos atuais

## Fase 6 - Interface MVP

- [x] Criar layout principal da ficha.
- [x] Criar navegacao por abas:
  - [x] Visao geral/ficha
  - [x] Magias
  - [x] Habilidades
  - [x] Itens
  - [x] NPCs e relacoes
  - [x] Quests
  - [x] Diario
- [x] Criar lista de magias com filtros basicos:
  - [x] Nome
  - [x] Nivel
  - [x] Acao
  - [x] Custo
  - [x] Tags
  - [ ] Escola
  - [ ] Preparada
  - [ ] Conhecida
  - [ ] Favorita
- [x] Criar lista de habilidades com filtros basicos:
  - [x] Origem
  - [x] Categoria
  - [x] Acao
  - [x] Custo
  - [x] Tags
  - [ ] Arvore
  - [ ] Desbloqueada
  - [ ] Equipada
  - [ ] Favorita
- [x] Criar inventario inicial/listagem de itens.
- [ ] Criar controles de inventario:
  - [ ] Equipado
  - [ ] Sintonizado
  - [ ] Consumivel
  - [ ] Quantidade
  - [ ] Cargas
- [x] Criar tela de detalhe para cada entidade.
- [x] Renderizar imagem de NPC/entidade quando `frontmatter.image` estiver definido.
- [x] Adicionar controles de estado por personagem na tela de detalhe:
  - [x] Favorita
  - [x] Conhecida
  - [x] Preparada
  - [x] Equipada
  - [x] Ativa
  - [x] Cargas atuais
  - [x] Usos atuais
- [x] Condicionar `cargas` e `usos` ao tipo/campos da entidade, evitando aparecer em todas as telas.
- [x] Remover input numerico de `usos` para habilidades; `usos` e `recarga` aparecem como informacao de regra.
- [x] Permitir editar tags pela tela.
- [x] Exibir tags existentes como sugestoes no editor.
- [x] Permitir selecionar tags existentes por clique.
- [x] Permitir criar nova tag digitando no campo do editor.
- [x] Mostrar acao explicita para remover tag selecionada da entidade.
- [x] Persistir tags editadas em `tags` e `entity_tags`.
- [x] Adicionar formulario de criacao de entidade manual.
- [x] Adicionar edicao de entidade manual.
- [x] Adicionar edicao local de entidades importadas.
- [x] Adicionar campo de escalonamento de dano no editor de magia.
- [x] Adicionar campos especificos de item no editor:
  - [x] Categoria
  - [x] Subcategoria
  - [x] Raridade
  - [x] Quantidade
  - [x] Cargas
  - [x] Cargas maximas
- [x] Exibir informacoes especificas de item no detalhe.
- [x] Adicionar exclusao de entidade manual.
- [x] Liberar exclusao local de entidades importadas em todas as telas de detalhe.
- [x] Adicionar criacao de personagem pela tela.
- [x] Adicionar exclusao de personagem pela tela.
- [x] Criar tela de ficha do personagem ativo:
  - [x] Resumo do personagem vinculado
  - [x] Totais de magias, habilidades e itens marcados
  - [x] Recursos editaveis
  - [x] Exclusao de recursos
  - [x] Lista de magias conhecidas/preparadas
  - [x] Lista de habilidades ativas/desbloqueadas/favoritas
  - [x] Lista de itens equipados/favoritos
  - [x] Lista de favoritos gerais
- [ ] Renderizar Markdown com links internos clicaveis.
- [x] Renderizar secoes Markdown de forma simples.

## Fase 7 - Interatividade de ficha

- [ ] Controlar recursos do personagem:
  - [x] Recursos manuais atuais e maximos
  - [ ] Vida atual e maxima como campo dedicado
  - [ ] Dados de vida
  - [ ] Espacos de magia como estrutura dedicada
  - [ ] Pontos de feiticaria como preset
  - [x] Cargas de itens via estado por entidade
  - [x] Usos por descanso via estado por entidade
- [ ] Criar botoes de descanso:
  - [ ] Descanso curto
  - [ ] Descanso longo
- [ ] Resetar recursos conforme regras configuradas.
- [ ] Permitir favoritar magias, habilidades e itens.
- [x] Permitir favoritar magias, habilidades e itens pela tela.
- [x] Permitir preparar/despreparar magias pela tela.
- [x] Permitir equipar/desequipar itens pela tela.
- [ ] Permitir marcar habilidades como ativas ou desbloqueadas.
- [ ] Criar painel rapido de acoes em combate.

## Fase 8 - Relacoes e links

- [ ] Resolver links Obsidian para entidades internas.
- [ ] Criar grafo simples de relacoes:
  - [ ] Personagem para grupo
  - [ ] NPC para grupo
  - [ ] Item para magia concedida
  - [ ] Habilidade para requisito
  - [ ] Quest para NPC/local
- [ ] Mostrar backlinks em cada entidade.
- [ ] Permitir navegar entre entidades sem sair da ficha.

## Fase 9 - Edicao dentro do app

- [ ] Decidir se o app sera somente leitura para notas ou tambem editor.
- [ ] Permitir editar apenas estado interativo no MVP.
- [ ] Depois permitir editar campos estruturados.
- [ ] Planejar exportacao de volta para Markdown, se necessario.
- [ ] Evitar sobrescrever notas manualmente editadas no Obsidian sem confirmacao.

## Fase 10 - Evolucao para Tauri

- [ ] Migrar app React para Tauri.
- [ ] Permitir escolher pasta do vault/projeto.
- [ ] Permitir importar notas por botao.
- [ ] Salvar SQLite local ao lado do app ou em pasta configurada.
- [ ] Criar build desktop.
- [ ] Testar acesso a arquivos locais no Windows.

## Fase 11 - Evolucao para banco de verdade

- [ ] Manter modelo compativel com migracao futura.
- [ ] Criar camada de repositorio para evitar acoplar UI ao SQLite.
- [ ] Escolher banco remoto:
  - [ ] PostgreSQL proprio
  - [ ] Supabase
  - [ ] Outro backend
- [ ] Criar API ou usar client oficial.
- [ ] Migrar tabelas locais para banco remoto.
- [ ] Criar autenticacao, se houver multiplos usuarios.
- [ ] Criar sincronizacao entre local e remoto, se necessario.

## Fase 12 - Qualidade e manutencao

- [ ] Criar testes para o parser.
- [ ] Criar fixtures com notas reais anonimizadas ou reduzidas.
- [x] Testar importacao com acentos, emojis e links Obsidian.
- [x] Testar geracao do banco SQLite com 65 entidades.
- [x] Testar contagens das tabelas principais:
  - [x] 65 registros em `entities`
  - [x] 330 registros em `entity_sections`
  - [x] 85 registros em `tags`
  - [x] 174 registros em `entity_tags`
  - [x] 79 registros em `entity_links`
- [x] Testar criacao das tabelas de personagem e estado.
- [x] Testar reimportacao sem perder estado com dado temporario em `character_entity_state`.
- [x] Testar CRUD de personagem com dado temporario.
- [x] Testar CRUD de entidade manual com dado temporario.
- [x] Testar CRUD de estado por personagem com dado temporario.
- [x] Testar CRUD de recurso por personagem com dado temporario.
- [x] Testar que entidade manual sobrevive a `npm run db:import`.
- [x] Testar exclusao local de entidade importada e preservacao apos `npm run db:import`.
- [x] Testar edicao de magia importada pela API.
- [x] Testar edicao do campo de escalonamento de magia pela API.
- [x] Testar edicao de campos especificos de item pela API.
- [x] Testar edicao de tags pela API.
- [x] Testar que tags editadas localmente sobrevivem a `npm run db:import`.
- [x] Testar bootstrap da API retornando tags globais.
- [x] Testar exclusao de personagem pela API.
- [x] Testar exclusao de recurso pela API.
- [x] Testar API local com `GET /api/bootstrap`.
- [x] Testar API local com `POST /api/state`.
- [x] Testar build apos criacao da tela de ficha.
- [x] Testar renderizacao simples de secoes Markdown.
- [x] Testar filtros principais de busca textual.
- [x] Testar build com `npm run build`.
- [ ] Criar backup automatico antes de operacoes destrutivas.
- [ ] Documentar formato esperado das notas.

## MVP recomendado

Escopo minimo para a primeira versao usavel:

- [x] App Vite + React + TypeScript.
- [x] Importador de Markdown/YAML.
- [x] Listagem de magias.
- [x] Listagem de habilidades.
- [x] Listagem de itens.
- [x] Tela de detalhe com Markdown renderizado de forma simples.
- [x] Filtros basicos.
- [x] Estado local para favorito, preparado, equipado e cargas via API local.
- [x] Persistencia local dos dados importados sem depender do Obsidian em tempo de execucao.

## Ordem pratica de implementacao

1. [x] Criar projeto React + TypeScript.
2. [x] Criar parser de notas.
3. [ ] Criar tipos especificos e validacoes.
4. [x] Criar tela simples de listagem.
5. [x] Criar tela de detalhe.
6. [ ] Criar estado interativo.
7. [ ] Persistir estado.
8. [ ] Melhorar UI da ficha.
9. [x] Adicionar SQLite.
10. [ ] Migrar para Tauri.
11. [ ] Planejar banco remoto.

## Perguntas em aberto

- [ ] A ficha sera para um personagem principal ou multiplos personagens?
- [ ] O app precisa editar as notas originais ou apenas importar?
- [ ] O Obsidian continuara sendo usado em paralelo?
- [ ] As regras sao D&D 5e puro, homebrew, ou sistema proprio baseado em 5e?
- [ ] O app precisa funcionar offline?
- [ ] Existe interesse futuro em usar em celular/tablet?
- [ ] O banco remoto sera necessario para sincronizar entre dispositivos ou para campanha com varios jogadores?
