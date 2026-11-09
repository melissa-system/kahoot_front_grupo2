import { describe, expect, it } from 'vitest';
import { DEFAULT_OWL_AVATAR_ID, OWL_AVATARS, owlAvatarOf, owlAvatarSrc, parseOwlAvatarId } from './owlAvatar';

describe('owlAvatar', () => {
  it('tiene los veinte búhos recortados', () => {
    expect(OWL_AVATARS).toHaveLength(20);
    expect(owlAvatarOf('king')).toMatchObject({ id: 'king', label: 'Rey' });
    expect(owlAvatarSrc('wizard')).toBe('/images/owls/wizard.png');
  });

  it('cae al búho de libro cuando el id no es válido', () => {
    expect(parseOwlAvatarId('robot')).toBe(DEFAULT_OWL_AVATAR_ID);
    expect(parseOwlAvatarId(undefined)).toBe('book');
  });
});
