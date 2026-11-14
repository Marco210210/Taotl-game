/** Copre tutto quando il telefono è in verticale: il Taotl si gioca in orizzontale. */
export function RotateNotice() {
  return (
    <div className="rotate-device" data-testid="rotate-device">
      <svg className="rotate-phone" viewBox="0 0 120 120" aria-hidden="true">
        <g className="phone">
          <rect x="38" y="14" width="44" height="92" rx="8" fill="none" stroke="#fbfaf5" strokeWidth="4" />
          <rect x="47" y="38" width="26" height="40" rx="3" fill="#fbfaf5" />
          <path d="M60 44v8M56.5 46l7 4M63.5 46l-7 4" stroke="#d9262c" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
      <h1>Ruota il telefono</h1>
      <p>Il Taotl si gioca in orizzontale: gira il telefono e il tavolo riappare com'era.</p>
    </div>
  );
}
