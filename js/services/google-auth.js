/*
 * Google sign-in through Google Identity Services (token model, no backend).
 * The access token lasts one hour and is kept in sessionStorage so a reload does not ask again.
 */
import { CLIENT_ID, SCOPE } from '../config.js';

const STORAGE_KEY = 'tok';
let token = null;
let tokenClient;

try {
  const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  if (saved?.exp > Date.now()) token = saved.v;
} catch {}

export const getToken = () => token;
export const isSignedIn = () => !!token;

/** Opens the Google consent popup. Resolves once a token is granted. */
export function signIn() {
  return new Promise((resolve, reject) => {
    tokenClient ??= google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: () => {} });
    tokenClient.callback = response => {
      if (response.error) return reject(new Error('Login: ' + response.error));
      token = response.access_token;
      const expiresAt = Date.now() + (response.expires_in - 60) * 1000;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: token, exp: expiresAt }));
      resolve();
    };
    tokenClient.requestAccessToken();
  });
}

export function signOut() {
  if (token) google.accounts.oauth2.revoke(token);
  clearToken();
}

/** Forgets the token locally (used when the API reports it as expired). */
export function clearToken() {
  token = null;
  sessionStorage.removeItem(STORAGE_KEY);
}
