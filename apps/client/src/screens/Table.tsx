import { useEffect, useState } from 'react';
import { cardId, godPlayStatus, type CardId, type Intent } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { BidPanel } from '../components/BidPanel';
import { GodChoice } from '../components/GodChoice';
import { HandSummary } from './HandSummary';
import { Hand } from '../components/Hand';
import { LastTrick } from '../components/LastTrick';
import { PauseDialog } from '../components/PauseDialog';
import { PlayersBar } from '../components/PlayersBar';
import { TrickArea } from '../components/TrickArea';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';

export function Table({ view, emit }: { view: RoomView; emit: TypedEmit }) {
  const [choosing, setChoosing] = useState<CardId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const game = view.game;
  const turnId = game?.turnId;
  const phase = game?.phase;
  useEffect(() => setError(null), [turnId, phase]);
  if (!game) return null;

  const send = async (intent: Intent) => {
    setChoosing(null);
    const r = await emit('game:intent', intent);
    setError(r.ok ? null : r.error);
  };
  const onPlay = (id: CardId) => {
    const card = game.hand.find((c) => cardId(c) === id);
    if (card?.kind === 'god' && godPlayStatus(card.god, game.trickSuit) === 'choice') {
      setChoosing(id);
      return;
    }
    void send({ type: 'play', cardId: id });
  };

  const ended = game.phase === 'trickEnd' ? game.tricksThisHand[game.tricksThisHand.length - 1] : undefined;
  const trickCards = ended ? ended.cards : game.currentTrick;
  const myTurn = game.turnId === view.me && (game.phase === 'bidding' || game.phase === 'playing') && !view.pause;
  const playable = new Set<CardId>(myTurn ? game.playableCardIds : []);

  return (
    <main className="table">
      <PlayersBar game={game} seats={view.seats} />
      {myTurn && (
        <p data-testid="my-turn" className="my-turn">
          Tocca a te
        </p>
      )}
      <TrickArea cards={trickCards} seats={view.seats} winnerId={ended?.winnerId} />
      <LastTrick tricks={game.tricksThisHand} seats={view.seats} />
      {game.legalBids.length > 0 && !view.pause && (
        <BidPanel allowed={game.legalBids} onBid={(value) => void send({ type: 'bid', value })} />
      )}
      {error && <p role="alert">{errorMessage(error)}</p>}
      {game.phase === 'handEnd' && <HandSummary view={view} emit={emit} />}
      <Hand cards={game.hand} playable={playable} onPlay={onPlay} />
      {choosing && (
        <GodChoice
          onChoose={(declareChipetl) => void send({ type: 'play', cardId: choosing, declareChipetl })}
          onCancel={() => setChoosing(null)}
        />
      )}
      {view.pause && <PauseDialog view={view} emit={emit} />}
    </main>
  );
}
