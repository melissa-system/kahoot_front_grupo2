# Visor REST de sala (Persona 4)

Página estática (HTML + JS, sin build) que inicia sesión con Supabase y consulta
`GET /sessions/:code/state` cada 3 s. Sirve para demostrar el cliente REST
independiente del frontend React.

## Cómo usarlo

1. En la raíz de este frontend:

```bash
npx serve clients/rest-viewer -l 5174
```

2. En el backend, incluye ese origen en CORS:

```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

No abras el HTML como `file://`: el API rechaza ese origen.

3. Completa API URL (`http://localhost:3000`), URL y anon key de Supabase, y
   un usuario existente. Tras el login se llama a `GET /auth/me` y, con un
   código de sala, a `GET /sessions/:code/state`.

Debes ser anfitrión o participante de esa sala; si no, el API responde
`SESSION_NOT_FOUND`.
