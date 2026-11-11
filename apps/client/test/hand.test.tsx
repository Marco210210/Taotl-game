import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '@taotl/engine';
import { Hand } from '../src/components/Hand';

const cards: Card[] = [
  { kind: 'suited', suit: 'cuori', rank: 14 },
  { kind: 'suited', suit: 'picche', rank: 5 },
];
const byId = (id: string) => document.querySelector(`[data-card-id="${id}"]`) as HTMLElement;

describe('Hand', () => {
  it('primo click seleziona, secondo gioca', async () => {
    const onPlay = vi.fn();
    render(<Hand cards={cards} playable={new Set(['cuori-14', 'picche-5'])} onPlay={onPlay} />);
    await userEvent.click(byId('cuori-14'));
    expect(onPlay).not.toHaveBeenCalled();
    expect(byId('cuori-14')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(byId('cuori-14'));
    expect(onPlay).toHaveBeenCalledWith('cuori-14');
  });
  it('btn-play gioca la carta selezionata ed è visibile solo con una selezione', async () => {
    const onPlay = vi.fn();
    render(<Hand cards={cards} playable={new Set(['cuori-14'])} onPlay={onPlay} />);
    expect(screen.queryByTestId('btn-play')).toBeNull();
    await userEvent.click(byId('cuori-14'));
    await userEvent.click(screen.getByTestId('btn-play'));
    expect(onPlay).toHaveBeenCalledWith('cuori-14');
  });
  it('carta non giocabile: aria-disabled e nessuna reazione', async () => {
    const onPlay = vi.fn();
    render(<Hand cards={cards} playable={new Set(['cuori-14'])} onPlay={onPlay} />);
    expect(byId('picche-5')).toHaveAttribute('aria-disabled', 'true');
    expect(byId('cuori-14')).toHaveAttribute('aria-disabled', 'false');
    await userEvent.click(byId('picche-5'));
    await userEvent.click(byId('picche-5'));
    expect(onPlay).not.toHaveBeenCalled();
    expect(screen.queryByTestId('btn-play')).toBeNull();
    expect(byId('picche-5')).toHaveAttribute('aria-pressed', 'false');
  });
  it('aria-label = cardLabel', () => {
    render(<Hand cards={cards} playable={new Set()} onPlay={vi.fn()} />);
    expect(byId('cuori-14')).toHaveAttribute('aria-label', 'A di Cuori');
  });
  it('attenuata solo se è il mio turno e la carta è illegale; fuori turno è leggibile', () => {
    const { rerender } = render(<Hand cards={cards} playable={new Set(['cuori-14'])} onPlay={vi.fn()} myTurn />);
    expect(byId('picche-5')).toHaveClass('dimmed');
    expect(byId('cuori-14')).not.toHaveClass('dimmed');
    rerender(<Hand cards={cards} playable={new Set()} onPlay={vi.fn()} myTurn={false} />);
    expect(byId('picche-5')).not.toHaveClass('dimmed');
    expect(byId('picche-5')).toHaveAttribute('aria-disabled', 'true');
  });
});
