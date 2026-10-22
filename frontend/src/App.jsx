import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import Home from './pages/Home'
import Pets from './pages/Pets'
import Weights from './pages/Weights'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pets" element={<Pets />} />
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