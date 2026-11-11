import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../src/index';

describe('smoke', () => {
  it('DEFAULT_RULES ha i valori di default', () => {
    expect(DEFAULT_RULES).toEqual({ scoring: 'progressive', perfectGameBonus: 0, taotlGrace: false });
  });
});
