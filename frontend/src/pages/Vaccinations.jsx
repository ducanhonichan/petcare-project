import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useOutletContext } from 'react-router-dom'
import {
  createVaccination,
  deleteVaccination,
  getPet,
  getUpcomingReminders,
  getVaccinations,
  getVaccineTypes,
  updateVaccination,
} from '../api/vaccinationsApi'
import StateDisplay from '../components/StateDisplay'
import './Vaccinations.css'

const emptyForm = {
  vaccine_type_id: '',
  given_date: '',
  next_due_date: '',
  clinic: '',
  note: '',
}

const STATUS_LABELS = {
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due soon',
  LATER: 'Up to date',
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// 'YYYY-MM-DD' + n days
function addDays(value, days) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function describeDays(days) {
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  if (days > 1) return `in ${days} days`
  if (days === -1) return '1 day overdue'
  return `${-days} days overdue`
}

function Vaccinations() {
  const { petId } = useParams()
  return <PetVaccinations key={petId} petId={petId} />
}

function PetVaccinations({ petId }) {
  const { retryReminders } = useOutletContext()
  const [pet, setPet] = useState(null)
  const [types, setTypes] = useState([])
  const [records, setRecords] = useState(null)
  const [reminders, setReminders] = useState({})
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [needsLogin, setNeedsLogin] = useState(
    () => !sessionStorage.getItem('petcare_token')
  )
  const [reload, setReload] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [dueEdited, setDueEdited] = useState(false)

  useEffect(() => {
    if (needsLogin) return

    let active = true

    async function load() {
      try {
        const petData = await getPet(petId)
        const [typeData, recordData] = await Promise.all([
          getVaccineTypes(petData.species_id),
          getVaccinations(petId),
        ])

        // Reminder badges are optional: the page still works without them.
        const statusById = {}

        try {
          const upcoming = await getUpcomingReminders()

          for (const dose of [
            ...upcoming.overdue,
            ...upcoming.due_soon,
            ...upcoming.later,
          ]) {
            statusById[dose.vaccination_id] = dose
          }
        } catch {
          // ignore
        }

        if (!active) return

        setPet(petData)
        setTypes(typeData)
        setRecords(recordData)
        setReminders(statusById)
      } catch (error) {
        if (!active) return

        if (error.status === 401) {
          setNeedsLogin(true)
        } else {
          setLoadError(error.message)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [petId, reload, needsLogin])

  if (needsLogin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: `/pets/${petId}/vaccinations` }}
      />
    )
  }

  const today = todayString()
  const selectedType = types.find(
    (type) => String(type.id) === String(form.vaccine_type_id)
  )

  // Suggested next date = given date + the vaccine's interval (until the user types one)
  const suggestedDue =
    selectedType?.interval_days && form.given_date
      ? addDays(form.given_date, selectedType.interval_days)
      : ''
  const shownDue = dueEdited ? form.next_due_date : suggestedDue

  // When editing a record whose vaccine type was hidden later, keep it selectable
  const editingRecord = records?.find((r) => r.id === editingId)
  const typeOptions =
    editingRecord && !types.some((t) => t.id === editingRecord.vaccine_type_id)
      ? [
          ...types,
          {
            id: editingRecord.vaccine_type_id,
            name: editingRecord.vaccine_name,
          },
        ]
      : types

  function reloadHistory() {
    setRecords(null)
    setLoadError('')
    setReload((value) => value + 1)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setDueEdited(false)
    setActionError('')
  }

  function openAddForm() {
    setActionError('')
    setEditingId(null)
    setForm(emptyForm)
    setDueEdited(false)
    setShowForm(true)
  }

  function openEditForm(record) {
    setActionError('')
    setEditingId(record.id)
    setForm({
      vaccine_type_id: String(record.vaccine_type_id),
      given_date: record.given_date,
      next_due_date: record.next_due_date || '',
      clinic: record.clinic || '',
      note: record.note || '',
    })
    setDueEdited(true)
    setShowForm(true)
  }

  async function runAction(action, request) {
    setPendingAction(action)
    setActionError('')

    try {
      await request()
      retryReminders()
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

    if (!form.vaccine_type_id) {
      setActionError('Please choose a vaccine.')
      return
    }

    if (!form.given_date) {
      setActionError('Please choose the date it was given.')
      return
    }

    if (shownDue && shownDue < form.given_date) {
      setActionError('Next due date cannot be before the date given.')
      return
    }

    const payload = {
      vaccine_type_id: Number(form.vaccine_type_id),
      given_date: form.given_date,
      clinic: form.clinic,
      note: form.note,
    }

    if (shownDue) payload.next_due_date = shownDue

    void runAction('save', async () => {
      if (editingId === null) {
        await createVaccination(petId, payload)
      } else {
        await updateVaccination(editingId, payload)
      }

      closeForm()
    })
  }

  function handleDelete(record) {
    if (
      pendingAction ||
      !window.confirm(`Delete this ${record.vaccine_name} record?`)
    ) {
      return
    }

    void runAction(record.id, () => deleteVaccination(record.id))
  }

  function updateField(event) {
    const { name, value } = event.target

    if (name === 'next_due_date') setDueEdited(true)

    setForm((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="vacc-page">
      <Link className="vacc-back" to="/pets">
        ← Back to My Pets
      </Link>

      <header className="vacc-header">
        <div>
          <h1>Vaccinations{pet ? ` · ${pet.name}` : ''}</h1>
          <p>Record vaccines and see when the next dose is due.</p>
        </div>

        {records && !showForm && (
          <button
            type="button"
            className="add-pet-btn"
            disabled={pendingAction !== null}
            onClick={openAddForm}
          >
            + Add Vaccination
          </button>
        )}
      </header>

      {actionError && (
        <p className="login-error" role="alert">
          {actionError}
        </p>
      )}

      {showForm && (
        <section className="vacc-card">
          <h2>{editingId === null ? 'New Vaccination' : 'Edit Vaccination'}</h2>

          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="vacc-fields" disabled={pendingAction !== null}>
              <label>
                Vaccine
                <select
                  name="vaccine_type_id"
                  value={form.vaccine_type_id}
                  onChange={updateField}
                >
                  <option value="">Select a vaccine</option>
                  {typeOptions.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date given
                <input
                  name="given_date"
                  type="date"
                  min="1900-01-01"
                  max={today}
                  value={form.given_date}
                  onChange={updateField}
                />
              </label>

              <label>
                Next due date
                <input
                  name="next_due_date"
                  type="date"
                  min={form.given_date || undefined}
                  value={shownDue}
                  onChange={updateField}
                />
                <small>
                  {selectedType?.interval_days
                    ? `Suggested: ${selectedType.interval_days} days after the date given. You can change it.`
                    : 'Optional.'}
                </small>
              </label>

              <label>
                Clinic
                <input
                  name="clinic"
                  maxLength={255}
                  value={form.clinic}
                  onChange={updateField}
                />
              </label>

              <label className="vacc-wide">
                Note
                <textarea
                  name="note"
                  rows={3}
                  value={form.note}
                  onChange={updateField}
                />
              </label>

              <div className="pet-form-actions vacc-wide">
                <button type="button" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit">
                  {pendingAction === 'save' ? 'Saving…' : 'Save Vaccination'}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <section className="vacc-history">
        <h2>Vaccination History</h2>

        {loadError ? (
          <StateDisplay
            type="error"
            message={loadError}
            actionLabel="Try again"
            onAction={reloadHistory}
          />
        ) : records === null ? (
          <StateDisplay type="loading" title="Loading vaccinations…" />
        ) : records.length === 0 ? (
          <StateDisplay
            title="No vaccinations yet"
            message="Add the first vaccine to start tracking due dates."
          />
        ) : (
          <div className="vacc-table-wrap">
            <table className="vacc-table">
              <thead>
                <tr>
                  <th>Vaccine</th>
                  <th>Date given</th>
                  <th>Next due</th>
                  <th>Clinic</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const reminder = reminders[record.id]

                  return (
                    <tr key={record.id}>
                      <td data-label="Vaccine">
                        <strong>{record.vaccine_name}</strong>
                        {record.note && (
                          <span className="vacc-note">{record.note}</span>
                        )}
                      </td>
                      <td data-label="Date given">{record.given_date}</td>
                      <td data-label="Next due">
                        {record.next_due_date || '—'}
                        {reminder && (
                          <span
                            className={`vacc-badge vacc-badge--${reminder.status.toLowerCase()}`}
                          >
                            {STATUS_LABELS[reminder.status]} ·{' '}
                            {describeDays(reminder.days_until_due)}
                          </span>
                        )}
                      </td>
                      <td data-label="Clinic">{record.clinic || '—'}</td>
                      <td className="vacc-actions">
                        <button
                          type="button"
                          disabled={pendingAction !== null}
                          onClick={() => openEditForm(record)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="vacc-delete"
                          disabled={pendingAction !== null}
                          onClick={() => handleDelete(record)}
                        >
                          {pendingAction === record.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Vaccinations
