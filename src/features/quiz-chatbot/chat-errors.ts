import { ApiError, errorMessage } from '../../lib/http';

export function chatErrorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    CHAT_NOT_CONFIGURED: 'El asistente no está configurado. Puedes seguir agregando preguntas manualmente.',
    CHAT_PROVIDER_ERROR: 'No se pudo obtener una respuesta. Tu propuesta sigue aquí; puedes reintentar.',
    CHAT_TIMEOUT: 'El asistente tardó demasiado. Tu propuesta sigue aquí; puedes reintentar.',
    CHAT_RATE_LIMITED: 'Espera un momento antes de pedir otra respuesta (máximo cinco por minuto).',
    OPERATION_CONFLICT: 'Este intento corresponde a otro contenido. Revisa el cuestionario antes de continuar.',
  };
  return error instanceof ApiError ? messages[error.code] ?? errorMessage(error) : errorMessage(error);
}
