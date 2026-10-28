/* Thin client for the Google Sheets REST API v4. Knows nothing about the tracker's data. */
import { clearToken, getToken } from './google-auth.js';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets/';

export class SessionExpiredError extends Error {
  constructor() {
    super('Sesión caducada, vuelve a entrar');
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (response.status === 401) {
    clearToken();
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Error ' + response.status);
  }
  return response.json();
}

/** A1 range prefixed with a quoted sheet (tab) name, e.g. 'My tab'!A2:G */
export const a1 = (tab, range) => `'${tab.replace(/'/g, "''")}'!${range}`;

export const getSpreadsheet = id => request(`${id}?fields=properties.title,sheets.properties.title`);

export function batchGet(id, ranges) {
  const query = ranges.map(range => 'ranges=' + encodeURIComponent(range)).join('&');
  return request(
    `${id}/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
}

/** USER_ENTERED lets Sheets parse ISO dates as real dates. */
export const updateValues = (id, range, values, valueInputOption = 'RAW') =>
  request(`${id}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`, {
    method: 'PUT',
    body: { values },
  });

export const batchUpdateValues = (id, data) =>
  request(`${id}/values:batchUpdate`, { method: 'POST', body: { valueInputOption: 'RAW', data } });

/** Structural changes, e.g. { addSheet: { properties: { title } } } */
export const batchUpdate = (id, requests) => request(`${id}:batchUpdate`, { method: 'POST', body: { requests } });

/**
 * Appends rows after the last row with data within `range`'s columns.
 * USER_ENTERED lets Sheets parse ISO dates as real dates.
 */
export const appendValues = (id, range, values, valueInputOption = 'USER_ENTERED') =>
  request(
    `${id}/values/${encodeURIComponent(range)}:append?valueInputOption=${valueInputOption}&insertDataOption=OVERWRITE`,
    {
      method: 'POST',
      body: { values },
    },
  );
