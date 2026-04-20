import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./components/Dashboard/Dashboard";
import QRScanner from "./components/QRScanner/QRScanner";
import ExperimentControl from "./components/ExperimentControl/ExperimentControl";
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<QRScanner />} />
        <Route path="/scanner" element={<QRScanner />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/experiment" element={<ExperimentControl />} />
      </Routes>
    </Layout>
  )
}

export default App
