import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OwlAvatar, OwlAvatarPicker } from './OwlAvatar';

describe('OwlAvatar', () => {
  it('anuncia el nombre y el personaje', () => {
    render(<OwlAvatar id="wizard" name="Ana" />);
    const image = screen.getByRole('img', { name: 'Ana, avatar Mago' });
    expect(image).toHaveAttribute('src', '/images/owls/wizard.png');
  });

  it('usa el búho de libro si el id no existe', () => {
    render(<OwlAvatar id="robot" name="Luis" />);
    expect(screen.getByRole('img', { name: 'Luis, avatar Libro' })).toBeInTheDocument();
  });

  it('permite elegir un búho del catálogo', async () => {
    const onChange = vi.fn();
    render(<OwlAvatarPicker value="book" onChange={onChange} />);
    await userEvent.click(screen.getByRole('option', { name: 'Rey' }));
    expect(onChange).toHaveBeenCalledWith('king');
  });
});
