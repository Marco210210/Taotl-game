import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cardId, godPlayStatus, trickSuit, type Card as CardT, type CardId, type Intent } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { BidPanel } from '../components/BidPanel';
import { GodChoice } from '../components/GodChoice';
import { Hand } from '../components/Hand';
import { PauseDialog } from '../components/PauseDialog';
import { Seat } from '../components/Seat';
import { StandingsDialog } from '../components/StandingsDialog';
import { TrickArea, deciderIndex } from '../components/TrickArea';
import { Pip } from '../components/cardArt/pips';
import { FeltMark } from '../components/FeltMark';
import { errorMessage } from '../lib/errors';
import { suitName } from '../lib/labels';
import { tableLayout, type RingBox } from '../lib/seatLayout';
import type { TypedEmit } from '../net/socket';
import { HandSummary } from './HandSummary';

/** Misure del riquadro dell'ovale, di una carta della presa e di una targhetta (px). */
function useRingBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<RingBox | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const room = el.closest<HTMLElement>('.table-room');
      const css = room ? getComputedStyle(room) : null;
      // le variabili CSS sono clamp(): si leggono risolte da un elemento sonda
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--trick-w);height:var(--plaque-h)';
      el.appendChild(probe);
      const cardW = probe.offsetWidth;
      const plaqueH = probe.offsetHeight;
      probe.remove();
      if (!css || el.clientHeight <= 0) return;
      const next = { w: el.clientWidth, h: el.clientHeight, cardW, cardH: cardW * (184 / 120), plaqueH };
      setBox((b) => (b && b.w === next.w && b.h === next.h && b.cardW === next.cardW ? b : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, box };
}

export function Table({ view, emit, connected = true }: { view: RoomView; emit: TypedEmit; connected?: boolean }) {
  const [choosing, setChoosing] = useState<CardId | null>(null);
  const [showStandings, setShowStandings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const game = view.game;
  const turnId = game?.turnId;
  const phase = game?.phase;
  useEffect(() => setError(null), [turnId, phase]);
  const seatIds = view.seats.map((s) => s.id).join(',');
  const { ref: ringRef, box } = useRingBox();
  const layout = useMemo(
    () => tableLayout(seatIds.split(','), view.me, box && box.h > 0 ? box.w / box.h : 2.5, box ?? undefined),
    [seatIds, view.me, box],
  );
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
  const trickNo = ended ? game.tricksThisHand.length - 1 : game.tricksThisHand.length;
  const leaderId = trickCards[0]?.playerId;
  const suit = trickSuit(trickCards);
  const decider = trickCards[deciderIndex(trickCards)];
  const active = game.phase === 'bidding' || game.phase === 'playing';
  const myTurn = game.turnId === view.me && active && !view.pause;
  const playable = new Set<CardId>(myTurn ? game.playableCardIds : []);
  const nick = (id: string | null | undefined) => view.seats.find((s) => s.id === id)?.nickname ?? '';
  const choosingCard: CardT | undefined = choosing ? game.hand.find((c) => cardId(c) === choosing) : undefined;

  let note: string | null = null;
  if (active && !myTurn && !view.pause && trickCards.length === 0) {
    note = game.phase === 'bidding' ? `Dichiara ${nick(game.turnId)}` : `Apre ${nick(game.turnId)}`;
  }

  return (
    <main className="table-room" data-testid="table" data-players={view.seats.length} data-crowd={view.seats.length > 8 ? 'large' : 'small'}>
      <div className="table-stage">
        <header className="hud" data-testid="hud">
          <strong>Mano {game.handNumber}/6</strong>
          <span>
            Dichiarate {game.totalBid} / {game.cardsPerPlayer}
          </span>
        </header>
        <div className="table-oval" aria-hidden="true">
          <div className="table-felt">
            <FeltMark />
          </div>
        </div>
        <div className="table-ring" ref={ringRef}>
          {view.seats.map((s) => {
            const p = game.players.find((x) => x.id === s.id);
            if (!p) return null;
            return (
              <Seat
                key={s.id}
                seat={s}
                player={p}
                pos={layout.seat.get(s.id)!}
                me={s.id === view.me}
                turn={active && s.id === game.turnId}
                leader={s.id === leaderId}
              />
            );
          })}
          <TrickArea
            cards={trickCards}
            seats={view.seats}
            seatPos={layout.seat}
            spotPos={layout.spot}
            winnerId={ended?.winnerId}
            trickNo={trickNo}
          />
        </div>
        <div className="hud-right">
          <button type="button" className="secondary standings-btn" data-testid="btn-standings" onClick={() => setShowStandings(true)}>
            Classifica
          </button>
        </div>
        {!connected && (
          <p className="net-status" data-testid="reconnecting" role="status">
            Riconnessione…
          </p>
        )}
        <div className="table-center">
          {suit && game.legalBids.length === 0 && (
            <p className="trick-suit" data-testid="trick-suit" data-suit={suit}>
              <svg viewBox="0 0 24 30" aria-hidden="true">
                <Pip kind={suit} cx={12} cy={15} w={22} />
              </svg>
              <span>
                {suitName(suit)}
                {decider && decider.playerId !== view.me && <small> da {nick(decider.playerId)}</small>}
                {decider && decider.playerId === view.me && <small> da te</small>}
              </span>
            </p>
          )}
          {game.legalBids.length > 0 && !view.pause && (
            <BidPanel allowed={game.legalBids} onBid={(value) => void send({ type: 'bid', value })} />
          )}
          {note && <p className="table-note">{note}</p>}
        </div>
        <div className="actions">
          {myTurn && (
            <p data-testid="my-turn" className="my-turn">
              Tocca a te
            </p>
          )}
        </div>
      </div>
      <div className="dock">
        <Hand cards={game.hand} playable={playable} onPlay={onPlay} myTurn={myTurn && game.phase === 'playing'} />
        {error && (
          <p role="alert" className="table-error">
            {errorMessage(error)}
          </p>
        )}
      </div>
      {game.phase === 'handEnd' && <HandSummary view={view} emit={emit} />}
      {choosing && (
        <GodChoice
          card={choosingCard}
          onChoose={(declareChipetl) => void send({ type: 'play', cardId: choosing, declareChipetl })}
          onCancel={() => setChoosing(null)}
        />
      )}
      {showStandings && <StandingsDialog view={view} onClose={() => setShowStandings(false)} />}
      {view.pause && <PauseDialog view={view} emit={emit} />}
    </main>
  );
}
