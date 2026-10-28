/*
 * Pure calculations for quitting smoking.
 * Attempts: { start, end } ISO dates, end = null while in progress.
 * Cravings: { at: "yyyy-mm-dd hh:mm", intensity: 1-5, trigger }.
 */
import { addDays, daysBetween, weekdayIndex } from '../core/dates.js';
import { average } from './stats.js';

export const attemptDays = ({ start, end }, today) => Math.max(0, daysBetween(start, end ?? today));

/** The attempt in progress: the last one, if it has not ended. */
export function currentAttempt(attempts) {
  const last = attempts.at(-1);
  return last && !last.end ? last : null;
}

export function smokeStats(attempts, today) {
  const days = attempts.map(attempt => attemptDays(attempt, today));
  return {
    best: Math.max(0, ...days),
    total: days.reduce((sum, n) => sum + n, 0),
    count: attempts.length,
  };
}

// ---------- Savings ----------

const PACK_SIZE = 20; // ponytail: fixed 20-cigarette pack, add a setting if rolling tobacco or other sizes matter

/** Cigarettes not smoked and money saved over `days` smoke-free days. */
export function savings(days, { perDay, packPrice }) {
  const cigarettes = days * perDay;
  return { cigarettes, money: (cigarettes * packPrice) / PACK_SIZE };
}

/** Life expectancy gained per cigarette not smoked (UCL, Addiction 2024: ~20 minutes). */
const MINUTES_PER_CIGARETTE = 20;

export const lifeGainedMinutes = cigarettes => cigarettes * MINUTES_PER_CIGARETTE;

// ---------- Milestones ----------

/** Health milestones (WHO / CDC timelines), also the streak medals. */
export const MILESTONES = [
  { days: 1, title: '1 día', text: 'El monóxido de carbono en sangre vuelve a niveles normales.' },
  { days: 3, title: '3 días', text: 'La nicotina ha salido del cuerpo; respirar empieza a costar menos.' },
  { days: 7, title: '1 semana', text: 'El olfato y el gusto se recuperan.' },
  { days: 14, title: '2 semanas', text: 'Mejoran la circulación y la función pulmonar.' },
  { days: 30, title: '1 mes', text: 'Bajan la tos y la falta de aire.' },
  { days: 90, title: '3 meses', text: 'Los pulmones funcionan claramente mejor.' },
  { days: 180, title: '6 meses', text: 'Los cilios de los pulmones se han regenerado: menos infecciones.' },
  { days: 365, title: '1 año', text: 'El riesgo de enfermedad coronaria es la mitad que el de un fumador.' },
  { days: 1825, title: '5 años', text: 'El riesgo de ictus se acerca al de alguien que nunca ha fumado.' },
  { days: 3650, title: '10 años', text: 'El riesgo de cáncer de pulmón es la mitad que el de un fumador.' },
];

/** Each milestone with its status for `days` smoke-free days: 'reached' | 'next' | 'pending'. */
export function milestoneProgress(days) {
  const next = MILESTONES.find(milestone => milestone.days > days);
  return MILESTONES.map(milestone => ({
    ...milestone,
    status: milestone.days <= days ? 'reached' : milestone === next ? 'next' : 'pending',
  }));
}

/** The next milestone to reach and the % of the way there from the previous one; null when all are reached. */
export function nextMilestone(days) {
  const index = MILESTONES.findIndex(milestone => milestone.days > days);
  if (index === -1) return null;
  const from = MILESTONES[index - 1]?.days ?? 0;
  const milestone = MILESTONES[index];
  return {
    ...milestone,
    left: milestone.days - days,
    percent: Math.round(((days - from) / (milestone.days - from)) * 100),
  };
}

// ---------- Cravings ----------

const CRAVINGS_WINDOW_DAYS = 30;

function timeSlot(at) {
  const hour = Number(at.slice(11, 13));
  if (hour < 6 || hour >= 21) return 'Noche';
  if (hour < 12) return 'Mañana';
  return hour < 16 ? 'Mediodía' : 'Tarde';
}

/** The largest group: { key, share } of `items` grouped by `keyOf`, or null. */
function mostCommon(items, keyOf) {
  const groups = [...Map.groupBy(items, keyOf)].sort((a, b) => b[1].length - a[1].length);
  return groups.length ? { key: groups[0][0], share: groups[0][1].length / items.length } : null;
}

/** Situations already used, most frequent first (suggestions for the form). */
export function cravingTriggers(cravings) {
  const withTrigger = cravings.filter(craving => craving.trigger);
  return [...Map.groupBy(withTrigger, craving => craving.trigger)]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([trigger]) => trigger);
}

/** Last 7 days count, plus intensity, hardest time of day and top situation over the last 30 days. */
export function cravingStats(cravings, today) {
  const since = days => cravings.filter(craving => craving.at.slice(0, 10) > addDays(today, -days));
  const recent = since(CRAVINGS_WINDOW_DAYS);
  return {
    lastWeek: since(7).length,
    intensity: average(recent.map(craving => craving.intensity).filter(Boolean)),
    hardestSlot: mostCommon(recent, craving => timeSlot(craving.at)),
    topTrigger: mostCommon(
      recent.filter(craving => craving.trigger),
      craving => craving.trigger,
    ),
  };
}

