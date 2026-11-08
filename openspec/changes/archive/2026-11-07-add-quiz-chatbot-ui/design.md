## Context

Ver `proposal.md` para la motivación. `QuizEditorPage` ya carga el detalle y coordina CRUD manual, imágenes y creación de partidas. `useApi` proporciona el cliente autenticado; `HttpClient` admite transporte real/simulado. El logo y tokens claro/oscuro existen. La referencia C# aporta separación de mensajes/entrada/hook, pero sus reintentos de consultas no son adecuados para escrituras.

Se incluye diseño por el nuevo estado conversacional, la frontera de aprobación y la coordinación de un contrato REST nuevo. Su dueño es backend P1/P2: `Back-Proyecto2/openspec/changes/add-quiz-chatbot/design.md`. Este repo implementa únicamente consumidor P3, interacción, tipos, mocks y pruebas.

## Goals / Non-Goals

**Goals:** integrar con pocos cambios al editor, revisar antes de guardar, no perder correcciones entre turnos, no duplicar lotes y conservar navegación accesible y autoría manual.

**Non-Goals:** copiar estilos del chatbot del clima, llamar DeepSeek desde el navegador, persistir conversaciones entre recargas, dar autoridad al modelo sobre el guardado o modificar el frontend del estudiante.

## Decisions

### 1. Dirección visual y componentes existentes

Usuario: profesor preparando una evaluación; el trabajo principal sigue siendo revisar preguntas, no conversar. Dominio: cuestionario, afirmación, respuesta correcta, cantidad, borrador, revisión y aprobación. Mundo cromático: blanco de hoja, azul ProfeLink, verde de verdadero, rojo de falso y dorado del búho; usar sus tokens actuales, sin inventar otra paleta. Firma: el búho acompaña una propuesta V/F cuyo contador distingue preguntas propuestas, seleccionadas y guardadas.

Rechazar tres defaults: página genérica de chat → panel del propio cuestionario; robot genérico → icono ProfeLink existente; guardar automáticamente al recibir una respuesta → revisión estructurada y botón explícito. Mantener Inter, tamaños, espaciado base de 4 px y superficies/radios de la app. Azul para acción, verde/rojo solo para significado V/F. La propuesta y su botón tienen más jerarquía que metadatos de conversación; no usar color decorativo para cada mensaje.

Panel lateral de aproximadamente 440 px en escritorio y pantalla completa en móvil, con conversación desplazable que ocupa el espacio disponible, entrada fija y propuesta plegable independiente. La propuesta comienza plegada y vuelve a plegarse al enviar un turno; su botón con flecha hacia abajo permite abrirla, conserva selección/ediciones y anuncia `aria-expanded`. Al abrirla, el diálogo amplía su ancho hasta 94vw/72rem; a partir de 1024 px muestra conversación/entrada a la izquierda y una revisión de altura completa a la derecha. En móvil/tablet se apilan conversación, revisión amplia y entrada compacta, reservando al menos 9rem al área de conversación. Se elimina el límite anterior de 45%, que recortaba demasiado la revisión. Campos de tres líneas y texto de 16–18 px, controles V/F de 48 px y scroll independiente mejoran la legibilidad sin perder mensajes. Errores de guardado y acciones de recuperación permanecen visibles aunque se pliegue. Reutilizar `Button`, campos, `Alert` y logo. El `Modal` actual declara `aria-modal` pero no implementa todo el manejo de foco: componer un `<dialog>` nativo para este panel (foco inicial, Escape, retorno al disparador, título accesible), sin alterar de forma amplia los diálogos existentes. Probar a 390 px y en escritorio, claro/oscuro y teclado; respetar movimiento reducido.

Alternativa rechazada: añadir cientos de líneas de JSX y estado al editor o una burbuja flotante global visible a estudiantes.

El encabezado ofrece «Pantalla completa»/«Restaurar tamaño» junto a cerrar, con iconos accesibles y objetivos de 44 px. Amplía el diálogo al viewport, no abre pestañas ni utiliza la Fullscreen API del navegador. Conserva el borrador, el foco y el tamaño elegido mientras el editor siga montado; en móvil el ancho ya ocupa el viewport. El contenido ampliado mantiene un ancho legible, con scroll interno y entrada fija.

