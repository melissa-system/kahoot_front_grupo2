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

### Requirement: Composición y lectura de conversación

El chat SHALL enviar con Enter y permitir salto de línea con Shift+Enter, sin enviar mensajes vacíos ni durante una respuesta pendiente. SHALL mostrar mensajes en orden y un indicador de respuesta en curso. El desplazamiento automático SHALL respetar al profesor que está leyendo mensajes anteriores. Un reintento de generación SHALL reutilizar el turno fallido sin duplicar su mensaje.

#### Scenario: Teclado y reintento por turno
- **WHEN** el profesor agrega un salto con Shift+Enter, envía con Enter y reintenta tras un error
- **THEN** el salto no envía el mensaje y el reintento conserva un único mensaje del profesor en el historial

### Requirement: Simulación explícita sin ocultar fallos reales

El modo simulado SHALL seleccionarse mediante la configuración existente y anunciarse en el chat. Si el modo real falla, la interfaz no SHALL sustituirlo automáticamente por respuestas simuladas.

#### Scenario: Backend real no disponible
- **WHEN** el modo simulado está desactivado y falla el backend
- **THEN** se muestra el error recuperable y no aparece una propuesta simulada como si fuera real

### Requirement: Acceso contextual al chat del profesor

El editor de un cuestionario propio ya creado SHALL mostrar al profesor un botón «Chat bot» con el icono existente de ProfeLink. SHALL abrir una interfaz contextual adaptada a escritorio y móvil sin abandonar el cuestionario. El diálogo SHALL ofrecer navegación por teclado, gestión de foco, cierre accesible y mensajes de estado legibles.

#### Scenario: Abrir desde el editor
- **WHEN** el profesor pulsa «Chat bot» en su cuestionario
- **THEN** ve el icono de ProfeLink, la conversación y el área para describir las preguntas sin navegar a otra página

#### Scenario: Uso en móvil y teclado
- **WHEN** se abre el chat a 390 píxeles de ancho o se navega solo con teclado
- **THEN** no hay desbordamiento horizontal, se puede completar el flujo, el foco queda en el diálogo y vuelve al botón al cerrarlo

#### Scenario: Ampliar y restaurar el chat
- **WHEN** el profesor activa el botón visible «Pantalla completa» y luego «Restaurar tamaño»
- **THEN** el mismo diálogo ocupa el viewport y vuelve a su tamaño lateral, sin perder mensajes, correcciones ni foco; el control anuncia su estado y Escape sigue cerrando el chat

### Requirement: Solicitud por tema, cantidad o preguntas aportadas

El chat SHALL permitir escribir un tema, cantidad y nivel opcional, o una lista de afirmaciones concretas, en el mensaje, sin un campo separado de cantidad. SHALL consumir `POST /quizzes/:quizId/chat` con el JWT actual, historial y borrador editado, sin enviar claves del proveedor ni imponer una cantidad estructurada a turnos posteriores. SHALL mostrar las aclaraciones del asistente cuando falten datos y permitir pedir ajustes posteriores.

#### Scenario: Solicitud con cantidad
- **WHEN** el profesor indica tema y cantidad 10
- **THEN** se envía el mensaje que contiene esa cantidad, sin `requestedCount`, y se muestra la propuesta validada devuelta por la API

#### Scenario: Solicitud con lista
- **WHEN** el profesor pega una lista de afirmaciones en el mensaje
- **THEN** puede enviarlas al asistente y revisar la propuesta o las aclaraciones recibidas

#### Scenario: Cantidad fuera de límite en el mensaje
- **WHEN** el profesor solicita más de 30 preguntas en el mensaje
- **THEN** se muestra la aclaración o error seguro del asistente sin truncar ni guardar automáticamente

### Requirement: Propuesta plegable sin ocultar la conversación

La propuesta SHALL comenzar plegada con contador y botón de flecha hacia abajo, y SHALL permitir abrir/cerrar con teclado y anunciar su estado. Plegar no SHALL descartar preguntas ni correcciones. Enviar otro mensaje SHALL plegarla dejando espacio para leer la respuesta; abierta SHALL tener scroll y altura acotada para mantener mensajes y entrada accesibles. Los errores de guardado y su recuperación no SHALL ocultarse al plegar.

#### Scenario: Continuar conversando y ampliar una propuesta
- **WHEN** el profesor abre y corrige una propuesta, la pliega y solicita «agrega 2 países más»
- **THEN** se envían historial y borrador corregido, se ve el nuevo mensaje del asistente con la propuesta plegada y al abrirla aparecen las preguntas anteriores y las nuevas sin guardar ninguna

