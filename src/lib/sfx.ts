import { useEffect, useSyncExternalStore } from 'react';

export const SFX_STORAGE_KEY = 'profelink-sfx';
export const FIRST_QUESTIONS_BGM_SRC = encodeURI('/Musicaprimeraspreguntas.wav');
export const LAST_QUESTIONS_BGM_SRC = encodeURI('/Musica ultimas 3 preguntas.wav');
export const FINAL_QUESTION_BGM_SRC = encodeURI('/Ultimapregunta.mp3');
const BGM_VOLUME = 0.2;
const LAST_QUESTION_BGM_COUNT = 3;

export type QuestionBgmKind = 'first' | 'last' | 'final' | null;

export type SfxName =
  | 'click'
  | 'join'
  | 'error'
  | 'pop'
  | 'question'
  | 'reveal'
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'finish'
  | 'dread'
  | 'reconnect';

type Tone = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slideTo?: number;
};

const listeners = new Set<() => void>();
let muted = readMuted();
let ctx: AudioContext | null = null;
let unlocked = false;
let bgm: HTMLAudioElement | null = null;
let bgmKind: QuestionBgmKind = null;
let bgmSrc: string | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(SFX_STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

function unlock() {
  unlocked = true;
  const audio = getContext();
  if (audio?.state === 'suspended') void audio.resume();
  syncBgm();
}

function getBgm() {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!bgm) {
    bgm = new Audio();
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.volume = BGM_VOLUME;
  }
  return bgm;
}

function srcForKind(kind: QuestionBgmKind) {
  if (kind === 'final') return FINAL_QUESTION_BGM_SRC;
  if (kind === 'last') return LAST_QUESTIONS_BGM_SRC;
  if (kind === 'first') return FIRST_QUESTIONS_BGM_SRC;
  return null;
}

function pauseBgm(reset = false) {
  if (!bgm) return;
  bgm.pause();
  if (!reset) return;
  try {
    bgm.currentTime = 0;
  } catch {
    /* jsdom */
  }
}

function syncBgm() {
  const src = srcForKind(bgmKind);
  const track = getBgm();
  if (!track) return;
  if (!src || muted) {
    pauseBgm();
    return;
  }
  if (bgmSrc !== src) {
    pauseBgm(true);
    track.src = src;
    bgmSrc = src;
  }
  if (!unlocked) return;
  try {
    const playing = track.play();
    if (playing && typeof playing.catch === 'function') playing.catch(() => undefined);
  } catch {
    /* autoplay / tests */
  }
}

/** Primeras preguntas → últimas 3 → pista exclusiva de la pregunta final. */
export function questionBgmKind(currentIndex: number, questionsCount: number): QuestionBgmKind {
  if (questionsCount <= 0 || currentIndex < 0 || currentIndex >= questionsCount) return null;
  const remaining = questionsCount - currentIndex;
  if (remaining === 1) return 'final';
  if (remaining <= LAST_QUESTION_BGM_COUNT) return 'last';
  return 'first';
}

/** Solo suena mientras la pregunta está abierta; se calla al revelar. */
export function activeQuestionBgm({
  inProgress,
  questionOpen,
  currentIndex,
  questionsCount,
}: {
  inProgress: boolean;
  questionOpen: boolean;
  currentIndex: number;
  questionsCount: number;
}): QuestionBgmKind {
  if (!inProgress || !questionOpen) return null;
  return questionBgmKind(currentIndex, questionsCount);
}

export function setQuestionBgm(kind: QuestionBgmKind) {
  bgmKind = kind;
  if (!kind) pauseBgm(true);
  syncBgm();
}

export function useQuestionBgm(kind: QuestionBgmKind) {
  useEffect(() => {
    setQuestionBgm(kind);
    return () => setQuestionBgm(null);
  }, [kind]);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

function beep(audio: AudioContext, tone: Tone) {
  const start = audio.currentTime + (tone.at ?? 0);
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = tone.type ?? 'sine';
  osc.frequency.setValueAtTime(Math.max(tone.freq, 1), start);
  if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(tone.slideTo, 1), start + tone.duration);
  const volume = Math.min(tone.gain ?? 0.07, 0.18);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + tone.duration + 0.02);
}

