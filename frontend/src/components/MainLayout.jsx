import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getReminderCounts } from '../api/remindersApi'
import { clearSession, getToken, useSessionUser } from '../auth/session'
import Navbar from './Navbar'

function MainLayout() {
  useSessionUser()
  const token = getToken()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const reminders = !token
    ? { status: 'unavailable' }
    : result?.token === token && result.attempt === attempt && result.pathname === pathname
      ? result.reminders
      : { status: 'loading' }

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    async function loadReminders() {
      let reminders
      try {
        reminders = await getReminderCounts(token, controller.signal)
      } catch (error) {
        if (controller.signal.aborted) return
        if (error.status === 401) {
          clearSession()
          navigate('/login', { replace: true })
          return
        }
        reminders = { status: 'error' }
      }
      if (!controller.signal.aborted) setResult({ token, attempt, pathname, reminders })
    }

    void loadReminders()
    return () => controller.abort()
  }, [token, attempt, pathname, navigate])

  function retryReminders() {
    setAttempt((current) => current + 1)
  }

  const reminderCount = reminders.status === 'ready'
    ? reminders.overdue + reminders.upcoming
    : 0

  return (
    <div className="main-layout">
      <Navbar reminderCount={reminderCount} />
      <main className="main-content">
        <Outlet context={{ reminders, retryReminders }} />
      </main>
    </div>
  )
}

export default MainLayout
