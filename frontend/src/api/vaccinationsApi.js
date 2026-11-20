const API_URL = 'http://localhost:3000/api'

function getAuthHeaders() {
  const token = sessionStorage.getItem('petcare_token')

  if (!token) {
    const error = new Error('Please sign in to manage vaccinations.')
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
    const error = new Error(
      data.message || `Request failed (${response.status}).`
    )
    error.status = response.status
    throw error
  }

  return data
}

function request(path, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: getAuthHeaders(),
  }).then(handleResponse)
}

// The pet (name and species) shown at the top of the page
export function getPet(petId) {
  return request(`/pets/${petId}`)
}

// Active vaccine types of one species, for the form
export function getVaccineTypes(speciesId) {
  return request(`/vaccine-types?speciesId=${speciesId}`)
}

// Vaccination history of a pet, newest first
export function getVaccinations(petId) {
  return request(`/pets/${petId}/vaccinations`)
}

export function createVaccination(petId, data) {
  return request(`/pets/${petId}/vaccinations`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateVaccination(vaccinationId, data) {
  return request(`/vaccinations/${vaccinationId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteVaccination(vaccinationId) {
  return request(`/vaccinations/${vaccinationId}`, {
    method: 'DELETE',
  })
}

// Reminder status (OVERDUE / DUE_SOON / LATER) of the latest dose of each vaccine
export function getUpcomingReminders() {
  return request('/reminders/upcoming')
}
