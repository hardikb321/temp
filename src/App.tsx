import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { MapPage } from "./pages/MapPage";
import { AdminPage } from "./pages/AdminPage";
import { PointDetailPage } from "./pages/PointDetailPage";
import { StateDetailPage } from "./pages/StateDetailPage";
import { CityDetailPage } from "./pages/CityDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/map/:type" element={<MapPage />} />
      <Route path="/point/:id" element={<PointDetailPage />} />
      <Route path="/dashboard/india/:stateName" element={<StateDetailPage />} />
      <Route path="/dashboard/india/:stateName/:cityName" element={<CityDetailPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

