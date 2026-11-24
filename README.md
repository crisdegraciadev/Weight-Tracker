# Life Control Manager

Static web app to track weight, daily steps, migraine attacks and expenses, using a Google Sheet as its database. It reads and writes the sheet directly: changes made in the app show up in the sheet and vice versa (the app reloads when you come back to the tab, or with ↻).

No backend, no build step and no npm dependencies: it runs as-is on GitHub Pages.

## Spreadsheet layout

Row 1 holds the headers.

| A    | B     | C             | D      | E             | F             | G                                  | H                                 |
| ---- | ----- | ------------- | ------ | ------------- | ------------- | ---------------------------------- | --------------------------------- |
| Date | Steps | Avg (formula) | Weight | Avg (formula) | Min (formula) | Notes (one per week, Monday's row) | Workout type (empty = no workout) |

The app only writes columns A, B, D, G and H; the formulas in C, E and F are never touched.
Goals are stored next to the data: target weight in `I2` (header "Objetivo" in `I1`) and daily step goal in `J2` (header "Objetivo pasos" in `J1`).

Migraines live in a tab named **Migrañas** (created on the first save). Row 1 holds the headers; two blocks side by side:

| Columns | Content |
| ------- | ------- |
| A:F | Attacks, one per row: date, intensity (1-10), duration (h), medication ("Ibuprofeno, Naproxeno"), notes, aura ("Sí" or empty) |
| H:J | Preventive treatment periods, one per row: drug, from, to (empty = still taking it) |

Expenses live in a tab named **Gastos** (created on the first save):

| Columns | Content |
| ------- | ------- |
| A:D | Expenses, one per row: date, category name, amount (€), concept |
| F:G | Categories, one per row: name, monthly budget (€, optional). Renaming one in the app rewrites its expenses; renaming it to an existing name merges them; a category in use can't be deleted |
| I:L | Recurring expenses, one per row: concept, category name, amount (€), day of the month. One counts as logged when that month has an expense with the same concept and category |
| N2 | Monthly spending target (€, optional). Each month spent under it counts as saved, over it as overspent |

## Architecture

```
index.html                 Markup for every screen
css/
  main.css                 Entry point: declares cascade layers and imports the rest
  tokens.css               Design tokens: colors (light/dark), spacing, radii, type scale
  base.css                 Reset, typography, native form controls
  layout.css               App shell and dashboard grids, breakpoints
  components/              One file per UI component (button, card, kpi-card, week-card…)
js/
  main.js                  Entry point: mounts components, app-level wiring
  config.js                OAuth Client ID
  state.js                 The app store and selectors (current screen)
  actions.js               Use cases: sign in, select sheet, reload, save day/note/goal
  core/                    Generic helpers: DOM, store, notifications, dates, formatting, theme colors
  services/
    google-auth.js         Google Identity Services token flow
    sheets-api.js          Thin Google Sheets REST client
    tracker-repository.js  Maps tracker data to the spreadsheet layout
    migraine-repository.js Maps migraine attacks and preventive periods to the "Migrañas" tab
    expense-repository.js  Maps expenses, categories and recurring expenses to the "Gastos" tab
  domain/
    stats.js               Pure calculations: weeks, averages, goal progress
    migraine.js            Pure calculations: days since last attack, medication days, 30-day averages, calendar days
    expenses.js            Pure calculations: month totals, budgets, monthly series, pending recurring, filters (self-check: `node js/domain/expenses.test.js`)
  components/              One module per UI component, matching css/components
```

### Conventions

**Dependencies flow one way:** `components → actions → services / domain → core`.
Components never call Google directly, and `domain/` never touches the DOM.

**Components** export a `mountX()` function. It wires the component's events and subscribes to the store with `store.watch(keys, render)`, so it re-renders only when the keys it uses change. To add a feature: create `js/components/my-thing.js` + `css/components/my-thing.css`, import the CSS in `main.css` and mount the JS in `main.js`.

**State** lives in a single store (`state.js`). Components read it and call `actions.*` to change it; only actions write to the store.

**Notifications** go through `core/notify.js` (`notify`, `reportError`), which dispatches a window event the toast listens to. No module needs a reference to the toast.

**CSS**

- Cascade layers (`tokens, base, layout, components`) set precedence, so specificity battles and `!important` are not needed.
- Each component has one root class (`.week-card`) and styles its parts with native nesting (`.week-card .head`).
- No raw values in components: colors, spacing, radii and font sizes come from `tokens.css`.
- `--accent` lets the markup pick a component's color (`style="--accent: var(--color-aqua)"`).
- Colors use `light-dark()`, so each token is declared once for both themes. Canvas charts resolve them through `core/theme.js`.

**Sections:** the dashboard has three panels (`data-panel="peso"` / `"migranas"` / `"gastos"`) switched by the URL hash (`#peso`, `#migranas`, `#gastos`) through `section-nav.js`.

**Language:** code, comments and docs are in English; user-facing text is in Spanish.

**Formatting:** Prettier with the settings in `.prettierrc` (`npx prettier --write .`).

### Browser support

Uses modern platform features (`light-dark()`, CSS nesting, cascade layers, `Map.groupBy`): current Chrome, Edge, Safari 17.5+ and Firefox 128+.

## 1. Create the OAuth Client ID (once)

1. Go to <https://console.cloud.google.com/> and create a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **OAuth consent screen** → type _External_, keep it in _Testing_ mode and add your email under _Test users_.
4. **Credentials → Create credentials → OAuth client ID** → type _Web application_.
   Under _Authorized JavaScript origins_ add:
   - `https://<your-user>.github.io`
   - `http://localhost:8001` (for local testing)
5. Copy the Client ID into `CLIENT_ID` in `js/config.js`. It is not a secret and can be committed.

Google will show an "unverified app" warning on sign-in; that is expected for a personal app in Testing mode.

## 2. Run locally

The app uses ES modules, so it must be served over http (opening `index.html` from disk does not work):

```sh
python3 -m http.server 8001
```

Open <http://localhost:8001>, sign in with Google, paste the sheet URL, pick the tab and you are done.

## 3. Publish on GitHub Pages

Push the repository and go to **Settings → Pages → Deploy from a branch → main / (root)**. It will be served at `https://<your-user>.github.io/<repo>/`.

## Notes

- The Google session lasts one hour; after that the app asks you to sign in again.
- Saving a date that has no row in the sheet appends a new row at the end.
