# Proposal: add-host-frontend (P3)

## Why
El profesor necesita preparar cuestionarios y dirigir partidas en vivo desde ProfeLink.

## What changes
- Proyecto React + TS (Vite + Tailwind) con layout ProfeLink compartido con P4.
- Login/registro Supabase, perfil, CRUD de cuestionarios y preguntas con imagen.
- Lobby y panel en vivo del anfitrión sobre Socket.IO (`/sessions`).
- Modo mock fiel a los contratos para desarrollar sin credenciales.

## Contratos consumidos
- P1: `/profiles/me`, `/quizzes`, `/quizzes/:id/questions`, `/questions/:id`, `/questions/:id/image`.
- P2: `POST /sessions`, `GET /sessions/:id`, comandos `room:subscribe`, `game:start|advance|finish`,
  `auth:refresh`; eventos `room:state`, `question:opened|closed`, `scoreboard:updated`, `game:finished`.

## Non-goals
Pantallas del participante (P4), reglas de puntaje o temporizadores (P2).
