import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../../api/client';
import { ChatComposer } from './ChatComposer';
import { QuizChatbot } from './QuizChatbot';
import { ApiError } from '../../lib/http';

describe('Composición de mensajes', () => {
  it('solo ofrece mensaje libre: Enter envía, Shift+Enter no envía y texto vacío bloquea', async () => {
    const send = vi.fn().mockReturnValue(true);
    render(<ChatComposer disabled={false} onSend={send} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('¿Qué preguntas necesitas?');
    expect(screen.queryByLabelText('Cantidad (opcional)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    await user.type(input, '2 preguntas de fotosíntesis');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(send).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(send).toHaveBeenCalledWith('2 preguntas de fotosíntesis\n');
    expect(input).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});

describe('Chat contextual y revisión humana', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
  });

  async function prepareProposal(createBatch = vi.fn(), onSaved = vi.fn().mockResolvedValue(undefined)) {
    const respond = vi.fn().mockResolvedValue({ reply: 'Revisa.', draft: { questions: [{ statement: 'El Sol es una estrella', correctBoolean: true }] } });
    render(<QuizChatbot api={{ chatbot: { respond }, questions: { createBatch } } as unknown as Api} quizId="quiz" quizTitle="Ciencias" isMock onSaved={onSaved} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Chat bot' }));
    await user.type(screen.getByLabelText('¿Qué preguntas necesitas?'), 'Una pregunta');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.click(await screen.findByRole('button', { name: 'Ver propuesta' }));
    await screen.findByLabelText('Afirmación propuesta 1');
    return { user, createBatch, onSaved };
  }

  it('amplía y restaura sin perder correcciones ni foco y conserva el borrador al cerrar', async () => {
    const { user, createBatch } = await prepareProposal();
    const input = screen.getByLabelText('Afirmación propuesta 1');
    await user.clear(input);
    await user.type(input, 'Corrección local');
    const dialog = screen.getByRole('dialog');
    const expand = screen.getByRole('button', { name: 'Pantalla completa' });
    expect(expand).toHaveAttribute('aria-pressed', 'false');
    expect(dialog).toHaveClass('sm:w-[min(94vw,72rem)]');
    await user.click(expand);
    const restore = screen.getByRole('button', { name: 'Restaurar tamaño' });
    expect(restore).toHaveAttribute('aria-pressed', 'true');
    expect(restore).toHaveFocus();
    expect(dialog).not.toHaveClass('sm:w-[min(94vw,72rem)]');
    await user.click(restore);
    expect(dialog).toHaveClass('sm:w-[min(94vw,72rem)]');
    expect(input).toHaveValue('Corrección local');
    expect(input).toHaveAttribute('rows', '3');
    await user.click(screen.getByRole('button', { name: 'Minimizar propuesta' }));
    expect(dialog).toHaveClass('sm:w-[28rem]');
    await user.click(screen.getByRole('button', { name: 'Ver propuesta' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar chat' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat bot' })).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
    await user.click(screen.getByRole('button', { name: 'Chat bot' }));
    expect(screen.getByLabelText('Afirmación propuesta 1')).toHaveValue('Corrección local');
    expect(createBatch).not.toHaveBeenCalled();
  });

  it('pliega la propuesta sin perder correcciones y permite agregar dos países leyendo el chat', async () => {
    const initial = [{ statement: 'Costa Rica está en América Central.', correctBoolean: true }, { statement: 'Francia está en Europa.', correctBoolean: true }];
    const corrected = { statement: 'Corrección del profesor sobre Costa Rica.', correctBoolean: false };
    const extra = [{ statement: 'Japón está en Asia.', correctBoolean: true }, { statement: 'Brasil está en Europa.', correctBoolean: false }];
    const respond = vi.fn().mockResolvedValueOnce({ reply: 'Preparé dos países.', draft: { questions: initial } })
      .mockResolvedValueOnce({ reply: 'Añadí dos países más; ahora hay cuatro.', draft: { questions: [corrected, initial[1], ...extra] } });
    const createBatch = vi.fn();
    render(<QuizChatbot api={{ chatbot: { respond }, questions: { createBatch } } as unknown as Api} quizId="quiz" quizTitle="Países" isMock onSaved={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Chat bot' }));
    await user.type(screen.getByLabelText('¿Qué preguntas necesitas?'), '2 preguntas de países');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    const expand = await screen.findByRole('button', { name: 'Ver propuesta' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Afirmación propuesta 1')).not.toBeVisible();
    await user.click(expand);
    await user.clear(screen.getByLabelText('Afirmación propuesta 1'));
    await user.type(screen.getByLabelText('Afirmación propuesta 1'), corrected.statement);
    await user.click(within(screen.getByRole('group', { name: 'Respuesta correcta · pregunta 1' })).getByRole('radio', { name: 'Falso' }));
    // La respuesta se conserva también al plegar sin enviar.
    await user.click(screen.getByRole('button', { name: 'Minimizar propuesta' }));
    await user.click(screen.getByRole('button', { name: 'Ver propuesta' }));
    expect(screen.getByLabelText('Afirmación propuesta 1')).toHaveValue(corrected.statement);
    await user.type(screen.getByLabelText('¿Qué preguntas necesitas?'), 'Agrega 2 países más');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(within(screen.getByRole('log')).getByText('Añadí dos países más; ahora hay cuatro.')).toBeVisible());
    expect(screen.getByRole('button', { name: 'Ver propuesta' })).toHaveAttribute('aria-expanded', 'false');
    expect(respond.mock.calls[1][1]).toMatchObject({ currentDraft: { questions: [corrected, initial[1]] } });
    expect(respond.mock.calls[1][1]).not.toHaveProperty('requestedCount');
    expect(respond.mock.calls[1][1].messages).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Ver propuesta' }));
    expect(screen.getByLabelText('Afirmación propuesta 1')).toHaveValue(corrected.statement);
    expect(screen.getByLabelText('Afirmación propuesta 4')).toHaveValue(extra[1].statement);
    expect(createBatch).not.toHaveBeenCalled();
  });

  it('no guarda al generar: agrega solo las preguntas seleccionadas y corregidas', async () => {
    const respond = vi.fn().mockResolvedValue({ reply: 'Revisa estas preguntas.', draft: { questions: [
      { statement: 'Primera propuesta', correctBoolean: true }, { statement: 'Segunda propuesta', correctBoolean: false },
    ] } });
    const createBatch = vi.fn().mockImplementation((_id, body) => ({ operationId: body.operationId, questions: body.questions }));
    const onSaved = vi.fn().mockResolvedValue(undefined);
    render(<QuizChatbot api={{ chatbot: { respond }, questions: { createBatch } } as unknown as Api} quizId="quiz" quizTitle="Ciencias" isMock onSaved={onSaved} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Chat bot' }));
    expect(screen.getByText(/Modo simulado/)).toBeVisible();
    await user.type(screen.getByLabelText('¿Qué preguntas necesitas?'), 'Dos preguntas del Sol');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.click(await screen.findByRole('button', { name: 'Ver propuesta' }));
    const first = await screen.findByLabelText('Afirmación propuesta 1');
    expect(createBatch).not.toHaveBeenCalled();
    await user.clear(first);
    await user.type(first, 'Afirmación corregida por el profesor');
    await user.click(screen.getByRole('checkbox', { name: 'Incluir pregunta 2' }));
    await user.click(screen.getByRole('button', { name: 'Agregar al cuestionario' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createBatch.mock.calls[0][1].questions).toEqual([{ statement: 'Afirmación corregida por el profesor', correctBoolean: true }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat bot' })).toHaveFocus();
    expect(screen.getByText('Las preguntas están guardadas en tu cuestionario.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Chat bot' }));
    expect(screen.getByLabelText('Afirmación propuesta 1')).toHaveValue('Afirmación corregida por el profesor');
    expect(screen.queryByRole('button', { name: 'Agregar al cuestionario' })).not.toBeInTheDocument();
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it('espera el recibo antes de cerrar, sin esperar la recarga del detalle', async () => {
    let confirm!: (value: unknown) => void;
    const createBatch = vi.fn().mockImplementation((_id, body) => new Promise((resolve) => {
      confirm = () => resolve({ operationId: body.operationId, questions: body.questions });
    }));
    let refresh!: () => void;
    const onSaved = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { refresh = resolve; }));
    const { user } = await prepareProposal(createBatch, onSaved);
    await user.click(screen.getByRole('button', { name: 'Agregar al cuestionario' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => { confirm(undefined); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
    await act(async () => { refresh(); });
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['definitivo', new ApiError(400, 'VALIDATION_ERROR', 'Entrada inválida.')],
    ['incierto', new Error('Sin conexión')],
    ['recibo inválido', null],
  ])('no cierra ante un resultado %s', async (_name, error) => {
    const createBatch = error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue({ operationId: 'otro', questions: [] });
    const { user, onSaved } = await prepareProposal(createBatch);
    await user.click(screen.getByRole('button', { name: 'Agregar al cuestionario' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByLabelText('Afirmación propuesta 1')).toHaveValue('El Sol es una estrella');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText('Las preguntas están guardadas en tu cuestionario.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Minimizar propuesta' }));
    expect(screen.getByRole('alert')).toBeVisible();
    if (_name === 'incierto') {
      createBatch.mockImplementation((_id, body) => Promise.resolve({ operationId: body.operationId, questions: body.questions }));
      await user.click(screen.getByRole('button', { name: 'Reintentar guardado' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(createBatch.mock.calls[1][1]).toEqual(createBatch.mock.calls[0][1]);
    }
  });

  it('cierra tras guardar aunque falle el detalle y permite actualizar desde el editor sin reenviar', async () => {
    const createBatch = vi.fn().mockImplementation((_id, body) => ({ operationId: body.operationId, questions: body.questions }));
    const onSaved = vi.fn().mockRejectedValueOnce(new Error('Detalle no disponible')).mockResolvedValue(undefined);
    const { user } = await prepareProposal(createBatch, onSaved);
    await user.click(screen.getByRole('button', { name: 'Agregar al cuestionario' }));
    await screen.findByRole('button', { name: 'Actualizar listado' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Las preguntas están guardadas en tu cuestionario.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Actualizar listado' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Actualizar listado' })).not.toBeInTheDocument());
    expect(onSaved).toHaveBeenCalledTimes(2);
    expect(createBatch).toHaveBeenCalledTimes(1);
  });
});
