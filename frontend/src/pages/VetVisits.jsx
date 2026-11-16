import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getVetVisits, createVetVisit, deleteVetVisit } from '../api/vetVisitsApi'
import StateDisplay from '../components/StateDisplay'
import './VetVisits.css'

const emptyForm = {
  visit_date: '',
  clinic: '',
  reason: '',
  diagnosis: '',
  cost: '',
  note: '',
}

const currency = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

function VetVisits() {
  const { petId } = useParams()
  return <PetVisitHistory key={petId} petId={petId} />
}

function PetVisitHistory({ petId }) {
  const [visits, setVisits] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(
    () => !sessionStorage.getItem('petcare_token')
  )
  const [reload, setReload] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (needsLogin) return

    let active = true
    getVetVisits(petId).then((data) => {
      if (active) setVisits(data)
    }).catch((error) => {
      if (!active) return
      if (error.status === 401) {
        setNeedsLogin(true)
      } else {
        setLoadError(error.message)
      }
    })

    return () => { active = false }
  }, [petId, reload, needsLogin])

  if (needsLogin) {
    return <Navigate to="/login" replace state={{ returnTo: `/pets/${petId}/visits` }} />
  }

  function reloadHistory() {
    setVisits(null)
    setLoadError('')
    setReload((value) => value + 1)
  }

  async function runAction(action, request) {
    setPendingAction(action)
    setActionError('')
    try {
      await request()
      reloadHistory()
    } catch (error) {
      if (error.status === 401) {
        setNeedsLogin(true)
      } else {
        setActionError(error.message)
      }
    } finally {
      setPendingAction(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (pendingAction) return
    void runAction('save', async () => {
      await createVetVisit(petId, {
        ...form,
        cost: form.cost === '' ? null : Number(form.cost),
      })
      setForm(emptyForm)
      setShowForm(false)
    })
  }

  function handleDelete(visitId) {
    if (pendingAction || !window.confirm('Delete this veterinary visit?')) return
    void runAction(visitId, () => deleteVetVisit(petId, visitId))
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="vet-page">
      <Link className="vet-back" to="/pets">← Back to My Pets</Link>
      <header className="vet-header">
        <div>
          <h1>Veterinary Visits</h1>
          <p>Keep track of your pet’s medical visits and health records.</p>
        </div>
        {visits && !showForm && (
          <button type="button" className="add-pet-btn" disabled={pendingAction !== null}
            onClick={() => { setActionError(''); setShowForm(true) }}>
            + Add Visit
          </button>
        )}
      </header>

      {actionError && <p className="login-error" role="alert">{actionError}</p>}

      {showForm && (
        <section className="vet-card">
          <h2>New Veterinary Visit</h2>
          <form onSubmit={handleSubmit}>
            <fieldset className="vet-fields" disabled={pendingAction !== null}>
              <label>Visit Date
                <input name="visit_date" type="date" required min="1000-01-01"
                  max="9999-12-31" value={form.visit_date} onChange={updateField} />
              </label>
              <label>Clinic
                <input name="clinic" maxLength={255} value={form.clinic} onChange={updateField} />
              </label>
              <label>Reason
                <input name="reason" value={form.reason} onChange={updateField} />
              </label>
              <label>Diagnosis
                <input name="diagnosis" value={form.diagnosis} onChange={updateField} />
              </label>
              <label>Cost (VND)
                <input name="cost" type="number" min="0" max="9999999999.99"
                  step="0.01" value={form.cost} onChange={updateField} />
              </label>
              <label>Note
                <textarea name="note" rows={3} value={form.note} onChange={updateField} />
              </label>
              <div className="pet-form-actions">
                <button type="button" onClick={() => { setShowForm(false); setActionError('') }}>
                  Cancel
                </button>
                <button type="submit">
                  {pendingAction === 'save' ? 'Saving…' : 'Save Visit'}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <section className="vet-history">
        <h2>Visit History</h2>
        {loadError ? (
          <StateDisplay type="error" message={loadError}
            actionLabel="Try again" onAction={reloadHistory} />
        ) : visits === null ? (
          <StateDisplay type="loading" title="Loading veterinary visits…" />
        ) : visits.length === 0 ? (
          <StateDisplay title="No veterinary visits yet"
            message="Start recording your pet’s medical visits." />
        ) : (
          <div className="vet-list">
            {visits.map((visit) => (
              <article className="vet-card" key={visit.id}>
                <div className="vet-card-heading">
                  <div>
                    <time dateTime={visit.visit_date}>{visit.visit_date}</time>
                    <h3>{visit.clinic || 'Veterinary Clinic'}</h3>
                  </div>
                  <button type="button" className="vet-delete" disabled={pendingAction !== null}
                    onClick={() => handleDelete(visit.id)}>
                    {pendingAction === visit.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
                <dl className="vet-details">
                  <dt>Reason</dt><dd>{visit.reason || '—'}</dd>
                  <dt>Diagnosis</dt><dd>{visit.diagnosis || '—'}</dd>
                  <dt>Cost</dt><dd>{visit.cost == null ? '—' : `${currency.format(visit.cost)} VND`}</dd>
                  <dt>Note</dt><dd>{visit.note || '—'}</dd>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default VetVisits
