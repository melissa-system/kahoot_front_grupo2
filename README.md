# ProfeLink · Evaluaciones en vivo (frontend)

Frontend React + TypeScript del proyecto *Evaluaciones en vivo tipo Kahoot* (Paradigmas de
Programación · EIF400 · II Ciclo 2026). Vive dentro del curso de ProfeLink como la sección
**Evaluaciones en vivo** del menú lateral.

- **Persona 3:** login Supabase, perfil, cuestionarios, preguntas con imagen, sala y panel en vivo del anfitrión.
- **Persona 4:** pantallas del participante en `/app/jugar` (unirse, responder, resultados, reconexión) y visor REST independiente.
- API: [Back-Proyecto2](https://github.com/Luz-Davila/Back-Proyecto2) (NestJS, REST + Socket.IO).

## Requisitos

- Node.js 22+ y npm 10+
- La API corriendo (por defecto en `http://localhost:3000`) con `CORS_ORIGIN=http://localhost:5173`
- Proyecto Supabase (URL + clave **pública** anon/publishable)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173
```

### Modo demo (sin Supabase ni API)

Si faltan las variables de Supabase, o `VITE_USE_MOCKS=true`, la app usa un **backend simulado** que
respeta los mismos contratos (rutas, validaciones, errores y eventos). Usuario:
`profe@profelink.test` / `profelink123`. En la sala del anfitrión aparecen 4 jugadores simulados y un
botón "Simular caída de red". En **Unirse a una sala**, el código `PLAY23` abre una partida demo que
empieza sola a los ~4 s. El historial incluye partidas de ejemplo con Valeria, Diego, Camila y Andrés.
Los datos se guardan en `localStorage`.

## Scripts

### Chat bot del profesor

Dentro de un cuestionario ya creado, pulsa **Chat bot** (icono ProfeLink). Indica tema, nivel opcional,
cantidad de 1 a 30 o pega tus afirmaciones. Enter envía y Shift+Enter agrega una línea. Revisa la
propuesta, corrige enunciados/respuestas V/F y desmarca lo que no quieras incluir; solo
**Agregar al cuestionario** guarda las preguntas seleccionadas al final del listado.

La clave DeepSeek va únicamente en el `.env` del backend, nunca en variables `VITE_*`.
El modo demo se anuncia como **simulado** y no consulta DeepSeek ni sustituye fallos del modo real.
El historial/borrador se conserva al cerrar el panel, pero no al recargar o cambiar de cuenta/cuestionario.
En un resultado de guardado incierto, reintenta el mismo lote sin editarlo para evitar duplicados.
Si se guardó pero falló la recarga, usa **Actualizar listado**, no otra confirmación.

La feature es modular en `src/features/quiz-chatbot/`. Consume el contrato REST de backend P1/P2:
`POST /quizzes/:quizId/chat`, `POST /quizzes/:quizId/questions/batch` y `GET /quizzes/:id`.
El backend debe tener aplicada la migración `AddQuestionBatchOperations` antes de confirmar lotes.
Revisa siempre la exactitud del contenido propuesto por la IA.

Prueba real opcional de navegador, con servidores levantados y la cuenta `TEST_USER_*` de profesor
configurada en el backend (requiere un cuestionario existente). Usa DeepSeek y consume saldo,
pero **no crea cuestionarios ni confirma lotes**; comprueba que el borrador es editable y que
las preguntas guardadas no cambian. No imprime credenciales ni genera trazas con tokens:

```bash
npm run test:chatbot:live -- --live
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm test` | Pruebas unitarias/componentes (Vitest + Testing Library) |
| `npm run test:e2e` | E2E Playwright escritorio + móvil (modo demo; primera vez: `npx playwright install chromium`) |
| `npm run lint` | oxlint |

## Estructura

```
src/
  api/          client.ts (REST tipado), types.ts (contratos), mock/ (backend simulado)
  auth/         AuthProvider + useAuth (sesión, token, api), ProtectedRoute, supabaseAuth
  realtime/     sessionSocket.ts, useHostSession.ts, useParticipantSession.ts
  components/   ui/ + live/ (ConnectionBanner, CountdownRing, Ranking)
  layout/       AppShell (sidebar + header ProfeLink), PublicHeader, ThemeToggle
  pages/        Landing, auth/, live/ (anfitrión), play/ (JoinPage, PlaySessionPage), Profile
  clients/      rest-viewer/ (HTML+JS independiente)
```

## Persona 4 · participante

Rutas (requieren sesión):

| Ruta | Pantalla |
|---|---|
| `/app/evaluaciones/historial` | Historial de kahoots: ganador, puntos, aciertos y errores |
| `/app/jugar` | Escribir código (se precarga `?code=` del enlace del host) |
| `/app/jugar/:code` | Lobby → V/F → revisión → clasificación |

Flujo: `POST /sessions/join` → Socket.IO `room:join` (idempotente, cubre reconexión) →
`answer:submit` con ack → eventos `question:opened` / `question:closed` / `game:finished`.

Modo mock: entra con el usuario demo, código **`PLAY23`**. La sala arranca sola; un humano basta
para cerrar la pregunta al responder.

### Cliente REST independiente

`clients/rest-viewer/` consulta `GET /auth/me` y `GET /sessions/:code/state` sin React ni sockets.

```bash
npx serve clients/rest-viewer -l 5174
```

Agrega `http://localhost:5174` a `CORS_ORIGIN` del API. Detalle en `clients/rest-viewer/README.md`.

### Prueba multi-dispositivo (API real)

1. API y frontend en el mismo Wi-Fi. En el front, `VITE_API_URL=http://<IP-del-host>:3000`.
2. En el backend, `CORS_ORIGIN=http://localhost:5173,http://<IP-del-host>:5173`.
3. Navegador A (anfitrión): crea la sala y copia el código.
4. Navegador B o el teléfono (estudiante): `/app/jugar`, mismo código, responde V/F.
5. Apaga datos un momento y vuelve: debe reconectar con `room:join` sin duplicar al jugador.

## Seguridad

- Solo variables `VITE_*` públicas. Nunca la service role key en el frontend.
- React no decide tiempos, puntajes ni estados: muestra los sobres del servidor y envía comandos.
- `.env.local` está en `.gitignore`.

## Documentación

- `openspec/specs/host-frontend/spec.md` y `openspec/specs/participant-frontend/spec.md`.
- `docs/manual-anfitrion.md`: manual breve del flujo del anfitrión.
- `docs/contratos-consumidos.md`: REST y eventos usados (host y participante).
