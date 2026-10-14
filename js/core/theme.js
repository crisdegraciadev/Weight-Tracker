/*
 * Resolves design tokens to concrete colors for canvas drawing (Chart.js).
 * Tokens use light-dark(), which only resolves when applied to an element,
 * so a hidden probe element does the resolution.
 */
let probe;

export function themeColor(token, alpha = 1) {
  if (!probe) {
    probe = document.createElement('span');
    probe.hidden = true;
    document.body.append(probe);
  }
  probe.style.color = `var(${token})`;
  const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
