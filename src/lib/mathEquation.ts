export type MathTone = 'ops' | 'template' | 'relation' | 'set';

export interface MathKey {
  latex: string;
  label: string;
  name: string;
  tone?: MathTone;
  /** LaTeX compacto para pintar el botón con huecos visibles. */
  glyph?: string;
}

function key(tone: MathTone, latex: string, label: string, name: string, glyph?: string): MathKey {
  return glyph ? { tone, latex, label, name, glyph } : { tone, latex, label, name };
}

/** Convierte plantillas `#` / `{}` a huecos visibles de MathLive (`#?`). */
export function toMathLiveSnippet(latex: string): string {
  return latex.replace(/#/g, '#?').replace(/\{\}/g, '{#?}');
}

/** MathLive serializa huecos como `\placeholder{}`; los dejamos como `{}` para no perder el bloque. */
export function mathLiveToLatex(raw: string): string {
  return raw
    .replace(/\{\\placeholder(?:\[[^\]]*\])?\{[^}]*\}\}/g, '{}')
    .replace(/\\placeholder(?:\[[^\]]*\])?\{[^}]*\}/g, '{}');
}

/** True si la selección actual es un hueco vacío, no un número o símbolo. */
export function isPlaceholderSelection(latex: string): boolean {
  return /^\{?\\placeholder(?:\[[^\]]*\])?\{[^}]*\}\}?$/.test(latex.trim());
}

export type SlotHitBox = { id: string; left: number; top: number; right: number; bottom: number };

/** Elige la casilla más pequeña que contiene el clic; si no hay, la más cercana. */
export function pickHitSlot(slots: SlotHitBox[], x: number, y: number, pad = 8, maxDist = 20): string | null {
  let inside: { id: string; area: number } | null = null;
  let near: { id: string; dist: number } | null = null;
  for (const slot of slots) {
    const left = slot.left - pad;
    const right = slot.right + pad;
    const top = slot.top - pad;
    const bottom = slot.bottom + pad;
    const width = Math.max(0, slot.right - slot.left);
    const height = Math.max(0, slot.bottom - slot.top);
    if (x >= left && x <= right && y >= top && y <= bottom) {
      const area = Math.max(1, width * height);
      if (!inside || area < inside.area) inside = { id: slot.id, area };
    }
    const dist = Math.hypot(x - (slot.left + slot.right) / 2, y - (slot.top + slot.bottom) / 2);
    if (!near || dist < near.dist) near = { id: slot.id, dist };
  }
  if (inside) return inside.id;
  if (near && near.dist <= maxDist) return near.id;
  return null;
}

/** `#` marca dónde queda el cursor al insertar. */
export function insertLatexSnippet(value: string, start: number, end: number, snippet: string) {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  const caretIn = snippet.indexOf('#');
  const clean = snippet.replaceAll('#', '');
  return {
    value: value.slice(0, from) + clean + value.slice(to),
    caret: from + (caretIn >= 0 ? caretIn : clean.length),
  };
}

const UNICODE_TO_LATEX: Record<string, string> = {
  'π': '\\pi',
  '∞': '\\infty',
  '×': '\\times',
  '÷': '\\div',
  '·': '\\cdot',
  '−': '-',
  '±': '\\pm',
  '≠': '\\neq',
  '≤': '\\leq',
  '≥': '\\geq',
  '≈': '\\approx',
  '∼': '\\sim',
  '≅': '\\cong',
  '∠': '\\angle',
  '°': '^{\\circ}',
  '∘': '\\circ',
  '⊥': '\\perp',
  '∥': '\\parallel',
  '⇔': '\\Leftrightarrow',
  '⇒': '\\Rightarrow',
  '↔': '\\leftrightarrow',
  '⇄': '\\leftrightarrows',
  '←': '\\leftarrow',
  '→': '\\rightarrow',
  'ℕ': '\\mathbb{N}',
  'ℤ': '\\mathbb{Z}',
  'ℚ': '\\mathbb{Q}',
  'ℝ': '\\mathbb{R}',
  'ℂ': '\\mathbb{C}',
  '∀': '\\forall',
  '∃': '\\exists',
  '∈': '\\in',
  '∉': '\\notin',
  '∅': '\\emptyset',
  '∧': '\\land',
  '∨': '\\lor',
  '⊄': '\\not\\subset',
  '¬': '\\neg',
  '∩': '\\cap',
  '∪': '\\cup',
  '⊂': '\\subset',
  '⊆': '\\subseteq',
  '⊈': '\\nsubseteq',
  '∖': '\\setminus',
  '∫': '\\int',
  '∑': '\\sum',
  '∏': '\\prod',
  '∂': '\\partial',
  'α': '\\alpha',
  'β': '\\beta',
  'γ': '\\gamma',
  'δ': '\\delta',
  'ε': '\\varepsilon',
  'ζ': '\\zeta',
  'η': '\\eta',
  'θ': '\\theta',
  'ι': '\\iota',
  'κ': '\\kappa',
  'λ': '\\lambda',
  'μ': '\\mu',
  'ν': '\\nu',
  'ξ': '\\xi',
  'ρ': '\\rho',
  'σ': '\\sigma',
  'τ': '\\tau',
  'υ': '\\upsilon',
  'φ': '\\phi',
  'χ': '\\chi',
  'ψ': '\\psi',
  'ω': '\\omega',
  'Γ': '\\Gamma',
  'Δ': '\\Delta',
  'Θ': '\\Theta',
  'Λ': '\\Lambda',
  'Ξ': '\\Xi',
  'Π': '\\Pi',
  'Σ': '\\Sigma',
  'Υ': '\\Upsilon',
  'Φ': '\\Phi',
  'Ψ': '\\Psi',
  'Ω': '\\Omega',
};

