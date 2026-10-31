# Contratos consumidos por el frontend del anfitrión

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
| GET | `/sessions/:id` | Snapshot inicial del host |

Errores: `{ statusCode, message, error }` (NestJS) o `{ statusCode, code, message }` (sesiones).
`src/lib/http.ts` los normaliza en `ApiError { status, code, message }`.

## Socket.IO

- URL: `${VITE_API_URL}/sessions`, path `/socket.io`, `auth: { token }`.
- Comandos con ack `{ ok: true, data } | { ok: false, error: { code, message } }`:
  `room:subscribe {sessionId}`, `game:start {sessionId}`, `game:advance {sessionId, expectedQuestionId}`,
  `game:finish {sessionId}`, `auth:refresh {token}`.
- Eventos (todos traen `RoomEnvelope`): `room:state`, `question:opened`, `question:closed`,
  `scoreboard:updated`, `game:finished`.
- El host descarta sobres con `sequence` menor al actual y pide snapshot en cada reconexión.

## Pendiente con el equipo backend

- Hacer merge de `main` → `development` en Back-Proyecto2 (los sockets solo están en `main`).
- Incluir en `CORS_ORIGIN` la URL del frontend (`http://localhost:5173` y la URL pública).
