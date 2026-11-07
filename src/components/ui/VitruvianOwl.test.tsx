import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VitruvianOwl } from './VitruvianOwl';

describe('VitruvianOwl', () => {
  it('expone el búho como imagen accesible y acepta clases externas', () => {
    render(<VitruvianOwl className="w-56" />);
    const owl = screen.getByRole('img', { name: /Hombre de Vitruvio/i });
    expect(owl).toBeInTheDocument();
    expect(owl).toHaveClass('w-56');
  });

  it('usa dos capas del spritesheet para el fundido entre fotogramas', () => {
    const { container } = render(<VitruvianOwl />);
    const layers = container.querySelectorAll<HTMLImageElement>('img.pl-owl-layer');
    expect(layers).toHaveLength(2);
    expect(layers[0].getAttribute('src')).toBe('/images/vitruvian-owl-spritesheet.jpg');
    expect(container.querySelector('.pl-owl-layer-a')).not.toBeNull();
    expect(container.querySelector('.pl-owl-layer-b')).not.toBeNull();
  });

  it('muestra la mascota de respaldo si el spritesheet no carga', () => {
    const { container } = render(<VitruvianOwl />);
    fireEvent.error(container.querySelector('.pl-owl-layer-a')!);
    expect(container.querySelectorAll('img.pl-owl-layer')).toHaveLength(0);
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/pl-greeting/);
  });
});
