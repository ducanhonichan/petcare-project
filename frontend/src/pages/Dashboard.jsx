
import { Link } from 'react-router-dom'

const summaryCards = [
  {
    title: 'Total Pets',
    value: '2',
    description: 'Pets in your care',
    icon: '🐾',
  },
  {
    title: 'Weight Records',
    value: '4',
    description: 'Recent measurements',
    icon: '⚖️',
  },
  {
    title: 'Upcoming Vaccinations',
    value: '1',
    description: 'Scheduled vaccination',
    icon: '💉',
  },
  {
    title: 'Vet Visits',
    value: '3',
    description: 'Recorded appointments',
    icon: '🏥',
  },
]

function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            An overview of your pets' health and activities.
          </p>
          <small>Demo data — API integration pending</small>
        </div>

        <Link to="/pets" className="dashboard-action">
          View My Pets
        </Link>
      </div>

      <div className="dashboard-grid">
        {summaryCards.map((card) => (
          <div className="dashboard-card" key={card.title}>
            <div className="dashboard-card-icon">
              {card.icon}
            </div>

            <h3>{card.title}</h3>
            <strong>{card.value}</strong>
            <p>{card.description}</p>
          </div>
        ))}
      </div>

      <section className="dashboard-section">
        <h2>Recent Activities</h2>

        <div className="dashboard-activity">
          <span>🐶</span>
          <div>
            <strong>Milo</strong>
            <p>Weight record updated — 5.6 kg</p>
          </div>
        </div>

        <div className="dashboard-activity">
          <span>🐱</span>
          <div>
            <strong>Luna</strong>
            <p>Vaccination reminder scheduled</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
