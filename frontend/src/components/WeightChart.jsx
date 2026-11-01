
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const sampleData = [
  { date: '01/10/2026', weight: 5.2 },
  { date: '08/10/2026', weight: 5.4 },
  { date: '15/10/2026', weight: 5.3 },
  { date: '22/10/2026', weight: 5.6 },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="weight-tooltip">
      <p>{label}</p>
      <strong>{Number(payload[0].value).toFixed(2)} kg</strong>
    </div>
  )
}

function WeightChart({ data = sampleData }) {
  const validData = Array.isArray(data)
    ? data.filter(
        (item) =>
          item &&
          item.date &&
          Number.isFinite(Number(item.weight)) &&
          Number(item.weight) > 0
      )
    : []

  const latestWeight = validData.length
    ? validData[validData.length - 1].weight
    : null

  const highestWeight = validData.length
    ? Math.max(...validData.map((item) => Number(item.weight)))
    : null

  const lowestWeight = validData.length
    ? Math.min(...validData.map((item) => Number(item.weight)))
    : null

  return (
    <section className="weights-card weight-chart-card">
      <div className="weight-chart-heading">
        <div>
          <h2>Weight History Chart</h2>
          <p>Track your pet's weight over time.</p>
        </div>
        <span className="weight-unit">KG</span>
      </div>

      {validData.length === 0 ? (
        <div className="weight-chart-empty">
          <div className="weight-chart-empty__icon">🐾</div>
          <h3>No weight records yet</h3>
          <p>Add your first weight record to see your pet's progress.</p>
        </div>
      ) : (
        <>
          <div className="weight-summary">
            <div className="weight-summary-item">
              <span>Latest Weight</span>
              <strong>{Number(latestWeight).toFixed(2)} kg</strong>
            </div>

            <div className="weight-summary-item">
              <span>Highest Weight</span>
              <strong>{Number(highestWeight).toFixed(2)} kg</strong>
            </div>

            <div className="weight-summary-item">
              <span>Lowest Weight</span>
              <strong>{Number(lowestWeight).toFixed(2)} kg</strong>
            </div>
          </div>

          <div className="weight-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={validData}
                margin={{ top: 15, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  unit=" kg"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#008b83"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#008b83' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="weight-chart-note">
        Demo data — API integration pending.
      </p>
    </section>
  )
}

export default WeightChart
