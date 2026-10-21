import { describe, expect, it } from 'vitest';
import { CALC_INITIAL, calcBackspace, calcEquals, calcInput, calcToggleSign, evaluate, type CalcState } from './calculator';

const press = (keys: string[], start: CalcState = CALC_INITIAL) =>
  keys.reduce((s, k) => (k === '=' ? calcEquals(s) : calcInput(s, k)), start);

describe('evaluate', () => {
  it('respects precedence', () => {
    expect(evaluate('2+3×4')).toBe(14);
    expect(evaluate('10-4÷2')).toBe(8);
  });

  it('handles unary minus and decimals', () => {
    expect(evaluate('-2.5×-2')).toBe(5);
  });

  it('rejects malformed input', () => {
    expect(evaluate('2+')).toBeNull();
    expect(evaluate('×3')).toBeNull();
    expect(evaluate('alert(1)')).toBeNull();
  });

  it('gives Infinity for divide by zero, which formats as Error', () => {
    expect(calcEquals({ expression: '1÷0', resultShown: false }).expression).toBe('Error');
  });
});

describe('key handling', () => {
  it('builds and evaluates an expression', () => {
    expect(press(['1', '2', '+', '3', '=']).expression).toBe('15');
  });

  it('replaces a trailing operator', () => {
    expect(press(['5', '+', '×']).expression).toBe('5×');
  });

  it('allows one decimal point per number', () => {
    expect(press(['1', '.', '.', '5', '+', '.', '5']).expression).toBe('1.5+.5');
  });

  it('starts fresh after a result when typing a digit', () => {
    expect(press(['2', '=', '7']).expression).toBe('7');
  });

  it('converts the last number to a percentage', () => {
    expect(press(['8', '0', '%']).expression).toBe('0.8');
  });

  it('toggles sign and backspaces', () => {
    expect(calcToggleSign({ expression: '3+4', resultShown: false }).expression).toBe('3+-4');
    expect(calcBackspace({ expression: '7', resultShown: false })).toEqual(CALC_INITIAL);
  });
});
