import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

function Weights() {
  const { petId } = useParams()

  const [weight, setWeight] = useState('')
  const [measuredAt, setMeasuredAt] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const value = Number(weight)

    if (!Number.isFinite(value) || value <= 0 || value > 9999.99) {
      setMessage('Please enter a valid weight.')
      return
    }

    if (!measuredAt) {
      setMessage('Please select the measurement date and time.')
      return
    }

    setMessage('Form validated. Saving will be available after login integration.')
  }

  return (
    <main className="weights-page">
      <Link to="/pets">← Back to My Pets</Link>

      <h1>Weight Tracking</h1>
      <p>Track your pet's weight over time.</p>

      <section className="weights-card">
        <h2>Pet #{petId}</h2>
        <p>Weight history will appear here.</p>
      </section>

      <section className="weights-card">
        <h2>Add Weight Record</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="weight">Weight (kg)</label>
            <input
              id="weight"
              type="number"
              min="0.01"
              max="9999.99"
              step="0.01"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="measuredAt">Measured At</label>
            <input
              id="measuredAt"
              type="datetime-local"
              step="1"
              value={measuredAt}
              onChange={(event) => setMeasuredAt(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="note">Note (optional)</label>
            <textarea
              id="note"
              maxLength={5000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note about your pet's weight..."
              rows={3}
            />
          </div>

          <button type="submit">Validate Weight Record</button>
        </form>

        {message && <p role="status">{message}</p>}
      </section>
    </main>
  )
}

export default Weights