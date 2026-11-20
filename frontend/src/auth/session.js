import { useSyncExternalStore } from 'react'

// The Login page stores the token and user in sessionStorage under these keys.
const TOKEN_KEY = 'petcare_token'
const USER_KEY = 'petcare_user'
const EVENT = 'petcare-session'

function read(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function notify() {
  window.dispatchEvent(new Event(EVENT))
}

export function getToken() {
  return read(TOKEN_KEY)
}

export function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  notify()
}

// Keep the name shown in the navbar in step with the profile
export function updateStoredUser(changes) {
  try {
    const current = JSON.parse(read(USER_KEY)) || {}
    sessionStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...changes }))
  } catch {
    // ignore
  }

  notify()
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  } catch {
    // ignore
  }

  notify()
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)

  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// The logged-in user, or null. Re-renders when the session changes.
export function useSessionUser() {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(USER_KEY),
    () => null
  )

  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
