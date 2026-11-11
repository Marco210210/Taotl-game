import { chooseBid } from './estimate';
import { choosePlay } from './play';
import type { Intent, PlayerView, RuleConfig } from '../types';

/** Mossa del bot: funzione pura della sola vista del giocatore (§8). */
export function botMove(view: PlayerView, _config?: RuleConfig): Intent {
  if (view.turnId !== view.me) throw new Error('Non è il turno del bot');
  if (view.phase === 'bidding') {
    const mode = view.totalBid >= view.cardsPerPlayer ? 'floor' : 'round';
    return {
      type: 'bid',
      value: chooseBid(view.hand, view.cardsPerPlayer, view.players.length, view.legalBids, mode),
    };
  }
  if (view.phase === 'playing') return choosePlay(view);
  throw new Error(`Il bot non può muovere in fase ${view.phase}`);
}