El disparador se ubica junto al título/contador de Preguntas. La confirmación posterior ocupa una fila completa de esa sección, no el grupo de acciones del encabezado: así no comprime el título del cuestionario ni desplaza «Editar datos»/«Jugar».

### 2. Feature modular y puntos de integración

```text
src/features/quiz-chatbot/
  QuizChatbot.tsx                  # composición y disparador/panel
  QuizChatDialog.tsx               # accesibilidad y layout
  ChatMessageList.tsx
  ChatComposer.tsx                 # mensaje libre con cantidad/ajustes por texto
  QuestionDraftReview.tsx          # selección, contador y confirmar
  DraftQuestionCard.tsx            # enunciado y respuesta local
  useQuizChat.ts                   # historial, turnos y contexto
  useQuestionBatch.ts              # snapshot de confirmación y reintento
  quizChat.types.ts                # tipos locales, no credenciales
```

Objetivo de revisión: aproximadamente 200 líneas por archivo nuevo de producción; separar por responsabilidad si crece, no por cantidad artificial de archivos. `QuizEditorPage` solo compone la feature con `quizId`/contexto y un callback de recarga; no contiene llamadas del proveedor ni bucles de herramientas. Los tipos REST y métodos van en `src/api/`, y los mocks en módulos específicos invocados por el transporte existente.

Reutilizar reglas del enunciado/VF del editor manual. No forzar el componente `QuestionEditor` a representar un lote persistido: su `onSubmit` guarda una pregunta; el nuevo editor de borrador solo actualiza estado local. Una extracción pequeña de campos/validaciones compartidos es aceptable si las pruebas mantienen el comportamiento actual.

### 3. Contrato consumido y estado de generación

Se incorporan del spec `chatbot/openspec/specs/chatbot-interface/spec.md`: Enter envía (excepto composición IME), Shift+Enter crea salto, indicador de respuesta, reintento del mismo turno sin duplicar mensajes y auto-scroll solo cuando se está al final. El modo simulado se anuncia y nunca sustituye errores del transporte real.

Añadir `api.chatbot.respond(quizId, { messages, requestedCount?, currentDraft? })` y `api.questions.createBatch(quizId, { operationId, questions })`. Usan el mismo `HttpClient`, JWT y normalización de errores. No hay variables `VITE_DEEPSEEK_*`, ni `fetch` directo en componentes ni eventos Socket.IO nuevos.

El contrato autoritativo del backend devuelve `{ reply, draft: { questions: [{ statement, correctBoolean }] } | null }` y el lote devuelve `{ operationId, questions }` con IDs y posiciones reales. Límite inicial 30 preguntas; historial hasta 40 mensajes de 2000 caracteres, último `user`, cuerpo hasta 96 KiB. La UI previene excesos, no trunca historial silenciosamente; ofrece iniciar conversación nueva conservando la propuesta tras confirmación del profesor. La cantidad se escribe en el mensaje; instrucciones contradictorias se aclaran con el asistente.

Estado por cuestionario/usuario: `idle → generating → idle|generationError`. Envío explícito desde el manejador/hook, no desde un efecto que pueda duplicarse bajo StrictMode. Deshabilitar envío y edición de propuesta mientras se genera para no sobrescribir correcciones hechas después del snapshot. Cerrar el panel no guarda ni elimina el borrador; la feature permanece montada en el editor. Cambiar de cuestionario, cerrar sesión o desmontar invalida el turno con un contador de contexto; cualquier respuesta antigua se ignora.

Cada pregunta recibe una clave solo local y selección independiente, sin confundirla con IDs de la base. `currentDraft` contiene versiones actuales retenidas, no la respuesta original del bot. `draft: null` preserva la propuesta actual. Una nueva propuesta válida reemplaza la revisión activa y se muestra antes de confirmar; las versiones anteriores del historial no tienen botones de guardado.

No hay campo de cantidad ni extracción numérica en componentes: el profesor indica «3 preguntas» o «agrega 2 países más» en su mensaje. El hook envía texto, historial y borrador retenido sin `requestedCount`; la propiedad sigue siendo opcional en el contrato REST para otros consumidores. Una ampliación devuelve el borrador completo, manteniendo las correcciones previas, no únicamente las dos preguntas nuevas.

