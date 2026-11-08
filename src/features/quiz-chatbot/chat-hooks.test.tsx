import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Api } from '../../api/client';
import { ApiError } from '../../lib/http';
import { useQuizChat } from './useQuizChat';
import { useQuestionBatch } from './useQuestionBatch';

const question = { statement: 'El Sol es una estrella', correctBoolean: true };
const proposal = { reply: 'Revisa la propuesta.', draft: { questions: [question] } };

describe('Conversación por turnos', () => {
  it.each([
    [400, 'VALIDATION_ERROR', 'Entrada inválida.'],
    [429, 'CHAT_RATE_LIMITED', 'Espera un momento'],
    [503, 'CHAT_NOT_CONFIGURED', 'no está configurado'],
    [504, 'CHAT_TIMEOUT', 'tardó demasiado'],
  ] as const)('conserva la propuesta y muestra un error seguro ante HTTP %s', async (status, code, message) => {
    const respond = vi.fn().mockResolvedValueOnce(proposal).mockRejectedValueOnce(new ApiError(status, code, 'Entrada inválida.'));
    const { result } = renderHook(() => useQuizChat({ chatbot: { respond } } as unknown as Api, 'quiz'));
    act(() => { result.current.send('Una pregunta'); });
    await waitFor(() => expect(result.current.questions).toHaveLength(1));
    act(() => { result.current.send('Revisa el borrador'); });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(result.current.error).toContain(message);
    expect(result.current.questions[0].statement).toBe(question.statement);
  });

  it('no duplica envíos bajo StrictMode y reintenta sin duplicar el mensaje', async () => {
    const respond = vi.fn().mockRejectedValueOnce(new ApiError(502, 'CHAT_PROVIDER_ERROR', 'Error')).mockResolvedValueOnce(proposal);
    const api = { chatbot: { respond } } as unknown as Api;
    const { result } = renderHook(() => useQuizChat(api, 'quiz'), { wrapper: StrictMode });
    act(() => { result.current.send('Una pregunta del Sol'); result.current.send('Doble clic'); });
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(respond).toHaveBeenCalledTimes(1);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.questions).toHaveLength(1));
    expect(result.current.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(respond.mock.calls[0]).toEqual(respond.mock.calls[1]);
  });

  it('envía el borrador corregido y draft null no borra la propuesta', async () => {
    const respond = vi.fn().mockResolvedValueOnce(proposal).mockResolvedValueOnce({ reply: '¿Qué cambio?', draft: null });
    const { result } = renderHook(() => useQuizChat({ chatbot: { respond } } as unknown as Api, 'quiz'));
    act(() => { result.current.send('Una pregunta'); });
    await waitFor(() => expect(result.current.questions).toHaveLength(1));
    act(() => result.current.patch(result.current.questions[0].key, { statement: 'Edición del profesor', correctBoolean: false }));
    act(() => { result.current.send('Simplifica esta pregunta'); });
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(respond.mock.calls[1][1].currentDraft.questions).toEqual([{ statement: 'Edición del profesor', correctBoolean: false }]);
    expect(respond.mock.calls[1][1]).not.toHaveProperty('requestedCount');
    expect(result.current.questions[0].statement).toBe('Edición del profesor');
  });

  it('ignora una respuesta después de desmontar/cambiar de contexto', async () => {
    let resolve!: (value: typeof proposal) => void;
    const onProposal = vi.fn();
    const respond = vi.fn().mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result, unmount } = renderHook(() => useQuizChat({ chatbot: { respond } } as unknown as Api, 'quiz', onProposal));
    act(() => { result.current.send('Una pregunta'); });
    unmount();
    await act(async () => { resolve(proposal); await Promise.resolve(); });
    expect(onProposal).not.toHaveBeenCalled();
  });
});

describe('Confirmación de lote', () => {
  it('reutiliza UUID y copia de preguntas ante resultado incierto', async () => {
    const createBatch = vi.fn().mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'red')).mockImplementationOnce((_id, body) => ({ operationId: body.operationId, questions: body.questions }));
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useQuestionBatch({ questions: { createBatch } } as unknown as Api, 'quiz', onSaved));
    const input = [{ ...question }];
    act(() => { result.current.save(input); result.current.save(input); });
    await waitFor(() => expect(result.current.state).toBe('uncertain'));
    input[0].statement = 'Cambio que no debe reenviarse';
    act(() => { result.current.save(input); result.current.retry(); });
    await waitFor(() => expect(result.current.state).toBe('saved'));
    expect(createBatch).toHaveBeenCalledTimes(2);
    expect(createBatch.mock.calls[1]).toEqual(createBatch.mock.calls[0]);
    expect(createBatch.mock.calls[1][1].questions[0].statement).toBe(question.statement);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('una falla de recarga no convierte un éxito en otro guardado', async () => {
    const createBatch = vi.fn().mockImplementation((_id, body) => ({ operationId: body.operationId, questions: body.questions }));
    const onSaved = vi.fn().mockRejectedValueOnce(new Error('detalle')).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useQuestionBatch({ questions: { createBatch } } as unknown as Api, 'quiz', onSaved));
    act(() => result.current.save([question]));
    await waitFor(() => expect(result.current.refreshError).toBe(true));
    expect(result.current.state).toBe('saved');
    act(() => result.current.save([question]));
    await act(async () => result.current.refresh());
    expect(createBatch).toHaveBeenCalledTimes(1);
    expect(result.current.refreshError).toBe(false);
  });

  it('rechaza selección vacía y bloquea un conflicto sin inventar otro intento', async () => {
    const createBatch = vi.fn().mockRejectedValue(new ApiError(409, 'OPERATION_CONFLICT', 'conflicto'));
    const { result } = renderHook(() => useQuestionBatch({ questions: { createBatch } } as unknown as Api, 'quiz', vi.fn()));
    act(() => result.current.save([]));
    expect(createBatch).not.toHaveBeenCalled();
    act(() => result.current.save([question]));
    await waitFor(() => expect(result.current.state).toBe('conflict'));
    act(() => { result.current.reset(); result.current.save([question]); });
    expect(result.current.locked).toBe(true);
    expect(createBatch).toHaveBeenCalledTimes(1);
  });
});
