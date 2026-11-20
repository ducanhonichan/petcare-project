import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getProfile, updateProfile } from '../api/authApi'
import { clearSession, getToken, updateStoredUser } from '../auth/session'
import StateDisplay from '../components/StateDisplay'
import '../styles/auth.css'

function Profile() {
  const navigate = useNavigate()
  const [needsLogin, setNeedsLogin] = useState(() => !getToken())
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)

  const [name, setName] = useState('')
  const [remindDays, setRemindDays] = useState('7')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (needsLogin) return

    let active = true

    getProfile()
      .then((data) => {
        if (!active) return
        setProfile(data)
        setName(data.name)
        setRemindDays(String(data.remind_before_days))
      })
      .catch((error) => {
        if (!active) return

        // Token expired or invalid: sign out and go to the login page
        if (error.status === 401) {
          clearSession()
          setNeedsLogin(true)
        } else {
          setLoadError(error.message)
        }
      })

    return () => {
      active = false
    }
  }, [needsLogin, reload])

  if (needsLogin) {
    return <Navigate to="/login" replace />
  }

  function retry() {
    setLoadError('')
    setProfile(null)
    setReload((value) => value + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaved(false)
    setFormError('')

    const days = Number(remindDays)

    if (!name.trim()) {
      setFormError('Please enter your name.')
      return
    }

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setFormError('Reminder days must be a whole number from 1 to 365.')
      return
    }

    setSaving(true)

    try {
      const updated = await updateProfile({
        name: name.trim(),
        remind_before_days: days,
      })

      setProfile(updated)
      setName(updated.name)
      setRemindDays(String(updated.remind_before_days))
      updateStoredUser({ name: updated.name })
      setSaved(true)
    } catch (error) {
      if (error.status === 401) {
        clearSession()
        setNeedsLogin(true)
      } else {
        setFormError(error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  if (loadError) {
    return (
      <div className="profile-page">
        <StateDisplay
          type="error"
          message={loadError}
          actionLabel="Try again"
          onAction={retry}
        />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <StateDisplay type="loading" title="Loading your profile…" />
      </div>
    )
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB')
    : '—'

  return (
    <div className="profile-page">
      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {profile.name.charAt(0).toUpperCase()}
        </div>

        <h1>My Profile</h1>

        <dl className="profile-info">
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{profile.role}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{memberSince}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setSaved(false)
            }}
          />

          <label htmlFor="profile-remind">
            Remind me before a vaccine is due (days)
          </label>
          <input
            id="profile-remind"
            type="number"
            min="1"
            max="365"
            step="1"
            value={remindDays}
            onChange={(event) => {
              setRemindDays(event.target.value)
              setSaved(false)
            }}
          />

          {formError && (
            <p role="alert" className="login-error">
              {formError}
            </p>
          )}

          {saved && (
            <p role="status" className="profile-saved">
              Profile saved.
            </p>
          )}

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <button
          type="button"
          className="profile-logout"
          onClick={handleLogout}
        >
          Log out
        </button>
      </section>
    </div>
  )
}

export default Profile
