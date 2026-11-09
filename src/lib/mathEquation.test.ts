import { describe, expect, it } from 'vitest';
import { compactDisplayLatex, insertLatexSnippet, interpretMathInput, interpretMathTyping, isPlaceholderSelection, joinMath, mathLiveToLatex, padMathChunks, pickHitSlot, previewMathLatex, splitMath, toMathLiveSnippet, wrapInlineMath } from './mathEquation';

describe('fórmulas', () => {
  it('envuelve LaTeX para insertarlo en el enunciado', () => {
    expect(wrapInlineMath(' \\pi ')).toBe('$\\pi$');
    expect(wrapInlineMath('$x^2$')).toBe('$x^2$');
    expect(wrapInlineMath('  ')).toBe('');
  });

  it('prepara plantillas para editarlas por huecos', () => {
    expect(toMathLiveSnippet('\\sqrt{#}')).toBe('\\sqrt{#?}');
    expect(toMathLiveSnippet('\\sqrt[3]{#}')).toBe('\\sqrt[3]{#?}');
    expect(toMathLiveSnippet('\\frac{#}{#}')).toBe('\\frac{#?}{#?}');
    expect(toMathLiveSnippet('{#}^{2}')).toBe('{#?}^{2}');
    expect(toMathLiveSnippet('\\int_{#}^{#}\\,{#}')).toBe('\\int_{#?}^{#?}\\,{#?}');
    expect(toMathLiveSnippet('\\sum_{#}^{#}\\,{#}')).toBe('\\sum_{#?}^{#?}\\,{#?}');
    expect(toMathLiveSnippet('\\lim_{# \\to #}\\,{#}')).toBe('\\lim_{#? \\to #?}\\,{#?}');
    expect(toMathLiveSnippet('\\pi ')).toBe('\\pi ');
  });

  it('conserva los huecos vacíos que MathLive serializa como placeholder', () => {
    expect(mathLiveToLatex('\\frac{\\placeholder{}}{\\placeholder{}}')).toBe('\\frac{}{}');
    expect(mathLiveToLatex('\\int\\placeholder{}\\,\\mathrm{d}x')).toBe('\\int{}\\,\\mathrm{d}x');
    expect(mathLiveToLatex('{\\placeholder{}}^{2}')).toBe('{}^{2}');
  });

  it('distingue un hueco vacío de un valor escrito', () => {
    expect(isPlaceholderSelection('\\placeholder{}')).toBe(true);
    expect(isPlaceholderSelection('{\\placeholder{}}')).toBe(true);
    expect(isPlaceholderSelection('3')).toBe(false);
    expect(isPlaceholderSelection('\\int_{3}^{3}{3}')).toBe(false);
  });

  it('elige la casilla clicada aunque se solape con otra más grande', () => {
    const lower = { id: 'lo', left: 10, top: 40, right: 22, bottom: 52 };
    const upper = { id: 'hi', left: 12, top: 8, right: 24, bottom: 20 };
    const body = { id: 'body', left: 18, top: 6, right: 48, bottom: 54 };
    expect(pickHitSlot([lower, upper, body], 16, 46)).toBe('lo');
    expect(pickHitSlot([lower, upper, body], 18, 14)).toBe('hi');
    expect(pickHitSlot([lower, upper, body], 40, 30)).toBe('body');
    expect(pickHitSlot([lower, upper, body], 16, 46 + 6)).toBe('lo');
    expect(pickHitSlot([lower], 200, 200)).toBe(null);
  });

  it('inserta plantillas dejando el cursor en #', () => {
    expect(insertLatexSnippet('', 0, 0, '\\frac{#}{#}')).toEqual({ value: '\\frac{}{}', caret: 6 });
    expect(insertLatexSnippet('x', 1, 1, '{#}^{2}')).toEqual({ value: 'x{}^{2}', caret: 2 });
  });

  it('separa texto y fórmulas $...$', () => {
    expect(splitMath('Área $\\pi r^{2}$ cm')).toEqual([
      { type: 'text', value: 'Área ' },
      { type: 'math', value: '\\pi r^{2}' },
      { type: 'text', value: ' cm' },
    ]);
    expect(joinMath(splitMath('Área $\\pi r^{2}$ cm'))).toBe('Área $\\pi r^{2}$ cm');
    expect(padMathChunks(splitMath('$\\pi$'))).toEqual([
      { type: 'text', value: '' },
      { type: 'math', value: '\\pi' },
      { type: 'text', value: '' },
    ]);
  });

  it('interpreta símbolos y atajos como LaTeX', () => {
    expect(interpretMathInput('√3')).toBe('\\sqrt{3}');
    expect(interpretMathInput('π')).toBe('\\pi');
    expect(interpretMathInput('pi')).toBe('\\pi');
    expect(interpretMathInput('x ≤ 2')).toBe('x \\leq 2');
    expect(interpretMathInput('1/2')).toBe('\\frac{1}{2}');
    expect(interpretMathInput('\\sqrt{3}')).toBe('\\sqrt{3}');
    expect(wrapInlineMath('√3')).toBe('$\\sqrt{3}$');
  });

  it('deja el cursor dentro de la raíz al escribir √', () => {
    const typed = interpretMathTyping('√', 1);
    expect(typed.value).toBe('\\sqrt{}');
    expect(typed.caret).toBe('\\sqrt{'.length);
  });

  it('interpreta la raíz cúbica y la pinta con un hueco visible', () => {
    expect(interpretMathInput('raiz tres de 8')).toBe('\\sqrt[3]{8}');
    expect(interpretMathInput('∛8')).toBe('\\sqrt[3]{8}');
    expect(interpretMathInput('\\sqrt[3]{8}')).toBe('\\sqrt[3]{8}');
    expect(previewMathLatex('\\sqrt[3]{}')).toBe('\\sqrt[3]{\\square}');
    expect(previewMathLatex('\\sqrt[3]{8}')).toBe('\\sqrt[3]{8}');
    expect(compactDisplayLatex('\\int_{}^{}e^{x}')).toBe('\\int e^{x}');
    expect(compactDisplayLatex('\\int_{}^{}\\,{}')).toBe('\\int');
    expect(compactDisplayLatex('\\int_{0}^{1}e^{x}')).toBe('\\int_{0}^{1}e^{x}');
    expect(previewMathLatex('\\int_{}^{}\\,{}')).toBe('\\int');
    expect(previewMathLatex('\\int_{}^{}e^{x}')).toBe('\\int e^{x}');
    expect(previewMathLatex('{}^{2}')).toBe('{\\square}^{2}');
  });
});
