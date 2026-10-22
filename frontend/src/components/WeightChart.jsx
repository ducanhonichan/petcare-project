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
  { date: '01/10', weight: 5.2 },
  { date: '08/10', weight: 5.4 },
  { date: '15/10', weight: 5.3 },
  { date: '22/10', weight: 5.6 },
]

function WeightChart() {
  return (
    <section className="weights-card">
      <h2>Weight History Chart</h2>

      <p>Sample data – API integration pending.</p>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampleData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis
              domain={['auto', 'auto']}
              unit=" kg"
            />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="weight"
              stroke="#008b83"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default WeightChart
