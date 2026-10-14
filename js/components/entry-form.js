/*
 * Daily entry form. Picking a date (or a day in a week card) loads its saved values.
 * The workout field is free text with suggestions; leaving it empty means no workout that day.
 */
import { $, on } from '../core/dom.js';
import { today } from '../core/dates.js';
import * as actions from '../actions.js';
import { workoutTypes } from '../domain/stats.js';
import { store } from '../state.js';

export function mountEntryForm() {
  const date = $('entryDate');
  const weight = $('entryWeight');
  const steps = $('entrySteps');
  const workout = $('entryWorkout');

  const fill = () => {
    const day = store.get().days.find(d => d.date === date.value);
    weight.value = day?.weight ?? '';
    steps.value = day?.steps ?? '';
    workout.value = day?.workout ?? '';
  };
  const numberOrEmpty = input => (input.value === '' ? '' : Number(input.value));

  date.value = today();
  store.watch(['days'], ({ days }) => {
    fill();
    $('workoutTypes').replaceChildren(...workoutTypes(days).map(type => new Option(type)));
  });
  store.watch(['selectedDate'], ({ selectedDate }) => {
    if (!selectedDate) return;
    date.value = selectedDate;
    fill();
    weight.focus();
  });

  on(date, 'change', fill);
  on('entryForm', 'submit', e => {
    e.preventDefault();
    return actions.saveDay({
      date: date.value,
      weight: numberOrEmpty(weight),
      steps: numberOrEmpty(steps),
      workout: workout.value.trim(),
    });
  });
}
