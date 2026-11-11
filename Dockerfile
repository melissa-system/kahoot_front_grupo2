# Build estático del frontend. Las variables VITE_* se fijan en build.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# API local por defecto. Para otro entorno, usar --build-arg VITE_API_URL=...
ARG VITE_API_URL=http://localhost:3000
# Solo configuracion PUBLICA de Supabase; nunca service_role ni claves secretas.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_USE_MOCKS=false
ENV VITE_API_URL=$VITE_API_URL VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY VITE_USE_MOCKS=$VITE_USE_MOCKS
# Evitar una imagen aparentemente real que active los mocks por falta de variables.
# La demo sigue siendo explicita: --build-arg VITE_USE_MOCKS=true.
RUN if [ "$VITE_USE_MOCKS" != "true" ]; then \
      if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then \
        echo "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY publicas para el build real." >&2; \
        exit 1; \
      fi; \
    fi
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
