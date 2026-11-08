## 1. Baseline y contrato backend

- [x] 1.1 Retomar tras autorización de apply y registrar baseline de tests/typecheck/build/lint con Node compatible. Automatizada: suites Vitest previas y compilación; manual: abrir editor, agregar/editar/reordenar/eliminar una pregunta y verificar imágenes antes de cambios.
- [x] 1.2 Añadir tipos y métodos del cliente para chat/lote según el contrato P1/P2, sin secretos ni `fetch` directo en pantallas. Automatizada: Vitest verifica ruta, JWT, cuerpo, errores y shapes; manual: inspeccionar Network y confirmar que solo se llama al backend y no a DeepSeek.

## 2. Mocks y estado modular

- [x] 2.1 Extraer mocks de chat/lote con rutas exactas, respuestas deterministas, permisos y recibos idempotentes, conservando rutas previas. Automatizada: Vitest prueba contrato, replay/409 y que lote no cae en creación individual; manual: generar/agregar un lote en modo simulado y luego agregar una pregunta manual.
- [x] 2.2 Crear hook de conversación con envío explícito, historial, cantidad por texto, snapshot editado y protección contra respuestas viejas. Automatizada: Vitest cubre StrictMode, un solo envío, aclaraciones, 400/429/502/503/504 y cambio de usuario/cuestionario; manual: enviar tema/cantidad/lista, cerrar/reabrir y pedir otro ajuste.
- [x] 2.3 Crear hook de guardado separado con snapshot inmutable, UUID estable y estados guardado/incierto/recarga fallida. Automatizada: Vitest simula respuesta perdida, doble clic, replay, 409 y error de detalle posterior al éxito; manual: interrumpir la respuesta y reintentar sin cambiar preguntas ni duplicar el lote.

## 3. Panel, mensajes y propuesta editable

- [x] 3.1 Crear diálogo/panel contextual con botón «Chat bot», logo existente, foco, Escape y retorno al disparador, usando tokens de la app. Automatizada: Vitest/Playwright verifica roles, nombre accesible, foco y cierre; manual: recorrer todo con teclado en claro/oscuro y a 390 px sin desbordamientos.
- [x] 3.2 Crear componentes separados de mensajes/entrada con tema/cantidad por texto y estados de espera/error. Automatizada: Vitest prueba mensajes vacíos/excesivos, envío bloqueado y estado anunciado; manual: solicitar diez preguntas, pegar una lista y comprobar que faltantes se aclaran sin perder el contenido escrito. El campo numérico inicial se retiró en 6.1.
- [x] 3.3 Crear tarjetas de propuesta con campos locales de enunciado/VF, selección, contador y descarte. Automatizada: Vitest comprueba edición/exclusión, validación, `draft: null`, borrador enviado tras ajustes y ninguna persistencia previa; manual: corregir una respuesta, excluir dos preguntas y comprobar que aún no aparecen guardadas en el editor.
- [x] 3.4 Integrar «Agregar al cuestionario» con el hook de lote y recarga del detalle; bloquear propuestas guardadas/selección vacía/operación incierta. Automatizada: Vitest verifica cuerpo editado exacto, UUID reutilizado y recarga sin volver a guardar; manual: aprobar ocho de diez y comprobar orden final, contenido y mensaje de confirmación real.

## 4. Integración pequeña y regresiones

- [x] 4.1 Componer la feature dentro de `QuizEditorPage`, aislar estado por usuario/cuestionario y mantener autoría manual independiente. Automatizada: Vitest/Playwright prueba integración, permisos, cierre/reapertura y asistente no configurado; manual: usar CRUD e imágenes con el chat abierto/cerrado y con error 503, y verificar que un estudiante no ve el disparador.
- [x] 4.2 Implementar manejo local seguro de errores, límites de historial y aviso de guardado incierto al navegar sin alterar el cliente global innecesariamente. Automatizada: Vitest verifica mensajes por código, conservación de borrador, cambio de contexto e historial límite; manual: provocar timeout/red caída y comprobar acciones claras, sin secretos ni falso mensaje de «no guardado».
- [x] 4.3 Añadir E2E de tema/cantidad → propuesta → edición → confirmación y casos de reintento; coordinar smoke test real solo después de backend verificado y permiso. Automatizada: Playwright con mocks y fixtures del contrato real; manual: repetir el flujo con backend/DeepSeek configurado, autorizando expresamente cualquier escritura y sin compartir credenciales.
- [x] 4.4 Ejecutar regresiones y revisar modularidad/documentación con el cambio backend. Automatizada: Vitest completo, Playwright de CRUD/imágenes/orden/salas/participantes y typecheck/build/lint; manual: partida host con dos estudiantes y revisión desktop/móvil/claro/oscuro. Registrar bloqueos o fallos previos; no sincronizar/archivar specs hasta aprobación.