const SUPER_TO_LATEX: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  'ⁿ': 'n',
};

const SUB_TO_LATEX: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  'ₙ': 'n',
};

const NAMED_COMMANDS: [string, string][] = [
  ['infty', '\\infty'],
  ['inf', '\\infty'],
  ['alpha', '\\alpha'],
  ['beta', '\\beta'],
  ['gamma', '\\gamma'],
  ['delta', '\\delta'],
  ['theta', '\\theta'],
  ['lambda', '\\lambda'],
  ['sigma', '\\sigma'],
  ['omega', '\\omega'],
  ['phi', '\\phi'],
  ['psi', '\\psi'],
  ['pi', '\\pi'],
  ['sum', '\\sum'],
  ['prod', '\\prod'],
  ['lim', '\\lim'],
  ['log', '\\log'],
  ['ln', '\\ln'],
  ['sin', '\\sin'],
  ['cos', '\\cos'],
  ['tan', '\\tan'],
];

const CARET_MARK = '\u0000';

function mapPlainMath(segment: string): string {
  let s = segment;
  s = s.replace(/<=>/g, '\\Leftrightarrow ');
  s = s.replace(/<=/g, '\\leq ');
  s = s.replace(/>=/g, '\\geq ');
  s = s.replace(/!=/g, '\\neq ');
  s = s.replace(/\+-/g, '\\pm ');
  s = s.replace(/->/g, '\\rightarrow ');
  s = s.replace(/<-/g, '\\leftarrow ');
  s = s.replace(/(^|[^\\])ra[ií]z\s*(?:c[uú]bica|tres|3)\s*(?:de\s+)?\(?([A-Za-z0-9]+)\)?/gi, '$1\\sqrt[3]{$2}');
  s = s.replace(/(^|[^\\])cbrt\s*\(([^)]*)\)/gi, '$1\\sqrt[3]{$2}');
  s = s.replace(/(^|[^\\])ra[ií]z\s*(?:de\s+)?\(?([A-Za-z0-9]+)\)?/gi, '$1\\sqrt{$2}');
  s = s.replace(/(^|[^\\])sqrt\s*\[(\d+)\]\s*\{([^}]*)\}/gi, '$1\\sqrt[$2]{$3}');
  s = s.replace(/(^|[^\\])sqrt\s*\(([^)]*)\)/gi, '$1\\sqrt{$2}');
  s = s.replace(/(^|[^\\])sqrt\s+([A-Za-z0-9]+)/gi, '$1\\sqrt{$2}');
  s = s.replace(/√\s*\(([^)]*)\)/g, '\\sqrt{$1}');
  s = s.replace(/√\s*\{([^}]*)\}/g, '\\sqrt{$1}');
  s = s.replace(/√\s*([A-Za-z0-9]+)/g, '\\sqrt{$1}');
  s = s.replace(/√/g, `\\sqrt{${CARET_MARK}}`);
  s = s.replace(/∛\s*\(([^)]*)\)/g, '\\sqrt[3]{$1}');
  s = s.replace(/∛\s*\{([^}]*)\}/g, '\\sqrt[3]{$1}');
  s = s.replace(/∛\s*([A-Za-z0-9]+)/g, '\\sqrt[3]{$1}');
  s = s.replace(/∛/g, `\\sqrt[3]{${CARET_MARK}}`);
  s = s.replace(new RegExp(`[${Object.keys(SUPER_TO_LATEX).join('')}]+`, 'g'), (run) => `^{${[...run].map((char) => SUPER_TO_LATEX[char] ?? char).join('')}}`);
  s = s.replace(new RegExp(`[${Object.keys(SUB_TO_LATEX).join('')}]+`, 'g'), (run) => `_{${[...run].map((char) => SUB_TO_LATEX[char] ?? char).join('')}}`);
  for (const [symbol, latex] of Object.entries(UNICODE_TO_LATEX)) {
    s = s.replaceAll(symbol, `${latex} `);
  }
  for (const [name, latex] of NAMED_COMMANDS) {
    s = s.replace(new RegExp(`(^|[^\\\\A-Za-z])${name}(?![A-Za-z])`, 'gi'), `$1${latex} `);
  }
  s = s.replace(/(^|[^A-Za-z\\{])(\d+)\/(\d+)/g, '$1\\frac{$2}{$3}');
  s = s.replace(/\\sqrt(?![\{\[])(\s*)([A-Za-z0-9]+)/g, '\\sqrt{$2}');
  return s;
}

/** LaTeX para pintar la vista previa: huecos vacíos se ven como un recuadro. */
export function previewMathLatex(raw: string): string {
  return interpretMathInput(raw)
    .replace(/\\sqrt\[([^\]]*)\]\{\}/g, '\\sqrt[$1]{\\square}')
    .replace(/\\sqrt\{\}/g, '\\sqrt{\\square}')
    .replace(/\\frac\{\}\{\}/g, '\\frac{\\square}{\\square}')
    .replace(/\\frac\{\}\{([^{}]*)\}/g, '\\frac{\\square}{$1}')
    .replace(/\\frac\{([^{}]*)\}\{\}/g, '\\frac{$1}{\\square}')
    .replace(/\{\}/g, '{\\square}');
}

/** Convierte símbolos y atajos (√3, π, pi, <=) a LaTeX que KaTeX entiende. */
export function interpretMathInput(raw: string): string {
  return raw
    .split(/(\\[a-zA-Z]+\*?|\\[^a-zA-Z])/g)
    .map((part) => (part.startsWith('\\') ? part : mapPlainMath(part)))
    .join('')
    .replaceAll(CARET_MARK, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/  +/g, ' ')
    .trim();
}

/** Igual que interpretMathInput, pero conserva el cursor al reescribir. */
export function interpretMathTyping(value: string, caret: number) {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  const marked = value.slice(0, safeCaret) + CARET_MARK + value.slice(safeCaret);
  const interpreted = marked
    .split(/(\\[a-zA-Z]+\*?|\\[^a-zA-Z])/g)
    .map((part) => (part.startsWith('\\') ? part : mapPlainMath(part)))
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/  +/g, ' ');
  const extraMarks = interpreted.split(CARET_MARK).length - 1;
  let next = interpreted;
  if (extraMarks > 1) {
    const first = interpreted.indexOf(CARET_MARK);
    next = interpreted.slice(0, first + 1) + interpreted.slice(first + 1).replaceAll(CARET_MARK, '');
  }
  const idx = next.indexOf(CARET_MARK);
  if (idx < 0) {
    const clean = next.replaceAll(CARET_MARK, '');
    return { value: clean, caret: clean.length };
  }
  const valueOut = next.replaceAll(CARET_MARK, '');
  return { value: valueOut, caret: idx };
}

