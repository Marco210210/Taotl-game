/** Emblema stampato sul panno, a bassa opacità: cerchio a greca e il nome del gioco. */
export function FeltMark() {
  const steps = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg className="felt-mark" viewBox="0 0 200 200" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth="2">
        <circle cx="100" cy="100" r="92" />
        <circle cx="100" cy="100" r="70" />
        {steps.map((d) => (
          <path key={d} d="M100 12v6h5v5h5" transform={`rotate(${d} 100 100)`} />
        ))}
      </g>
      <text x="100" y="114" textAnchor="middle" fontFamily="var(--font-display)" fontSize="44" fill="#fff">
        Taotl
      </text>
    </svg>
  );
}
