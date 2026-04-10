"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, MapPin, Map, ChevronDown } from "lucide-react";
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
  lat: number;
  lng: number;
}

function getWqiInfo(wqi: number | null): {
  color: string;
  bgColor: string;
  
  label: string;
  dotColor: string;
  textHex: string;
} {
  if (wqi == null)
    return { label: "Unknown", color: "text-gray-400", bgColor: "bg-gray-800", dotColor: "#6b7280", textHex: "#9ca3af" };
  if (wqi <= 50)
    return { label: "Excellent", color: "text-blue-400", bgColor: "bg-blue-900/30", dotColor: "#3b82f6", textHex: "#60a5fa" };
  if (wqi <= 100)
    return { label: "Good", color: "text-green-400", bgColor: "bg-green-900/30", dotColor: "#22c55e", textHex: "#4ade80" };
  if (wqi <= 150)
    return { label: "Moderate", color: "text-yellow-400", bgColor: "bg-yellow-900/30", dotColor: "#eab308", textHex: "#facc15" };
  if (wqi <= 200)
    return { label: "Poor", color: "text-orange-400", bgColor: "bg-orange-900/30", dotColor: "#f97316", textHex: "#fb923c" };
  return { label: "Extremely poor", color: "text-red-400", bgColor: "bg-red-900/30", dotColor: "#ef4444", textHex: "#f87171" };
}

function getWqiColor(wqi: number | null): { color: string; bgColor: string; label: string } {
  if (wqi == null) return { color: "#6b7280", bgColor: "#6b728026", label: "Unknown" };
  if (wqi <= 50) return { color: "#3b82f6", bgColor: "#3b82f626", label: "Excellent" };
  if (wqi <= 100) return { color: "#22c55e", bgColor: "#22c55e26", label: "Good" };
  if (wqi <= 150) return { color: "#eab308", bgColor: "#eab30826", label: "Moderate" };
  if (wqi <= 200) return { color: "#f97316", bgColor: "#f9731626", label: "Poor" };
  return { color: "#ef4444", bgColor: "#ef444426", label: "Extremely poor" };
}

