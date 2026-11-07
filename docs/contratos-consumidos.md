# Contratos consumidos por el frontend (anfitrión y participante)

Fuente: Back-Proyecto2 (`src/sessions/session.contracts.ts`, `realtime/session-realtime.contracts.ts`,
DTO de `quizzes` y `profiles`). Los tipos espejo viven en `src/api/types.ts`.

## REST (Authorization: Bearer <JWT de Supabase>)

| Método | Ruta | Uso en la UI |
|---|---|---|
| GET / PATCH | `/profiles/me` | Perfil y nombre visible |
| GET / POST | `/quizzes` | Listar / crear cuestionario |
| GET / PATCH / DELETE | `/quizzes/:id` | Editor, editar datos, eliminar |
| POST | `/quizzes/:quizId/questions` | Agregar pregunta |
| PATCH / DELETE | `/questions/:id` | Editar, reordenar (`position`), eliminar |
| PUT / DELETE | `/questions/:id/image` | Subir (multipart `file`) / quitar imagen |
| POST | `/sessions` | Crear sala `{ quizId, questionDurationSeconds, reviewDurationSeconds }` |
| GET | `/sessions/history` | Historial del anfitrión: ganador, totales, aciertos/errores por pregunta y clasificación |
| GET | `/sessions/played` | Historial del participante: puesto, puntaje y si acertó cada pregunta |
| GET | `/sessions/:id` | Snapshot inicial del host (`SessionState`) |
| GET | `/sessions/:code/state` | Snapshot con `RoomEnvelope` (host o participante) |
| POST | `/sessions/join` | Participante: `{ code }` → `{ participant, session }` (idempotente) |
| DELETE | `/sessions/:id/participants/me` | Salir del lobby (solo `WAITING`) |

Errores: `{ statusCode, message, error }` (NestJS) o `{ statusCode, code, message }` (sesiones).
`src/lib/http.ts` los normaliza en `ApiError { status, code, message }`.

Códigos frecuentes del participante: `SESSION_NOT_FOUND`, `HOST_CANNOT_PARTICIPATE`,
`SESSION_NOT_JOINABLE`, `SESSION_FINISHED`, `ALREADY_IN_ACTIVE_SESSION`,
`SESSION_NOT_LEAVABLE`.

## Socket.IO

- URL: `${VITE_API_URL}/sessions`, path `/socket.io`, `auth: { token }` (JWT crudo, sin `Bearer`).
- Comandos con ack `{ ok: true, data } | { ok: false, error: { code, message } }`:
  - Host: `room:subscribe {sessionId}`, `game:start {sessionId}`, `game:advance {sessionId, expectedQuestionId}`, `game:finish {sessionId}`, `auth:refresh {token}`.
  - Participante: `room:join {code}` → `{ participant, room }`, `room:subscribe {sessionId}`, `room:leave {sessionId}`, `answer:submit {sessionQuestionId, choice}` → `{ answer: AnswerReceipt }`, `auth:refresh {token}`.
- Eventos (todos traen `RoomEnvelope`): `room:state`, `question:opened`, `question:closed`,
  `scoreboard:updated`, `game:finished`.
- `answer:submit` es idempotente: la misma elección se acepta de nuevo (ack con el recibo original);
  una elección distinta responde `ANSWER_ALREADY_SUBMITTED`. Tarde o pregunta cerrada:
  `ANSWER_TOO_LATE` / `QUESTION_NOT_OPEN`.
- El cliente descarta sobres con `sequence` menor al actual. Cada reconexión pide snapshot
  (`room:join` el participante, `room:subscribe` el host).

## Pendiente con el equipo backend

- Incluir en `CORS_ORIGIN` la URL del frontend (`http://localhost:5173` y la URL pública) y,
  si se usa el visor REST, `http://localhost:5174`.
