"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Map, Maximize2 } from "lucide-react";
import type { Marker } from "@/components/MyMap";
import { Navbar } from "@/components/Navbar";
import { PointChartsPanel } from "@/components/PointChartsPanel";

interface HistoryEntry {
  created_at: string;
  wqi: number | null;
  parameters: Record<string, number | null>;
}

interface MonthlyWqi {
  month: number;
  avg_wqi: number;
}

interface YearData {
  year: number;
  data: MonthlyWqi[];
}

function getWqiStatus(wqi: number | null | undefined): {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  barColor: string;
  textHex: string;
} {
  if (wqi == null)
    return { label: "Unknown", color: "text-gray-400", bgColor: "bg-gray-800", dotColor: "#6b7280", barColor: "#6b7280", textHex: "#9ca3af" };
  if (wqi < 40)
    return { label: "Poor", color: "text-red-400", bgColor: "bg-red-900/30", dotColor: "#ef4444", barColor: "#ef4444", textHex: "#f87171" };
  if (wqi < 65)
    return { label: "Moderate", color: "text-yellow-400", bgColor: "bg-yellow-900/30", dotColor: "#eab308", barColor: "#eab308", textHex: "#facc15" };
  if (wqi < 85)
    return { label: "Good", color: "text-green-400", bgColor: "bg-green-900/30", dotColor: "#22c55e", barColor: "#22c55e", textHex: "#4ade80" };
  return { label: "Excellent", color: "text-cyan-400", bgColor: "bg-cyan-900/30", dotColor: "#06b6d4", barColor: "#06b6d4", textHex: "#22d3ee" };
}

