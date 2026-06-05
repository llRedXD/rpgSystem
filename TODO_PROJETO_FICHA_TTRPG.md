# TODO - Ficha TTRPG Interativa

## Objetivo

Criar uma ficha interativa de TTRPG usando as notas existentes do Obsidian como fonte inicial de dados. O projeto deve permitir importar magias, habilidades, itens, NPCs, grupos, quests e diarios a partir dos arquivos Markdown, transformar esses dados em entidades estruturadas e oferecer uma interface mais pratica do que o Obsidian para uso em mesa.

## Decisoes iniciais recomendadas

- Stack principal: TypeScript + React.
- Primeira versao: Vite + React + TypeScript.
- Evolucao desktop: Tauri.
- Persistencia inicial: JSON local ou SQLite.
- Persistencia recomendada para evoluir: SQLite primeiro, PostgreSQL/Supabase depois.
- Parser de notas:
  - `gray-matter` para frontmatter YAML.
  - `react-markdown` ou `markdown-it` para renderizar corpo Markdown.
  - `zod` para validar e normalizar dados importados.

## Fase 1 - Levantamento das notas

- [ ] Mapear todos os diretorios relevantes:
  - [ ] `_Caracteristica`
  - [ ] `_Diario`
  - [ ] `_Habilidades`
  - [ ] `_Itens`
  - [ ] `_Magias`
  - [ ] `_Personagens`
  - [ ] `_Quest`
  - [ ] `_Template`
- [ ] Ignorar metadados que nao devem entrar no app:
  - [ ] Pastas `.space`
  - [ ] Arquivos vazios ou indices sem conteudo util
- [ ] Listar todos os tipos existentes no frontmatter:
  - [ ] `magia`
  - [ ] `habilidade`
  - [ ] `item`
  - [ ] `npc`
  - [ ] `grupo`
  - [ ] `local`
  - [ ] `quest`
  - [ ] `sessao`
  - [ ] Outros tipos encontrados
- [ ] Comparar os arquivos reais com os templates em `_Template`.
- [ ] Registrar campos obrigatorios e opcionais por tipo.
- [ ] Identificar campos inconsistentes ou com nomes duplicados.

## Fase 2 - Modelo interno de dados

- [ ] Criar tipos TypeScript para entidades principais:
  - [ ] `Spell`
  - [ ] `Ability`
  - [ ] `Item`
  - [ ] `Character`
  - [ ] `Npc`
  - [ ] `Group`
  - [ ] `Quest`
  - [ ] `JournalEntry`
- [ ] Separar conteudo estatico de estado interativo.
- [ ] Definir um identificador estavel por nota:
  - [ ] Caminho do arquivo
  - [ ] Slug gerado a partir do nome
  - [ ] Campo `id` futuro, se necessario
- [ ] Preservar o caminho original da nota em `sourcePath`.
- [ ] Preservar o corpo Markdown original em `markdownBody`.
- [ ] Normalizar links Obsidian `[[...]]`.
- [ ] Normalizar aliases e tags.

## Fase 3 - Parser/importador das notas

- [ ] Criar rotina para varrer recursivamente arquivos `.md`.
- [ ] Ler arquivos sempre como UTF-8.
- [ ] Extrair frontmatter YAML.
- [ ] Extrair corpo Markdown.
- [ ] Remover ou ignorar blocos especificos do Obsidian quando necessario:
  - [ ] `INPUT[...]`
  - [ ] Dataview inline como `` `= this.nome` ``
  - [ ] Callouts de controle que nao fazem sentido no app
- [ ] Preservar secoes uteis:
  - [ ] Efeitos
  - [ ] Efeitos adicionais
  - [ ] Aparencia
  - [ ] Personalidade
  - [ ] Historico
  - [ ] Notas de roleplay
- [ ] Criar validacoes com `zod`.
- [ ] Gerar relatorio de importacao:
  - [ ] Arquivos lidos
  - [ ] Arquivos ignorados
  - [ ] Erros de YAML
  - [ ] Campos ausentes
  - [ ] Links nao resolvidos

## Fase 4 - Persistencia inicial

- [ ] Escolher persistencia do MVP:
  - [ ] JSON local para prototipo rapido
  - [ ] SQLite para estrutura mais duravel
