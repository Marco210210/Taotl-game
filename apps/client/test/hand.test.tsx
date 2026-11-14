import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '@taotl/engine';
import { Hand } from '../src/components/Hand';

const cards: Card[] = [
  { kind: 'suited', suit: 'cuori', rank: 14 },
  { kind: 'suited', suit: 'picche', rank: 5 },
  { kind: 'suited', suit: 'totem', rank: 3 },
];
const byId = (id: string) => document.querySelector(`[data-card-id="${id}"]`) as HTMLElement;
const pressed = (id: string) => byId(id).getAttribute('aria-pressed') === 'true';

describe('Hand: giocata con un tocco (SPEC §7.4)', () => {
  it('nel mio turno un solo tocco su una carta giocabile la gioca subito, senza pulsante "Gioca"', async () => {
    const onPlay = vi.fn();
    render(<Hand cards={cards} playable={new Set(['cuori-14', 'picche-5'])} onPlay={onPlay} myTurn />);
    await userEvent.click(byId('cuori-14'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith('cuori-14');
    expect(document.querySelector('[data-testid="btn-play"]')).toBeNull();
  });
  it('nel mio turno una carta non giocabile è oscurata e non reagisce', async () => {
    const onPlay = vi.fn();
    render(<Hand cards={cards} playable={new Set(['cuori-14'])} onPlay={onPlay} myTurn />);
    expect(byId('picche-5')).toHaveAttribute('aria-disabled', 'true');
    expect(byId('picche-5')).toHaveClass('dimmed');
    await userEvent.click(byId('picche-5'));
    expect(onPlay).not.toHaveBeenCalled();
    expect(pressed('picche-5')).toBe(false);
  });
  it('aria-label = cardLabel', () => {
    render(<Hand cards={cards} playable={new Set()} onPlay={vi.fn()} />);
    expect(byId('cuori-14')).toHaveAttribute('aria-label', 'A di Cuori');
  });
});

describe('Hand: preselezione fuori turno', () => {
  it("un tocco solleva, un altro abbassa, un tocco su un'altra sposta la selezione; non gioca mai", async () => {
    const onPlay = vi.fn();
    render(<Hand cards={cards} playable={new Set()} onPlay={onPlay} />);
    expect(byId('picche-5')).toHaveAttribute('aria-disabled', 'false');
    expect(byId('picche-5')).not.toHaveClass('dimmed');
    await userEvent.click(byId('picche-5'));
    expect(pressed('picche-5')).toBe(true);
    await userEvent.click(byId('picche-5'));
    expect(pressed('picche-5')).toBe(false);
    await userEvent.click(byId('picche-5'));
    await userEvent.click(byId('cuori-14'));
    expect(pressed('picche-5')).toBe(false);
    expect(pressed('cuori-14')).toBe(true);
    expect(onPlay).not.toHaveBeenCalled();
  });
  it('quando arriva il turno la carta resta sollevata, non si gioca da sola; un tocco la gioca', async () => {
    const onPlay = vi.fn();
    const { rerender } = render(<Hand cards={cards} playable={new Set()} onPlay={onPlay} />);
    await userEvent.click(byId('picche-5'));
    rerender(<Hand cards={cards} playable={new Set(['picche-5', 'totem-3'])} onPlay={onPlay} myTurn />);
    expect(pressed('picche-5')).toBe(true);
    expect(onPlay).not.toHaveBeenCalled();
    await userEvent.click(byId('picche-5'));
    expect(onPlay).toHaveBeenCalledWith('picche-5');
  });
  it('se nel frattempo è diventata non giocabile (obbligo di colore) si deseleziona da sola', async () => {
    const onPlay = vi.fn();
    const { rerender } = render(<Hand cards={cards} playable={new Set()} onPlay={onPlay} />);
    await userEvent.click(byId('picche-5'));
    rerender(<Hand cards={cards} playable={new Set(['cuori-14', 'totem-3'])} onPlay={onPlay} myTurn />);
    expect(pressed('picche-5')).toBe(false);
    expect(onPlay).not.toHaveBeenCalled();
  });
});
