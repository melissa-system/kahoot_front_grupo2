# Verificación del chat contextual

Cambio OpenSpec: `openspec/changes/add-quiz-chatbot-ui`. Contratos REST propiedad del
backend P1/P2; este repo solo consume chat, lote y detalle de cuestionario.

## Resultados automatizados

- Baseline: 22 archivos / 63 pruebas Vitest. Después: 25 archivos / 85 pruebas aprobadas.
- Partida manual con dos estudiantes reales: comprobación realizada por el profesor con dos
  cuentas de estudiante, registrada como aceptada en OpenSpec (tarea 4.4).
- Vista previa grande: al abrir la propuesta, en escritorio ocupa una columna de altura
  completa junto al chat (el diálogo se amplía hasta 72 rem); en móvil tiene más altura.
  Los enunciados usan texto de 16–18 px, campos de tres líneas y botones V/F de 48 px.
  Playwright comprueba tamaño mínimo y legibilidad en ambos proyectos.
- Build y typecheck aprobados. El lint mantiene advertencias previas en componentes
  existentes; no aparecen nuevas advertencias en `features/quiz-chatbot`.
- Diez recorridos Playwright aprobados en escritorio y móvil: chatbot, propuesta plegable/ampliación, login/ruta
  protegida, registro de profesor, autoría con imagen, sala, partida y participante.
- En el flujo nuevo se genera sin guardar, se edita un enunciado, se excluye una pregunta,
  se confirma el contenido seleccionado, se impide confirmar otra vez y se comprueba
  el resultado tras recargar. También se verifica cierre/reapertura, Escape y retorno del foco.
- El botón del encabezado amplía el mismo diálogo al viewport y restaura el panel; conserva
  correcciones y foco, con contenido de ancho legible. Se verificaron dimensiones y capturas
  en escritorio y móvil. El disparador queda junto a Preguntas y la confirmación en fila completa.
- Tras verificar el recibo, el chat se cierra automáticamente sin esperar la recarga del detalle.
  La confirmación queda visible en el editor; si falla el detalle, «Actualizar listado» solo
  repite la consulta. Errores definitivos, resultados inciertos y recibos inválidos no cierran
  automáticamente el diálogo. Se prueba también el cierre tras un reintento idempotente exitoso.
- Unitarias adicionales cubren Shift+Enter/Enter, entrada vacía, cantidad solo por texto, StrictMode,
  reintento del mismo turno, borrador actualizado, respuesta antigua ignorada, UUID
  estable tras error de red, doble clic, conflicto y recarga fallida después de un commit.
- Ya no existe «Cantidad (opcional)». La propuesta comienza plegada, ofrece flecha y
  estado accesible, conserva las ediciones al plegar y se minimiza al enviar otro mensaje.
  La conversación y la revisión abierta tienen scroll independiente; se comprobó que el
  último mensaje sigue dentro del viewport al abrir la propuesta en escritorio/móvil.
- El caso «Agrega 2 países más» envía el borrador corregido y el historial, sin imponer un
  total estructurado anterior. Unitarias y E2E verifican la ampliación simulada sin guardar;
  la prueba real del backend también conservó dos preguntas anteriores y devolvió cuatro.
- Capturas del panel en escritorio/móvil y claro/oscuro; comprobación de ausencia de
  desbordamiento horizontal. Los archivos se generan en `test-results/`, no contienen
  credenciales ni datos de usuarios reales.

## Ajustes de pruebas previas

Los E2E anteriores no reflejaban el registro por roles actual: el host se registraba con
el rol estudiante por defecto y el participante usaba la cuenta profesor. Se corrigieron
fixtures y selectores exactos, conservando sus aserciones funcionales y sin modificar
registro, login, páginas de juego o reglas para hacer pasar las pruebas.

## Verificación real

La clave DeepSeek está exclusivamente en el backend y su prueba real fue exitosa.
El usuario completó `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` públicas con
`VITE_USE_MOCKS=false`; se comprobó que la clave no tiene formato de servicio.
Se agregó al backend solo `CORS_ORIGIN=http://localhost:5173` y se reinició.

`npm run test:chatbot:live -- --live` aprobó el login Supabase con la cuenta de prueba
configurada, abrió un cuestionario existente y obtuvo dos preguntas por Nest/DeepSeek.
Se editaron localmente y se consultó el detalle real para comprobar que no se guardaron.
Hubo cero POST de lote y cero peticiones directas del navegador a DeepSeek. No se capturaron
trazas/capturas reales ni se imprimieron claves, JWT, contenido generado o credenciales.

La partida manual con dos estudiantes reales queda pendiente en OpenSpec. El guardado real
en la base del usuario tampoco se ejecutó sin aprobación; los lotes sí se verificaron en
Docker y en el flujo E2E simulado. No se presentan mocks como pruebas reales ni se hace
fallback de un error del backend real a un resultado simulado.
