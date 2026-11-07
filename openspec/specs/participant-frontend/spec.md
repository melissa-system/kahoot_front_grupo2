# participant-frontend Specification

## Purpose
Interfaz del estudiante/participante (Persona 4): unirse a una sala por código,
responder verdadero/falso en vivo, ver corrección, puntaje y clasificación, y
recuperar el estado al reconectar. Reutiliza el cliente REST y Socket.IO de P3.

## Requirements

### Requirement: Unirse por código
La app SHALL permitir unirse con un código de 6 caracteres del alfabeto
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` mediante `POST /sessions/join { code }` y
navegar a `/app/jugar/:code`. El enlace `/app/jugar?code=` SHALL precargar el
campo. Tras un 401, el destino con query SHALL sobrevivir al login.

#### Scenario: Código inexistente
- **WHEN** el estudiante envía un código que el API no reconoce
- **THEN** se muestra un mensaje amistoso (`SESSION_NOT_FOUND`) y permanece en
  la pantalla de unirse

#### Scenario: El anfitrión intenta jugar
- **WHEN** el host de la sala escribe su propio código
- **THEN** se muestra que el anfitrión no puede participar

### Requirement: Responder V/F con ack
Durante `phase === ANSWERING` la app SHALL enviar `answer:submit
{ sessionQuestionId, choice }` y esperar el ack. La UI SHALL deshabilitar los
botones tras un envío exitoso y mostrar "Respuesta registrada". Una repetición
con la misma elección SHALL tratarse como éxito; una elección distinta SHALL
mostrarse como `ANSWER_ALREADY_SUBMITTED`.

#### Scenario: Pregunta abierta
- **WHEN** llega `question:opened`
- **THEN** se muestran enunciado, imagen y botones Verdadero/Falso, sin revelar
  `correctBoolean`

#### Scenario: Fuera de tiempo
- **WHEN** el ack es `ANSWER_TOO_LATE` o `QUESTION_NOT_OPEN`
- **THEN** se muestra un aviso y no se inventa un puntaje en el cliente

### Requirement: Revisión, cierre y clasificación
Al `question:closed` la app SHALL marcar la respuesta correcta, indicar si el
jugador acertó y mostrar el scoreboard. Al `game:finished` SHALL mostrar podio,
posición propia y ranking completo a partir de `state.results` o
`scoreboard`.

### Requirement: Reconexión sin duplicar
Cada conexión Socket.IO SHALL emitir `room:join { code }` (idempotente: el
backend reutiliza el mismo `participant.id`). La UI SHALL mostrar
conectando/reconectando/sin conexión y aplicar solo sobres con `sequence`
mayor o igual, ignorando snapshots REST viejos.

#### Scenario: Caída de red
- **WHEN** se pierde la conexión y luego vuelve
- **THEN** el jugador reaparece en la misma sala y ve el estado actual del
  servidor, sin una segunda fila de participante
