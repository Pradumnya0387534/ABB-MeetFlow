/**
 * auth.js
 * ─────────────────────────────────────────────────────────────────
 * Client-side localStorage authentication for the
 * Digitalization Review Suite.
 *
 * ⚠️  This is intentionally a simple, zero-backend auth layer
 *     for an internal presentation tool. It is NOT a secure
 *     authentication system for sensitive/production data.
 *
 * Credentials
 * ───────────
 *   admin   /  Admin@2026
 *   viewer  /  Viewer@2026
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Storage key ────────────────────────────────────────────────
var AUTH_KEY = 'digi_review_session';

// ── User store ─────────────────────────────────────────────────
var USERS = {
  admin: {
    password: 'Admin@2026',
    role:     'admin',
    label:    'Administrator',
    redirect: 'timer.html'
  },
  viewer: {
    password: 'Viewer@2026',
    role:     'viewer',
    label:    'Viewer',
    redirect: 'timer.html'    // viewer will get read-only view of timer (admin features locked)
  }
};


/* ══════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════ */

/**
 * login(username, password)
 * ─────────────────────────
 * Validates credentials. On success, persists the session to
 * localStorage and returns the redirect URL string.
 * On failure, returns false.
 *
 * @param  {string}         username
 * @param  {string}         password
 * @returns {string|false}  redirect path, or false
 */
function login(username, password) {
  var key  = (username || '').trim().toLowerCase();
  var user = USERS[key];

  if (!user || user.password !== password) {
    return false;
  }

  var session = {
    username:  key,
    role:      user.role,
    label:     user.label,
    loginTime: Date.now()
  };

  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } catch (e) {
    // Safari private-mode localStorage can throw – fail gracefully
    console.warn('[auth] Could not write session to localStorage:', e);
  }

  return user.redirect;
}


/**
 * logout()
 * ────────
 * Clears the session and returns the user to the login page.
 */
function logout() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) { /* ignore */ }

  window.location.replace('index.html');
}


/**
 * getSession()
 * ────────────
 * Returns the current session object, or null if not logged in.
 *
 * @returns {{ username, role, label, loginTime } | null}
 */
function getSession() {
  try {
    var raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}


/**
 * requireAuth()
 * ─────────────
 * Call at the top of every protected page.
 * Redirects to login immediately if there is no valid session.
 * Returns the session object when authenticated.
 *
 * @returns {{ username, role, label, loginTime } | null}
 */
function requireAuth() {
  var session = getSession();

  if (!session) {
    window.location.replace('index.html');
    return null;
  }

  return session;
}


/**
 * isAdmin()
 * ─────────
 * @returns {boolean}
 */
function isAdmin() {
  var session = getSession();
  return !!(session && session.role === 'admin');
}


/**
 * isViewer()
 * ──────────
 * @returns {boolean}
 */
function isViewer() {
  var session = getSession();
  return !!(session && session.role === 'viewer');
}
