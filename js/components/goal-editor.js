/*
 * Shared view/edit behavior for goal cards: shows the form while the goal is unset
 * or being edited, and the view otherwise.
 */
import { $, on } from '../core/dom.js';
import { store } from '../state.js';

/**
 * @param stateKey  store key holding the goal value (e.g. 'weightGoal')
 * @param prefix    element id prefix: `${prefix}View`, `${prefix}Form`, `${prefix}Input`
 * @param editId    id of the edit (pencil) button
 * @param save      (value: number) => Promise
 */
export function mountGoalEditor({ stateKey, prefix, editId, save }) {
  const view = $(`${prefix}View`);
  const form = $(`${prefix}Form`);
  const input = $(`${prefix}Input`);
  let editing = false;

  const sync = () => {
    const hasGoal = store.get()[stateKey] != null;
    form.hidden = hasGoal && !editing;
    view.hidden = !hasGoal || editing;
  };

  store.watch([stateKey], () => {
    editing = false;
    sync();
  });

  on(editId, 'click', () => {
    editing = !editing;
    input.value = store.get()[stateKey] ?? '';
    sync();
    if (editing) input.focus();
  });

  on(form, 'submit', e => {
    e.preventDefault();
    return save(Number(input.value));
  });
}
