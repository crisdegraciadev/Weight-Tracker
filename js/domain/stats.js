/* Pure calculations over daily entries (no DOM, no I/O). */
import { addDays, startOfWeek, weekdayIndex } from '../core/dates.js';

export const average = values => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);

const present = values => values.filter(v => v != null);

export const firstWeighIn = days => days.find(day => day.weight != null);
export const lastWeighIn = days => days.findLast(day => day.weight != null);

/**
 * Groups days into Monday-to-Sunday weeks, most recent first.
 * Weeks without any data (dates pre-filled in the sheet) are dropped.
 */
export function buildWeeks(days) {
  const byWeek = Map.groupBy(days, day => startOfWeek(day.date));
  return [...byWeek]
    .map(([start, weekDays]) => {
      const weights = present(weekDays.map(day => day.weight));
      return {
        start,
        days: weekDays,
        weight: average(weights),
        min: weights.length ? Math.min(...weights) : null,
        steps: average(present(weekDays.map(day => day.steps))),
        note: weekDays
          .map(day => day.note)
          .filter(Boolean)
          .join('\n'),
        workouts: weekDays.filter(day => day.workout).length,
        noteRow: Math.min(...weekDays.map(day => day.row)),
      };
    })
    .filter(week => week.weight != null || week.steps != null || week.note)
    .reverse();
}

export const findWeek = (weeks, iso) => weeks.find(week => week.start === startOfWeek(iso));

/** Most recent week that has the given metric, plus the one before it (for deltas). */
export function latestTwo(weeks, metric) {
  const [current, previous] = weeks.filter(week => week[metric] != null);
  return { current, previous };
}

/** 7-day rolling average of weight, one value per weigh-in. */
export const rollingAverage = weighIns =>
  weighIns.map(day =>
    average(weighIns.filter(d => d.date <= day.date && d.date > addDays(day.date, -7)).map(d => d.weight)),
  );

/** Progress (0-100) from the starting weight to the goal. Works for losing and gaining. */
export function goalProgress(start, current, goal) {
  const ratio = (current - start) / (goal - start || 1);
  return {
    percent: Math.round(Math.min(1, Math.max(0, ratio)) * 100),
    achieved: start - current,
    remaining: current - goal,
  };
}

// ---------- Weight trend ----------

const TREND_WINDOW_DAYS = 28;
const TREND_MIN_POINTS = 5;
const TREND_MIN_SPAN_DAYS = 10;
const daysBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / 864e5;

/**
 * Linear regression over the weigh-ins of the last 28 days. Less noisy than comparing two days.
 * Returns null when there is not enough data (fewer than 5 weigh-ins or under 10 days apart).
 * @returns {{ kgPerWeek: number, current: number, lastDate: string } | null}
 *          current = trend value at the last weigh-in
 */
export function weightTrend(days) {
  const last = lastWeighIn(days);
  if (!last) return null;
  const from = addDays(last.date, -TREND_WINDOW_DAYS);
  const points = days
    .filter(day => day.weight != null && day.date > from)
    .map(day => ({ x: daysBetween(from, day.date), y: day.weight }));
  if (points.length < TREND_MIN_POINTS || points.at(-1).x - points[0].x < TREND_MIN_SPAN_DAYS) return null;

  const meanX = average(points.map(p => p.x));
  const meanY = average(points.map(p => p.y));
  const slope =
    points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0) /
    points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  return {
    kgPerWeek: slope * 7,
    current: meanY + slope * (points.at(-1).x - meanX),
    lastDate: last.date,
  };
}

/** Estimated date to reach the goal at the current trend, or null if the trend is flat or moving away. */
export function forecastGoalDate(trend, goal) {
  const MIN_KG_PER_WEEK = 0.05;
  const MAX_DAYS = 730;
  const remaining = goal - trend.current;
  if (Math.abs(trend.kgPerWeek) < MIN_KG_PER_WEEK || remaining * trend.kgPerWeek <= 0) return null;
  // Rounded before ceil so floating-point noise (13.0000001) does not add a day
  const daysNeeded = Math.ceil(Number((remaining / (trend.kgPerWeek / 7)).toFixed(6)));
  return daysNeeded > MAX_DAYS ? null : addDays(trend.lastDate, daysNeeded);
}

// ---------- Step goal ----------

/** Status of each day Monday-Sunday of the week containing `today`: 'met' | 'missed' | 'empty' | 'future'. */
export function stepGoalWeek(days, stepGoal, today) {
  const monday = startOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const steps = days.find(day => day.date === date)?.steps ?? null;
    const status = date > today ? 'future' : steps == null ? 'empty' : steps >= stepGoal ? 'met' : 'missed';
    return { date, steps, status };
  });
}

/** Share (0-1) of logged days in the last 28 days that reached the goal, or null with no data. */
export function stepGoalRate(days, stepGoal, today) {
  const from = addDays(today, -TREND_WINDOW_DAYS);
  const logged = days.filter(day => day.steps != null && day.date > from && day.date <= today);
  return logged.length ? logged.filter(day => day.steps >= stepGoal).length / logged.length : null;
}

// ---------- Steps vs weight ----------

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Change of each week's average weight against the closest older week with weight. */
export function weeklyWeightChanges(weeks) {
  return weeks
    .map((week, i) => {
      const previous = weeks.slice(i + 1).find(w => w.weight != null);
      return week.weight != null && previous ? { week, change: week.weight - previous.weight } : null;
    })
    .filter(Boolean);
}

