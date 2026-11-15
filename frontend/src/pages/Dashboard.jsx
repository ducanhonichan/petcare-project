
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:3000/api'

function Dashboard() {
  const navigate = useNavigate()
  const [totalPets, setTotalPets] = useState(null)
  const [totalWeights, setTotalWeights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadPets() {
      const token = sessionStorage.getItem('petcare_token')

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const response = await fetch(`${API_BASE}/pets`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        if (!response.ok) {
          throw new Error('Unable to load your pets.')
        }

        const pets = await response.json()

        if (!Array.isArray(pets)) {
          throw new Error('Invalid pets data.')
        }

        setTotalPets(pets.length)

const weightResults = await Promise.all(
  pets.map(async (pet) => {
    const response = await fetch(
      `${API_BASE}/pets/${pet.id}/weights`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      throw new Error('Unable to load weight records.')
    }

    const result = await response.json()

    if (!Array.isArray(result.data)) {
      throw new Error('Invalid weight records data.')
    }

    return result.data.length
  })
)

const weightCount = weightResults.reduce(
  (total, count) => total + count,
  0
)

setTotalWeights(weightCount)

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadPets()

    return () => controller.abort()
  }, [navigate])

  const summaryCards = [
    {
      title: 'Total Pets',
      value: loading ? '...' : error ? '—' : totalPets,
      description: 'Pets in your care',
      icon: '🐾',
    },
    {
      title: 'Weight Records',
      value: loading ? '...' : error ? '—' : totalWeights ?? 0,
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

      {error && (
        <p role="alert" className="dashboard-error">
          {error}
        </p>
      )}

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
