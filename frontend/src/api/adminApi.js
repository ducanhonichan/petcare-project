import { API_BASE } from './config'

async function request(path, options = {}) {
  const token = sessionStorage.getItem('petcare_token')

  if (!token) {
    const error = new Error('Please sign in.')
    error.status = 401
    throw error
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`)
    error.status = response.status
    throw error
  }

  return data
}

export const getUsers = () => request('/admin/users')

export const setUserBanned = (id, isBanned) =>
  request(`/admin/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ is_banned: isBanned }),
  })

export const getSpecies = () => request('/species')

export const getAdminVaccineTypes = () => request('/admin/vaccine-types')

export const createVaccineType = (data) =>
  request('/admin/vaccine-types', { method: 'POST', body: JSON.stringify(data) })

export const updateVaccineType = (id, data) =>
  request(`/admin/vaccine-types/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const hideVaccineType = (id) =>
  request(`/admin/vaccine-types/${id}`, { method: 'DELETE' })