### 4. Confirmación y resultado incierto

Al confirmar, validar selección 1..30 y campos, capturar una copia inmutable de las preguntas y crear un UUID `operationId`. Estados separados: `reviewing → saving → saved|saveError|uncertain`. Deshabilitar confirmación/edición/reenvío al bot mientras se guarda; permitir cerrar visualmente sin abandonar el estado.

En error de red o servidor después del envío, el resultado puede ser incierto: conservar la copia y UUID, bloquear su edición y ofrecer «Reintentar guardado» con el mismo cuerpo. No generar otro UUID ni permitir descartar ese estado y enviar un duplicado con otro identificador dentro del mismo editor. Errores definitivos de validación/permisos se explican sin afirmar éxito; 409 indica inconsistencia y exige revisar, no reintentar automáticamente con ID nuevo.

Después de verificar el recibo, marcar la propuesta como guardada y cerrar el diálogo devolviendo el foco al disparador, antes de recargar `GET /quizzes/:id`. La confirmación queda visible en el editor. Si falla esa recarga, ofrecer allí «Actualizar listado»: no llamar otra vez al lote ni ocultar el aviso al cerrar el chat. Errores definitivos o resultados inciertos no provocan cierre automático. Reabrir una propuesta guardada no permite volver a agregarla. El recibo reejecutado puede reflejar el momento de creación, por eso el listado procede del detalle actual del servidor. Solo una nueva propuesta deliberada abre otra revisión con un futuro UUID nuevo.

No se implementa recuperación entre recargas en esta versión; evitar prometerla y avisar al navegar si existe guardado incierto. No persistir claves ni conversaciones. La idempotencia durable del backend protege cualquier reintento que conserve su identificador.

### 5. Mocks, errores y regresión

Ampliar el transporte con rutas exactas antes del manejador genérico de preguntas; actualmente ese manejador aceptaría cualquier POST bajo `questions`, por lo que un lote podría interpretarse erróneamente como pregunta individual. Usar un mock conversacional determinista, claramente simulado, sin presentar sus respuestas como DeepSeek real; misma forma de contrato, permisos y errores. Mantener recibos por operación en el mock para verificar el reintento.

Mostrar mensajes específicos para 429/502/503/504 sin revelar payloads del proveedor. El cliente actual convierte todos los 5xx a un texto genérico; resolver el código en la feature con un mapa seguro, sin cambiar indiscriminadamente el manejo global ni mostrar detalles internos. Las pruebas deben cubrir payloads reales y simulados equivalentes.

## Risks / Trade-offs

- [Generación sobrescribe cambios locales] → snapshot y bloqueo de edición durante turno; mandar borrador vigente y descartar respuestas viejas.
- [Confirmación duplicada] → copia estable, UUID reutilizado y estado guardado separado de recarga del listado.
- [Accesibilidad incompleta del modal actual] → diálogo nativo acotado a la feature y pruebas de foco/teclado.
- [Mocks esconden diferencias de backend] → fixtures de contrato compartidos por documentación y al menos un flujo integrado con backend real autorizado.
- [Borradores perdidos al recargar] → comunicar la limitación; no afirmar persistencia que no se implementa.
- [Regresión en edición/juego] → mantener la integración pequeña y ejecutar las suites previas además del flujo nuevo.

## Migration Plan

1. Pausar después de artifacts y esperar la configuración del usuario/autorización de apply; no agregar secretos al frontend.
2. Capturar baseline de `npm run test`, `npm run typecheck`, `npm run build` y lint; registrar problemas previos sin atribuirlos al chatbot. Resolver el requisito conocido de Node si impide usar el entorno de pruebas.
3. Implementar tipos/hooks y componentes con mocks, luego integrar con el contrato backend verificado. Cada tarea tendrá prueba automatizada y manual.
4. Verificar CRUD, imágenes, orden, creación de sala y flujo de estudiantes; probar desktop/móvil y accesibilidad.
5. La reversión consiste en retirar la feature y sus nuevos métodos/rutas simuladas, sin modificar datos ni requerir cambios en participantes. No archivar/sincronizar los specs principales antes de completar y revisar el cambio.
