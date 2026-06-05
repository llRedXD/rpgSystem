---
tipo: npc
nome:
titulo:
raca:
classe:
origem:
faccao:
localizacao:
relacao:
conexao: []
status:
vivo: true
hostil: false
aliado: false
importancia:
primeiro_encontro:
ultima_interacao:
image:
icone:
tags: []
aliases: []
---
## 🎛️ Controle de Relação  
  
> [!tip]- Estado  
> **Aliado:** `INPUT[toggle:aliado]`  
> **Hostil:** `INPUT[toggle:hostil]`  
> **Vivo:** `INPUT[toggle:vivo]`  
> **Importância:** `INPUT[inlineSelect(option(baixa), option(media), option(alta), option(critica)):importancia]`  
> **Relação:** `INPUT[text:relacao]`
# `= this.file.name`

> [!info]- Resumo rápido
> **Raça:** `= this.raca`
> **Classe:** `= this.classe`
> **Relação:** `= this.relacao`
> **Conexão:** `= this.conexao`
> **Localização:** `= this.localizacao`
> **Status:** `= this.status`

## 👤 Aparência

Descrição física do NPC.

---

## 🧠 Personalidade

Como ele age, fala ou se comporta.

---

## 🔗 Relação com o Personagem

Como ele se conecta ao personagem ou à party.

---

## 📜 Histórico

Eventos importantes envolvendo esse NPC.

---

## 💀 Notas de Roleplay

Frases, impressões, detalhes marcantes ou mistérios.