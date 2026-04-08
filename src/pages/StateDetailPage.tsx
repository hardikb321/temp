"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
        return fetch(`/api/lakes/cities/wqi/${foundState.state_id}`);
      })
      .then((r) => (r?.ok ? r.json() : Promise.reject("Failed to fetch cities")))
      .then((json) => {
        setCities(json?.data ?? []);
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

  // Summary stats
  const wqiValues = cities.filter((c) => c.avg_wqi != null).map((c) => c.avg_wqi);
  const avgWqi = wqiValues.length
    ? wqiValues.reduce((a, b) => a + b, 0) / wqiValues.length
    : null;
  const bestCity = cities.reduce(
    (best, c) => (!best || c.avg_wqi > best.avg_wqi ? c : best),
    null as CityWQI | null
  );

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

        {/* Summary Cards */}
        {!loading && !error && cities.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total Cities", value: cities.length, unit: "" },
              {
                label: "State Avg WQI",
                value: avgWqi ? Number(avgWqi).toFixed(1) : "—",
                unit: "",
                color: avgWqi ? getWqiInfo(avgWqi).color : "#9ca3af",
              },
              {
                label: "Best City",
                value: bestCity?.city_name ?? "—",
                unit: bestCity ? `WQI ${Number(bestCity.avg_wqi).toFixed(0)}` : "",
                color: bestCity ? getWqiInfo(bestCity.avg_wqi).color : "#9ca3af",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                <div
                  className="text-lg font-bold truncate"
                  style={{ color: (stat as any).color ?? "#fff" }}
                >
                  {stat.value}
                </div>
                {stat.unit && <div className="text-xs text-slate-500">{stat.unit}</div>}
              </div>
            ))}
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