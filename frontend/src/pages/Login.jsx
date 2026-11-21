
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { API_BASE } from '../api/config'
import { saveSession } from '../auth/session'

function Login() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Login failed')
      }

      if (!result.token) {
        throw new Error('No authentication token received')
      }

      saveSession(result.token, result.user)

      const returnTo = state?.returnTo
      const isReturnPath = typeof returnTo === 'string' && /^\/pets\/\d+\/(visits|vaccinations)$/.test(returnTo)
      navigate(isReturnPath ? returnTo : '/pets', { replace: isReturnPath })
    } catch (err) {
      setError(err.message || 'Unable to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Welcome to PetCare</h1>
        <p>Sign in to manage your pets and health records.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error && <p role="alert" className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          New to PetCare? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  )
}

export default Login
