## Why

El profesor necesita convertir sus instrucciones en preguntas sin abandonar el editor, revisar las respuestas y corregirlas antes de guardar. Un chat contextual de ProfeLink evita que una generación automática modifique el cuestionario sin aprobación.

## What Changes

- Agregar el botón «Chat bot» con el icono existente de ProfeLink dentro del editor de un cuestionario ya creado y propio del profesor.
- Abrir un panel lateral en escritorio y un diálogo de ancho completo en móvil, con conversación en español y estados accesibles; ofrecer un botón visible de pantalla completa/restaurar dentro del mismo diálogo.
- Permitir indicar tema, cantidad, nivel opcional o afirmaciones concretas, y solicitar ajustes posteriores.
- Indicar la cantidad únicamente en el mensaje, sin campo «Cantidad (opcional)». Mostrar la propuesta plegable con flecha y mantener la conversación visible al seguir hablando.
- Mostrar propuestas de verdadero/falso editables: cambiar enunciado/respuesta, excluir preguntas y agregar únicamente la versión revisada con «Agregar al cuestionario».
- Cerrar el chat solo después de verificar el recibo de guardado, conservar la confirmación en el editor y permitir actualizar el listado sin reenviar el lote si falla la recarga.
- Separar componentes de mensajes, entrada y propuesta; encapsular conversación y guardado en hooks, sin hacer crecer el editor con lógica del proveedor.
- Conservar CRUD manual, imágenes, orden, creación de salas y comportamiento de partidas; ampliar el transporte simulado y cubrir regresiones.

## Capabilities

### New Capabilities

Ninguna; se amplía la experiencia existente del profesor.

### Modified Capabilities

- `host-frontend`: chat contextual, solicitud por cantidad o lista, revisión editable, confirmación y recuperación de errores sin duplicar preguntas.

## Impact

- `src/pages/live/QuizEditorPage.tsx`, nuevos componentes/hooks de `src/features/quiz-chatbot/`, tipos y métodos del cliente API, mocks y pruebas Vitest/Playwright.
- Se consumen `POST /quizzes/:quizId/chat`, `POST /quizzes/:quizId/questions/batch` y el detalle existente `GET /quizzes/:id`. Dueño del contrato REST: backend P1/P2, definido en `Back-Proyecto2/openspec/changes/add-quiz-chatbot`; frontend P3 lo consume, no lo redefine.
- Se reutilizan `useApi`, JWT de Supabase, logo y tokens/componentes actuales. No se incluyen claves DeepSeek ni variables secretas en Vite.
- Sin cambios en `participant-frontend`, eventos Socket.IO ni reglas de puntuación/temporización.
- Fuera de alcance: historial persistente entre recargas, generación de imágenes, opción múltiple y edición/eliminación de preguntas ya guardadas desde el bot.