export function wrapInlineMath(latex: string) {
  const trimmed = latex.trim();
  if (!trimmed) return '';
  const inner =
    trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length >= 2 ? trimmed.slice(1, -1).trim() : trimmed;
  const interpreted = interpretMathInput(inner).trim();
  return interpreted ? `$${interpreted}$` : '';
}

export type MathChunk = { type: 'text' | 'math'; value: string };

export function splitMath(text: string): MathChunk[] {
  const chunks: MathChunk[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) chunks.push({ type: 'text', value: text.slice(last, match.index) });
    chunks.push({ type: 'math', value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) chunks.push({ type: 'text', value: text.slice(last) });
  return chunks.length ? chunks : [{ type: 'text', value: text }];
}

/** Barra superior: aritmética, paréntesis y constantes, con hueco entre grupos. */
export const MATH_TOOLBAR_GROUPS: MathKey[][] = [
  [
    key('ops', '+', '+', 'más'),
    key('ops', '-', '−', 'menos'),
    key('ops', '\\cdot ', '·', 'punto'),
    key('ops', '\\times ', '×', 'por'),
    key('ops', '\\div ', '÷', 'dividido'),
    key('ops', '=', '=', 'igual'),
  ],
  [
    key('ops', '(', '(', 'paréntesis izquierdo'),
    key('ops', ')', ')', 'paréntesis derecho'),
  ],
  [
    key('ops', '[', '[', 'corchete izquierdo'),
    key('ops', ']', ']', 'corchete derecho'),
  ],
  [
    key('ops', '\\{', '{', 'llave izquierda'),
    key('ops', '\\}', '}', 'llave derecha'),
  ],
  [
    key('ops', '\\pi ', 'π', 'pi'),
    key('ops', 'e', 'e', 'número e'),
    key('ops', '\\infty ', '∞', 'infinito'),
  ],
];

const BOX = '\\square';

/** Columna de estructuras: cada bloque trae huecos para rellenar. */
export const MATH_TEMPLATE_KEYS: MathKey[] = [
  key('template', '\\frac{#}{#}', 'ᵃ⁄ᵦ', 'fracción', `\\frac{${BOX}}{${BOX}}`),
  key('template', '{#}^{2}', '□²', 'al cuadrado', `{${BOX}}^{2}`),
  key('template', '{#}^{#}', '□ⁿ', 'exponente', `{${BOX}}^{${BOX}}`),
  key('template', '{#}_{#}', '□ₙ', 'subíndice', `{${BOX}}_{${BOX}}`),
  key('template', '\\left|#\\right|', '|□|', 'valor absoluto', `\\left|${BOX}\\right|`),
  key('template', '\\sqrt{#}', '√□', 'raíz cuadrada', `\\sqrt{${BOX}}`),
  key('template', '\\sqrt[3]{#}', '∛□', 'raíz cúbica', `\\sqrt[3]{${BOX}}`),
  key('template', '\\overline{#}', '□̄', 'barra', `\\overline{${BOX}}`),
  key('template', '\\overleftarrow{#}', '←□', 'vector izquierda', `\\overleftarrow{${BOX}}`),
  key('template', '\\overrightarrow{#}', '□→', 'vector', `\\overrightarrow{${BOX}}`),
  key('template', '\\lim_{# \\to #}\\,{#}', 'lim', 'límite', `\\lim_{${BOX}\\to${BOX}}`),
  key('template', '\\sum_{#}^{#}\\,{#}', 'Σ', 'sumatoria', `\\sum_{${BOX}}^{${BOX}}`),
  key('template', '\\prod_{#}^{#}\\,{#}', 'Π', 'productoria', `\\prod_{${BOX}}^{${BOX}}`),
  key('template', '\\lfloor{#}\\rfloor', '⌊□⌋', 'piso', `\\lfloor${BOX}\\rfloor`),
  key('template', '\\lceil{#}\\rceil', '⌈□⌉', 'techo', `\\lceil${BOX}\\rceil`),
  key('template', '\\ln{#}', 'ln', 'logaritmo natural', `\\ln${BOX}`),
  key('template', '\\log_{10}{#}', 'log₁₀', 'logaritmo en base 10', `\\log_{10}${BOX}`),
  key('template', '\\log_{#}{#}', 'log', 'logaritmo', `\\log_{${BOX}}${BOX}`),
  key('template', '\\int_{#}^{#}\\,{#}', '∫', 'integral', `\\int_{${BOX}}^{${BOX}}`),
  key('template', '\\frac{\\mathrm{d}#}{\\mathrm{d}#}', 'd/dx', 'derivada', `\\frac{\\mathrm{d}${BOX}}{\\mathrm{d}${BOX}}`),
];

/** Columna de relaciones, ángulos y flechas. */
export const MATH_RELATION_KEYS: MathKey[] = [
  key('relation', '\\%', '%', 'porcentaje'),
  key('relation', '\\pm ', '±', 'más menos'),
  key('relation', '\\neq ', '≠', 'distinto'),
  key('relation', '<', '<', 'menor que'),
  key('relation', '>', '>', 'mayor que'),
  key('relation', '\\angle ', '∠', 'ángulo'),
  key('relation', '^{\\circ}', '°', 'grados'),
  key('relation', '\\circ ', '∘', 'composición'),
  key('relation', '\\leq ', '≤', 'menor o igual'),
  key('relation', '\\geq ', '≥', 'mayor o igual'),
  key('relation', '\\perp ', '⊥', 'perpendicular'),
  key('relation', '\\parallel ', '∥', 'paralelo'),
  key('relation', '\\Leftrightarrow ', '⇔', 'si y solo si'),
  key('relation', '\\Rightarrow ', '⇒', 'implica'),
  key('relation', '\\leftrightarrow ', '↔', 'flecha doble'),
  key('relation', '\\sim ', '~', 'similar'),
  key('relation', '\\approx ', '≈', 'aproximado'),
  key('relation', '\\leftarrow ', '←', 'flecha izquierda'),
  key('relation', '\\rightarrow ', '→', 'flecha derecha'),
  key('relation', '\\leftrightarrows ', '⇄', 'flechas opuestas'),
];

/** Columna de conjuntos y lógica. */
export const MATH_SET_KEYS: MathKey[] = [
  key('set', '\\mathbb{N}', 'ℕ', 'naturales'),
  key('set', '\\mathbb{Z}', 'ℤ', 'enteros'),
  key('set', '\\mathbb{Q}', 'ℚ', 'racionales'),
  key('set', '\\mathbb{R}', 'ℝ', 'reales'),
  key('set', '\\mathbb{C}', 'ℂ', 'complejos'),
  key('set', '\\forall ', '∀', 'para todo'),
  key('set', '\\exists ', '∃', 'existe'),
  key('set', '\\in ', '∈', 'pertenece'),
  key('set', '\\notin ', '∉', 'no pertenece'),
  key('set', '\\emptyset ', '∅', 'vacío'),
  key('set', '\\land ', '∧', 'y lógico'),
  key('set', '\\lor ', '∨', 'o lógico'),
  key('set', '\\not\\subset ', '⊄', 'no subconjunto'),
  key('set', '\\neg ', '¬', 'negación'),
  key('set', '\\cap ', '∩', 'intersección'),
  key('set', '\\cup ', '∪', 'unión'),
  key('set', '\\subseteq ', '⊆', 'subconjunto o igual'),
  key('set', '\\nsubseteq ', '⊈', 'no subconjunto o igual'),
  key('set', '\\setminus ', '∖', 'diferencia de conjuntos'),
];

export const MATH_BOARD_COLUMNS: MathKey[][] = [MATH_TEMPLATE_KEYS, MATH_RELATION_KEYS, MATH_SET_KEYS];

export const MATH_OPERATOR_KEYS: MathKey[] = MATH_TOOLBAR_GROUPS.flat();

const GREEK_UPPER = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
const GREEK_UPPER_LATEX = ['A', 'B', '\\Gamma ', '\\Delta ', 'E', 'Z', 'H', '\\Theta ', 'I', 'K', '\\Lambda ', 'M', 'N', '\\Xi ', 'O', '\\Pi ', 'P', '\\Sigma ', 'T', '\\Upsilon ', '\\Phi ', 'X', '\\Psi ', '\\Omega '];
const GREEK_LOWER = 'αβγδεζηθικλμνξοπρστυφχψω';
const GREEK_LOWER_LATEX = ['\\alpha ', '\\beta ', '\\gamma ', '\\delta ', '\\varepsilon ', '\\zeta ', '\\eta ', '\\theta ', '\\iota ', '\\kappa ', '\\lambda ', '\\mu ', '\\nu ', '\\xi ', 'o', '\\pi ', '\\rho ', '\\sigma ', '\\tau ', '\\upsilon ', '\\phi ', '\\chi ', '\\psi ', '\\omega '];

export const MATH_GREEK_KEYS: MathKey[] = [
  ...[...GREEK_UPPER].map((label, i) => ({ latex: GREEK_UPPER_LATEX[i], label, name: `griega ${label}` })),
  ...[...GREEK_LOWER].map((label, i) => ({ latex: GREEK_LOWER_LATEX[i], label, name: `griega ${label}` })),
  { latex: '\\partial ', label: '∂', name: 'parcial' },
  { latex: '\\epsilon ', label: 'ϵ', name: 'épsilon' },
  { latex: '\\vartheta ', label: 'ϑ', name: 'theta variante' },
  { latex: '\\varkappa ', label: 'ϰ', name: 'kappa variante' },
  { latex: '\\varphi ', label: 'ϕ', name: 'fi variante' },
  { latex: '\\varrho ', label: 'ϱ', name: 'rho variante' },
];