## 5. Ampliación y cierre después de guardar

- [x] 5.1 Agregar control accesible de pantalla completa/restaurar al diálogo conservando foco, borrador y estilo. Verificar teclado, escritorio y móvil.
- [x] 5.2 Cerrar solo tras recibo verificado; mostrar confirmación y recuperación de recarga fuera del chat, sin duplicar lotes. Cubrir éxito, errores definitivos/inciertos y reapertura.
- [x] 5.3 Actualizar pruebas y documentación; ejecutar Vitest, Playwright, build, lint y validación OpenSpec, y revisar capturas escritorio/móvil.

## 6. Conversación visible y propuesta plegable

- [x] 6.1 Quitar cantidad opcional del compositor y enviar cantidades solo como texto; adaptar unitarias, E2E y smoke sin romper el contrato REST opcional.
- [x] 6.2 Separar scroll de mensajes y propuesta; añadir flecha accesible para plegar/abrir, preservar correcciones y plegar al enviar. Cubrir ampliación de dos preguntas con historial vigente y recuperación de guardado.
- [x] 6.3 Ajustar mock explícito para ampliaciones y verificar escritorio/móvil, pruebas, build y OpenSpec; coordinar instrucciones de refinamiento con backend.

## 7. Vista previa de mayor tamaño (solo frontend)

- [x] 7.1 Ampliar la revisión con columnas en escritorio, más altura en móvil y tipografía/campos legibles; conservar conversación, plegado, foco y guardado sin cambios backend.
- [x] 7.2 Verificar dimensiones y legibilidad mediante Playwright escritorio/móvil, revisar capturas y ejecutar unitarias, build, lint y validación OpenSpec.

## Evidencia y pendientes de verificación

- Baseline: 63 pruebas Vitest; después de propuesta plegable y cantidad por texto, 85 aprobadas. Build y typecheck pasan; lint conserva advertencias previas, sin nuevas advertencias en la feature.
- Playwright: diez recorridos aprobados en escritorio/móvil (chat, ampliación con propuesta plegable, autoría con imágenes, juego y participante). Se actualizaron fixtures E2E anteriores para elegir profesor al registrarse, usar cuenta estudiante y localizar textos inequívocos; no se modificaron registro/login/juego para hacerlos pasar.
- Revisión de capturas claro/oscuro y prueba de Escape/foco/reapertura realizadas. Pruebas automáticas de reintento/resultado incierto usan mocks; no se simula haber realizado esas interrupciones en una cuenta real.
- Refinamiento: Playwright verifica dimensiones del viewport al ampliar, restauración, correcciones conservadas, cierre automático, foco, reapertura sin duplicado y ausencia de desbordamiento después de guardar. Capturas de pantalla completa y confirmación revisadas en escritorio/móvil. Vitest cubre espera del recibo, detalle pendiente/fallido, error definitivo, recibo inválido y reintento del mismo lote antes de cerrar.
- Propuesta plegable: pruebas verifican ausencia de campo numérico y `requestedCount`, flecha/teclado, correcciones preservadas, ampliación 2→4 sin persistencia y mensajes visibles incluso con revisión abierta. Se mantiene scroll al último mensaje si el profesor estaba al final al cambiar el tamaño; no se fuerza al que lee mensajes anteriores. Capturas revisadas en ambos tamaños.
- El usuario completó las variables públicas del frontend. Se configuró únicamente el origen CORS local que faltaba en el backend y se verificó la conexión real. `npm run test:chatbot:live -- --live` aprobó login con la cuenta TEST_USER existente, generación de dos preguntas y edición local; el detalle de la API conservó la cantidad anterior, hubo cero confirmaciones de lote y cero llamadas del navegador a DeepSeek. No se imprimieron credenciales ni se guardaron trazas reales.
- Pendiente de aceptación: partida manual con dos estudiantes reales. Las suites de sockets/multiusuario y los E2E de host/participante sí están aprobados; no se presentan como esa prueba manual adicional. La confirmación de lote contra la BD real del usuario no se ejecutó, por diseño; su atomicidad e idempotencia están verificadas en PostgreSQL de pruebas y el flujo visual en E2E simulado.
- No archivar ni sincronizar specs principales mientras estos pendientes no estén revisados. Los escenarios manuales descritos quedan disponibles para esa verificación final.
