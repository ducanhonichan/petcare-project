const API_URL = 'http://localhost:3000/api'

function getAuthHeaders() {
  const token = localStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }

  return data
}

// Get veterinary visits of a pet
export async function getVetVisits(petId) {
  const response = await fetch(
    `${API_URL}/pets/${petId}/visits`,
    {
      headers: getAuthHeaders(),
    }
  )

  return handleResponse(response)
}

// Create a veterinary visit
export async function createVetVisit(petId, visitData) {
  const response = await fetch(
    `${API_URL}/pets/${petId}/visits`,
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
    `${API_URL}/pets/${petId}/visits/${visitId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  )

  return handleResponse(response)
}