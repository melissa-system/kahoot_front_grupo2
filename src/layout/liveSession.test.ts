import { describe, expect, it } from 'vitest';
import { isLiveSessionPath } from './liveSession';

describe('isLiveSessionPath', () => {
  it('reconoce las pantallas de juego y de anfitrión', () => {
    expect(isLiveSessionPath('/app/jugar/PLAY23')).toBe(true);
    expect(isLiveSessionPath('/app/evaluaciones/sala/abc-123')).toBe(true);
  });

  it('deja el resto de la app con la navegación normal', () => {
    expect(isLiveSessionPath('/app/jugar')).toBe(false);
    expect(isLiveSessionPath('/app/evaluaciones')).toBe(false);
    expect(isLiveSessionPath('/app/curso')).toBe(false);
  });
});
