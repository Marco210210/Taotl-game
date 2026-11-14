import type { Suit } from '@taotl/engine';

/**
 * Inchiostri del mazzo, presi dalle foto in docs/carte-originali: stampa a tinte piatte
 * (rosso, verde, nero, giallo) su cartoncino bianco, con contorno nero.
 */
export const INK = {
  paper: '#fbfaf5',
  red: '#d9262c',
  green: '#1f7a40',
  black: '#191714',
  yellow: '#f3d012',
  back: '#a9d06d',
  line: '#191714',
} as const;

/** Colore dell'indice (valore) di ogni seme: come nell'originale, rosso o nero. */
export const SUIT_INK: Record<Suit, string> = {
  cuori: INK.red,
  quadri: INK.red,
  fiori: INK.black,
  picche: INK.black,
  totem: INK.black,
};

/** Larghezza e altezza della tavola SVG di ogni carta. */
export const CARD_W = 120;
export const CARD_H = 184;
export const MID = CARD_H / 2;
