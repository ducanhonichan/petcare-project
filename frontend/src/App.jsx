import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import Home from './pages/Home'
import Pets from './pages/Pets'
import Dashboard from './pages/Dashboard'
import Weights from './pages/Weights'
import Login from './pages/Login'
import VetVisits from './pages/VetVisits'
import Vaccinations from './pages/Vaccinations'

function App() {
  return (
    <BrowserRouter>
      <Routes>
            <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/pets/:petId/weights"
            element={<Weights />}
          />
          <Route
  path="/pets/:petId/visits"
  element={<VetVisits />}
/>
          <Route
            path="/pets/:petId/vaccinations"
            element={<Vaccinations />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
