import { useEffect, useRef } from 'react';

/** Sposta il focus sul primo bottone del dialog all'apertura (o sul dialog stesso se non ne ha). */
export function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (el.querySelector<HTMLElement>('button') ?? el).focus();
  }, []);
  return ref;
}
