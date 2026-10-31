import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getVetVisits,
  createVetVisit,
  deleteVetVisit,
} from '../api/vetVisitsApi'

function VetVisits() {
  const { petId } = useParams()
  const navigate = useNavigate()

  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    visit_date: '',
    clinic: '',
    reason: '',
    diagnosis: '',
    cost: '',
    note: '',
  })

  const loadVisits = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getVetVisits(petId)
      setVisits(data)
    } catch (err) {
      setError(err.message || 'Unable to load veterinary visits.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVisits()
  }, [petId])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')

      await createVetVisit(petId, {
        ...form,
        cost: form.cost === '' ? null : Number(form.cost),
      })

      setForm({
        visit_date: '',
        clinic: '',
        reason: '',
        diagnosis: '',
        cost: '',
        note: '',
      })

      setShowForm(false)
      await loadVisits()
    } catch (err) {
      setError(err.message || 'Unable to save veterinary visit.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (visitId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this visit?'
    )

    if (!confirmed) return

    try {
      setError('')
      await deleteVetVisit(petId, visitId)
      await loadVisits()
    } catch (err) {
      setError(err.message || 'Unable to delete veterinary visit.')
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'

    const value = new Date(date)
    return Number.isNaN(value.getTime())
      ? date
      : value.toLocaleDateString()
  }

  const formatCost = (cost) => {
    if (cost == null) return 'Not specified'

    return Number(cost).toLocaleString('vi-VN') + ' VND'
  }

  return (
    <div className="vet-page">
      <div className="vet-header">
        <div>
          <button
            type="button"
            className="vet-back-btn"
            onClick={() => navigate('/pets')}
          >
            ← Back to My Pets
          </button>

          <h1>Veterinary Visits</h1>
          <p>Keep track of your pet's medical visits and health records.</p>
        </div>

        <button
          type="button"
          className="vet-add-btn"
          onClick={() => setShowForm(!showForm)}
        >
          + Add Visit
        </button>
      </div>

      {error && (
        <div className="vet-error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <section className="vet-form-card">
          <h2>New Veterinary Visit</h2>

          <form onSubmit={handleSubmit}>
            <div className="vet-form-grid">
              <div>
                <label htmlFor="visit-date">Visit Date *</label>
                <input
                  id="visit-date"
                  type="date"
                  value={form.visit_date}
                  onChange={(e) =>
                    setForm({ ...form, visit_date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="visit-clinic">Clinic</label>
                <input
                  id="visit-clinic"
                  type="text"
                  value={form.clinic}
                  onChange={(e) =>
                    setForm({ ...form, clinic: e.target.value })
                  }
                  placeholder="Enter clinic name"
                />
              </div>

              <div>
                <label htmlFor="visit-reason">Reason</label>
                <input
                  id="visit-reason"
                  type="text"
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                  placeholder="Reason for visit"
                />
              </div>

              <div>
                <label htmlFor="visit-diagnosis">Diagnosis</label>
                <input
                  id="visit-diagnosis"
                  type="text"
                  value={form.diagnosis}
                  onChange={(e) =>
                    setForm({ ...form, diagnosis: e.target.value })
                  }
                  placeholder="Enter diagnosis"
                />
              </div>

              <div>
                <label htmlFor="visit-cost">Cost (VND)</label>
                <input
                  id="visit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) =>
                    setForm({ ...form, cost: e.target.value })
                  }
                  placeholder="Enter cost"
                />
              </div>

              <div>
                <label htmlFor="visit-note">Note</label>
                <textarea
                  id="visit-note"
                  value={form.note}
                  onChange={(e) =>
                    setForm({ ...form, note: e.target.value })
                  }
                  placeholder="Additional notes"
                  rows="3"
                />
              </div>
            </div>

            <div className="vet-form-actions">
              <button
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Visit'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="vet-list-section">
        <h2>Visit History</h2>

        {loading ? (
          <p>Loading veterinary visits...</p>
        ) : visits.length === 0 ? (
          <div className="vet-empty">
            <div className="vet-empty-icon">🏥</div>
            <h3>No veterinary visits yet</h3>
            <p>Start recording your pet's medical visits.</p>
          </div>
        ) : (
          <div className="vet-visit-list">
            {visits.map((visit) => (
              <article className="vet-visit-card" key={visit.id}>
                <div className="vet-visit-top">
                  <div>
                    <span className="vet-visit-date">
                      {formatDate(visit.visit_date)}
                    </span>
                    <h3>{visit.clinic || 'Veterinary Clinic'}</h3>
                  </div>

                  <button
                    type="button"
                    className="vet-delete-btn"
                    onClick={() => handleDelete(visit.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="vet-visit-details">
                  <p><strong>Reason:</strong> {visit.reason || 'N/A'}</p>
                  <p><strong>Diagnosis:</strong> {visit.diagnosis || 'N/A'}</p>
                  <p><strong>Cost:</strong> {formatCost(visit.cost)}</p>
                  <p><strong>Note:</strong> {visit.note || 'N/A'}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default VetVisits