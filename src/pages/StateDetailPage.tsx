"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface StateWQI {
  state_id: number;
  state_name: string;
  avg_wqi: number;
  lat: number;
  lng: number;
}

interface CityWQI {
  city_id: number;
  city_name: string;
  state_id: number;
  avg_wqi: number;
  lat: number;
  lng: number;
}

function getWqiInfo(wqi: number | null): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  dotColor: string;
} {
  if (wqi == null)
    return {
      color: "#9ca3af",
      bgColor: "rgba(156,163,175,0.1)",
      borderColor: "rgba(156,163,175,0.2)",
      label: "Unknown",
      dotColor: "#6b7280",
    };
  if (wqi < 40)
    return {
      color: "#f87171",
      bgColor: "rgba(248,113,113,0.1)",
      borderColor: "rgba(248,113,113,0.25)",
      label: "Poor",
      dotColor: "#ef4444",
    };
  if (wqi < 65)
    return {
      color: "#fbbf24",
      bgColor: "rgba(251,191,36,0.1)",
      borderColor: "rgba(251,191,36,0.25)",
      label: "Fair",
      dotColor: "#f59e0b",
    };
  if (wqi < 85)
    return {
      color: "#4ade80",
      bgColor: "rgba(74,222,128,0.1)",
      borderColor: "rgba(74,222,128,0.25)",
      label: "Good",
      dotColor: "#22c55e",
    };
  return {
    color: "#60a5fa",
    bgColor: "rgba(96,165,250,0.1)",
    borderColor: "rgba(96,165,250,0.25)",
    label: "Excellent",
    dotColor: "#3b82f6",
  };
}

function WqiGauge({ wqi, color }: { wqi: number; color: string }) {
  const pct = Math.min(Math.max(wqi, 0), 100);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute text-xs font-bold tabular-nums"
        style={{ color, fontSize: "11px" }}
      >
        {wqi ? Number(wqi).toFixed(0) : "—"}
      </span>
    </div>
  );
}

