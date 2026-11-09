import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { db, save, uuid } from '../../api/mock/mockDb';
import { loginAsDemo, renderRoute } from '../../test/render';
import { QuizListPage } from './QuizListPage';

function addQuizzes(ownerId: string, titles: string[]) {
  const now = Date.now();
  titles.forEach((title, index) => {
    db().quizzes.push({
      id: uuid(),
      ownerId,
      title,
      description: title.includes('lógica') ? 'Tema de Prolog y lógica' : null,
      imageKey: null,
      imageUrl: null,
      createdAt: new Date(now - (index + 1) * 60_000).toISOString(),
      updatedAt: new Date(now - (index + 1) * 60_000).toISOString(),
    });
  });
  save();
}

describe('Panel de cuestionarios', () => {
  it('lista los cuestionarios propios', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    const list = await screen.findByRole('list', { name: 'Cuestionarios' });
    expect(within(list).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(list).getByText('3 preguntas')).toBeInTheDocument();
  });

  it('valida el título y crea un cuestionario nuevo', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo cuestionario/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Título'), 'ab');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear cuestionario' }));
    expect(within(dialog).getByText(/entre 3 y 120/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Título'), 'c Funcional');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear cuestionario' }));
    expect(await screen.findByText('Editor abierto')).toBeInTheDocument();
  });

  it('pide confirmación antes de eliminar', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Paradigmas: repaso rápido' }));
    expect(screen.getByText('¿Eliminar cuestionario?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Aún no tienes cuestionarios')).toBeInTheDocument();
  });

  it('pagina de a seis cuestionarios', async () => {
    const user = loginAsDemo();
    addQuizzes(
      user.id,
      Array.from({ length: 6 }, (_, i) => `Cuestionario ${i + 1}`),
    );
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });

    const list = await screen.findByRole('list', { name: 'Cuestionarios' });
    expect(within(list).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(list).getByText('Cuestionario 5')).toBeInTheDocument();
    expect(within(list).queryByText('Cuestionario 6')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Paginación de cuestionarios')).toHaveTextContent('Página 1 de 2');

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const next = screen.getByRole('list', { name: 'Cuestionarios' });
    expect(within(next).getByText('Cuestionario 6')).toBeInTheDocument();
    expect(within(next).queryByText('Paradigmas: repaso rápido')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Paginación de cuestionarios')).toHaveTextContent('Página 2 de 2');
  });

  it('filtra por coincidencia en título o descripción', async () => {
    const user = loginAsDemo();
    addQuizzes(user.id, ['Álgebra lineal', 'Kahoot de lógica']);
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });

    const search = await screen.findByLabelText('Buscar cuestionarios');
    const buscar = () => userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await userEvent.type(search, 'paradigmas');
    const beforeSearch = screen.getByRole('list', { name: 'Cuestionarios' });
    expect(within(beforeSearch).getByText('Álgebra lineal')).toBeInTheDocument();

    await buscar();
    const byTitle = screen.getByRole('list', { name: 'Cuestionarios' });
    expect(within(byTitle).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(byTitle).queryByText('Álgebra lineal')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'prolog');
    await buscar();
    const byDescription = screen.getByRole('list', { name: 'Cuestionarios' });
    expect(within(byDescription).getByText('Kahoot de lógica')).toBeInTheDocument();
    expect(within(byDescription).queryByText('Paradigmas: repaso rápido')).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'xyz no existe');
    await buscar();
    expect(await screen.findByText('No hay coincidencias')).toBeInTheDocument();
  });

  it('filtra por rango de fechas de actualización', async () => {
    const user = loginAsDemo();
    db().quizzes.push({
      id: uuid(),
      ownerId: user.id,
      title: 'Kahoot de octubre',
      description: null,
      imageKey: null,
      imageUrl: null,
      createdAt: '2026-10-15T18:00:00.000Z',
      updatedAt: '2026-10-15T18:00:00.000Z',
    });
    save();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });

    await screen.findByRole('list', { name: 'Cuestionarios' });
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-15' } });
    expect(screen.getByRole('list', { name: 'Cuestionarios' }).textContent).toContain('Paradigmas: repaso rápido');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    const october = screen.getByRole('list', { name: 'Cuestionarios' });
    expect(within(october).getByText('Kahoot de octubre')).toBeInTheDocument();
    expect(within(october).queryByText('Paradigmas: repaso rápido')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    const november = screen.getByRole('list', { name: 'Cuestionarios' });
    expect(within(november).getByText('Paradigmas: repaso rápido')).toBeInTheDocument();
    expect(within(november).queryByText('Kahoot de octubre')).not.toBeInTheDocument();
  });

  it('configura el tiempo límite aparte y Jugar abre la sala', async () => {
    loginAsDemo();
    renderRoute(<QuizListPage />, { path: '/app/evaluaciones', route: '/app/evaluaciones' });
    await userEvent.click(await screen.findByRole('button', { name: 'Tiempo límite' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Tiempo límite' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '10 s' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Tiempo límite guardado')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Jugar' }));
    expect(await screen.findByText('Sala abierta')).toBeInTheDocument();
  });
});
