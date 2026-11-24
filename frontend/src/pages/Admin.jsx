import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import StateDisplay from '../components/StateDisplay'
import { clearSession, useSessionUser } from '../auth/session'
import {
  createVaccineType,
  getAdminVaccineTypes,
  getSpecies,
  getUsers,
  hideVaccineType,
  setUserBanned,
  updateVaccineType,
} from '../api/adminApi'
import './Admin.css'

const EMPTY_FORM = { name: '', species_id: '', interval_days: '', description: '' }

// Load a list from the API and keep loading / error / reload in one place
function useList(loader, enabled) {
  const navigate = useNavigate()
  const [state, setState] = useState({ items: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true

    loader()
      .then((items) => active && setState({ items, error: '' }))
      .catch((error) => {
        if (!active) return
        if (error.status === 401) {
          clearSession()
          navigate('/login', { replace: true })
          return
        }
        setState({
          items: null,
          error: error instanceof TypeError
            ? 'Could not connect to the server.'
            : error.message,
        })
      })

    return () => { active = false }
  }, [loader, enabled, attempt, navigate])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  return { ...state, reload }
}

function UsersPanel({ currentUserId }) {
  const { items: users, error, reload } = useList(getUsers, true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  async function toggle(user) {
    setBusyId(user.id)
    setMessage('')
    setActionError('')

    try {
      const result = await setUserBanned(user.id, !user.is_banned)
      setMessage(`${result.message}: ${user.email}`)
      reload()
    } catch (failure) {
      setActionError(failure.message)
    } finally {
      setBusyId(null)
    }
  }

  if (error) {
    return <StateDisplay type="error" message={error} actionLabel="Try again" onAction={reload} />
  }

  if (users === null) return <StateDisplay type="loading" title="Loading users…" />

  return (
    <>
      {message && <p role="status" className="admin-ok">{message}</p>}
      {actionError && <p role="alert" className="admin-error">{actionError}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Pets</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}{user.id === currentUserId && ' (you)'}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.pet_count}</td>
                <td>
                  <span className={user.is_banned ? 'admin-badge admin-badge--off' : 'admin-badge'}>
                    {user.is_banned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td>
                  {user.role !== 'ADMIN' && (
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={busyId === user.id}
                      onClick={() => toggle(user)}
                    >
                      {user.is_banned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function VaccinesPanel() {
  const { items: types, error, reload } = useList(getAdminVaccineTypes, true)
  const { items: species } = useList(getSpecies, true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function startEdit(type) {
    setEditing(type)
    setMessage('')
    setActionError('')
    setForm({
      name: type.name,
      species_id: String(type.species_id),
      interval_days: type.interval_days ?? '',
      description: type.description ?? '',
    })
  }

  function cancelEdit() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function submit(event) {
    event.preventDefault()
    setActionError('')
    setMessage('')

    const days = String(form.interval_days).trim()
    const body = {
      name: form.name.trim(),
      species_id: Number(form.species_id),
      interval_days: days === '' ? null : Number(days),
      description: form.description.trim() || null,
    }

    if (!body.name) return setActionError('Name is required.')
    if (!form.species_id) return setActionError('Choose a species.')
    if (body.interval_days !== null &&
        (!Number.isInteger(body.interval_days) || body.interval_days < 1 || body.interval_days > 3650)) {
      return setActionError('Interval must be a whole number from 1 to 3650 days, or empty.')
    }

    setBusy(true)
    try {
      const result = editing
        ? await updateVaccineType(editing.id, { ...body, is_active: editing.is_active })
        : await createVaccineType(body)
      setMessage(result.message)
      cancelEdit()
      reload()
    } catch (failure) {
      setActionError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(type) {
    setActionError('')
    setMessage('')
    setBusy(true)

    try {
      const result = type.is_active
        ? await hideVaccineType(type.id)
        : await updateVaccineType(type.id, {
            name: type.name,
            species_id: type.species_id,
            interval_days: type.interval_days,
            description: type.description,
            is_active: true,
          })
      setMessage(result.message)
      reload()
    } catch (failure) {
      setActionError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="admin-form" onSubmit={submit}>
        <h3>{editing ? `Edit “${editing.name}”` : 'Add vaccine type'}</h3>
        <label>Name
          <input name="name" value={form.name} onChange={change} maxLength={150} required />
        </label>
        <label>Species
          <select name="species_id" value={form.species_id} onChange={change} required>
            <option value="">Choose…</option>
            {(species || []).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>Days until next dose (empty = no repeat)
          <input name="interval_days" type="number" min="1" max="3650"
            value={form.interval_days} onChange={change} />
        </label>
        <label>Description
          <textarea name="description" rows={2} maxLength={5000}
            value={form.description} onChange={change} />
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            {editing ? 'Save changes' : 'Add'}
          </button>
          {editing && (
            <button type="button" className="admin-btn" disabled={busy} onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && <p role="status" className="admin-ok">{message}</p>}
      {actionError && <p role="alert" className="admin-error">{actionError}</p>}

      {error ? (
        <StateDisplay type="error" message={error} actionLabel="Try again" onAction={reload} />
      ) : types === null ? (
        <StateDisplay type="loading" title="Loading vaccine types…" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th><th>Species</th><th>Interval (days)</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id} className={type.is_active ? '' : 'admin-row--off'}>
                  <td>{type.name}</td>
                  <td>{type.species_name}</td>
                  <td>{type.interval_days ?? '—'}</td>
                  <td>
                    <span className={type.is_active ? 'admin-badge' : 'admin-badge admin-badge--off'}>
                      {type.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="admin-actions">
                    <button type="button" className="admin-btn" disabled={busy}
                      onClick={() => startEdit(type)}>Edit</button>
                    <button type="button" className="admin-btn" disabled={busy}
                      onClick={() => toggleActive(type)}>
                      {type.is_active ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Admin() {
  const user = useSessionUser()
  const [tab, setTab] = useState('users')

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'ADMIN') {
    return (
      <StateDisplay
        type="error"
        title="Admin access only"
        message="Your account does not have permission to open this page."
      />
    )
  }

  return (
    <div className="admin-page">
      <h1>Admin</h1>
      <p className="admin-intro">Manage user accounts and the vaccine catalogue.</p>

      <div className="admin-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'users'}
          className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Users
        </button>
        <button type="button" role="tab" aria-selected={tab === 'vaccines'}
          className={tab === 'vaccines' ? 'active' : ''} onClick={() => setTab('vaccines')}>
          Vaccine types
        </button>
      </div>

      {tab === 'users' ? <UsersPanel currentUserId={user.id} /> : <VaccinesPanel />}
    </div>
  )
}

export default Admin