const PATTERNS: Record<SfxName, Tone[]> = {
  click: [{ freq: 880, duration: 0.05, type: 'triangle', gain: 0.05 }],
  join: [
    { freq: 523, duration: 0.1, type: 'triangle', gain: 0.07 },
    { freq: 784, duration: 0.14, type: 'triangle', gain: 0.07, at: 0.09 },
  ],
  error: [{ freq: 180, duration: 0.22, type: 'sawtooth', gain: 0.05, slideTo: 110 }],
  pop: [{ freq: 740, duration: 0.08, type: 'square', gain: 0.035 }],
  question: [
    { freq: 392, duration: 0.1, type: 'triangle', gain: 0.06 },
    { freq: 523, duration: 0.1, type: 'triangle', gain: 0.06, at: 0.08 },
    { freq: 659, duration: 0.16, type: 'triangle', gain: 0.07, at: 0.16 },
  ],
  reveal: [
    { freq: 494, duration: 0.1, type: 'sine', gain: 0.05 },
    { freq: 740, duration: 0.16, type: 'sine', gain: 0.06, at: 0.08 },
  ],
  correct: [
    { freq: 523, duration: 0.1, type: 'triangle', gain: 0.07 },
    { freq: 659, duration: 0.1, type: 'triangle', gain: 0.07, at: 0.08 },
    { freq: 784, duration: 0.18, type: 'triangle', gain: 0.08, at: 0.16 },
  ],
  wrong: [
    { freq: 392, duration: 0.12, type: 'square', gain: 0.04 },
    { freq: 311, duration: 0.12, type: 'square', gain: 0.04, at: 0.1 },
    { freq: 247, duration: 0.2, type: 'square', gain: 0.045, at: 0.2 },
  ],
  tick: [{ freq: 1280, duration: 0.04, type: 'square', gain: 0.03 }],
  finish: [
    { freq: 523, duration: 0.12, type: 'triangle', gain: 0.07 },
    { freq: 659, duration: 0.12, type: 'triangle', gain: 0.07, at: 0.1 },
    { freq: 784, duration: 0.12, type: 'triangle', gain: 0.08, at: 0.2 },
    { freq: 1046, duration: 0.28, type: 'triangle', gain: 0.09, at: 0.32 },
  ],
  dread: [
    { freq: 98, duration: 0.9, type: 'sawtooth', gain: 0.05, slideTo: 46 },
    { freq: 62, duration: 1.3, type: 'sine', gain: 0.07, at: 0.15, slideTo: 36 },
    { freq: 140, duration: 0.35, type: 'square', gain: 0.03, at: 0.85, slideTo: 70 },
  ],
  reconnect: [
    { freq: 880, duration: 0.08, type: 'sine', gain: 0.05 },
    { freq: 1320, duration: 0.12, type: 'sine', gain: 0.05, at: 0.07 },
  ],
};

export function isSfxMuted() {
  return muted;
}

export function subscribeSfx(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSfxMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(SFX_STORAGE_KEY, next ? 'off' : 'on');
  } catch {
    /* ignore */
  }
  syncBgm();
  notify();
}

export function toggleSfx() {
  setSfxMuted(!muted);
  if (!muted) playSfx('click');
  return muted;
}

export function playSfx(name: SfxName) {
  if (muted) return;
  try {
    const audio = getContext();
    if (!audio) return;
    if (!unlocked && audio.state === 'suspended') return;
    PATTERNS[name].forEach((tone) => beep(audio, tone));
  } catch {
    /* Audio no disponible (tests, autoplay bloqueado, etc.) */
  }
}

export function useSfxMuted() {
  return useSyncExternalStore(subscribeSfx, isSfxMuted, () => true);
}
