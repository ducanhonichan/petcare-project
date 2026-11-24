
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import StateDisplay from '../components/StateDisplay'

import { API_BASE } from '../api/config'
import { clearSession } from '../auth/session'

function Dashboard() {
  const navigate = useNavigate()
  const { reminders, retryReminders } = useOutletContext()
  const [summary, setSummary] = useState(null)
  const [activities, setActivities] = useState([])
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const token = sessionStorage.getItem('petcare_token')

    async function getData(path, message) {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      if (!response.ok) {
        throw Object.assign(new Error(message), { status: response.status })
      }
      return response.json()
    }

    async function loadSummary() {
      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const result = await getData('/dashboard', 'Unable to load dashboard records.')
        if (!result.summary || !Array.isArray(result.activities)) throw new Error('Invalid dashboard data.')
        if (!signal.aborted) {
          setSummary(result.summary)
          setActivities(result.activities)
        }
      } catch (error) {
        if (signal.aborted) return
        if (error.status === 401) {
          clearSession()
          navigate('/login', { replace: true })
        } else {
          setError(error instanceof TypeError
            ? 'Could not connect to PetCare. Check that the server is running and try again.'
            : error.message)
        }
      }
    }

    void loadSummary()
    return () => controller.abort()
  }, [navigate, reload])

  function retry() {
    setError('')
    setReload((value) => value + 1)
  }

  const summaryCards = [
    {
      title: 'Total Pets',
      value: summary?.totalPets,
      description: 'Pets in your care',
      icon: '🐾',
    },
    {
      title: 'Weight Records',
      value: summary?.totalWeights,
      description: 'Total recorded weight measurements',
      icon: '⚖️',
    },
    {
      title: 'Vet Visits',
      value: summary?.totalVisits,
      description: 'Total recorded veterinary visits',
      icon: '🩺',
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>An overview of your pets' health and activities.</p>
        </div>

        <Link to="/pets" className="dashboard-action">
          View My Pets
        </Link>
      </div>

      {error ? (
        <section className="dashboard-section">
          <StateDisplay
            type="error"
            title="Could not load the dashboard"
            message={error}
            actionLabel="Try again"
            onAction={retry}
          />
        </section>
      ) : summary === null ? (
        <section className="dashboard-section">
          <StateDisplay type="loading" title="Loading your dashboard…" />
        </section>
      ) : summary.totalPets === 0 ? (
        <section className="dashboard-section">
          <StateDisplay
            title="No pets yet"
            message="Add a pet in My Pets to see its health records here."
          />
        </section>
      ) : (
        <div className="dashboard-grid">
          {summaryCards.map((card) => (
            <div className="dashboard-card" key={card.title}>
              <div className="dashboard-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <strong>{card.value}</strong>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      )}

      <section className="dashboard-section">
        <h2>Vaccination Reminders</h2>
        {reminders.status === 'loading' ? (
          <StateDisplay type="loading" title="Loading vaccination reminders…" />
        ) : reminders.status === 'error' ? (
          <StateDisplay
            type="error"
            title="Could not load vaccination reminders"
            message="Try again to refresh your reminder counts."
            actionLabel="Try again"
            onAction={retryReminders}
          />
        ) : reminders.status === 'ready' ? (
          <div className="dashboard-grid">
            <div className="dashboard-card reminder-card reminder-card--overdue">
              <h3>Overdue</h3>
              <strong>{reminders.overdue}</strong>
              <p>{reminders.overdue ? 'Vaccinations past their due date' : 'No overdue vaccinations'}</p>
            </div>
            <div className="dashboard-card reminder-card reminder-card--upcoming">
              <h3>Due Soon</h3>
              <strong>{reminders.upcoming}</strong>
              <p>{reminders.upcoming ? 'Vaccinations within your reminder window' : 'No vaccinations due soon'}</p>
            </div>
          </div>
        ) : (
          <p>Vaccination reminders are not available yet.</p>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Recent Activities</h2>
        <p>Latest health records, ordered by record date.</p>
        {error ? <p role="status">Activities could not be loaded. Use Try again above.</p>
          : summary === null ? <StateDisplay type="loading" title="Loading activities…" />
          : activities.length === 0 ? <StateDisplay title="No health records yet" message="Add a weight, veterinary visit or vaccination to see it here." />
          : <ul className="dashboard-activities">
            {activities.map((activity) => {
              const kinds = {
                weight: { icon: '⚖️', label: 'Weight recorded', path: 'weights' },
                visit: { icon: '🩺', label: 'Veterinary visit', path: 'visits' },
                vaccination: { icon: '💉', label: 'Vaccination', path: 'vaccinations' },
              }
              const kind = kinds[activity.kind]
              if (!kind) return null
              return <li key={activity.kind + '-' + activity.id}>
                <Link className="dashboard-activity" to={'/pets/' + activity.pet_id + '/' + kind.path}>
                  <span aria-hidden="true">{kind.icon}</span>
                  <div>
                    <strong>{activity.pet_name} · {kind.label}</strong>
                    <p>{activity.detail}</p>
                    <time dateTime={activity.record_date}>{activity.record_date}</time>
                  </div>
                </Link>
              </li>
            })}
          </ul>}
      </section>
    </div>
  )
}

export default Dashboard