export function StateDetailPage() {
  const { stateName } = useParams<{ stateName: string }>();
  const navigate = useNavigate();

  const [stateData, setStateData] = useState<StateWQI | null>(null);
  const [cities, setCities] = useState<CityWQI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"avg_wqi" | "city_name">("avg_wqi");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!stateName) {
      setError("No state name provided");
      setLoading(false);
      return;
    }

    fetch("/api/lakes/states/wqi")
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to fetch states")))
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
        // Store state data for the card
        setStateData(foundState);
        return fetch(`/api/lakes/cities/wqi/${foundState.state_id}`);
      })
      .then((r) => (r?.ok ? r.json() : Promise.reject("Failed to fetch cities")))
      .then((json) => {
        const allCities = json?.data ?? [];
        // Filter out cities with null or undefined WQI (cities with no monitoring points)
        const filteredCities = allCities.filter((city: CityWQI) => city.avg_wqi != null);
        setCities(filteredCities);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setError(err instanceof Error ? err.message : "Failed to load cities");
        setLoading(false);
      });
  }, [stateName]);

  const formattedStateName = stateName
    ? stateName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "State";

  const sorted = [...cities].sort((a, b) => {
    if (sortKey === "city_name") {
      return sortDir === "asc"
        ? a.city_name.localeCompare(b.city_name)
        : b.city_name.localeCompare(a.city_name);
    }
    const av = a.avg_wqi ?? 0;
    const bv = b.avg_wqi ?? 0;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const handleSort = (key: "avg_wqi" | "city_name") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "avg_wqi" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <Minus className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <TrendingUp className="w-3 h-3" style={{ color: "#60a5fa" }} />
    ) : (
      <TrendingDown className="w-3 h-3" style={{ color: "#60a5fa" }} />
    );
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "linear-gradient(160deg, #060d14 0%, #0d1521 50%, #060d14 100%)",
        fontFamily: "'DM Sans', 'Sora', sans-serif",
      }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#3b82f6" }} />
        <div className="absolute top-1/2 -right-48 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#1e90ff" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "#3b82f6" }} />
      </div>

      <Navbar />

      {/* Breadcrumb */}
      <div
        className="border-b border-gray-800/50"
        style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Dashboard
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">India</span>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">{formattedStateName}</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:text-white"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              {formattedStateName}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">City-wise Water Quality Index</p>
          </div>
        </div>
        {/* Main Row: State Card + Map Card */}
        {!loading && !error && stateData && (
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* State Hero Card */}
            <div className="flex-1 rounded-3xl p-8 overflow-hidden" style={{
              background: "linear-gradient(145deg, #0c1825 0%, #0f2035 100%)",
              border: `1px solid ${getWqiInfo(stateData.avg_wqi).borderColor}`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.4)`,
            }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{formattedStateName}</h2>
                  <p className="text-slate-400 text-sm">State Water Quality Index</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{
                  background: `${getWqiInfo(stateData.avg_wqi).bgColor}`,
                  border: `1px solid ${getWqiInfo(stateData.avg_wqi).borderColor}`,
                }}>
                  <span className="text-xl font-bold" style={{ color: getWqiInfo(stateData.avg_wqi).color }}>
                    {stateData.avg_wqi ? Number(stateData.avg_wqi).toFixed(0) : "—"}
                  </span>
                </div>
              </div>

              {/* WQI Status */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{
                    background: getWqiInfo(stateData.avg_wqi).bgColor,
                    color: getWqiInfo(stateData.avg_wqi).color,
                    border: `1px solid ${getWqiInfo(stateData.avg_wqi).borderColor}`,
                  }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: getWqiInfo(stateData.avg_wqi).dotColor }} />
                    {getWqiInfo(stateData.avg_wqi).label}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">Average water quality across all cities and monitoring points</p>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: `${getWqiInfo(stateData.avg_wqi).dotColor}20`, marginBottom: "1.5rem" }} />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Total Cities</p>
                  <p className="text-2xl font-bold text-white">{cities.length}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Coordinates</p>
                  <p className="text-xs text-slate-300 font-mono">{stateData.lat.toFixed(3)}, {stateData.lng.toFixed(3)}</p>
                </div>
              </div>
            </div>

            {/* Map Card */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <button
                onClick={() => navigate(`/map/lake?lat=${stateData.lat}&lng=${stateData.lng}&zoom=12`)}
                className="group w-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "#111827",
                  border: "1.5px solid #1e90ff",
                  boxShadow: "0 0 0 4px rgba(30,144,255,0.08), 0 8px 40px rgba(0,0,0,0.7), 0 0 50px rgba(30,144,255,0.18)",
                }}
              >
                {/* Blue accent top bar */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: "rgba(30,144,255,0.08)", borderBottom: "1px solid rgba(30,144,255,0.2)" }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>WQI Map</span>
                  </div>
                  <div className="text-xs" style={{ color: "#94a3b8" }}>
                    State center
                  </div>
                </div>

                {/* Terrain map SVG */}
                <div className="relative overflow-hidden" style={{ height: 220 }}>
                  <svg className="w-full h-full" viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg">
                    {/* Terrain base */}
                    <rect width="320" height="220" fill="#c8d8a0" />
                    <rect x="0" y="0" width="100" height="80" fill="#b5cc8a" />
                    <rect x="100" y="0" width="120" height="60" fill="#cddca0" />
                    <rect x="220" y="0" width="100" height="90" fill="#bfd090" />
                    <rect x="0" y="80" width="80" height="80" fill="#d4e4a8" />
                    <rect x="150" y="80" width="90" height="70" fill="#c2d695" />
                    <rect x="240" y="90" width="80" height="80" fill="#b8cc82" />
                    <rect x="0" y="160" width="130" height="60" fill="#c5d898" />
                    <rect x="200" y="150" width="120" height="70" fill="#cce0a2" />
                    {/* Roads */}
                    <line x1="0" y1="110" x2="320" y2="110" stroke="#f5e6c8" strokeWidth="3" />
                    <line x1="160" y1="0" x2="160" y2="220" stroke="#f5e6c8" strokeWidth="2" />
                    <line x1="80" y1="0" x2="60" y2="220" stroke="#ede0c0" strokeWidth="1.5" opacity="0.7" />
                    <line x1="240" y1="0" x2="260" y2="220" stroke="#ede0c0" strokeWidth="1.5" opacity="0.7" />
                    {/* Water */}
                    <path d="M 30 90 Q 70 75 110 95 Q 140 108 160 100 Q 185 90 200 105 Q 220 118 250 108 Q 270 100 300 112" stroke="#5aabdc" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.85" />
                    <ellipse cx="75" cy="155" rx="28" ry="16" fill="#7ec8e3" opacity="0.8" />
                    <ellipse cx="255" cy="65" rx="22" ry="12" fill="#7ec8e3" opacity="0.7" />
                    {/* Urban blocks */}
                    <rect x="130" y="90" width="60" height="40" fill="#ddd6c0" opacity="0.6" rx="2" />
                    <rect x="50" y="120" width="40" height="30" fill="#ddd6c0" opacity="0.5" rx="2" />
                    {/* State center point - larger, glowing */}
                    <circle cx="160" cy="110" r="18" fill={getWqiInfo(stateData.avg_wqi).dotColor} opacity="0.2" />
                    <circle cx="160" cy="110" r="13" fill={getWqiInfo(stateData.avg_wqi).dotColor} />
                    <circle cx="160" cy="110" r="13" fill="none" stroke="white" strokeWidth="2.5" />
                    <text x="160" y="114" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui,sans-serif">{stateData.avg_wqi ? Number(stateData.avg_wqi).toFixed(0) : "?"}</text>
                    {/* Legend bar */}
                    <rect x="0" y="198" width="320" height="22" fill="rgba(15,23,42,0.75)" />
                    <circle cx="14" cy="209" r="4" fill="#ef4444" /><text x="22" y="213" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Poor</text>
                    <circle cx="55" cy="209" r="4" fill="#eab308" /><text x="63" y="213" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Fair</text>
                    <circle cx="95" cy="209" r="4" fill="#22c55e" /><text x="103" y="213" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Good</text>
                    <circle cx="140" cy="209" r="4" fill="#3b82f6" /><text x="148" y="213" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Excellent</text>
                  </svg>
                </div>

                {/* Blue gradient divider */}
                <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(30,144,255,0.05), rgba(30,144,255,0.4), rgba(30,144,255,0.05))" }} />

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(30,144,255,0.06)" }}>
                  <div>
                    <div className="text-sm font-bold text-white">Open Full Map</div>
                    <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>All monitoring points</div>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-full group-hover:translate-x-0.5 transition-transform duration-200"
                    style={{ background: "#1e90ff", width: 32, height: 32 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {error ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#161b27", border: "1px solid #1e2a3a" }}
          >
            <div className="text-red-400 text-lg font-semibold mb-2">Error</div>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-slate-400 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-blue-400 animate-spin" />
              Loading cities...
            </div>
          </div>
        ) : cities.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#161b27", border: "1px solid #1e2a3a" }}
          >
            <div className="text-slate-400 text-sm">No city data available</div>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Table header */}
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="grid items-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest"
                style={{ gridTemplateColumns: "3rem 1fr 7rem 7rem 6rem 6rem" }}
              >
                <span>Rank</span>
                <button
                  onClick={() => handleSort("city_name")}
                  className="flex items-center gap-1 hover:text-white transition-colors text-left"
                >
                  City <SortIcon col="city_name" />
                </button>
                <button
                  onClick={() => handleSort("avg_wqi")}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  WQI <SortIcon col="avg_wqi" />
                </button>
                <span>Status</span>
                <span className="text-right">Lat</span>
                <span className="text-right">Lng</span>
              </div>
            </div>

            {/* Scrollable body */}
            <div
              style={{
                maxHeight: "520px",
                overflowY: "auto",
                background: "#080f1a",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(96,165,250,0.3) transparent",
              }}
            >
              {sorted.map((city, idx) => {
                const info = getWqiInfo(city.avg_wqi);
                const cityPath = city.city_name.toLowerCase().replace(/\s+/g, "-");
                const isTop3 = idx < 3;
                return (
                  <div
                    key={city.city_id}
                    onClick={() => navigate(`/dashboard/india/${stateName}/${cityPath}`)}
                    className="grid items-center px-4 py-3 cursor-pointer group transition-all duration-200"
                    style={{
                      gridTemplateColumns: "3rem 1fr 7rem 7rem 6rem 6rem",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        `${info.bgColor}`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {/* Rank */}
                    <div className="flex items-center">
                      {isTop3 ? (
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background:
                              idx === 0
                                ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                                : idx === 1
                                ? "linear-gradient(135deg,#94a3b8,#64748b)"
                                : "linear-gradient(135deg,#cd7c3b,#a16232)",
                            color: "#fff",
                          }}
                        >
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm font-mono w-7 text-center">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* City */}
                    <div className="flex items-center gap-3 min-w-0">
                      <WqiGauge wqi={city.avg_wqi} color={info.color} />
                      <span
                        className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate"
                        style={{ fontSize: "15px" }}
                      >
                        {city.city_name}
                      </span>
                    </div>

                    {/* WQI number */}
                    <div
                      className="font-bold tabular-nums text-lg"
                      style={{ color: info.color }}
                    >
                      {city.avg_wqi ? Number(city.avg_wqi).toFixed(1) : "—"}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: info.bgColor,
                          color: info.color,
                          border: `1px solid ${info.borderColor}`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: info.dotColor }}
                        />
                        {info.label}
                      </span>
                    </div>

                    {/* Lat */}
                    <div className="text-right text-slate-400 text-xs font-mono">
                      {city.lat ? city.lat.toFixed(3) : "—"}
                    </div>

                    {/* Lng */}
                    <div className="text-right text-slate-400 text-xs font-mono">
                      {city.lng ? city.lng.toFixed(3) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {(["Poor", "Fair", "Good", "Excellent"] as const).map((label) => {
                  const colorMap: Record<string, string> = {
                    Poor: "#f87171",
                    Fair: "#fbbf24",
                    Good: "#4ade80",
                    Excellent: "#60a5fa",
                  };
                  return (
                    <span key={label} className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ background: colorMap[label] }}
                      />
                      {label}
                    </span>
                  );
                })}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-400" />
                {cities.length} cities
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}