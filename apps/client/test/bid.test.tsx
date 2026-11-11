import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BidPanel } from '../src/components/BidPanel';

describe('BidPanel', () => {
  it('mostra solo i valori leciti', async () => {
    const onBid = vi.fn();
    render(<BidPanel allowed={[0, 1, 2, 4]} onBid={onBid} />);
    for (const n of [0, 1, 2, 4]) expect(screen.getByTestId(`bid-${n}`)).toBeInTheDocument();
    expect(screen.queryByTestId('bid-3')).toBeNull();
    await userEvent.click(screen.getByTestId('bid-2'));
    expect(onBid).toHaveBeenCalledWith(2);
  });
});
