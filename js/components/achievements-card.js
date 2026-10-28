/* Lifetime achievements: unlocked first, then locked ones closest to completion, with their progress. */
import { $ } from '../core/dom.js';
import { today } from '../core/dates.js';
import { formatNumber } from '../core/format.js';
import { achievements } from '../domain/smoke.js';
import { store } from '../state.js';

const share = ({ value, goal }) => Math.min(1, value / goal);

export function mountAchievementsCard() {
  store.watch(['attempts', 'cravings', 'smokeCosts'], ({ attempts, cravings, smokeCosts: costs }) => {
    const list = achievements({ attempts, cravings, costs }, today()).sort(
      (a, b) => b.unlocked - a.unlocked || share(b) - share(a),
    );
    const unlocked = list.filter(achievement => achievement.unlocked).length;
    $('achievementsSummary').textContent = `${unlocked} de ${list.length}`;
    $('achievementsList').replaceChildren(...list.map(createTile));
  });
}

function createTile(achievement) {
  const { icon, title, text, value, goal, unit = '', unlocked } = achievement;
  const tile = document.createElement('li');
  tile.className = unlocked ? 'unlocked' : 'locked';

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = icon;

  const name = document.createElement('b');
  name.textContent = title;

  const description = document.createElement('p');
  description.textContent = text;

  tile.append(badge, name, description);

  // Yes/no achievements have nothing to count, so only multi-step ones show a bar
  if (!unlocked && goal > 1) {
    const percent = Math.round(share(achievement) * 100);
    const bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', `Progreso de ${title}`);
    bar.setAttribute('aria-valuenow', percent);
    const fill = document.createElement('i');
    fill.style.width = percent + '%';
    bar.append(fill);

    const count = document.createElement('small');
    count.textContent = `${formatNumber(value, 0)} / ${formatNumber(goal, 0)}${unit}`;
    tile.append(bar, count);
  }
  return tile;
}
