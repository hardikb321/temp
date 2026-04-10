"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, MapPin, TrendingUp, TrendingDown, Minus, Map, ChevronDown } from "lucide-react";
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

// WQI scale bar — same as PointDetailPage
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

export function StateDetailPage() {
  const { stateName } = useParams<{ stateName: string }>();
  const navigate = useNavigate();
  const citiesRef = useRef<HTMLDivElement>(null);

  const [stateData, setStateData] = useState<StateWQI | null>(null);
  const [cities, setCities] = useState<CityWQI[]>([]);
  const [allStates, setAllStates] = useState<StateWQI[]>([]);
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
        setAllStates(states.filter((s: StateWQI) => s.avg_wqi != null));
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
        setStateData(foundState);
        return fetch(`/api/lakes/cities/wqi/${foundState.state_id}`);
      })
      .then((r) => (r?.ok ? r.json() : Promise.reject("Failed to fetch cities")))
      .then((json) => {
        const allCities = json?.data ?? [];
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

  const wqiInfo = stateData ? getWqiInfo(stateData.avg_wqi) : getWqiInfo(null);

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
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: stateData ? wqiInfo.dotColor : "#3b82f6" }} />
        <div className="absolute top-1/2 -right-48 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#1e90ff" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: stateData ? wqiInfo.dotColor : "#3b82f6" }} />
      </div>

      <Navbar />

      {/* Breadcrumb */}
      <div
        className="border-b border-gray-800/50"
        style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3">
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

      <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-8">
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

            {/* ── Hero WQI Card (matches PointDetailPage style) ── */}
            <div
              className="flex-1 rounded-3xl overflow-hidden relative"
              style={{
                background: "linear-gradient(145deg, #0c1825 0%, #0f2035 40%, #091520 100%)",
                border: `1px solid ${wqiInfo.dotColor}40`,
                boxShadow: `0 0 0 1px ${wqiInfo.dotColor}15, 0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${wqiInfo.dotColor}18`,
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
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${wqiInfo.dotColor}, #1e90ff, ${wqiInfo.dotColor})` }} />

              {/* Realistic water at bottom of card */}
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "42%", overflow: "hidden" }}>
                {/* Deep water gradient */}
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(180deg, transparent 0%, ${wqiInfo.dotColor}22 18%, ${wqiInfo.dotColor}50 60%, ${wqiInfo.dotColor}70 100%)`
                }} />
                {/* Caustic light patches */}
                {[10, 28, 50, 68, 85].map((l, i) => (
                  <div key={i} className="absolute rounded-full" style={{
                    left: `${l}%`, top: `${30 + (i % 3) * 18}%`,
                    width: 40 + i * 12, height: 8 + i * 3,
                    background: `radial-gradient(ellipse, ${wqiInfo.textHex}28 0%, transparent 70%)`,
                    filter: "blur(3px)",
                    animation: `scaustic ${2.2 + i * 0.5}s ease-in-out infinite ${i * 0.4}s`
                  }} />
                ))}
                {/* Glint streaks */}
                {[18, 42, 70].map((l, i) => (
                  <div key={i} className="absolute" style={{
                    left: `${l}%`, top: `${22 + i * 20}%`,
                    width: 60, height: 2,
                    background: `linear-gradient(90deg, transparent, ${wqiInfo.textHex}80, transparent)`,
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
                    background: `radial-gradient(circle at 35% 35%, ${wqiInfo.textHex}90, ${wqiInfo.dotColor}30)`,
                    boxShadow: `0 0 4px ${wqiInfo.textHex}40, inset 0 1px 1px rgba(255,255,255,0.5)`,
                    animation: `sb ${2 + i * 0.65}s ease-out infinite ${i * 1.1}s`
                  }} />
                ))}
                {/* Wave layer 3 */}
                <svg className="absolute top-0 left-0 h-full" style={{ width: "200%", animation: "sw3 18s linear infinite" }}
                  viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,60 C100,40 200,80 300,60 C400,40 500,78 600,58 C700,38 800,76 900,58 C1000,40 1100,78 1200,60 C1300,42 1400,76 1600,58 L1600,120 L0,120 Z"
                    fill={wqiInfo.dotColor} opacity="0.20" />
                </svg>
                {/* Wave layer 2 */}
                <svg className="absolute top-0 left-0 h-full" style={{ width: "200%", animation: "sw2 11s linear infinite" }}
                  viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,48 C80,28 160,68 240,48 C320,28 400,66 480,46 C560,26 640,64 720,46 C800,28 880,64 960,46 C1040,28 1120,64 1200,46 C1280,28 1360,62 1600,46 L1600,120 L0,120 Z"
                    fill={wqiInfo.dotColor} opacity="0.30" />
                </svg>
                {/* Wave layer 1 */}
                <svg className="absolute top-0 left-0 h-full" style={{ width: "200%", animation: "sw1 7s linear infinite" }}
                  viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="stateWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={wqiInfo.dotColor} stopOpacity="0.55" />
                      <stop offset="100%" stopColor={wqiInfo.dotColor} stopOpacity="0.85" />
                    </linearGradient>
                  </defs>
                  <path d="M0,38 C60,18 120,58 180,36 C240,14 300,54 360,34 C420,14 480,52 540,32 C600,12 660,50 720,30 C780,10 840,48 900,28 C960,8 1020,46 1080,28 C1140,10 1200,46 1260,28 C1320,10 1400,46 1600,30 L1600,120 L0,120 Z"
                    fill="url(#stateWaveGrad)" />
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
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${wqiInfo.dotColor}20 0%, transparent 65%)` }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, #1e90ff12 0%, transparent 70%)` }} />

              <div className="relative p-6 md:p-8">
                {/* Live badge row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${wqiInfo.dotColor}18`, border: `1px solid ${wqiInfo.dotColor}40` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: wqiInfo.dotColor }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: wqiInfo.textHex }}>State WQI</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <MapPin className="w-3 h-3" />
                    {stateData.lat.toFixed(3)}, {stateData.lng.toFixed(3)}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-start gap-8">
                  {/* WQI value */}
                  <div className="min-w-[200px]">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        {/* Giant glowing WQI number */}
                        <div className="relative inline-block">
                          <div className="text-8xl font-black tracking-tight leading-none" style={{
                            color: wqiInfo.textHex,
                            textShadow: `0 0 40px ${wqiInfo.dotColor}80, 0 0 80px ${wqiInfo.dotColor}30`
                          }}>
                            {stateData.avg_wqi ? Number(stateData.avg_wqi).toFixed(1) : "N/A"}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xl font-bold text-white">{wqiInfo.label}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                            background: `${wqiInfo.dotColor}25`,
                            color: wqiInfo.textHex,
                            border: `1px solid ${wqiInfo.dotColor}50`
                          }}>WQI</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Average across all cities &amp; monitoring points
                        </p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <WqiScaleBar wqi={stateData.avg_wqi} />
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
                        <p className="text-slate-500 text-xs mb-1">Total Cities</p>
                        <p className="text-3xl font-black text-white">{cities.length}</p>
                      </div>
                      <div className="rounded-2xl px-4 py-3" style={{
                        background: "rgba(10,20,35,0.75)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                        backdropFilter: "blur(10px)",
                      }}>
                        <p className="text-slate-500 text-xs mb-1">Best City WQI</p>
                        <p className="text-3xl font-black" style={{ color: wqiInfo.textHex }}>
                          {cities.length > 0
                            ? Number(Math.max(...cities.map((c) => c.avg_wqi ?? 0))).toFixed(0)
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Explore Cities CTA */}
                    <button
                      onClick={() => citiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="group w-full rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, ${wqiInfo.dotColor}18, #1e90ff12)`,
                        border: `2px solid ${wqiInfo.dotColor}80`,
                        boxShadow: `0 0 30px ${wqiInfo.dotColor}30`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                          background: `${wqiInfo.dotColor}20`,
                          border: `1px solid ${wqiInfo.dotColor}40`
                        }}>
                          <Droplets className="w-4 h-4" style={{ color: wqiInfo.textHex }} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-white">Explore Cities in {formattedStateName}</div>
                          <div className="text-xs mt-0.5 font-medium" style={{ color: wqiInfo.textHex }}>
                            {cities.length} cities with WQI data
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-1"
                        style={{ color: wqiInfo.textHex }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Map Card (identical to PointDetailPage) ── */}
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
                    <Map className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>WQI Map</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                      <span
                        className="w-2 h-2 rounded-full ring-1 ring-white/20"
                        style={{ background: wqiInfo.dotColor, boxShadow: `0 0 6px ${wqiInfo.dotColor}` }}
                      />
                      State center
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
                    {/* State center point — larger, glowing */}
                    <circle cx="160" cy="110" r="18" fill={wqiInfo.dotColor} opacity="0.2" />
                    <circle cx="160" cy="110" r="13" fill={wqiInfo.dotColor} />
                    <circle cx="160" cy="110" r="13" fill="none" stroke="white" strokeWidth="2.5" />
                    <text x="160" y="114" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui,sans-serif">
                      {stateData.avg_wqi ? Number(stateData.avg_wqi).toFixed(0) : "?"}
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
                    <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>All monitoring points</div>
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

        {/* Cities Table — scroll target */}
        <div ref={citiesRef}>
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
                <div
                  className="grid items-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest"
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
                        (e.currentTarget as HTMLElement).style.background = `${info.bgColor}`;
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