/**
 * Splits weeks by average daily steps (>= threshold vs below) and averages each group's
 * weight change against its previous week. Weeks without steps or without a previous weight are skipped.
 */
export function compareStepsAndWeight(weeks, threshold) {
  const changes = weeklyWeightChanges(weeks).filter(c => c.week.steps != null);
  const group = list => ({ count: list.length, change: average(list.map(c => c.change)) });
  return {
    above: group(changes.filter(c => c.week.steps >= threshold)),
    below: group(changes.filter(c => c.week.steps < threshold)),
  };
}

// ---------- Streaks and consistency ----------

/**
 * Consecutive days present in `dates` ending today. If today is not logged yet the streak
 * is still alive, so it counts back from yesterday.
 */
export function currentStreak(dates, today) {
  const logged = new Set(dates);
  let day = logged.has(today) ? today : addDays(today, -1);
  let length = 0;
  while (logged.has(day)) {
    length++;
    day = addDays(day, -1);
  }
  return length;
}

/** Longest run of consecutive days in `dates` (sorted ascending). */
export function longestStreak(dates) {
  let best = 0;
  let run = 0;
  dates.forEach((date, i) => {
    run = i > 0 && addDays(dates[i - 1], 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export const weighInDates = days => days.filter(day => day.weight != null).map(day => day.date);
export const stepGoalDates = (days, goal) => days.filter(day => day.steps >= goal).map(day => day.date);

/**
 * Share (0-1) of days with a weigh-in over the last 28 days, or since the first weigh-in
 * if tracking started more recently.
 */
export function loggingRate(days, today) {
  const first = firstWeighIn(days);
  if (!first) return null;
  const from = [first.date, addDays(today, -(TREND_WINDOW_DAYS - 1))].sort().at(-1);
  const span = daysBetween(from, today) + 1;
  const logged = weighInDates(days).filter(date => date >= from && date <= today).length;
  return logged / span;
}

// ---------- Weekday pattern ----------

const MIN_WEIGH_INS_PER_WEEK = 3;

/**
 * For each weekday (0 = Monday): average weight relative to its own week's average
 * (so the overall trend does not bias it) and average steps.
 * Weeks with fewer than 3 weigh-ins are ignored for the weight part.
 */
export function weekdayPattern(weeks) {
  const weightDeltas = Array.from({ length: 7 }, () => []);
  const steps = Array.from({ length: 7 }, () => []);
  weeks.forEach(week => {
    const weighIns = week.days.filter(day => day.weight != null);
    week.days.forEach(day => {
      if (day.steps != null) steps[weekdayIndex(day.date)].push(day.steps);
      if (day.weight != null && weighIns.length >= MIN_WEIGH_INS_PER_WEEK)
        weightDeltas[weekdayIndex(day.date)].push(day.weight - week.weight);
    });
  });
  return weightDeltas.map((deltas, weekday) => ({
    weekday,
    weightDelta: average(deltas),
    steps: average(steps[weekday]),
  }));
}

// ---------- Records ----------

const maxBy = (items, value) =>
  items.reduce((best, item) => (best == null || value(item) > value(best) ? item : best), null);

// A week needs this many logged days to compete for a weekly record, so a week that just started cannot win
const MIN_DAYS_FOR_WEEK_RECORD = 4;
const loggedDays = (week, metric) => week.days.filter(day => day[metric] != null).length;

/** All-time bests. Each entry is null when there is no data for it. */
export function personalRecords(days, weeks) {
  const lowestWeight = maxBy(
    days.filter(day => day.weight != null),
    day => -day.weight,
  );
  const mostSteps = maxBy(
    days.filter(day => day.steps != null),
    day => day.steps,
  );
  const biggestDrop = maxBy(
    weeklyWeightChanges(weeks).filter(c => c.change < 0 && loggedDays(c.week, 'weight') >= MIN_DAYS_FOR_WEEK_RECORD),
    c => -c.change,
  );
  const bestStepsWeek = maxBy(
    weeks.filter(week => loggedDays(week, 'steps') >= MIN_DAYS_FOR_WEEK_RECORD),
    week => week.steps,
  );
  return { lowestWeight, mostSteps, biggestDrop, bestStepsWeek };
}

// ---------- Chart range ----------

export const CHART_RANGES = { month: 30, quarter: 90, all: null };

/** Keeps the days inside the selected range, counted back from the latest entry. */
export function filterByRange(days, range) {
  const length = CHART_RANGES[range];
  if (!length || !days.length) return days;
  const from = addDays(days.at(-1).date, -length);
  return days.filter(day => day.date > from);
}

// ---------- Workouts ----------

const DEFAULT_WORKOUT_TYPES = ['Gym', 'Correr', 'Bici', 'Natación', 'Caminata larga'];

/** Suggestions for the workout field: types already used (most frequent first), then the defaults. */
export function workoutTypes(days) {
  const counts = new Map();
  days.forEach(day => day.workout && counts.set(day.workout, (counts.get(day.workout) ?? 0) + 1));
  const used = [...counts].sort((a, b) => b[1] - a[1]).map(([type]) => type);
  return [...new Set([...used, ...DEFAULT_WORKOUT_TYPES])];
}
