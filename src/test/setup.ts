import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { mockGame } from '../api/mock/mockGame';
import { setQuestionBgm, setSfxMuted } from '../lib/sfx';

HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = () => undefined;

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  mockGame.reset();
  setQuestionBgm(null);
  setSfxMuted(false);
});
