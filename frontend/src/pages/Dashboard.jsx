
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StateDisplay from '../components/StateDisplay'

const API_BASE = 'http://localhost:3000/api'

function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
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
        const pets = await getData('/pets', 'Unable to load your pets.')
        if (!Array.isArray(pets)) throw new Error('Invalid pets data.')

        const weightCounts = await Promise.all(pets.map(async (pet) => {
          const result = await getData(
            `/pets/${pet.id}/weights`, 'Unable to load weight records.'
          )
          if (!Array.isArray(result.data)) throw new Error('Invalid weight records data.')
          return result.data.length
        }))

        if (!signal.aborted) {
          setSummary({
            totalPets: pets.length,
            totalWeights: weightCounts.reduce((sum, count) => sum + count, 0),
          })
        }
      } catch (error) {
        if (signal.aborted) return
        if (error.status === 401) {
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
      title: 'Upcoming Vaccinations',
      value: '—',
      description: 'API integration pending',
      icon: '💉',
    },
    {
      title: 'Vet Visits',
      value: '—',
      description: 'API integration pending',
      icon: '🩺',
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>An overview of your pets' health and activities.</p>
          <small>Live pet data — other integrations pending</small>
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
        <h2>Recent Activities</h2>
        <div className="dashboard-activity">
          <span>📋</span>
          <div>
            <strong>Coming soon</strong>
            <p>Recent activities will appear after API integration.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