- [ ] Criar estrutura para dados importados.
- [ ] Criar estrutura separada para estado interativo.
- [ ] Garantir que reimportar notas nao apague estado do personagem.
- [ ] Guardar data da ultima importacao.
- [ ] Guardar hash ou timestamp de cada arquivo importado.

## Fase 5 - Modelo de banco local

Tabelas candidatas:

- [ ] `entities`
- [ ] `spells`
- [ ] `abilities`
- [ ] `items`
- [ ] `characters`
- [ ] `npcs`
- [ ] `groups`
- [ ] `quests`
- [ ] `journal_entries`
- [ ] `tags`
- [ ] `entity_tags`
- [ ] `entity_links`
- [ ] `character_spells`
- [ ] `character_abilities`
- [ ] `character_items`
- [ ] `resources`
- [ ] `resource_state`

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

- [ ] Criar layout principal da ficha.
- [ ] Criar navegacao por abas:
  - [ ] Visao geral
  - [ ] Magias
  - [ ] Habilidades
  - [ ] Itens
  - [ ] NPCs e relacoes
  - [ ] Quests
  - [ ] Diario
- [ ] Criar lista de magias com filtros:
  - [ ] Nome
  - [ ] Nivel
  - [ ] Escola
  - [ ] Acao
  - [ ] Preparada
  - [ ] Conhecida
  - [ ] Favorita
- [ ] Criar lista de habilidades com filtros:
  - [ ] Origem
  - [ ] Arvore
  - [ ] Categoria
  - [ ] Desbloqueada
  - [ ] Equipada
  - [ ] Favorita
- [ ] Criar inventario:
  - [ ] Equipado
  - [ ] Sintonizado
  - [ ] Consumivel
  - [ ] Quantidade
  - [ ] Cargas
- [ ] Criar tela de detalhe para cada entidade.
- [ ] Renderizar Markdown com links internos clicaveis.

## Fase 7 - Interatividade de ficha

- [ ] Controlar recursos do personagem:
  - [ ] Vida atual e maxima
  - [ ] Dados de vida
  - [ ] Espacos de magia
  - [ ] Pontos de feiticaria
  - [ ] Cargas de itens
  - [ ] Usos por descanso
- [ ] Criar botoes de descanso:
  - [ ] Descanso curto
  - [ ] Descanso longo
- [ ] Resetar recursos conforme regras configuradas.
- [ ] Permitir favoritar magias, habilidades e itens.
- [ ] Permitir preparar/despreparar magias.
- [ ] Permitir equipar/desequipar itens.
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
- [ ] Testar importacao com acentos, emojis e links Obsidian.
- [ ] Testar reimportacao sem perder estado.
- [ ] Testar renderizacao Markdown.
- [ ] Testar filtros principais.
- [ ] Criar backup automatico antes de operacoes destrutivas.
- [ ] Documentar formato esperado das notas.

## MVP recomendado

Escopo minimo para a primeira versao usavel:

- [ ] App Vite + React + TypeScript.
- [ ] Importador de Markdown/YAML.
- [ ] Listagem de magias.
- [ ] Listagem de habilidades.
- [ ] Listagem de itens.
- [ ] Tela de detalhe com Markdown renderizado.
- [ ] Filtros basicos.
- [ ] Estado local para favorito, preparado, equipado e cargas.
- [ ] Persistencia local sem depender do Obsidian.

## Ordem pratica de implementacao

1. Criar projeto React + TypeScript.
2. Criar parser de notas.
3. Criar tipos e validacoes.
4. Criar tela simples de listagem.
5. Criar tela de detalhe.
6. Criar estado interativo.
7. Persistir estado.
8. Melhorar UI da ficha.
9. Adicionar SQLite.
10. Migrar para Tauri.
11. Planejar banco remoto.

## Perguntas em aberto

- [ ] A ficha sera para um personagem principal ou multiplos personagens?
- [ ] O app precisa editar as notas originais ou apenas importar?
- [ ] O Obsidian continuara sendo usado em paralelo?
- [ ] As regras sao D&D 5e puro, homebrew, ou sistema proprio baseado em 5e?
- [ ] O app precisa funcionar offline?
- [ ] Existe interesse futuro em usar em celular/tablet?
- [ ] O banco remoto sera necessario para sincronizar entre dispositivos ou para campanha com varios jogadores?

