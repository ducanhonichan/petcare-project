
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import StateDisplay from '../components/StateDisplay'
import WeightChart from '../components/WeightChart'

const API_BASE = 'http://localhost:3000/api/pets'

const emptyForm = {
  weight_kg: '',
  measured_at: '',
  note: '',
}

function toInputDateTime(value) {
  if (!value) return ''

  const text = String(value)

  // MySQL DATETIME thường trả về ISO hoặc YYYY-MM-DD HH:mm:ss.
  // Chuyển ISO về giờ địa phương khi cần.
  if (text.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(text)) {
    const date = new Date(text)

    if (Number.isNaN(date.getTime())) return ''

    const pad = (number) => String(number).padStart(2, '0')

    return [
      date.getFullYear(),
      '-',
      pad(date.getMonth() + 1),
      '-',
      pad(date.getDate()),
      'T',
      pad(date.getHours()),
      ':',
      pad(date.getMinutes()),
    ].join('')
  }

  return text.replace(' ', 'T').slice(0, 16)
}

function displayDateTime(value) {
  if (!value) return 'N/A'

  const inputValue = toInputDateTime(value)

  if (!inputValue) return String(value)

  const [date, time] = inputValue.split('T')

  return `${date} ${time || ''}`
}

async function request(url, options = {}) {
  const token = sessionStorage.getItem('petcare_token')
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = response.status === 401
      ? 'Please sign in to access weight records.'
      : result.message || `Request failed (${response.status}).`
    throw Object.assign(new Error(message), { status: response.status })
  }
  return result
}

function Weights() {
  const { petId } = useParams()
  return <PetWeights key={petId} petId={petId} />
}

function PetWeights({ petId }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)
  const [history, setHistory] = useState(null)
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const endpoint = `${API_BASE}/${petId}/weights`

  const busy = saving || deletingId !== null
  const records = history?.records ?? []

  useEffect(() => {
    const controller = new AbortController()

    async function loadHistory() {
      try {
        const result = await request(endpoint, { signal: controller.signal })
        if (!Array.isArray(result.data)) {
          throw new Error('The server returned an invalid weight history.')
        }
        if (!controller.signal.aborted) setHistory({ records: result.data })
      } catch (error) {
        if (!controller.signal.aborted) {
          setHistory({
            error: error instanceof TypeError
              ? 'Could not connect to PetCare. Check that the server is running and try again.'
              : error.message,
            needsLogin: error.status === 401,
          })
        }
      }
    }

    void loadHistory()
    return () => controller.abort()
  }, [endpoint, reload])

  function refreshHistory() {
    setHistory(null)
    setReload((value) => value + 1)
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingId(null)
  }

  function validateForm() {
    const rawWeight = form.weight_kg.trim()
    const weight = Number(rawWeight)

    if (
      !/^\d+(\.\d{1,2})?$/.test(rawWeight) ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      weight > 9999.99
    ) {
      return 'Please enter a valid weight (0.01–9999.99 kg, up to 2 decimals).'
    }

    if (!form.measured_at) {
      return 'Please select the measurement date and time.'
    }

    if (form.note.length > 5000) {
      return 'Note cannot exceed 5000 characters.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    setMessage('')
    setError('')

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      weight_kg: Number(form.weight_kg),
      measured_at: `${form.measured_at.replace('T', ' ')}:00`,
      note: form.note.trim() || null,
    }

    const isEditing = editingId !== null

    setSaving(true)

    try {
      await request(
        isEditing ? `${endpoint}/${editingId}` : endpoint,
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      )

      resetForm()
      refreshHistory()

      setMessage(
        isEditing
          ? 'Weight record updated successfully.'
          : 'Weight record added successfully.'
      )
    } catch (err) {
      setError(err.message || 'Unable to save weight record.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(record) {
    setEditingId(record.id)
    setForm({
      weight_kg: String(record.weight_kg),
      measured_at: toInputDateTime(record.measured_at),
      note: record.note || '',
    })

    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(recordId) {
    if (busy) return
    const confirmed = window.confirm(
      'Are you sure you want to delete this weight record?'
    )

    if (!confirmed) return

    setDeletingId(recordId)
    setMessage('')
    setError('')

    try {
      await request(`${endpoint}/${recordId}`, {
        method: 'DELETE',
      })

      if (editingId === recordId) {
        resetForm()
      }

      refreshHistory()
      setMessage('Weight record deleted successfully.')
    } catch (err) {
      setError(err.message || 'Unable to delete weight record.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="weights-page">
      <Link to="/pets">← Back to My Pets</Link>

      <h1>Weight Tracking</h1>

      <p>
        Track and manage your pet&apos;s weight history.
        Pet ID: {petId}
      </p>

      <section className="weights-card">
        <h2>
          {editingId !== null
            ? 'Edit Weight Record'
            : 'Add Weight Record'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="weight-kg">
              Weight (kg)
            </label>

            <input
              id="weight-kg"
              name="weight_kg"
              type="number"
              min="0.01"
              max="9999.99"
              step="0.01"
              value={form.weight_kg}
              onChange={handleChange}
              placeholder="e.g. 12.50"
              required
            />
          </div>

          <div>
            <label htmlFor="measured-at">
              Measurement Date &amp; Time
            </label>

            <input
              id="measured-at"
              name="measured_at"
              type="datetime-local"
              step="60"
              value={form.measured_at}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="weight-note">
              Note (optional)
            </label>

            <textarea
              id="weight-note"
              name="note"
              value={form.note}
              onChange={handleChange}
              maxLength={5000}
              placeholder="Add a note about this measurement"
              rows={3}
            />
          </div>

          <button type="submit" disabled={busy || history === null || history.needsLogin}>
            {saving
              ? 'Saving...'
              : editingId !== null
                ? 'Update Weight'
                : 'Save Weight'}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              style={{ marginLeft: 8 }}
            >
              Cancel Edit
            </button>
          )}
        </form>

        {message && (
          <p role="status">{message}</p>
        )}

        {error && (
          <p role="alert" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
      </section>

      {records.length > 0 && (
        <WeightChart
          data={records
            .filter((record) =>
              record.measured_at &&
              Number.isFinite(Number(record.weight_kg)) &&
              Number(record.weight_kg) > 0
            )
            .map((record) => ({
              date: record.measured_at,
              weight: Number(record.weight_kg),
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))}
        />
      )}

      <section className="weights-card">
        <h2>Weight History</h2>

        {history && !history.error && (
          <button type="button" onClick={refreshHistory} disabled={busy}>
            Refresh
          </button>
        )}

        {history === null ? (
          <StateDisplay type="loading" title="Loading weight history…" />
        ) : history.error ? (
          <StateDisplay
            type="error"
            title="Could not load weight history"
            message={history.error}
            actionLabel={history.needsLogin ? 'Sign in' : 'Try again'}
            onAction={history.needsLogin ? () => navigate('/login') : refreshHistory}
          />
        ) : records.length === 0 ? (
          <StateDisplay
            title="No weight records yet"
            message="Add a measurement to start tracking your pet’s weight."
          />
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th scope="col">Date &amp; Time</th>
                  <th scope="col">Weight (kg)</th>
                  <th scope="col">Note</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {displayDateTime(record.measured_at)}
                    </td>

                    <td>
                      {Number(record.weight_kg).toFixed(2)}
                    </td>

                    <td>{record.note || '—'}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleEdit(record)}
                        disabled={busy}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        disabled={busy}
                        style={{ marginLeft: 8 }}
                      >
                        {deletingId === record.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default Weights
