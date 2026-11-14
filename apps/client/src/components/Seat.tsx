import type { CSSProperties } from 'react';
import type { PlayerView } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';
import type { Point } from '../lib/seatLayout';

type PlayerInfo = PlayerView['players'][number];

/** Asterisco rosso delle carte: segna chi ha aperto la presa in corso. */
export function AsteriskIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1v10M1.7 3.5l8.6 5M10.3 3.5l-8.6 5" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg viewBox="0 0 10 14" aria-hidden="true">
      <rect x=".7" y=".7" width="8.6" height="12.6" rx="1.4" fill="var(--back)" stroke="var(--ink)" strokeWidth="1" />
      <path d="M3 4q2 1.5 0 3t0 3M7 4q-2 1.5 0 3t0 3" fill="none" stroke="#fff" strokeWidth=".9" />
    </svg>
  );
}

export interface SeatProps {
  seat: SeatView;
  player: PlayerInfo;
  pos: Point;
  me: boolean;
  dealer: boolean;
  turn: boolean;
  leader: boolean;
}

export function Seat({ seat: s, player: p, pos, me, dealer, turn, leader }: SeatProps) {
  const offline = !s.isBot && !s.connected;
  const status = [
    me ? 'tu' : null,
    dealer ? 'mazziere' : null,
    turn ? 'di turno' : null,
    leader ? 'ha aperto la presa' : null,
    s.isBot ? 'bot' : null,
    offline ? 'disconnesso' : null,
    s.botControlled && !s.isBot ? 'gioca il bot al suo posto' : null,
  ].filter(Boolean);
  return (
    <section
      className="seat"
      data-testid={`seat-${s.id}`}
      data-me={me}
      data-turn={turn}
      data-dealer={dealer}
      data-leader={leader}
      data-connected={!offline}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` } as CSSProperties}
      aria-label={`${s.nickname}${status.length ? ` (${status.join(', ')})` : ''}`}
    >
      <div className="seat-head">
        <span className="seat-name">{s.nickname}</span>
        <span className="seat-total" data-testid="stat-total" title="Punteggio">
          {p.total}
          <small>pt</small>
        </span>
      </div>
      <div className="seat-stats">
        <span title="Prese fatte / dichiarate">
          prese <b data-testid="stat-made">{p.tricksWon}</b>/<b data-testid="stat-bid">{p.bid ?? '–'}</b>
        </span>
        <span className="stat-cards" title="Carte in mano">
          <CardsIcon />
          <b data-testid="stat-cards">{p.handCount}</b>
        </span>
        <span className="seat-flags">
          {s.isBot && (
            <span className="pill" data-testid="badge-bot">
              bot
            </span>
          )}
          {s.botControlled && !s.isBot && (
            <span className="pill outline" data-testid="badge-bot" title="Gioca il bot al suo posto">
              bot
            </span>
          )}
          {offline && (
            <span className="pill off" data-testid="badge-offline" title="Disconnesso">
              off
            </span>
          )}
        </span>
      </div>
      {dealer && (
        <span className="dealer-chip" data-testid="dealer-chip" title="Mazziere" aria-hidden="true">
          M
        </span>
      )}
      {leader && (
        <span className="leader-mark" data-testid="leader-mark" title="Ha aperto la presa" aria-hidden="true">
          <AsteriskIcon />
        </span>
      )}
    </section>
  );
}
