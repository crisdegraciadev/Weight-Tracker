/** Number in Spanish format with fixed decimals; '—' when there is no value. */
export const formatNumber = (value, decimals = 1) =>
  value == null
    ? '—'
    : value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Change badge (sign + arrow + color). `lowerIsBetter` is true for weight, false for steps. */
export function deltaPill(delta, { decimals = 1, unit = '', lowerIsBetter = true } = {}) {
  if (delta == null) return '';
  const tone = delta < 0 === lowerIsBetter ? 'good' : 'bad';
  const arrow = delta > 0 ? '▲ +' : '▼ ';
  return `<span class="pill ${tone}">${arrow}${formatNumber(delta, decimals)}${unit}</span>`;
}
