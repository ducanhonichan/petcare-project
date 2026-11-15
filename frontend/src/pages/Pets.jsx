
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StateDisplay from '../components/StateDisplay'

const API_BASE = 'http://localhost:3000/api'

const emptyPet = {
  name: '',
  species_id: '',
  breed: '',
  gender: 'UNKNOWN',
}

function getPetEmoji(speciesName) {
  if (speciesName === 'Dog') return '🐶'
  if (speciesName === 'Cat') return '🐱'
  if (speciesName === 'Rabbit') return '🐰'
  return '🐾'
}

function getPetAge(birthDate) {
  if (!birthDate) return 'Unknown age'

  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return 'Unknown age'

  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()

  if (today.getDate() < birth.getDate()) months--

  if (months < 0) {
    years--
    months += 12
  }

  if (years < 0) return 'Unknown age'

  if (years === 0) {
    return `${months} month${months === 1 ? '' : 's'}`
  }

  return `${years} year${years === 1 ? '' : 's'}`
}

function Pets() {
  const navigate = useNavigate()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState(null)
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [newPet, setNewPet] = useState({ ...emptyPet })

  const [pets, setPets] = useState([])
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getSpeciesName = (speciesId) => {
    return species.find(
      (item) => item.id === Number(speciesId)
    )?.name || 'Unknown'
  }

  const request = async (path, options = {}) => {
    const token = sessionStorage.getItem('petcare_token')

    if (!token) {
      throw new Error('Please sign in to manage your pets.')
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        )
      }

      throw new Error(result.message || 'Request failed.')
    }

    return result
  }

  const loadPets = async () => {
    const result = await request('/pets')

    if (!Array.isArray(result)) {
      throw new Error('Invalid pets response.')
    }

    setPets(result)
  }

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const token = sessionStorage.getItem('petcare_token')

        if (!token) {
          navigate('/login', { replace: true })
          return
        }

        const [speciesResponse, petsResponse] = await Promise.all([
          fetch(`${API_BASE}/species`),
          fetch(`${API_BASE}/pets`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

        const speciesData = await speciesResponse.json()
        const petsData = await petsResponse.json()

        if (!speciesResponse.ok) {
          throw new Error(
            speciesData.message || 'Unable to load species.'
          )
        }

        if (!petsResponse.ok) {
          throw new Error(
            petsResponse.status === 401
              ? 'Your session has expired. Please sign in again.'
              : petsData.message || 'Unable to load pets.'
          )
        }

        if (!Array.isArray(speciesData) || !Array.isArray(petsData)) {
          throw new Error('Invalid API response.')
        }

        if (active) {
          setSpecies(speciesData)
          setPets(petsData)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load pets.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [navigate])

  const selectedPet = pets.find(
    (pet) => pet.id === selectedPetId
  )

  const handleOpenAddForm = () => {
    setEditingPetId(null)
    setNewPet({ ...emptyPet })
    setError('')
    setSuccess('')
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setEditingPetId(null)
    setNewPet({ ...emptyPet })
    setShowAddForm(false)
  }

  const handleAddPet = async (e) => {
    e.preventDefault()

    const name = newPet.name.trim()
    const speciesId = Number(newPet.species_id)

    if (
      !name ||
      !Number.isSafeInteger(speciesId) ||
      speciesId <= 0
    ) {
      setError('Please enter pet name and select species.')
      return
    }

    const petData = {
      name,
      species_id: speciesId,
      breed: newPet.breed.trim() || null,
      gender: newPet.gender,
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (editingPetId !== null) {
        // Preserve optional fields not shown in the edit form.
        const existingPet = pets.find(
          (pet) => pet.id === editingPetId
        )

        await request(`/pets/${editingPetId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...petData,
            birth_date: existingPet?.birth_date
              ? String(existingPet.birth_date).slice(0, 10)
              : null,
            color: existingPet?.color ?? null,
            avatar_url: existingPet?.avatar_url ?? null,
            note: existingPet?.note ?? null,
          }),
        })

        setSuccess('Pet updated successfully.')
      } else {
        await request('/pets', {
          method: 'POST',
          body: JSON.stringify(petData),
        })

        setSuccess('Pet added successfully.')
      }

      await loadPets()
      handleCancel()
    } catch (err) {
      setError(err.message || 'Unable to save pet.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePet = async (petId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this pet?'
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await request(`/pets/${petId}`, {
        method: 'DELETE',
      })

      await loadPets()

      if (editingPetId === petId) {
        handleCancel()
      }

      if (selectedPetId === petId) {
        setSelectedPetId(null)
      }

      setSuccess('Pet deleted successfully.')
    } catch (err) {
      setError(err.message || 'Unable to delete pet.')
    }
  }

  const handleEditPet = (pet) => {
    setEditingPetId(pet.id)

    setNewPet({
      name: pet.name || '',
      species_id: String(pet.species_id),
      breed: pet.breed || '',
      gender: pet.gender || 'UNKNOWN',
    })

    setError('')
    setSuccess('')
    setShowAddForm(true)
  }

  const handleViewPet = (pet) => {
    setSelectedPetId(pet.id)
  }

  return (
    <div className="pets-page">
      <div className="pets-header">
        <div>
          <h1>My Pets</h1>
          <p>
            Manage your pets' profiles and health information.
          </p>
        </div>

        <button
          className="add-pet-btn"
          type="button"
          onClick={handleOpenAddForm}
        >
          + Add New Pet
        </button>
      </div>

      {error && (
        <p role="alert" className="login-error">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="weight-success">
          {success}
        </p>
      )}

      {/* ADD / EDIT FORM */}
      {showAddForm && (
        <div className="add-pet-form">
          <h2>
            {editingPetId !== null
              ? 'Edit Pet'
              : 'Add New Pet'}
          </h2>

          <form onSubmit={handleAddPet}>
            <div>
              <label htmlFor="pet-name">Pet Name</label>
              <input
                id="pet-name"
                type="text"
                placeholder="Enter pet name"
                value={newPet.name}
                onChange={(e) =>
                  setNewPet({
                    ...newPet,
                    name: e.target.value,
                  })
                }
                maxLength={100}
                required
              />
            </div>

            <div>
              <label htmlFor="pet-species">Species</label>
              <select
                id="pet-species"
                value={newPet.species_id}
                onChange={(e) =>
                  setNewPet({
                    ...newPet,
                    species_id: e.target.value,
                  })
                }
                required
              >
                <option value="">Select species</option>
                {species.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pet-breed">Breed</label>
              <input
                id="pet-breed"
                type="text"
                placeholder="Enter breed"
                value={newPet.breed}
                onChange={(e) =>
                  setNewPet({
                    ...newPet,
                    breed: e.target.value,
                  })
                }
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="pet-gender">Gender</label>
              <select
                id="pet-gender"
                value={newPet.gender}
                onChange={(e) =>
                  setNewPet({
                    ...newPet,
                    gender: e.target.value,
                  })
                }
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div className="pet-form-actions">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button type="submit" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : editingPetId !== null
                    ? 'Update Pet'
                    : 'Save Pet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PET DETAILS */}
      {selectedPet && (
        <div className="add-pet-form">
          <h2>Pet Details</h2>

          <div className="pet-detail-content">
            <div className="pet-detail-avatar">
              {getPetEmoji(
                getSpeciesName(selectedPet.species_id)
              )}
            </div>

            <h3 className="pet-detail-name">
              {selectedPet.name}
            </h3>

            <div className="pet-detail-row">
              <span className="pet-detail-label">Species</span>
              <span className="pet-detail-value">
                {getSpeciesName(selectedPet.species_id)}
              </span>
            </div>

            <div className="pet-detail-row">
              <span className="pet-detail-label">Breed</span>
              <span className="pet-detail-value">
                {selectedPet.breed || 'Unknown breed'}
              </span>
            </div>

            <div className="pet-detail-row">
              <span className="pet-detail-label">Gender</span>
              <span className="pet-detail-value">
                {selectedPet.gender}
              </span>
            </div>

            <div className="pet-detail-row">
              <span className="pet-detail-label">Age</span>
              <span className="pet-detail-value">
                {getPetAge(selectedPet.birth_date)}
              </span>
            </div>
          </div>

          <div className="pet-form-actions">
            <button
              type="button"
              onClick={() => setSelectedPetId(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PET LIST */}
      {loading ? (
        <StateDisplay
          type="loading"
          title="Loading pets..."
          message="Fetching your pets from the database."
        />
      ) : !error && pets.length === 0 ? (
        <StateDisplay
          type="empty"
          title="No pets yet"
          message="You haven't added any pets. Start by creating your first pet profile."
          actionLabel="Add Your First Pet"
          onAction={handleOpenAddForm}
        />
      ) : (
        <div className="pets-grid">
          {pets.map((pet) => (
            <div className="pet-card" key={pet.id}>
              <div className="pet-avatar">
                {getPetEmoji(
                  getSpeciesName(pet.species_id)
                )}
              </div>

              <h2>{pet.name}</h2>
              <p>{pet.breed || 'Unknown breed'}</p>

              <div className="pet-details">
                <span>
                  {getSpeciesName(pet.species_id)}
                </span>
                <span>{pet.gender}</span>
                <span>{getPetAge(pet.birth_date)}</span>
              </div>

              <div className="pet-actions">
                <button
                  type="button"
                  onClick={() => handleViewPet(pet)}
                >
                  View
                </button>

                <button
                  type="button"
                  onClick={() => handleEditPet(pet)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/pets/${pet.id}/weights`)
                  }
                >
                  Weight Tracking
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePet(pet.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Pets
