import { NavLink, useNavigate } from 'react-router-dom'
import { clearSession, useSessionUser } from '../auth/session'
import '../styles/auth.css'

const linkClass = ({ isActive }) => (isActive ? 'active' : '')

function Navbar({ reminderCount = 0 }) {
  const user = useSessionUser()
  const navigate = useNavigate()

  function handleLogout() {
    clearSession()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">🐾 PetCare</div>
      <div className="navbar-links">
        <NavLink to="/" end className={linkClass}>Home</NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
              {reminderCount > 0 && (
                <span className="navbar-reminder-count"
                  aria-label={`${reminderCount} overdue or upcoming vaccinations`}>
                  {reminderCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/pets" className={linkClass}>My Pets</NavLink>
            {user.role === 'ADMIN' && (
              <NavLink to="/admin" className={linkClass}>Admin</NavLink>
            )}
            <NavLink to="/profile" className={linkClass}>{user.name || 'Profile'}</NavLink>
            <button type="button" className="navbar-logout" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>Sign in</NavLink>
            <NavLink to="/register" className={linkClass}>Sign up</NavLink>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
