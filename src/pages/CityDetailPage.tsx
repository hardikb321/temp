"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface LakeWQI {
  lake_id: number;
  lake_name: string;
  avg_wqi: number;
  city_id: number;
  state_id: number;
  lat: number;
  lng: number;
}

interface CityData {
  city_id: number;
  city_name: string;
  state_id: number;
  state_name: string;
}

function getWqiColor(wqi: number | null): { color: string; bgColor: string; label: string } {
  if (wqi == null) return { color: "#6b7280", bgColor: "#f3f4f6", label: "Unknown" };
  if (wqi < 40) return { color: "#ef4444", bgColor: "#fee2e2", label: "Poor" };
  if (wqi < 65) return { color: "#f59e0b", bgColor: "#fef3c7", label: "Fair" };
  if (wqi < 85) return { color: "#22c55e", bgColor: "#dcfce7", label: "Good" };
  return { color: "#3b82f6", bgColor: "#dbeafe", label: "Excellent" };
}

export function CityDetailPage() {
  const { stateName, cityName } = useParams<{ stateName: string; cityName: string }>();
  const navigate = useNavigate();

  const [lakes, setLakes] = useState<LakeWQI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);

  useEffect(() => {
    if (!stateName || !cityName) {
      setError("Missing state or city name");
      setLoading(false);
      return;
    }

    // First, fetch states to get state_id
    fetch("/api/lakes/states/wqi")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to fetch states"))
      .then((json) => {
        const states = json?.data ?? [];
        const foundState = states.find(
          (s: any) =>
            s.state_name.toLowerCase().replace(/\s+/g, "-") ===
            stateName.toLowerCase().replace(/\s+/g, "-")
        );

        if (!foundState) {
          setError("State not found");
          setLoading(false);
          return;
        }

        // Now fetch cities to get city_id
        return fetch(`/api/lakes/cities/wqi/${foundState.state_id}`).then((r) =>
          r.ok ? r.json() : Promise.reject("Failed to fetch cities")
        ).then((cityJson) => {
          const cities = cityJson?.data ?? [];
          const foundCity = cities.find(
            (c: any) =>
              c.city_name.toLowerCase().replace(/\s+/g, "-") ===
              cityName.toLowerCase().replace(/\s+/g, "-")
          );

          if (!foundCity) {
            setError("City not found");
            setLoading(false);
            return;
          }

          setCityData({
            city_id: foundCity.city_id,
            city_name: foundCity.city_name,
            state_id: foundState.state_id,
            state_name: foundState.state_name,
          });

          // Now fetch lakes for this city
          return fetch(`/api/lakes/lakes/wqi/${foundState.state_id}/${foundCity.city_id}`);
        });
      })
      .then((r) => r?.ok ? r.json() : Promise.reject("Failed to fetch lakes"))
      .then((json) => {
        const allLakes = json?.data ?? [];
        // Filter out lakes with null or undefined WQI (lakes with no monitoring points)
        const filteredLakes = allLakes.filter((lake: LakeWQI) => lake.avg_wqi != null);
        setLakes(filteredLakes);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching lakes:", err);
        setError(err instanceof Error ? err.message : "Failed to load lakes");
        setLoading(false);
      });
  }, [stateName, cityName]);

  const formattedCityName = cityName
    ? cityName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "City";

  const formattedStateName = stateName
    ? stateName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "State";

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "linear-gradient(160deg, #060d14 0%, #0d1521 50%, #060d14 100%)",
      }}
    >
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#10b981" }} />
        <div className="absolute top-1/2 -right-48 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#1e90ff" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "#10b981" }} />
      </div>

      <Navbar />

      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-800/50" style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Dashboard
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">India</span>
            <span className="text-gray-600">/</span>
            <button
              onClick={() => navigate(`/dashboard/india/${stateName}`)}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              {formattedStateName}
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">{formattedCityName}</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:text-white hover:scale-105"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{formattedCityName}</h1>
            <p className="text-slate-400 text-sm mt-1">
              Lakes in {formattedStateName} • Lake-wise Water Quality Index
            </p>
          </div>
        </div>

        {/* Lakes Table */}
        {error ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "#161b27", border: "1px solid #1e2a3a" }}>
            <div className="text-red-400 text-lg font-semibold mb-2">Error</div>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-slate-400 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-blue-400 animate-spin" />
              Loading lakes...
            </div>
          </div>
        ) : lakes.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "#161b27", border: "1px solid #1e2a3a" }}>
            <div className="text-slate-400 text-sm">No lake data available</div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Table Header */}
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 text-gray-400">Lake Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 text-gray-400">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300 text-gray-400">WQI Score</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300 text-gray-400">Latitude</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300 text-gray-400">Longitude</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300 text-gray-400">Action</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {lakes.map((lake, index) => {
                    const wqiStatusColor = getWqiColor(lake.avg_wqi);
                    return (
                      <tr
                        key={lake.lake_id}
                        style={{
                          background: index % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          transition: "all 0.2s ease",
                        }}
                        className="hover:bg-white/10 cursor-pointer"
                      >
                        {/* Lake Name */}
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span>{lake.lake_name}</span>
                            <span className="text-xs text-slate-500">(ID: {lake.lake_id})</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <div
                            className="text-xs font-bold px-3 py-1.5 rounded-full w-fit"
                            style={{ background: wqiStatusColor.bgColor, color: wqiStatusColor.color }}
                          >
                            {wqiStatusColor.label}
                          </div>
                        </td>

                        {/* WQI Score */}
                        <td className="px-6 py-4 text-center">
                          <div
                            className="text-lg font-bold"
                            style={{ color: wqiStatusColor.color }}
                          >
                            {lake.avg_wqi ? Number(lake.avg_wqi).toFixed(1) : "—"}
                          </div>
                        </td>

                        {/* Latitude */}
                        <td className="px-6 py-4 text-center text-sm text-slate-300 font-mono">
                          {lake.lat ? lake.lat.toFixed(4) : "—"}
                        </td>

                        {/* Longitude */}
                        <td className="px-6 py-4 text-center text-sm text-slate-300 font-mono">
                          {lake.lng ? lake.lng.toFixed(4) : "—"}
                        </td>

                        {/* Action Button */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => navigate(`/map/lake?lat=${lake.lat}&lng=${lake.lng}&zoom=15`)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all hover:scale-105"
                            style={{
                              background: wqiStatusColor.color,
                              color: "#fff",
                              border: "none",
                            }}
                          >
                            View Map
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary stats */}
        {!loading && lakes.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-slate-500 text-sm mb-2">Total Lakes</p>
              <p className="text-3xl font-bold text-white">{lakes.length}</p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-slate-500 text-sm mb-2">Average WQI</p>
              <p className="text-3xl font-bold text-white">
                {lakes.length > 0
                  ? (
                      lakes.reduce((sum, lake) => sum + (lake.avg_wqi || 0), 0) /
                      lakes.length
                    ).toFixed(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-slate-500 text-sm mb-2">Highest WQI</p>
              <p className="text-3xl font-bold text-green-400">
                {Math.max(...lakes.map((l) => l.avg_wqi || 0)).toFixed(0)}
              </p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-slate-500 text-sm mb-2">Lowest WQI</p>
              <p className="text-3xl font-bold text-red-400">
                {Math.min(...lakes.map((l) => l.avg_wqi || 0)).toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
