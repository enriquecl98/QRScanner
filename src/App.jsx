import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./components/Dashboard/Dashboard";
import QRScanner from "./components/QRScanner/QRScanner";
import './App.css'

function App() {
  
  return (
     <Layout>
      <Routes>
        {/* <Route path="/" element={<Navigate to="/scanner" replace />} /> */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scanner" element={<QRScanner />} />
        {/* <Route path="/history" element={<RecentHistory />} /> */}
      </Routes>
    </Layout>
  )
}

export default App
