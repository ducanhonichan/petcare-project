import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import Home from './pages/Home'
import Pets from './pages/Pets'
import Dashboard from './pages/Dashboard'
import Weights from './pages/Weights'
import Login from './pages/Login'

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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
