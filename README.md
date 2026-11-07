# ProfeLink · Evaluaciones en vivo (frontend)

Frontend React + TypeScript del proyecto *Evaluaciones en vivo tipo Kahoot* (Paradigmas de
Programación · EIF400 · II Ciclo 2026). Vive dentro del curso de ProfeLink como la sección
**Evaluaciones en vivo** del menú lateral.

- **Persona 3 (este módulo):** login Supabase, perfil, cuestionarios, preguntas con imagen, sala y
  panel en vivo del anfitrión.
- **Persona 4:** pantallas del participante en `/app/jugar` (placeholder listo para implementar).
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
`profe@profelink.test` / `profelink123`. En la sala aparecen 4 jugadores simulados y un botón
"Simular caída de red" para probar la reconexión. Los datos se guardan en `localStorage`.

## Scripts

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
  realtime/     sessionSocket.ts (Socket.IO /sessions + acks), useHostSession.ts
  components/ui Button, Card, Field, Modal, ConfirmDialog, Toast, Alert, Badge, EmptyState…
  layout/       AppShell (sidebar + header ProfeLink), PublicHeader, ThemeToggle
  pages/        Landing, auth/, live/ (QuizList, QuizEditor, HostSession), Profile, Join (P4)
```

## Para Persona 4 (reutilizar, no duplicar)

- `useAuth()` → `session`, `displayName`, `getToken()`, `api` (cliente REST con JWT).
- `getSupabase()` en `auth/supabaseAuth.ts`: **único** cliente Supabase.
- `createSessionSocket(getToken)` + `sendCommand(socket, 'room:join', { code })`.
- Componentes de `components/ui` y el layout `AppShell` (la ruta `/app/jugar` ya está en el menú).
- Contratos: `docs/contratos-consumidos.md`.

## Seguridad

- Solo variables `VITE_*` públicas. Nunca la service role key en el frontend.
- React no decide tiempos, puntajes ni estados: muestra los sobres del servidor y envía comandos.
- `.env.local` está en `.gitignore`.

## Documentación

- `openspec/specs/host-frontend/spec.md`: requisitos y escenarios.
- `docs/manual-anfitrion.md`: manual breve del flujo del anfitrión.
- `docs/contratos-consumidos.md`: REST y eventos usados.