// WQI scale bar — mirrors AQI.in's gradient bar
function WqiScaleBar({ wqi }: { wqi: number | null }) {
  const maxWqi = 100;
  const pct = wqi != null ? Math.min((wqi / maxWqi) * 100, 100) : 0;
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs mb-1" style={{ color: "#64748b" }}>
        {["Poor", "Moderate", "Good", "Excellent"].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #ef4444, #eab308, #22c55e, #06b6d4)" }}>
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

// Animated character based on WQI level
function WqiCharacter({ wqi }: { wqi: number | null }) {
  const status = getWqiStatus(wqi);
  const mood = wqi == null ? "unknown" : wqi < 40 ? "poor" : wqi < 65 ? "moderate" : wqi < 85 ? "good" : "excellent";
  const bodyColor = status.dotColor;
  const faceColor = mood === "excellent" ? "#22d3ee" : mood === "good" ? "#4ade80" : mood === "moderate" ? "#facc15" : "#f87171";
  return (
    <div className="relative flex items-end justify-center" style={{ width: 120, height: 140 }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full opacity-30 blur-md" style={{ background: bodyColor }} />
      <svg width="100" height="130" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
        <style>{`
          @keyframes wqi-bounce { from { transform: translateY(0px); } to { transform: translateY(-10px); } }
          @keyframes wqi-sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
          @keyframes wqi-droop { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(4px); } }
          .mood-excellent { animation: wqi-bounce 0.75s infinite alternate ease-in-out; transform-origin: 50px 120px; }
          .mood-good { animation: wqi-bounce 1.3s infinite alternate ease-in-out; transform-origin: 50px 120px; }
          .mood-moderate { animation: wqi-sway 2s infinite ease-in-out; transform-origin: 50px 120px; }
          .mood-poor { animation: wqi-droop 2.5s infinite ease-in-out; transform-origin: 50px 120px; }
        `}</style>
        <ellipse cx="50" cy="124" rx="22" ry="5" fill={bodyColor} opacity="0.2" />
        <g className={`mood-${mood}`}>
          {mood === "poor" ? (<><line x1="40" y1="95" x2="32" y2="118" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="60" y1="95" x2="52" y2="118" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /></>) : mood === "excellent" ? (<><line x1="40" y1="95" x2="28" y2="112" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="60" y1="95" x2="72" y2="112" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="28" y1="112" x2="20" y2="107" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" /><line x1="72" y1="112" x2="80" y2="107" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" /></>) : (<><line x1="40" y1="95" x2="35" y2="118" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="60" y1="95" x2="65" y2="118" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /></>)}
          <rect x="28" y="58" width="44" height="40" rx="12" fill={bodyColor} />
          {mood === "poor" ? (<><line x1="28" y1="68" x2="12" y2="86" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="72" y1="68" x2="88" y2="86" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /></>) : mood === "excellent" ? (<><line x1="28" y1="65" x2="10" y2="44" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="72" y1="65" x2="90" y2="44" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><text x="4" y="42" fontSize="11" fill="#facc15">✦</text><text x="85" y="42" fontSize="11" fill="#facc15">✦</text></>) : mood === "good" ? (<><line x1="28" y1="65" x2="12" y2="54" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="72" y1="65" x2="88" y2="54" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /></>) : (<><line x1="28" y1="65" x2="14" y2="74" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /><line x1="72" y1="65" x2="84" y2="52" stroke={bodyColor} strokeWidth="6" strokeLinecap="round" /></>)}
          <circle cx="50" cy="40" r="22" fill={faceColor} />
          {mood === "poor" ? (<><line x1="41" y1="35" x2="45" y2="39" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" /><line x1="45" y1="35" x2="41" y2="39" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" /><line x1="55" y1="35" x2="59" y2="39" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" /><line x1="59" y1="35" x2="55" y2="39" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" /></>) : mood === "excellent" ? (<><path d="M38 36 Q43 31 48 36" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M52 36 Q57 31 62 36" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>) : (<><circle cx="43" cy="37" r="3.5" fill="#1e293b" /><circle cx="57" cy="37" r="3.5" fill="#1e293b" /><circle cx="44.5" cy="35.5" r="1" fill="white" /><circle cx="58.5" cy="35.5" r="1" fill="white" /></>)}
          {mood === "poor" && <path d="M42 50 Q50 45 58 50" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
          {mood === "moderate" && <line x1="43" y1="49" x2="57" y2="49" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />}
          {mood === "good" && <path d="M42 47 Q50 53 58 47" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
          {mood === "excellent" && <path d="M39 47 Q50 58 61 47" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
          {mood === "excellent" && (<><ellipse cx="37" cy="45" rx="5" ry="3" fill="#f9a8d4" opacity="0.6" /><ellipse cx="63" cy="45" rx="5" ry="3" fill="#f9a8d4" opacity="0.6" /></>)}
          {mood === "poor" && <ellipse cx="67" cy="28" rx="3" ry="5" fill="#60a5fa" opacity="0.85" />}
        </g>
      </svg>
    </div>
  );
}

export function PointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [marker, setMarker] = useState<Marker | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allYearsData, setAllYearsData] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"chart" | "history">("chart");
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setPageError("No point ID provided in URL"); return; }
    const storedMarker = sessionStorage.getItem(`point_${id}`);
    if (storedMarker) {
      try { setMarker(JSON.parse(storedMarker)); setPageError(null); }
      catch (e) { setPageError(`Failed to parse point data: ${e instanceof Error ? e.message : String(e)}`); }
    } else {
      setPageError(`Point data not found in session.`);
    }
  }, [id]);

  useEffect(() => {
    if (!marker?.lakeId) return;
    setLoading(true); setError(null);
    fetch(`/api/lakes/marker-history?lake_id=${encodeURIComponent(marker.lakeId)}&lat=${marker.latitude}&lng=${marker.longitude}&limit=1000&offset=0`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => setHistoryEntries(json?.data?.results ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, [marker]);

  useEffect(() => {
    if (!marker?.lakeId) return;
    fetch(`/api/lakes/marker-years?lake_id=${encodeURIComponent(marker.lakeId)}&lat=${marker.latitude}&lng=${marker.longitude}`)
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to fetch years"))
      .then((json) => {
        const years: number[] = json?.data?.length ? json.data : [new Date().getFullYear()];
        return Promise.all(years.map((year) =>
          fetch(`/api/lakes/marker-chart?lake_id=${encodeURIComponent(marker.lakeId || "")}&lat=${marker.latitude}&lng=${marker.longitude}&year=${year}`)
            .then((r) => r.ok ? r.json() : null).catch(() => null)
            .then((json) => ({ year, data: json?.data?.wqi ?? [] }))
        ));
      })
      .then((results) => {
        const valid = results.filter((r) => r.data.length > 0);
        const final = valid.length ? valid : results;
        setAllYearsData(final);
        if (final.length > 0) setSelectedYear(final[0].year);
      })
      .catch(console.error);
  }, [marker]);

  const latestEntry = historyEntries[0] ?? null;

  if (!marker || pageError) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 40%, #0d1117 100%)" }}>
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="rounded-2xl p-8 max-w-md w-full text-center" style={{ background: "#161b27", border: "1px solid #1e2a3a" }}>
            <div className="text-red-400 text-lg font-semibold mb-2">Error Loading Point Data</div>
            <p className="text-slate-400 text-sm mb-6">{pageError || "No point data available."}</p>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: "#1e2a3a", border: "1px solid #2a3a4a" }}>
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wqiStatus = getWqiStatus(latestEntry?.wqi);
  const params = latestEntry?.parameters ? Object.entries(latestEntry.parameters) : [];

  // Key parameter icons mapping
  const paramIcons: Record<string, string> = {
    "pH": "⚗️", "Turbidity": "🌊", "DO": "💧", "BOD": "🧪",
    "TDS": "🔬", "Nitrates": "🌿", "Coliform": "🦠", "Temperature": "🌡️",
  };

  // bg changes subtly based on status
  const bgFrom = wqiStatus.dotColor + "18";
  const bgAccent = wqiStatus.dotColor + "0a";

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{
      background: "linear-gradient(160deg, #060d14 0%, #0d1521 50%, #060d14 100%)"
    }}>
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: wqiStatus.dotColor }} />
        <div className="absolute top-1/2 -right-48 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#1e90ff" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: wqiStatus.dotColor }} />
      </div>

      <Navbar />

      <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:text-white hover:scale-105"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: wqiStatus.dotColor }}>⬡</span>
              <span className="text-white font-bold">Lake {marker.lakeId}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 text-xs font-mono">{marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["WQI", "pH", "DO", "BOD", "Turbidity", "TDS"].map((p, i) => (
              <button key={p}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105"
                style={i === 0
                  ? { background: `linear-gradient(135deg, ${wqiStatus.dotColor}, #1e90ff)`, color: "#fff", boxShadow: `0 0 16px ${wqiStatus.dotColor}55` }
                  : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                }>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN ROW */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">

          {/* Hero WQI Card */}
          <div className="flex-1 rounded-3xl overflow-hidden relative" style={{
            background: `linear-gradient(145deg, #0c1825 0%, #0f2035 40%, #091520 100%)`,
            border: `1px solid ${wqiStatus.dotColor}40`,
            boxShadow: `0 0 0 1px ${wqiStatus.dotColor}15, 0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${wqiStatus.dotColor}18`
          }}>
            {/* Card-scoped animation keyframes */}
            <style>{`
              @keyframes card-wave1 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-4%)} }
              @keyframes card-wave2 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4%)} }
              @keyframes card-shimmer { 0%,100%{opacity:0.12} 50%{opacity:0.28} }
              @keyframes card-bubble { 0%{transform:translateY(0);opacity:0.6} 100%{transform:translateY(-56px);opacity:0} }
              @keyframes card-drift { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
            `}</style>

            {/* Top color bar */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${wqiStatus.dotColor}, #1e90ff, ${wqiStatus.dotColor})` }} />

            {/* Animated water at bottom of card */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "38%", overflow: "hidden" }}>
              {/* Water fill */}
              <div className="absolute inset-0" style={{
                background: `linear-gradient(180deg, ${wqiStatus.dotColor}18 0%, ${wqiStatus.dotColor}38 100%)`
              }} />
              {/* Drifting highlight streaks */}
              <div className="absolute inset-0" style={{
                width: "200%",
                backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 60px, ${wqiStatus.textHex}10 60px, ${wqiStatus.textHex}10 90px)`,
                animation: "card-drift 14s linear infinite"
              }} />
              {/* Wave 1 */}
              <svg className="absolute top-0 left-0 w-full" style={{ animation: "card-wave1 5s ease-in-out infinite" }}
                viewBox="0 0 800 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,20 C133,35 267,6 400,20 C533,34 667,7 800,20 L800,0 L0,0 Z"
                  fill="#0c1825" opacity="0.85" />
              </svg>
              {/* Wave 2 */}
              <svg className="absolute top-0 left-0 w-full" style={{ marginTop: "4px", animation: "card-wave2 8s ease-in-out infinite 0.6s" }}
                viewBox="0 0 800 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,14 C200,30 400,4 600,18 C700,25 760,10 800,15 L800,0 L0,0 Z"
                  fill={wqiStatus.dotColor} opacity="0.18" />
              </svg>
              {/* Ripple lines */}
              {[30, 55, 78].map((top, i) => (
                <div key={i} className="absolute left-0 right-0" style={{
                  top: `${top}%`, height: "1px",
                  background: `linear-gradient(90deg, transparent, ${wqiStatus.textHex}35 30%, ${wqiStatus.textHex}55 50%, ${wqiStatus.textHex}35 70%, transparent)`,
                  animation: `card-shimmer ${3 + i}s ease-in-out infinite ${i * 0.8}s`
                }} />
              ))}
              {/* Bubbles */}
              {[12, 28, 48, 66, 82].map((left, i) => (
                <div key={i} className="absolute rounded-full" style={{
                  bottom: `${8 + (i % 3) * 6}px`,
                  left: `${left}%`,
                  width: i % 2 === 0 ? 5 : 3,
                  height: i % 2 === 0 ? 5 : 3,
                  border: `1px solid ${wqiStatus.textHex}55`,
                  animation: `card-bubble ${2.5 + i * 0.7}s ease-out infinite ${i * 0.9}s`
                }} />
              ))}
            </div>

            {/* Glow blobs inside card */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${wqiStatus.dotColor}20 0%, transparent 65%)` }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, #1e90ff12 0%, transparent 70%)` }} />

            <div className="relative p-6 md:p-8">
              {/* Live badge row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${wqiStatus.dotColor}18`, border: `1px solid ${wqiStatus.dotColor}40` }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: wqiStatus.dotColor }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: wqiStatus.textHex }}>Live WQI</span>
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  {latestEntry?.created_at ? new Date(latestEntry.created_at).toLocaleDateString() : ""}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-start gap-8">
                {/* WQI value + character */}
                <div className="min-w-[220px]">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      {/* Giant glowing WQI number */}
                      <div className="relative inline-block">
                        <div className="text-8xl font-black tracking-tight leading-none" style={{
                          color: wqiStatus.textHex,
                          textShadow: `0 0 40px ${wqiStatus.dotColor}80, 0 0 80px ${wqiStatus.dotColor}30`
                        }}>
                          {latestEntry?.wqi?.toFixed(1) ?? "N/A"}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xl font-bold text-white">{wqiStatus.label}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                          background: `${wqiStatus.dotColor}25`,
                          color: wqiStatus.textHex,
                          border: `1px solid ${wqiStatus.dotColor}50`
                        }}>WQI</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {latestEntry?.created_at ? new Date(latestEntry.created_at).toLocaleString() : "No recent data"}
                      </p>
                    </div>
                    <div className="pb-2 hidden sm:block">
                      <WqiCharacter wqi={latestEntry?.wqi ?? null} />
                    </div>
                  </div>
                  <div className="mt-5">
                    <WqiScaleBar wqi={latestEntry?.wqi ?? null} />
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px self-stretch" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)" }} />

                {/* Parameters grid */}
                <div className="flex-1 flex flex-col gap-2.5">
                  {params.slice(0, 3).map(([key, value]) => (
                    <div key={key} className="rounded-2xl px-4 py-3 flex items-center justify-between group transition-all hover:scale-[1.02]" style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
                    }}>
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        <span className="text-base flex-shrink-0">{paramIcons[key.split(" ")[0]] ?? "📊"}</span>
                        <span className="text-xs text-slate-400 font-medium leading-snug break-words">{key}</span>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xl font-black text-white">
                          {typeof value === "number" ? value.toFixed(2) : "N/A"}
                        </span>
                        <div className="w-16 h-0.5 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{
                            width: typeof value === "number" ? `${Math.min((value / 10) * 100, 100)}%` : "0%",
                            background: `linear-gradient(90deg, ${wqiStatus.dotColor}, #1e90ff)`
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-shrink-0 w-full lg:w-64 flex flex-col gap-3">
            {/* Map Card */}
            <button
              onClick={() => navigate(`/map/lake?lat=${marker.latitude}&lng=${marker.longitude}&zoom=15`)}
              className="group w-full rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(145deg, #0c1825, #0f2035)",
                border: "1px solid rgba(30,144,255,0.25)",
                boxShadow: "0 0 40px rgba(30,144,255,0.1)",
              }}
            >
              <div className="relative h-44 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="mapglow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#1e90ff" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#0d1b2a" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="260" height="180" fill="#08131e" />
                  <rect width="260" height="180" fill="url(#mapglow)" />
                  {[30,60,90,120,150].map(y => <line key={y} x1="0" y1={y} x2="260" y2={y} stroke="#0f2035" strokeWidth="1" />)}
                  {[50,100,150,200].map(x => <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#0f2035" strokeWidth="1" />)}
                  <path d="M 15 70 Q 65 50 110 75 T 245 65" stroke="#1e90ff" strokeWidth="1.5" fill="none" opacity="0.5" strokeDasharray="5 3" />
                  <path d="M 10 120 Q 60 105 110 125 T 250 115" stroke="#00bcd4" strokeWidth="1" fill="none" opacity="0.3" />
                  {/* Glowing current point */}
                  <circle cx="50" cy="75" r="14" fill={wqiStatus.dotColor} opacity="0.15" />
                  <circle cx="50" cy="75" r="10" fill={wqiStatus.dotColor} opacity="0.9" />
                  <text x="50" y="79" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">{latestEntry?.wqi?.toFixed(0) ?? "?"}</text>
                  <circle cx="105" cy="65" r="9" fill="#eab308" opacity="0.85" /><text x="105" y="69" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">61</text>
                  <circle cx="155" cy="80" r="9" fill="#22c55e" opacity="0.85" /><text x="155" y="84" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">82</text>
                  <circle cx="205" cy="68" r="8" fill="#3b82f6" opacity="0.85" /><text x="205" y="72" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">91</text>
                  <circle cx="80" cy="125" r="8" fill="#ef4444" opacity="0.75" /><text x="80" y="129" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">35</text>
                </svg>
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(30,144,255,0.2)", border: "1px solid rgba(30,144,255,0.35)", color: "#60a5fa", backdropFilter: "blur(4px)" }}>
                  <Map className="w-3 h-3" /> WQI Map
                </div>
                <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(4px)" }}>
                  <Maximize2 className="w-3 h-3 text-slate-300" />
                </div>
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                  <span className="w-2 h-2 rounded-full ring-2" style={{ background: wqiStatus.dotColor, boxShadow: `0 0 6px ${wqiStatus.dotColor}` }} />
                  This point
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div className="text-white text-sm font-bold">Open Full Map</div>
                  <div className="text-slate-500 text-xs">All monitoring points</div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform" style={{ background: "linear-gradient(135deg, #1e90ff, #06b6d4)" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </button>

            {/* Comparison card */}
            {latestEntry?.wqi != null && (
              <div className="rounded-3xl p-4" style={{
                background: "linear-gradient(145deg, #0c1825, #0f2035)",
                border: `1px solid ${wqiStatus.dotColor}30`,
                boxShadow: `0 0 24px ${wqiStatus.dotColor}10`
              }}>
                <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Compared to average</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black" style={{ color: wqiStatus.textHex }}>
                    {latestEntry.wqi > 65 ? "Above" : "Below"}
                  </span>
                  <span className="text-slate-400 text-sm">regional threshold</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{
                    width: `${Math.min((latestEntry.wqi / 100) * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${wqiStatus.dotColor}, #1e90ff)`
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["chart", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
              style={activeTab === tab
                ? { background: `linear-gradient(135deg, ${wqiStatus.dotColor}30, #1e90ff20)`, color: "#fff", border: `1px solid ${wqiStatus.dotColor}40`, boxShadow: `0 0 20px ${wqiStatus.dotColor}20` }
                : { color: "#475569", border: "1px solid transparent" }
              }
            >
              {tab === "chart" ? "📈 Year Trend" : "🕒 Point History"}
            </button>
          ))}
        </div>

        {/* Chart Tab */}
        {activeTab === "chart" && (
          <div className="rounded-3xl p-6" style={{
            background: "linear-gradient(145deg, #0c1825, #0f2035)",
            border: `1px solid rgba(255,255,255,0.07)`,
            boxShadow: "0 24px 80px rgba(0,0,0,0.4)"
          }}>
            {/* Chart header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-lg">Water Quality Trend</h3>
                <p className="text-slate-500 text-xs mt-0.5">Monthly WQI averages for selected year</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: `${wqiStatus.dotColor}15`, color: wqiStatus.textHex, border: `1px solid ${wqiStatus.dotColor}30` }}>
                <span className="w-2 h-2 rounded-full" style={{ background: wqiStatus.dotColor }} />
                {selectedYear ?? ""}
              </div>
            </div>
            <PointChartsPanel
              availableYears={allYearsData.map(y => y.year)}
              year={selectedYear}
              onYearChange={setSelectedYear}
              lakeId={marker.lakeId ?? null}
              lat={marker.latitude}
              lng={marker.longitude}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="rounded-3xl overflow-hidden" style={{
            background: "linear-gradient(145deg, #0c1825, #0f2035)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.4)"
          }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <h3 className="text-white font-bold text-lg">Point History</h3>
                <p className="text-slate-500 text-xs mt-0.5">{historyEntries.length} records found</p>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                Latest first
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex items-center gap-3 p-6 text-slate-400 text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-blue-400 animate-spin" />
                  Loading history...
                </div>
              ) : error ? (
                <p className="text-red-400 text-sm p-4">{error}</p>
              ) : historyEntries.length === 0 ? (
                <p className="text-slate-500 text-sm p-6 text-center">No history available</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {historyEntries.map((entry, idx) => {
                    const isExpanded = expandedHistoryIdx === idx;
                    const st = getWqiStatus(entry.wqi);
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: isExpanded ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                          border: isExpanded ? `1px solid ${st.dotColor}40` : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isExpanded ? `0 0 20px ${st.dotColor}15` : "none"
                        }}
                        onClick={() => setExpandedHistoryIdx(isExpanded ? null : idx)}
                      >
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-4">
                            {/* WQI badge */}
                            <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0" style={{
                              background: `${st.dotColor}18`,
                              border: `1px solid ${st.dotColor}40`
                            }}>
                              <span className="text-xs font-black" style={{ color: st.textHex }}>
                                {entry.wqi != null ? entry.wqi.toFixed(0) : "—"}
                              </span>
                              <span className="text-[9px] font-bold" style={{ color: st.dotColor }}>WQI</span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-semibold">
                                {new Date(entry.created_at).toLocaleString()}
                              </p>
                              <p className="text-xs mt-0.5 font-medium" style={{ color: st.textHex }}>
                                {st.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}>
                              {Object.keys(entry.parameters ?? {}).length} params
                            </div>
                            <div style={{ color: "#334155" }}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>
                        {isExpanded && entry.parameters && (
                          <div className="px-5 pb-5 pt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {Object.entries(entry.parameters).map(([key, value]) => (
                              <div key={key} className="rounded-xl p-3 transition-all hover:scale-105" style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.07)"
                              }}>
                                <p className="text-slate-500 text-xs mb-1.5 flex items-center gap-1">
                                  <span>{paramIcons[key.split(" ")[0]] ?? "📊"}</span>
                                  <span className="truncate">{key}</span>
                                </p>
                                <p className="text-white font-black text-lg">
                                  {typeof value === "number" ? value.toFixed(2) : "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}