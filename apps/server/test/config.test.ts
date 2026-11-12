import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('usa i default quando le variabili mancano', () => {
    const cfg = loadConfig({});
    expect(cfg.port).toBe(3000);
    expect(cfg.host).toBeUndefined();
  });

  it('legge PORT e HOST', () => {
    const cfg = loadConfig({ PORT: '8140', HOST: '127.0.0.1' });
    expect(cfg.port).toBe(8140);
    expect(cfg.host).toBe('127.0.0.1');
  });

  it('ignora HOST vuoto o di soli spazi (ascolto su tutte le interfacce)', () => {
    expect(loadConfig({ HOST: '' }).host).toBeUndefined();
    expect(loadConfig({ HOST: '   ' }).host).toBeUndefined();
  });

  it('rimuove gli spazi attorno a HOST', () => {
    expect(loadConfig({ HOST: ' 127.0.0.1 ' }).host).toBe('127.0.0.1');
  });
});
