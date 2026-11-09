import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormulaPreview, MathText } from './MathText';

describe('MathText', () => {
  it('deja el texto plano sin cambiar', () => {
    render(<MathText text="El sol es una estrella" />);
    expect(screen.getByText('El sol es una estrella')).toBeInTheDocument();
  });

  it('pinta una fórmula embebida', () => {
    const { container } = render(<MathText text="Área $\\pi r^{2}$" />);
    expect(container.querySelector('.katex')).toBeTruthy();
    expect(container.textContent).toContain('Área');
  });

  it('muestra la vista previa solo si hay fórmula', () => {
    const { rerender } = render(<FormulaPreview text="sin fórmula" />);
    expect(screen.queryByText('Así se verá')).not.toBeInTheDocument();
    rerender(<FormulaPreview text="Usa $\\pi$" />);
    expect(screen.getByText('Así se verá')).toBeInTheDocument();
  });
});