// ---------- Achievements ----------

// ponytail: a craving counts as overcome unless it was logged on a relapse day; add an explicit flag if that misleads
const overcomeCravings = (attempts, cravings) => {
  const relapseDays = new Set(attempts.map(attempt => attempt.end).filter(Boolean));
  return cravings.filter(craving => !relapseDays.has(craving.at.slice(0, 10)));
};

/** True when some attempt covers a whole Saturday and Sunday (the relapse day itself is not smoke-free). */
function hadSmokeFreeWeekend(attempts, today) {
  return attempts.some(({ start, end }) => {
    const saturday = addDays(start, (5 - weekdayIndex(start) + 7) % 7);
    return addDays(saturday, 2) <= (end ?? today);
  });
}

/** Progress towards beating the best previous streak: done once any attempt beat every one before it. */
function recordProgress(attempts, today) {
  let best = -1;
  let beaten = false;
  attempts.forEach((attempt, index) => {
    const days = attemptDays(attempt, today);
    if (index > 0 && days > best) beaten = true;
    best = Math.max(best, days);
  });
  const current = currentAttempt(attempts);
  if (beaten || !current || attempts.length < 2) return { value: Number(beaten), goal: 1 };
  const previousBest = Math.max(...attempts.slice(0, -1).map(attempt => attemptDays(attempt, today)));
  return { value: attemptDays(current, today), goal: previousBest + 1 };
}

/**
 * Lifetime achievements: once reached they stay, whatever happens to the current attempt.
 * Each one: { icon, title, text, value, goal, unit }, unlocked when value >= goal.
 */
export function achievements({ attempts, cravings, costs }, today) {
  const overcome = overcomeCravings(attempts, cravings);
  const sameSituation = Math.max(
    0,
    ...[
      ...Map.groupBy(
        overcome.filter(c => c.trigger),
        c => c.trigger,
      ).values(),
    ].map(g => g.length),
  );
  const totalDays = smokeStats(attempts, today).total;
  const saved = costs ? savings(totalDays, costs) : { cigarettes: 0, money: 0 };
  const money = Math.floor(saved.money);
  const lifeHours = Math.floor(lifeGainedMinutes(saved.cigarettes) / 60);

  return [
    {
      icon: '💪',
      title: 'Primer antojo superado',
      text: 'Apunta un antojo y no fumes.',
      value: overcome.length,
      goal: 1,
    },
    {
      icon: '🔟',
      title: '10 antojos superados',
      text: 'Cada antojo que pasa es más débil.',
      value: overcome.length,
      goal: 10,
    },
    { icon: '🛡️', title: '50 antojos superados', text: 'Ya sabes cómo se pasan.', value: overcome.length, goal: 50 },
    {
      icon: '👑',
      title: '100 antojos superados',
      text: 'Los antojos ya no mandan.',
      value: overcome.length,
      goal: 100,
    },
    {
      icon: '🌋',
      title: 'Contra el más fuerte',
      text: 'Supera un antojo de intensidad 5.',
      value: overcome.filter(craving => craving.intensity === 5).length,
      goal: 1,
    },
    { icon: '🧠', title: 'Domador', text: 'Supera 5 antojos de la misma situación.', value: sameSituation, goal: 5 },
    {
      icon: '🏆',
      title: 'Nuevo récord',
      text: 'Supera tu mejor racha anterior.',
      ...recordProgress(attempts, today),
      unit: ' días',
    },
    {
      icon: '📅',
      title: 'Finde sin humo',
      text: 'Un sábado y un domingo enteros sin fumar.',
      value: Number(hadSmokeFreeWeekend(attempts, today)),
      goal: 1,
    },
    { icon: '💶', title: '100 € ahorrados', text: 'Sumando todos tus intentos.', value: money, goal: 100, unit: ' €' },
    { icon: '💰', title: '500 € ahorrados', text: 'Sumando todos tus intentos.', value: money, goal: 500, unit: ' €' },
    {
      icon: '🤑',
      title: '1.000 € ahorrados',
      text: 'Sumando todos tus intentos.',
      value: money,
      goal: 1000,
      unit: ' €',
    },
    {
      icon: '❤️',
      title: '1 día de vida ganado',
      text: '≈ 20 min por cigarrillo no fumado.',
      value: lifeHours,
      goal: 24,
      unit: ' h',
    },
    {
      icon: '💖',
      title: '1 semana de vida ganada',
      text: '≈ 20 min por cigarrillo no fumado.',
      value: lifeHours,
      goal: 168,
      unit: ' h',
    },
  ].map(achievement => ({ ...achievement, unlocked: achievement.value >= achievement.goal }));
}