// Converts a state name to a file-safe slug: "Uttar Pradesh" → "uttar-pradesh"
function toStateSlug(stateName: string): string {
  return stateName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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

function WqiScaleBar({ wqi }: { wqi: number | null }) {
  const maxWqi = 100;
  const pct = wqi != null ? Math.min((wqi / maxWqi) * 100, 100) : 0;
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs mb-1" style={{ color: "#64748b" }}>
        {["Poor", "Fair", "Good", "Excellent"].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #ef4444, #eab308, #22c55e, #3b82f6)" }}>
        {wqi != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
            style={{ left: `calc(${pct}% - 6px)`, background: "#fff" }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: "#475569" }}>
        <span>0</span><span>40</span><span>65</span><span>85</span><span>100+</span>
      </div>
    </div>
  );
}

export function CityDetailPage() {
  const { stateName, cityName } = useParams<{ stateName: string; cityName: string }>();
  const navigate = useNavigate();
  const lakesRef = useRef<HTMLDivElement>(null);

  const [lakes, setLakes] = useState<LakeWQI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [avgWqi, setAvgWqi] = useState<number | null>(null);

  const [allStates, setAllStates] = useState<any[]>([]);

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
        setAllStates(states.filter((s: any) => s.avg_wqi != null));
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
            lat: foundCity.lat,
            lng: foundCity.lng,
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
        
        // Calculate average WQI for the city
        if (filteredLakes.length > 0) {
          const total = filteredLakes.reduce((sum: number, lake: LakeWQI) => sum + (lake.avg_wqi || 0), 0);
          const avg = total / filteredLakes.length;
          setAvgWqi(avg);
        }
        
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

        {/* Main Row: City Card + Map Card */}
        {!loading && !error && cityData && (
          <div className="flex flex-col lg:flex-row gap-6 mb-8">

            {/* ── Hero WQI Card ── */}
            <div
              className="flex-1 rounded-3xl overflow-hidden relative"
              style={{
                background: "linear-gradient(145deg, #0c1825 0%, #0f2035 40%, #091520 100%)",
                border: `1px solid ${getWqiInfo(avgWqi).dotColor}40`,
                boxShadow: `0 0 0 1px ${getWqiInfo(avgWqi).dotColor}15, 0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${getWqiInfo(avgWqi).dotColor}18`,
              }}
            >
              {/* Card-scoped animation keyframes */}
              <style>{`
                @keyframes sw1 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                @keyframes sw2 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                @keyframes sw3 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                @keyframes sfoam { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                @keyframes scaustic { 0%,100%{opacity:0.07} 50%{opacity:0.18} }
                @keyframes sb { 0%{transform:translateY(0) scale(1);opacity:0.7} 80%{opacity:0.2} 100%{transform:translateY(-70px) scale(0.4);opacity:0} }
                @keyframes sglint { 0%,100%{opacity:0;transform:scaleX(0.3)} 40%,60%{opacity:1;transform:scaleX(1)} }
              `}</style>

              {/* Top color bar */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${getWqiInfo(avgWqi).dotColor}, #1e90ff, ${getWqiInfo(avgWqi).dotColor})` }} />

              {/* Realistic water at bottom of card */}
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "42%", overflow: "hidden" }}>
                {/* Deep water gradient */}
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(180deg, transparent 0%, ${getWqiInfo(avgWqi).dotColor}22 18%, ${getWqiInfo(avgWqi).dotColor}50 60%, ${getWqiInfo(avgWqi).dotColor}70 100%)`
                }} />
                {/* Caustic light patches */}
                {[10, 28, 50, 68, 85].map((l, i) => (
                  <div key={i} className="absolute rounded-full" style={{
                    left: `${l}%`, top: `${30 + (i % 3) * 18}%`,
                    width: 40 + i * 12, height: 8 + i * 3,
                    background: `radial-gradient(ellipse, ${getWqiInfo(avgWqi).textHex}28 0%, transparent 70%)`,
                    filter: "blur(3px)",
                    animation: `scaustic ${2.2 + i * 0.5}s ease-in-out infinite ${i * 0.4}s`
                  }} />
                ))}
                {/* Glint streaks */}
                {[18, 42, 70].map((l, i) => (
                  <div key={i} className="absolute" style={{
                    left: `${l}%`, top: `${22 + i * 20}%`,
                    width: 60, height: 2,
                    background: `linear-gradient(90deg, transparent, ${getWqiInfo(avgWqi).textHex}80, transparent)`,
                    borderRadius: 2,
                    animation: `sglint ${1.8 + i * 0.6}s ease-in-out infinite ${i * 0.7}s`
                  }} />
                ))}
                {/* Bubbles */}
                {[8, 22, 38, 54, 68, 82].map((l, i) => (
                  <div key={i} className="absolute rounded-full" style={{
                    left: `${l}%`,
                    bottom: `${4 + (i % 4) * 5}px`,
                    width: i % 3 === 0 ? 7 : i % 2 === 0 ? 5 : 3,
                    height: i % 3 === 0 ? 7 : i % 2 === 0 ? 5 : 3,
                    background: `radial-gradient(circle at 35% 35%, ${getWqiInfo(avgWqi).textHex}90, ${getWqiInfo(avgWqi).dotColor}30)`,
                    boxShadow: `0 0 4px ${getWqiInfo(avgWqi).textHex}40, inset 0 1px 1px rgba(255,255,255,0.5)`,
                    animation: `sb ${2 + i * 0.65}s ease-out infinite ${i * 1.1}s`
                  }} />
                ))}
                {/* Wave layer 3 */}
                <svg className="absolute top-0 left-0 h-full" style={{ width: "200%", animation: "sw3 18s linear infinite" }}
                  viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,60 C100,40 200,80 300,60 C400,40 500,78 600,58 C700,38 800,76 900,58 C1000,40 1100,78 1200,60 C1300,42 1400,76 1600,58 L1600,120 L0,120 Z"
                    fill={getWqiInfo(avgWqi).dotColor} opacity="0.20" />
                </svg>
                {/* Wave layer 2 */}
                <svg className="absolute top-0 left-0 h-full" style={{ width: "200%", animation: "sw2 11s linear infinite" }}
                  viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,48 C80,28 160,68 240,48 C320,28 400,66 480,46 C560,26 640,64 720,46 C800,28 880,64 960,46 C1040,28 1120,64 1200,46 C1280,28 1360,62 1600,46 L1600,120 L0,120 Z"
                    fill={getWqiInfo(avgWqi).dotColor} opacity="0.30" />
                </svg>
                {/* Wave layer 1 */}
                <svg className="absolute top-0 left-0 h-full" style={{ width: "200%", animation: "sw1 7s linear infinite" }}
                  viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="cityWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={getWqiInfo(avgWqi).dotColor} stopOpacity="0.55" />
                      <stop offset="100%" stopColor={getWqiInfo(avgWqi).dotColor} stopOpacity="0.85" />
                    </linearGradient>
                  </defs>
                  <path d="M0,38 C60,18 120,58 180,36 C240,14 300,54 360,34 C420,14 480,52 540,32 C600,12 660,50 720,30 C780,10 840,48 900,28 C960,8 1020,46 1080,28 C1140,10 1200,46 1260,28 C1320,10 1400,46 1600,30 L1600,120 L0,120 Z"
                    fill="url(#cityWaveGrad)" />
                </svg>
                {/* Foam */}
                <svg className="absolute top-0 left-0" style={{ width: "200%", height: "28px", animation: "sfoam 7s linear infinite" }}
                  viewBox="0 0 1600 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,14 C40,4 80,22 120,12 C160,2 200,20 240,12 C280,4 320,20 360,12 C400,4 440,20 480,12 C520,4 560,20 600,12 C640,4 680,20 720,12 C760,4 800,20 840,12 C880,4 920,20 960,12 C1000,4 1040,20 1080,12 C1120,4 1160,20 1200,12 C1240,4 1280,20 1320,12 C1360,4 1400,18 1440,12 C1480,6 1540,18 1600,12"
                    stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M0,18 C50,10 100,24 150,16 C200,8 250,22 300,16 C350,10 400,22 450,16 C500,10 550,22 600,16 C650,10 700,22 750,16 C800,10 850,22 900,16 C950,10 1000,22 1050,16 C1100,10 1150,22 1200,16 C1250,10 1300,22 1350,16 C1400,10 1500,20 1600,16"
                    stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>

              {/* Glow blobs */}
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${getWqiInfo(avgWqi).dotColor}20 0%, transparent 65%)` }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, #1e90ff12 0%, transparent 70%)` }} />

              <div className="relative p-6 md:p-8">
                {/* Live badge row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${getWqiInfo(avgWqi).dotColor}18`, border: `1px solid ${getWqiInfo(avgWqi).dotColor}40` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: getWqiInfo(avgWqi).dotColor }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: getWqiInfo(avgWqi).textHex }}>City WQI</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <MapPin className="w-3 h-3" />
                    {cityData.state_id ? "City avg" : "—"}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-start gap-8">
                  {/* WQI value */}
                  <div className="min-w-[200px]">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${getWqiInfo(avgWqi).textHex}, #1e90ff)` }}>
                          {avgWqi ? Number(avgWqi).toFixed(1) : "—"}
                        </span>
                      </div>
                      <WqiGauge wqi={avgWqi ?? 0} color={getWqiInfo(avgWqi).dotColor} />
                    </div>
                    <div className="text-base font-bold mt-3" style={{ color: getWqiInfo(avgWqi).textHex }}>
                      {getWqiInfo(avgWqi).label}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Average across all lakes</p>
                    <div className="mt-5">
                      <WqiScaleBar wqi={avgWqi} />
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="hidden md:block w-px self-stretch" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)" }} />

                  {/* Stats + Explore CTA */}
                  <div className="flex-1 flex flex-col gap-3">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl px-4 py-3" style={{
                        background: "rgba(10,20,35,0.75)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                        backdropFilter: "blur(10px)",
                      }}>
                        <p className="text-slate-500 text-xs mb-1">Total Lakes</p>
                        <p className="text-3xl font-black text-white">{lakes.length}</p>
                      </div>
                      <div className="rounded-2xl px-4 py-3" style={{
                        background: "rgba(10,20,35,0.75)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                        backdropFilter: "blur(10px)",
                      }}>
                        <p className="text-slate-500 text-xs mb-1">Best Lake WQI</p>
                        <p className="text-3xl font-black" style={{ color: getWqiInfo(avgWqi).textHex }}>
                          {lakes.length > 0
                            ? Number(Math.max(...lakes.map((l) => l.avg_wqi ?? 0))).toFixed(0)
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Explore Lakes CTA */}
                    <button
                      onClick={() => lakesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="group w-full rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, ${getWqiInfo(avgWqi).dotColor}18, #1e90ff12)`,
                        border: `2px solid ${getWqiInfo(avgWqi).dotColor}80`,
                        boxShadow: `0 0 30px ${getWqiInfo(avgWqi).dotColor}30`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                          background: `${getWqiInfo(avgWqi).dotColor}20`,
                          border: `1px solid ${getWqiInfo(avgWqi).dotColor}40`
                        }}>
                          <Droplets className="w-4 h-4" style={{ color: getWqiInfo(avgWqi).textHex }} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-white">Explore Lakes in {formattedCityName}</div>
                          <div className="text-xs mt-0.5 font-medium" style={{ color: getWqiInfo(avgWqi).textHex }}>
                            {lakes.length} lakes with WQI data
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-1"
                        style={{ color: getWqiInfo(avgWqi).textHex }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Map Card ── */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <button
                onClick={() => navigate(`/map/lake?lat=${cityData.lat}&lng=${cityData.lng}&zoom=12`)}
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
                    <Map className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>WQI Map</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                      <span
                        className="w-2 h-2 rounded-full ring-1 ring-white/20"
                        style={{ background: getWqiInfo(avgWqi).dotColor, boxShadow: `0 0 6px ${getWqiInfo(avgWqi).dotColor}` }}
                      />
                      City Lakes
                    </div>
                  </div>
                </div>

                {/* Terrain map SVG */}
                <div className="relative overflow-hidden" style={{ height: 220 }}>
                  <svg className="w-full h-full" viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg">
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
                    {/* City center point */}
                    <circle cx="160" cy="110" r="18" fill={getWqiInfo(avgWqi).dotColor} opacity="0.2" />
                    <circle cx="160" cy="110" r="13" fill={getWqiInfo(avgWqi).dotColor} />
                    <circle cx="160" cy="110" r="13" fill="none" stroke="white" strokeWidth="2.5" />
                    <text x="160" y="114" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui,sans-serif">
                      {avgWqi ? Number(avgWqi).toFixed(0) : "?"}
                    </text>
                    {/* Legend bar */}
                    <rect x="0" y="198" width="320" height="22" fill="rgba(15,23,42,0.75)" />
                    <circle cx="10" cy="209" r="3" fill="#ef4444" /><text x="16" y="212" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Ext poor</text>
                    <circle cx="50" cy="209" r="3" fill="#f97316" /><text x="56" y="212" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Poor</text>
                    <circle cx="85" cy="209" r="3" fill="#eab308" /><text x="91" y="212" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Moderate</text>
                    <circle cx="132" cy="209" r="3" fill="#22c55e" /><text x="138" y="212" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Good</text>
                    <circle cx="165" cy="209" r="3" fill="#3b82f6" /><text x="171" y="212" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Excellent</text>
                  </svg>
                </div>

                {/* Blue gradient divider */}
                <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(30,144,255,0.05), rgba(30,144,255,0.4), rgba(30,144,255,0.05))" }} />

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(30,144,255,0.06)" }}>
                  <div>
                    <div className="text-sm font-bold text-white">Open Full Map</div>
                    <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>All lakes in city</div>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-full group-hover:translate-x-0.5 transition-transform duration-200"
                    style={{ background: "#1e90ff", width: 32, height: 32 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Lakes Table — scroll target */}
        <div ref={lakesRef}>
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
        </div>

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

        {/* States WQI Section */}
        <div className="py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: "#ffffff" }}>
              India's States
            </h2>
            <p className="text-slate-400 text-lg">
              Average Water Quality Index
            </p>
          </div>

          <div className="overflow-x-auto pb-4 scrollbar-hide">
            <div style={{
              display: "grid",
              gridTemplateRows: "1fr 1fr",
              gridAutoFlow: "column",
              gridAutoColumns: 240,
              gap: 16,
              padding: "18px 4px 12px",
              width: "max-content",
            }}>
              {allStates.map((state) => {
                const wqiStatus = getWqiColor(state.avg_wqi);
                const statePath = state.state_name.toLowerCase().replace(/\s+/g, "-");
                const slug = toStateSlug(state.state_name);
                const imgUrl = `/states/${slug}.png`;
                return (
                  <div
                    key={state.state_id}
                    onClick={() => {
                      window.scrollTo(0, 0);
                      navigate(`/dashboard/india/${statePath}`);
                    }}
                    className="state-card transition-all duration-300 cursor-pointer"
                    style={{
                      borderRadius: 18,
                      overflow: "hidden",
                      position: "relative",
                      height: 220,
                      border: `1px solid ${wqiStatus.color}30`,
                      boxShadow: `0 4px 24px rgba(0,0,0,0.5)`,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(-4px) scale(1.02)";
                      el.style.borderColor = wqiStatus.color + "80";
                      el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.7), 0 0 28px ${wqiStatus.color}30`;
                      const img = el.querySelector(".card-bg-img") as HTMLElement;
                      if (img) img.style.transform = "scale(1.08)";
                      const overlay = el.querySelector(".card-overlay") as HTMLElement;
                      if (overlay) overlay.style.background = `linear-gradient(to top, rgba(5,10,20,0.96) 0%, rgba(5,10,20,0.6) 50%, rgba(5,10,20,0.3) 100%)`;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "";
                      el.style.borderColor = wqiStatus.color + "30";
                      el.style.boxShadow = `0 4px 24px rgba(0,0,0,0.5)`;
                      const img = el.querySelector(".card-bg-img") as HTMLElement;
                      if (img) img.style.transform = "scale(1)";
                      const overlay = el.querySelector(".card-overlay") as HTMLElement;
                      if (overlay) overlay.style.background = `linear-gradient(to top, rgba(5,10,20,0.92) 0%, rgba(5,10,20,0.55) 55%, rgba(5,10,20,0.18) 100%)`;
                    }}
                  >
                    {/* Background photo */}
                    <img
                      className="card-bg-img"
                      src={imgUrl}
                      alt={state.state_name}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      }}
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />

                    {/* Fallback background if no image */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `linear-gradient(135deg, ${wqiStatus.color}18 0%, #0d1520 100%)`,
                    }}>
                      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" opacity="0.25">
                        <path d="M28 8C17 8 8 17 8 28s9 20 20 20 20-9 20-20S39 8 28 8z" stroke={wqiStatus.color} strokeWidth="1.5"/>
                        <path d="M16 28 Q28 14 40 28 Q28 42 16 28z" stroke={wqiStatus.color} strokeWidth="1.2" fill="none"/>
                      </svg>
                    </div>

                    {/* Gradient overlay */}
                    <div
                      className="card-overlay"
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(to top, rgba(5,10,20,0.92) 0%, rgba(5,10,20,0.55) 55%, rgba(5,10,20,0.18) 100%)`,
                        transition: "background 0.3s ease",
                      }}
                    />

                    {/* WQI status badge */}
                    <div style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: `${wqiStatus.color}22`,
                      border: `1px solid ${wqiStatus.color}55`,
                      borderRadius: 20,
                      padding: "3px 10px",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: wqiStatus.color, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                        {wqiStatus.label}
                      </span>
                    </div>

                    {/* Text content */}
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "16px 16px 14px",
                    }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#ffffff",
                        letterSpacing: "0.01em",
                        marginBottom: 6,
                        textShadow: "0 1px 8px rgba(0,0,0,0.8)",
                        lineHeight: 1.2,
                      }}>
                        {state.state_name}
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-end", justifyItems: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 1, letterSpacing: "0.08em", textTransform: "uppercase" }}>Avg WQI</div>
                          <div style={{
                            fontSize: 36,
                            fontWeight: 800,
                            color: wqiStatus.color,
                            lineHeight: 1,
                            textShadow: `0 0 20px ${wqiStatus.color}60`,
                          }}>
                            {state.avg_wqi ? Number(state.avg_wqi).toFixed(0) : "—"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", marginLeft: "auto" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
                            <div>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 1, letterSpacing: "0.06em" }}>LAT</div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{state.lat?.toFixed(2) ?? "—"}</div>
                            </div>
                            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)" }} />
                            <div>
                              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 1, letterSpacing: "0.06em" }}>LNG</div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{state.lng?.toFixed(2) ?? "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        marginTop: 10,
                        height: 2,
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${wqiStatus.color}, ${wqiStatus.color}30)`,
                        opacity: 0.7,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .state-card {
          transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 0.35s ease,
                      border-color 0.35s ease;
        }
        .card-bg-img {
          transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>
    </div>
  );
}
