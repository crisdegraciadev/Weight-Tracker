/*
 * Google sign-in through Google Identity Services (token model, no backend).
 * The access token lasts one hour and is kept in localStorage so a reload or a new tab does not ask again.
 * Once consent is granted, signIn() renews the token without showing the consent screen again.
 */
import { CLIENT_ID, SCOPE } from '../config.js';

const STORAGE_KEY = 'tok';
let token = null;
let tokenClient;
let pending; // { resolve, reject } of the signIn() in flight

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved?.exp > Date.now()) token = saved.v;
} catch {}

export const getToken = () => token;
export const isSignedIn = () => !!token;

/** Opens the Google popup (consent only the first time). Resolves once a token is granted. */
export function signIn() {
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient ??= google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: response => {
        if (response.error) return pending.reject(new Error('Login: ' + response.error));
        token = response.access_token;
        const expiresAt = Date.now() + (response.expires_in - 60) * 1000;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: token, exp: expiresAt }));
        pending.resolve();
      },
      // Popup blocked or closed: without this the promise would never settle
      error_callback: err => pending.reject(new Error('Login: ' + err.type)),
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOut() {
  if (token) google.accounts.oauth2.revoke(token);
  clearToken();
}

/** Forgets the token locally (used when the API reports it as expired). */
export function clearToken() {
  token = null;
  localStorage.removeItem(STORAGE_KEY);
}
