/**
 * The grade page's mini calculator. The display is a string like "12+3×4";
 * these functions return the next display after each key.
 */
export interface CalcState {
  expression: string;
  /** True right after "=", so the next digit starts a new number. */
  resultShown: boolean;
}

export const CALC_INITIAL: CalcState = { expression: '0', resultShown: false };

const OPERATORS = ['+', '-', '×', '÷'];
const isOperator = (ch: string) => OPERATORS.includes(ch);
const LAST_NUMBER = /(\d*\.?\d+)(?!.*\d)/;
const LAST_SIGNED_NUMBER = /(-?\d*\.?\d+)(?!.*\d)/;

export function formatCalcNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return String(Math.round(value * 1e10) / 1e10);
}

export function calcInput(state: CalcState, key: string): CalcState {
  let expression = state.expression;
  const isDigit = /^[0-9]$/.test(key);
  if (expression === 'Error') expression = isDigit ? key : '0';
  if (state.resultShown && (isDigit || key === '.')) expression = '0';

  if (isDigit) {
    return { expression: expression === '0' ? key : expression + key, resultShown: false };
  }
  if (key === '.') {
    const current = expression.split(/[+\-×÷]/).pop() ?? '';
    return { expression: current.includes('.') ? expression : `${expression}.`, resultShown: false };
  }
  if (key === '%') {
    const match = expression.match(LAST_NUMBER);
    if (match) expression = expression.replace(LAST_NUMBER, formatCalcNumber(Number(match[1]) / 100));
    return { expression, resultShown: false };
  }
  if (!isOperator(key)) return state;
  const last = expression.slice(-1);
  return { expression: isOperator(last) ? expression.slice(0, -1) + key : expression + key, resultShown: false };
}

export function calcBackspace(state: CalcState): CalcState {
  if (state.expression === 'Error' || state.expression.length <= 1) return CALC_INITIAL;
  return { expression: state.expression.slice(0, -1), resultShown: false };
}

export function calcToggleSign(state: CalcState): CalcState {
  const match = state.expression.match(LAST_SIGNED_NUMBER);
  if (!match) return state;
  const current = match[1];
  const toggled = current.startsWith('-') ? current.slice(1) : `-${current}`;
  return { ...state, expression: state.expression.replace(LAST_SIGNED_NUMBER, toggled) };
}

export function calcEquals(state: CalcState): CalcState {
  if (!state.expression || state.expression === 'Error') return state;
  const value = evaluate(state.expression);
  return { expression: value == null ? 'Error' : formatCalcNumber(value), resultShown: true };
}

/**
 * Evaluates + - × ÷ with the usual precedence and unary minus. Returns null for
 * anything malformed. (The old version handed the string to Function().)
 */
export function evaluate(expression: string): number | null {
  const tokens = expression.replace(/×/g, '*').replace(/÷/g, '/').match(/\d*\.?\d+|[+\-*/]/g);
  if (!tokens || tokens.join('') !== expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '')) {
    return null;
  }
  let pos = 0;

  const factor = (): number | null => {
    const token = tokens[pos];
    if (token === '-') {
      pos += 1;
      const value = factor();
      return value == null ? null : -value;
    }
    if (token === '+') {
      pos += 1;
      return factor();
    }
    if (token === undefined || /^[*/]$/.test(token)) return null;
    pos += 1;
    const n = Number(token);
    return Number.isFinite(n) ? n : null;
  };

  const term = (): number | null => {
    let value = factor();
    while (value != null && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++];
      const rhs = factor();
      if (rhs == null) return null;
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  };

  let value = term();
  while (value != null && (tokens[pos] === '+' || tokens[pos] === '-')) {
    const op = tokens[pos++];
    const rhs = term();
    if (rhs == null) return null;
    value = op === '+' ? value + rhs : value - rhs;
  }
  if (pos !== tokens.length) return null;
  return value;
}
