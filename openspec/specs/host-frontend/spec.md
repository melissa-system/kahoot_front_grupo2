# host-frontend Specification

## Purpose
Interfaz del profesor/anfitrión (Persona 3): identidad, cuestionarios con imágenes,
creación de salas y conducción de la partida en vivo dentro del curso de ProfeLink.

## Requirements

### Requirement: Sesión con Supabase y rutas protegidas
La app SHALL registrar, iniciar y cerrar sesión con supabase-js, recuperar la sesión al recargar y
enviar el JWT en `Authorization: Bearer` a la API. Las rutas bajo `/app` SHALL requerir sesión.

#### Scenario: Ruta privada sin sesión
- **WHEN** un visitante sin sesión abre `/app/evaluaciones`
- **THEN** se le redirige a `/login` y, al entrar, vuelve al destino original

#### Scenario: Recarga de página
- **WHEN** un usuario autenticado recarga el navegador
- **THEN** la sesión se mantiene y no se le pide iniciar sesión otra vez

#### Scenario: Token rechazado
- **WHEN** la API responde 401
- **THEN** se cierra la sesión local y se muestra la pantalla de login

### Requirement: Perfil visible
La app SHALL mostrar y permitir editar el `displayName` mediante `GET/PATCH /profiles/me`
con validación de 2 a 40 caracteres antes de enviar.

#### Scenario: Nombre inválido
- **WHEN** el usuario guarda un nombre de 1 carácter
- **THEN** se muestra el error en el campo y no se llama a la API

### Requirement: CRUD de cuestionarios
La app SHALL listar, crear, editar y eliminar cuestionarios propios (`/quizzes`), validando
título (3-120) y descripción (≤500) igual que los DTO del backend, y pedir confirmación al eliminar.

#### Scenario: Creación válida
- **WHEN** el profesor crea un cuestionario con título válido
- **THEN** se abre su editor para agregar preguntas

#### Scenario: Cuestionario ajeno o inexistente
- **WHEN** se abre `/app/evaluaciones/:id` y la API responde 404/403
- **THEN** se muestra un estado vacío comprensible con enlace de regreso

### Requirement: Editor de preguntas V/F con imagen
La app SHALL crear, editar, reordenar y eliminar preguntas de verdadero/falso y subir una imagen
opcional (`PUT /questions/:id/image`, multipart `file`) mostrando vista previa y la regla
"JPG, PNG o WebP · máximo 2 MB" antes de subir. El backend vuelve a validar.

#### Scenario: Archivo no permitido
- **WHEN** se elige un GIF o un archivo de más de 2 MB
- **THEN** se rechaza en el navegador con un mensaje claro y no se sube

#### Scenario: Falla al subir imagen
- **WHEN** la pregunta se crea pero la subida falla
- **THEN** la pregunta queda guardada y se avisa que la imagen no se guardó

### Requirement: Crear sala y lobby en vivo
La app SHALL crear la sala con `POST /sessions` (duración de pregunta 5-120 s y revisión 3-15 s),
conectarse a `/sessions` con `handshake.auth.token`, suscribirse con `room:subscribe` y mostrar
código, enlace y participantes actualizados por `room:state`.

#### Scenario: Sin participantes
- **WHEN** no hay participantes en la sala
- **THEN** el botón "Iniciar partida" está deshabilitado y se explica por qué

### Requirement: Conducción de la partida sin autoridad del navegador
La app SHALL enviar `game:start`, `game:advance` (con `expectedQuestionId`) y `game:finish`, y
mostrar únicamente lo que llega en los sobres del servidor. El temporizador SHALL basarse en
`remainingMs` del servidor. La respuesta correcta SHALL mostrarse solo cuando la pregunta llega `CLOSED`.

#### Scenario: Pregunta abierta
- **WHEN** llega `question:opened`
- **THEN** se muestran enunciado, imagen y tiempo, sin revelar la respuesta

#### Scenario: Revisión
- **WHEN** llega `question:closed`
- **THEN** se resalta la respuesta correcta y la clasificación acumulada; "Siguiente" se habilita al terminar la revisión

#### Scenario: Comando rechazado
- **WHEN** el servidor responde un ack `{ ok: false, error }`
- **THEN** se muestra un mensaje legible y el estado no cambia localmente

### Requirement: Reconexión y estado consistente
Ante desconexión la app SHALL mostrar "Reconectando…"/"Sin conexión", reintentar con token
renovado y pedir snapshot (`room:subscribe`) al reconectar, descartando sobres con `sequence` menor.

#### Scenario: Caída de red durante la partida
- **WHEN** se pierde la conexión y luego vuelve
- **THEN** se muestra el estado actual del servidor sin duplicar la partida
