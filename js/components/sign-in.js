/* Sign-in screen. */
import { $, on } from '../core/dom.js';
import * as actions from '../actions.js';
import { currentView, store } from '../state.js';

export function mountSignIn() {
  store.watch(['signedIn', 'sheet'], state => {
    $('signIn').hidden = currentView(state) !== 'signIn';
  });
  on('signInButton', 'click', actions.signIn);
}
