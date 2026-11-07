import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { isSfxMuted } from '../lib/sfx';
import { SoundToggle } from './SoundToggle';

describe('SoundToggle', () => {
  it('silencia y restaura el sonido', async () => {
    render(<SoundToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Silenciar sonidos' }));
    expect(isSfxMuted()).toBe(true);
    expect(screen.getByRole('button', { name: 'Activar sonidos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Activar sonidos' }));
    expect(isSfxMuted()).toBe(false);
  });
});
