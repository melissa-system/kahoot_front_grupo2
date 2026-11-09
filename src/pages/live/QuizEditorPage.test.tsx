import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db, save } from '../../api/mock/mockDb';
import { loginAsDemo, renderRoute } from '../../test/render';
import { QuizEditorPage } from './QuizEditorPage';

describe('Editor del cuestionario', () => {
  it('muestra los segundos para contestar en cada pregunta', async () => {
    loginAsDemo();
    const quiz = db().quizzes[0];
    db().questions[0].durationSeconds = 20;
    save();
    renderRoute(<QuizEditorPage />, { path: '/app/evaluaciones/:quizId', route: `/app/evaluaciones/${quiz.id}` });

    expect(await screen.findByLabelText('20 segundos para contestar')).toBeInTheDocument();
    expect(screen.getAllByLabelText('30 segundos para contestar')).toHaveLength(2);
  });

  it('abre la edición de una pregunta en un modal', async () => {
    loginAsDemo();
    const quiz = db().quizzes[0];
    renderRoute(<QuizEditorPage />, { path: '/app/evaluaciones/:quizId', route: `/app/evaluaciones/${quiz.id}` });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar pregunta 1' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Editar pregunta 1' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Afirmación')).toHaveValue(db().questions[0].statement);
  });

  it('ofrece un asa para reordenar cada pregunta', async () => {
    loginAsDemo();
    const quiz = db().quizzes[0];
    renderRoute(<QuizEditorPage />, { path: '/app/evaluaciones/:quizId', route: `/app/evaluaciones/${quiz.id}` });
    expect(await screen.findByLabelText('Arrastrar pregunta 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Arrastrar pregunta 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Arrastrar pregunta 3')).toBeInTheDocument();
  });
});
