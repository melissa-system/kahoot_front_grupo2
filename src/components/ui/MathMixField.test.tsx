import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MathMixField } from './MathMixField';

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <MathMixField label="Afirmación" value={value} onChange={setValue} testId="mix" />;
}

describe('MathMixField', () => {
  it('deja escribir texto plano', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Afirmación'), 'Haskell es funcional');
    expect(screen.getByLabelText('Afirmación')).toHaveValue('Haskell es funcional');
    expect(screen.getByTestId('mix')).toHaveValue('Haskell es funcional');
  });

  it('pinta la fórmula en la afirmación y deja el texto al lado', () => {
    render(<Harness initial={'$\\int_{}^{}e^{x}$ es'} />);
    expect(document.querySelector('.math-mix-chip')).toBeTruthy();
    expect(document.querySelector('.math-mix-chip')?.textContent).toContain('∫');
    expect(document.querySelector('.math-mix-chip')?.textContent).not.toContain('□');
    expect(screen.getByLabelText('Afirmación')).toHaveValue('');
    expect(screen.getByTestId('mix')).toHaveValue('$\\int_{}^{}e^{x}$ es');
    const trailing = screen.getAllByRole('textbox').at(-1);
    expect(trailing).toHaveValue(' es');
  });

  it('borra la fórmula con backspace desde el texto de al lado', async () => {
    render(<Harness initial={'$\\pi$ es'} />);
    const trailing = screen.getAllByRole('textbox').at(-1) as HTMLTextAreaElement;
    await userEvent.click(trailing);
    trailing.setSelectionRange(0, 0);
    await userEvent.keyboard('{Backspace}');
    expect(screen.getByTestId('mix')).toHaveValue(' es');
    expect(document.querySelector('.katex')).toBeNull();
  });
});
