import { API_BASE } from './config'

function getAuthHeaders() {
  const token = sessionStorage.getItem('petcare_token')
  if (!token) {
    const error = new Error('Please sign in to view veterinary visits.')
    error.status = 401
    throw error
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`)
    error.status = response.status
    throw error
  }

  return data
}

// Get veterinary visits of a pet
export async function getVetVisits(petId) {
  const response = await fetch(
    `${API_BASE}/pets/${petId}/visits`,
    {
      headers: getAuthHeaders(),
    }
  )

  return handleResponse(response)
}

// Create a veterinary visit
export async function createVetVisit(petId, visitData) {
  const response = await fetch(
    `${API_BASE}/pets/${petId}/visits`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(visitData),
    }
  )

  return handleResponse(response)
}

// Delete a veterinary visit
export async function deleteVetVisit(petId, visitId) {
  const response = await fetch(
    `${API_BASE}/pets/${petId}/visits/${visitId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  )

  return handleResponse(response)
}