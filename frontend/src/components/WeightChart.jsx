
import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import StateDisplay from './StateDisplay'

function formatChartDate(value) {
  if (!value) return ''

  const date = new Date(String(value).replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="weight-tooltip">
     <p>{formatChartDate(label)} {String(label).slice(11, 16)}</p>

      <strong>{Number(payload[0].value).toFixed(2)} kg</strong>
    </div>
  )
}

function WeightChart({ data = [] }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const invalidRange = Boolean(startDate && endDate && startDate > endDate)
  const validData = Array.isArray(data)
    ? data.filter(
        (item) =>
          item &&
          item.date &&
          Number.isFinite(Number(item.weight)) &&
          Number(item.weight) > 0
      )
    : []

  const visibleData = validData.filter(({ localDay }) =>
    (!startDate || localDay >= startDate) && (!endDate || localDay <= endDate)
  )
  const weights = visibleData.map((item) => Number(item.weight))
  const latestWeight = weights.at(-1)
  const highestWeight = Math.max(...weights)
  const lowestWeight = Math.min(...weights)
  const change = weights.length > 1 ? latestWeight - weights[0] : null

  function resetRange() {
    setStartDate('')
    setEndDate('')
  }

  return (
    <section className="weights-card weight-chart-card">
      <div className="weight-chart-heading">
        <div>
          <h2>Weight History Chart</h2>
          <p>Track your pet's weight over time.</p>
        </div>
        <span className="weight-unit">KG</span>
      </div>

      {validData.length > 0 && (
        <fieldset className="weight-date-range">
          <legend>Filter chart by date</legend>
          <label>
            From
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button type="button" onClick={resetRange} disabled={!startDate && !endDate}>
            Clear dates
          </button>
        </fieldset>
      )}

      {invalidRange ? (
        <StateDisplay type="error" title="Invalid date range"
          message="The start date must be on or before the end date." />
      ) : validData.length === 0 ? (
        <StateDisplay title="No weight records yet"
          message="Add a measurement to see the chart." />
      ) : visibleData.length === 0 ? (
        <StateDisplay title="No weight records in this range"
          message="Try a different date range or clear the filters."
          actionLabel="Clear dates" onAction={resetRange} />
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
            <div className="weight-summary-item">
              <span>Weight Change</span>
              <strong>{change == null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)} kg`}</strong>
            </div>
          </div>

          <div className="weight-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visibleData}
                margin={{ top: 15, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
               <XAxis
  dataKey="date"
  tickFormatter={formatChartDate}
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

          </section>
  )
}

export default WeightChart
