import { NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        🐾 PetCare
      </div>

      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Home
        </NavLink>

        <NavLink
          to="/pets"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          My Pets
        </NavLink>
      </div>
    </nav>
  )
}

export default Navbar