#### Scenario: Vista previa grande y legible
- **WHEN** el profesor abre la propuesta en escritorio o móvil
- **THEN** en escritorio dispone de una columna amplia de altura completa junto al chat, y en móvil de un área de revisión más alta con entrada compacta; los enunciados tienen al menos 16 px y campos de tres líneas, sin desbordamiento horizontal ni pérdida de edición, mensajes, plegado o guardado

### Requirement: Revisión editable antes de persistir

La propuesta SHALL mostrarse separada de los mensajes, con enunciado editable, respuesta verdadero/falso y selección de preguntas a incluir. SHALL mostrar la cantidad seleccionada y permitir descartar la propuesta. Ninguna generación, edición de borrador, exclusión o cierre del chat SHALL guardar preguntas. Pedir otra revisión SHALL enviar la versión local actual y mostrar sus cambios antes de permitir aprobarla.

#### Scenario: Corregir antes de agregar
- **WHEN** el profesor cambia un enunciado, corrige una respuesta y excluye dos preguntas
- **THEN** esos cambios quedan en la propuesta local y el cuestionario guardado permanece intacto

#### Scenario: Aclaración sin propuesta nueva
- **WHEN** la API responde con `draft: null`
- **THEN** se muestra la respuesta y se conserva la propuesta local que ya existía

#### Scenario: Volver a pedir ajustes
- **WHEN** el profesor solicita «simplifica la tercera» después de una edición manual
- **THEN** se envía el borrador actualizado, no la versión original, y las propuestas antiguas no se pueden confirmar accidentalmente

### Requirement: Confirmación explícita y recibo de guardado

Solo «Agregar al cuestionario» SHALL enviar las preguntas seleccionadas y editadas a `POST /quizzes/:quizId/questions/batch`. SHALL impedir el envío vacío o inválido y dobles confirmaciones. Al verificar el recibo de éxito SHALL marcar la propuesta como agregada, cerrar automáticamente el chat devolviendo el foco al disparador e informar el éxito en el editor, y refrescar el cuestionario mediante su detalle actual, sin depender de que el modelo declare éxito. Los errores y resultados inciertos no SHALL cerrar automáticamente el chat.

#### Scenario: Confirmación válida
- **WHEN** el profesor aprueba ocho preguntas seleccionadas
- **THEN** se envían exactamente esas ocho versiones, se cierra el chat, se informa el resultado real en el editor y se actualiza el listado sin reemplazar preguntas anteriores

#### Scenario: Propuesta ya agregada o selección vacía
- **WHEN** no hay preguntas seleccionadas o la propuesta ya fue confirmada
- **THEN** «Agregar al cuestionario» no vuelve a crear preguntas

### Requirement: Recuperación segura y aislamiento de borradores

La interfaz SHALL distinguir generación, guardado y error, conservar el contenido ante fallos recuperables y usar el mismo identificador y contenido para reintentar una confirmación de resultado incierto. Mientras esa confirmación esté pendiente o sea incierta SHALL bloquear cambios en el lote a reenviar y ofrecer reintentar. SHALL descartar borradores al cambiar de cuestionario o usuario, ignorar respuestas antiguas y conservarlos al cerrar/reabrir el chat en el mismo editor. El historial no SHALL persistirse entre recargas en esta versión.

#### Scenario: Respuesta de guardado perdida
- **WHEN** falla la red después de enviar la confirmación
- **THEN** el chat permanece abierto y se conserva el lote congelado y su identificador para reintentar sin duplicados, sin afirmar que no se guardó

#### Scenario: Guardado confirmado pero detalle no disponible
- **WHEN** la API confirma el lote y luego falla la recarga del cuestionario
- **THEN** el chat se cierra y en el editor se informa que las preguntas están guardadas y se ofrece actualizar el listado, no volver a agregarlas

#### Scenario: Respuesta de otro contexto
- **WHEN** cambia el cuestionario o usuario antes de terminar una solicitud
- **THEN** la respuesta anterior no aparece ni modifica la nueva pantalla

### Requirement: Continuidad del editor manual y del juego

El chat SHALL ser opcional y los flujos previos de autoría manual, imágenes, orden, creación de salas y juego SHALL conservar su comportamiento aunque falle o no esté configurado el asistente. Los errores del chat SHALL mostrarse en su contexto sin bloquear el resto del editor, salvo las acciones que compitan con una solicitud de guardado en curso.

#### Scenario: Asistente no disponible
- **WHEN** la API devuelve 429, 502, 503 o 504 en el chat
- **THEN** aparece un mensaje comprensible, se conserva el borrador y el profesor puede seguir usando la autoría manual y crear partidas

