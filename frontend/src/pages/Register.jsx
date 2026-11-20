import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerUser } from '../api/authApi'
import { getToken, saveSession } from '../auth/session'
import '../styles/auth.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already signed in: nothing to register
  if (getToken()) {
    return <Navigate to="/pets" replace />
  }

  function validate() {
    if (!name.trim()) return 'Please enter your name.'
    if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const problem = validate()
    setError(problem)

    if (problem) return

    setLoading(true)

    try {
      // The server signs the new user in and returns a token
      const result = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      })

      saveSession(result.token, result.user)
      navigate('/pets', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to create the account')
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Create your account</h1>
        <p>Keep your pets' health records in one place.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />

          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />

          <label htmlFor="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />

          {error && <p role="alert" className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}

export default Register
