import { getToken } from '../auth/session'

import { API_BASE } from './config'

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed (${response.status}).`
    )
    error.status = response.status
    throw error
  }

  return data
}

function authHeaders() {
  const token = getToken()

  if (!token) {
    const error = new Error('Please sign in first.')
    error.status = 401
    throw error
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// Create an account. Returns { token, user }
export function registerUser({ name, email, password }) {
  return fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  }).then(handleResponse)
}

export function getProfile() {
  return fetch(`${API_BASE}/users/me`, {
    headers: authHeaders(),
  }).then(handleResponse)
}

// Update name and/or remind_before_days. Returns the new profile.
export function updateProfile(changes) {
  return fetch(`${API_BASE}/users/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(changes),
  }).then(handleResponse)
}
