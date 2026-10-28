/* Entry point: mounts every component and wires app-level behavior. */
import { $ } from './core/dom.js';
import { reportError } from './core/notify.js';
import * as actions from './actions.js';
import { currentView, store } from './state.js';
import { mountToast } from './components/toast.js';
import { mountThemeToggle } from './components/theme-toggle.js';
import { mountAppHeader } from './components/app-header.js';
import { mountSectionNav } from './components/section-nav.js';
import { mountSignIn } from './components/sign-in.js';
import { mountSheetPicker } from './components/sheet-picker.js';
import { mountKpiCards } from './components/kpi-cards.js';
import { mountEntryForm } from './components/entry-form.js';
import { mountWeightGoalCard } from './components/weight-goal-card.js';
import { mountStepGoalCard } from './components/step-goal-card.js';
import { mountStepsWeightCard } from './components/steps-weight-card.js';
import { mountChartRange } from './components/chart-range.js';
import { mountWeightChart } from './components/weight-chart.js';
import { mountStepsChart } from './components/steps-chart.js';
import { mountStreaksCard } from './components/streaks-card.js';
import { mountWeekdayCard } from './components/weekday-card.js';
import { mountRecordsCard } from './components/records-card.js';
import { mountWeeksList } from './components/weeks-list.js';
import { mountSmokeHero } from './components/smoke-hero.js';
import { mountSmokeKpis } from './components/smoke-kpis.js';
import { mountSmokeHistory } from './components/smoke-history.js';
import { mountMilestonesCard } from './components/milestones-card.js';
import { mountAchievementsCard } from './components/achievements-card.js';
import { mountCravingsCard } from './components/cravings-card.js';

mountToast();
mountThemeToggle();
mountAppHeader();
mountSectionNav();
mountSignIn();
mountSheetPicker();
mountKpiCards();
mountEntryForm();
mountWeightGoalCard();
mountStepGoalCard();
mountStepsWeightCard();
mountChartRange();
mountWeightChart();
mountStepsChart();
mountStreaksCard();
mountWeekdayCard();
mountRecordsCard();
mountWeeksList();
mountSmokeHero();
mountSmokeKpis();
mountSmokeHistory();
mountMilestonesCard();
mountAchievementsCard();
mountCravingsCard();

const isDashboard = () => currentView(store.get()) === 'dashboard';

// Show the dashboard and load its data whenever we land on it (sign-in, sheet selected, reload)
store.watch(['signedIn', 'sheet'], () => {
  $('dashboard').hidden = !isDashboard();
  if (isDashboard()) actions.reload().catch(reportError);
});

// Pick up edits made directly in the spreadsheet when coming back to the tab
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isDashboard()) actions.reload().catch(reportError);
});
