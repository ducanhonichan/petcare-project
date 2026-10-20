
import { useState } from 'react'

const emptyPet = {
  name: '',
  species: '',
  breed: '',
  gender: 'UNKNOWN',
}

function Pets() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState(null)
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [newPet, setNewPet] = useState({ ...emptyPet })

  const [pets, setPets] = useState([
    {
      id: 1,
      name: 'Milo',
      species: 'Dog',
      breed: 'Golden Retriever',
      gender: 'MALE',
      age: '2 years',
      emoji: '🐶',
    },
    {
      id: 2,
      name: 'Luna',
      species: 'Cat',
      breed: 'British Shorthair',
      gender: 'FEMALE',
      age: '1 year',
      emoji: '🐱',
    },
  ])

  // Find selected pet from the latest pets list
  const selectedPet = pets.find(
    (pet) => pet.id === selectedPetId
  )

  // Open Add Pet form
  const handleOpenAddForm = () => {
    setEditingPetId(null)
    setNewPet({ ...emptyPet })
    setShowAddForm(true)
  }

  // Cancel Add/Edit
  const handleCancel = () => {
    setEditingPetId(null)
    setNewPet({ ...emptyPet })
    setShowAddForm(false)
  }

  // Add or Update Pet
  const handleAddPet = (e) => {
    e.preventDefault()

    const name = newPet.name.trim()

    if (!name || !newPet.species) {
      alert('Please enter pet name and select species.')
      return
    }

    const petData = {
      name,
      species: newPet.species,
      breed: newPet.breed.trim() || 'Unknown breed',
      gender: newPet.gender,
      emoji:
        newPet.species === 'Dog'
          ? '🐶'
          : newPet.species === 'Cat'
            ? '🐱'
            : '🐰',
    }

    if (editingPetId !== null) {
      // Update existing pet
      setPets((previousPets) =>
        previousPets.map((pet) =>
          pet.id === editingPetId
            ? { ...pet, ...petData }
            : pet
        )
      )
    } else {
      // Add new pet
      setPets((previousPets) => [
        ...previousPets,
        {
          id: Date.now(),
          ...petData,
          age: 'Unknown age',
        },
      ])
    }

    handleCancel()
  }

  // Delete Pet
  const handleDeletePet = (petId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this pet?'
    )

    if (!confirmed) return

    setPets((previousPets) =>
      previousPets.filter((pet) => pet.id !== petId)
    )

    if (editingPetId === petId) {
      handleCancel()
    }

    if (selectedPetId === petId) {
      setSelectedPetId(null)
    }
  }

  // Edit Pet
  const handleEditPet = (pet) => {
    setEditingPetId(pet.id)

    setNewPet({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
    })

    setShowAddForm(true)
  }

  // View Pet
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
                required
              />
            </div>

            <div>
              <label htmlFor="pet-species">Species</label>
              <select
                id="pet-species"
                value={newPet.species}
                onChange={(e) =>
                  setNewPet({
                    ...newPet,
                    species: e.target.value,
                  })
                }
                required
              >
                <option value="">Select species</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Rabbit">Rabbit</option>
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
              >
                Cancel
              </button>

              <button type="submit">
                {editingPetId !== null
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
              {selectedPet.emoji}
            </div>

            <h3 className="pet-detail-name">
              {selectedPet.name}
            </h3>

            <div className="pet-detail-row">
              <span className="pet-detail-label">
                Species
              </span>
              <span className="pet-detail-value">
                {selectedPet.species}
              </span>
            </div>

            <div className="pet-detail-row">
              <span className="pet-detail-label">
                Breed
              </span>
              <span className="pet-detail-value">
                {selectedPet.breed}
              </span>
            </div>

            <div className="pet-detail-row">
              <span className="pet-detail-label">
                Gender
              </span>
              <span className="pet-detail-value">
                {selectedPet.gender}
              </span>
            </div>

            <div className="pet-detail-row">
              <span className="pet-detail-label">
                Age
              </span>
              <span className="pet-detail-value">
                {selectedPet.age}
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
      <div className="pets-grid">
        {pets.map((pet) => (
          <div className="pet-card" key={pet.id}>
            <div className="pet-avatar">
              {pet.emoji}
            </div>

            <h2>{pet.name}</h2>
            <p>{pet.breed}</p>

            <div className="pet-details">
              <span>{pet.species}</span>
              <span>{pet.gender}</span>
              <span>{pet.age}</span>
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
                onClick={() => handleDeletePet(pet.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Pets
