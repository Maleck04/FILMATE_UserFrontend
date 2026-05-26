const AUTH_KEY = 'filmate_auth_session';

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isGuestSession() {
  return getAuthSession()?.mode === 'guest';
}

export function isRegisteredSession() {
  return getAuthSession()?.mode === 'registered';
}

export function saveGuestSession() {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      mode: 'guest',
      user: null,
    })
  );
}

export function saveRegisteredSession(user) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      mode: 'registered',
      user,
    })
  );
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}
