import { API_BASE } from './config'

export async function getReminderCounts(token, signal) {
  const response = await fetch(`${API_BASE}/reminders/upcoming`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  if (response.status === 404) return { status: 'unavailable' }
  if (!response.ok) {
    throw Object.assign(new Error('Could not load vaccination reminders.'), { status: response.status })
  }

  const { summary } = await response.json()
  const overdue = summary?.overdue
  const upcoming = summary?.due_soon
  const validCount = (value) => Number.isSafeInteger(value) && value >= 0
  if (!validCount(overdue) || !validCount(upcoming) || !validCount(overdue + upcoming)) {
    throw new Error('Invalid vaccination reminder counts.')
  }
  return { status: 'ready', overdue, upcoming }
}
