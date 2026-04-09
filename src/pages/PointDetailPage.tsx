"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Map } from "lucide-react";
import type { Marker } from "@/components/MyMap";
import { Navbar } from "@/components/Navbar";
import { PointChartsPanel } from "@/components/PointChartsPanel";
import type { WaterType } from "@/types";

interface StateWQI {
  state_id: number;
  state_name: string;
  avg_wqi: number;
  lat: number;
  lng: number;
}

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

function getWqiColor(wqi: number | null): { color: string; bgColor: string; label: string } {
  if (wqi == null) return { color: "#6b7280", bgColor: "#6b728026", label: "Unknown" };
  if (wqi < 40) return { color: "#ef4444", bgColor: "#ef444426", label: "Poor" };
  if (wqi < 65) return { color: "#f59e0b", bgColor: "#f59e0b26", label: "Fair" };
  if (wqi < 85) return { color: "#22c55e", bgColor: "#22c55e26", label: "Good" };
  return { color: "#3b82f6", bgColor: "#3b82f626", label: "Excellent" };
}

// Converts a state name to a file-safe slug: "Uttar Pradesh" → "uttar-pradesh"
function toStateSlug(stateName: string): string {
  return stateName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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
  const mood = wqi == null ? "unknown" : wqi < 40 ? "poor" : wqi < 65 ? "moderate" : wqi < 85 ? "good" : "excellent";

  // Skin, hair, cloth colors
  const skin = "#f5c5a3";
  const skinDark = "#e8a882";
  const hair = "#2d1a0e";
  const lip = "#c97b6a";

  const shirtColor = mood === "excellent" ? "#22d3ee" : mood === "good" ? "#4ade80" : mood === "moderate" ? "#f59e0b" : "#ef4444";
  const shirtDark  = mood === "excellent" ? "#0e9ab5" : mood === "good" ? "#22c55e" : mood === "moderate" ? "#d97706" : "#b91c1c";
  const pantColor  = mood === "excellent" ? "#1e40af" : mood === "good" ? "#166534" : mood === "moderate" ? "#78350f" : "#7f1d1d";

  return (
    <div className="relative flex items-end justify-center" style={{ width: 110, height: 150 }}>
      <style>{`
        @keyframes h-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes h-sway   { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
        @keyframes h-droop  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(5px) rotate(1deg)} }
        @keyframes h-idle   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .mood-excellent-h { animation: h-bounce 0.8s ease-in-out infinite; transform-origin: 55px 145px; }
        .mood-good-h      { animation: h-idle   1.6s ease-in-out infinite; transform-origin: 55px 145px; }
        .mood-moderate-h  { animation: h-sway   2.2s ease-in-out infinite; transform-origin: 55px 145px; }
        .mood-poor-h      { animation: h-droop  2.8s ease-in-out infinite; transform-origin: 55px 145px; }
        .mood-unknown-h   { animation: h-idle   2s   ease-in-out infinite; transform-origin: 55px 145px; }
      `}</style>

      {/* Shadow */}
      <ellipse cx="55" cy="148" rx="24" ry="4" fill="#000" opacity="0.18" style={{position:"absolute",bottom:0} as React.CSSProperties} />

      <svg width="110" height="148" viewBox="0 0 110 148" xmlns="http://www.w3.org/2000/svg">
        <g className={`mood-${mood}-h`}>

          {/* === LEGS === */}
          {/* Left leg */}
          <rect x="34" y="108" width="16" height="30" rx="7" fill={pantColor} />
          <rect x="33" y="130" width="18" height="10" rx="4" fill="#1e293b" /> {/* shoe */}
          <rect x="31" y="134" width="20" height="6"  rx="3" fill="#334155" />
          {/* Right leg */}
          <rect x={mood === "poor" ? "58" : "56"} y="108" width="16" height="30" rx="7" fill={pantColor} />
          <rect x={mood === "poor" ? "57" : "55"} y="130" width="18" height="10" rx="4" fill="#1e293b" />
          <rect x={mood === "poor" ? "55" : "53"} y="134" width="20" height="6"  rx="3" fill="#334155" />

          {/* === TORSO === */}
          <rect x="30" y="72" width="46" height="42" rx="10" fill={shirtColor} />
          {/* shirt shading */}
          <rect x="30" y="72" width="46" height="12" rx="10" fill={shirtDark} opacity="0.4" />
          {/* collar */}
          <path d="M46,72 L55,82 L64,72" fill="white" opacity="0.9" />
          {/* shirt crease */}
          <line x1="55" y1="84" x2="55" y2="110" stroke={shirtDark} strokeWidth="1.5" opacity="0.4" />

          {/* === ARMS === */}
          {mood === "excellent" ? (
            <>
              {/* Both arms raised in cheer */}
              <path d="M30,80 C18,72 12,60 16,50" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <path d="M76,80 C88,72 94,60 90,50" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              {/* hands */}
              <circle cx="15" cy="48" r="7" fill={skin} />
              <circle cx="91" cy="48" r="7" fill={skin} />
              {/* thumbs up */}
              <line x1="15" y1="48" x2="10" y2="42" stroke={skinDark} strokeWidth="3" strokeLinecap="round"/>
              <line x1="91" y1="48" x2="96" y2="42" stroke={skinDark} strokeWidth="3" strokeLinecap="round"/>
              {/* sparkles */}
              <text x="2"  y="38" fontSize="10" fill="#facc15">✦</text>
              <text x="96" y="38" fontSize="10" fill="#facc15">✦</text>
            </>
          ) : mood === "good" ? (
            <>
              {/* Left arm relaxed, right arm slight wave */}
              <path d="M30,82 C20,78 14,82 12,90" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <path d="M76,82 C86,74 92,66 88,58" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <circle cx="11" cy="93" r="7" fill={skin} />
              <circle cx="89" cy="56" r="7" fill={skin} />
            </>
          ) : mood === "moderate" ? (
            <>
              {/* Arms crossed / hand on chin thinking */}
              <path d="M30,82 C22,80 18,86 20,94" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <path d="M76,82 C84,78 86,70 80,62" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <circle cx="20" cy="96" r="7" fill={skin} />
              <circle cx="79" cy="60" r="7" fill={skin} />
              {/* hand on cheek */}
              <path d="M79,60 Q76,52 70,50" stroke={skinDark} strokeWidth="3" strokeLinecap="round" fill="none"/>
            </>
          ) : (
            <>
              {/* Poor — slouched arms down */}
              <path d="M30,80 C22,86 18,96 20,108" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <path d="M76,80 C84,86 88,96 86,108" stroke={shirtColor} strokeWidth="10" strokeLinecap="round" fill="none"/>
              <circle cx="20" cy="110" r="7" fill={skin} />
              <circle cx="86" cy="110" r="7" fill={skin} />
            </>
          )}

          {/* === NECK === */}
          <rect x="48" y="60" width="14" height="14" rx="5" fill={skin} />

          {/* === HEAD === */}
          <ellipse cx="55" cy="42" rx="22" ry="24" fill={skin} />
          {/* head shading sides */}
          <ellipse cx="34" cy="44" rx="6"  ry="14" fill={skinDark} opacity="0.25" />
          <ellipse cx="76" cy="44" rx="6"  ry="14" fill={skinDark} opacity="0.25" />

          {/* === HAIR === */}
          <ellipse cx="55" cy="22" rx="22" ry="12" fill={hair} />
          <ellipse cx="55" cy="26" rx="20" ry="8"  fill={hair} />
          {/* hair strand */}
          {mood === "poor" && <path d="M55,18 Q60,10 58,6" stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none"/>}
          {mood === "excellent" && <>
            <path d="M40,20 Q36,10 38,6" stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M55,18 Q55,8  56,4"  stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M68,22 Q74,12 72,8"  stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none"/>
          </>}

          {/* === EARS === */}
          <ellipse cx="33" cy="44" rx="5" ry="7" fill={skin} />
          <ellipse cx="77" cy="44" rx="5" ry="7" fill={skin} />
          <ellipse cx="33" cy="44" rx="3" ry="5" fill={skinDark} opacity="0.3" />
          <ellipse cx="77" cy="44" rx="3" ry="5" fill={skinDark} opacity="0.3" />

          {/* === EYEBROWS === */}
          {mood === "poor" ? (
            <>
              <path d="M41,31 Q46,35 51,32" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              <path d="M59,32 Q64,35 69,31" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
            </>
          ) : mood === "excellent" ? (
            <>
              <path d="M41,32 Q46,27 51,30" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              <path d="M59,30 Q64,27 69,32" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
            </>
          ) : mood === "moderate" ? (
            <>
              <path d="M41,31 Q46,28 51,31" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              <path d="M59,31 Q64,28 69,31" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
            </>
          ) : (
            <>
              <path d="M41,30 Q46,28 51,30" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              <path d="M59,30 Q64,28 69,30" stroke={hair} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
            </>
          )}

          {/* === EYES === */}
          {mood === "excellent" ? (
            <>
              {/* Happy squint arcs */}
              <path d="M42,38 Q46,34 50,38" stroke={hair} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M60,38 Q64,34 68,38" stroke={hair} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              {/* blush */}
              <ellipse cx="38" cy="46" rx="6" ry="3" fill="#f9a8d4" opacity="0.55"/>
              <ellipse cx="72" cy="46" rx="6" ry="3" fill="#f9a8d4" opacity="0.55"/>
            </>
          ) : mood === "poor" ? (
            <>
              {/* Sad droopy eyes */}
              <ellipse cx="46" cy="39" rx="5" ry="5.5" fill="white"/>
              <ellipse cx="64" cy="39" rx="5" ry="5.5" fill="white"/>
              <circle cx="46" cy="40" r="3.2" fill="#3b4a6b"/>
              <circle cx="64" cy="40" r="3.2" fill="#3b4a6b"/>
              <circle cx="47" cy="38" r="1.2" fill="white"/>
              <circle cx="65" cy="38" r="1.2" fill="white"/>
              {/* tear */}
              <path d="M67,43 Q68,50 66,54" stroke="#60a5fa" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8"/>
            </>
          ) : (
            <>
              <ellipse cx="46" cy="39" rx="5.5" ry="6" fill="white"/>
              <ellipse cx="64" cy="39" rx="5.5" ry="6" fill="white"/>
              <circle cx="46" cy="40" r="3.5" fill="#2d3748"/>
              <circle cx="64" cy="40" r="3.5" fill="#2d3748"/>
              <circle cx="47.5" cy="38" r="1.3" fill="white"/>
              <circle cx="65.5" cy="38" r="1.3" fill="white"/>
            </>
          )}

          {/* === NOSE === */}
          <path d="M53,46 Q55,50 57,46" stroke={skinDark} strokeWidth="1.5" fill="none" strokeLinecap="round"/>

          {/* === MOUTH === */}
          {mood === "excellent" && <path d="M43,54 Q55,64 67,54" stroke={lip} strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
          {mood === "good"      && <path d="M45,54 Q55,60 65,54" stroke={lip} strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
          {mood === "moderate"  && <line x1="46" y1="56" x2="64" y2="56" stroke={lip} strokeWidth="2.5" strokeLinecap="round"/>}
          {mood === "poor"      && <path d="M45,58 Q55,52 65,58" stroke={lip} strokeWidth="2.5" fill="none" strokeLinecap="round"/>}

          {/* Teeth for excellent */}
          {mood === "excellent" && <path d="M47,55 Q55,62 63,55 L63,59 Q55,66 47,59 Z" fill="white" opacity="0.9"/>}

        </g>
      </svg>
    </div>
  );
}

export function PointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const statesRef = useRef<HTMLDivElement>(null);

  const [marker, setMarker] = useState<Marker | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allYearsData, setAllYearsData] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"chart" | "history">("chart");
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [states, setStates] = useState<StateWQI[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);

  const [waterType, setWaterType] = useState<WaterType>("lake");

  useEffect(() => {
    if (!id) { setPageError("No point ID provided in URL"); return; }
    const storedMarker = sessionStorage.getItem(`point_${id}`);
    if (storedMarker) {
      try { 
        const parsed = JSON.parse(storedMarker);
        setMarker(parsed); 
        if (parsed.riverId && !parsed.lakeId) setWaterType("river");
        else if (parsed.lakeId) setWaterType("lake");
        setPageError(null); 
      }
      catch (e) { setPageError(`Failed to parse point data: ${e instanceof Error ? e.message : String(e)}`); }
    } else {
      setPageError(`Point data not found in session.`);
    }
  }, [id]);

  useEffect(() => {
    const objectId = marker?.lakeId || marker?.riverId;
    if (!objectId) return;

    setLoading(true); setError(null);
    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";
    
    fetch(`/api/${route}/marker-history?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}&limit=1000&offset=0`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => setHistoryEntries(json?.data?.results ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, [marker, waterType]);

  useEffect(() => {
    const objectId = marker?.lakeId || marker?.riverId;
    if (!objectId) return;

    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    fetch(`/api/${route}/marker-years?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}`)
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to fetch years"))
      .then((json) => {
        const years: number[] = json?.data?.length ? json.data : [new Date().getFullYear()];
        return Promise.all(years.map((year) =>
          fetch(`/api/${route}/marker-chart?${idKey}=${encodeURIComponent(objectId || "")}&lat=${marker.latitude}&lng=${marker.longitude}&year=${year}`)
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
  }, [marker, waterType]);

  useEffect(() => {
    const route = waterType === "river" ? "rivers" : "lakes";
    fetch(`/api/${route}/states/wqi`)
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to fetch states"))
      .then((json) => {
        setStates(json?.data ?? []);
        setStatesLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching states:", err);
        setStatesLoading(false);
      });
  }, [waterType]);

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
    "pH": "🔴🔵", "Turbidity": "🌫️", "DO": "💧", "BOD": "🧪",
    "TDS": "🔬", "Nitrates": "🌿", "Coliform": "🦠", "Temperature": "🌡️",
  };

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

      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-800/50" style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Dashboard
            </button>
            <span className="text-gray-600">/</span>
            <button
              onClick={() => statesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
            >
              India
            </button>
            {marker.state_name && (
              <>
                <span className="text-gray-600">/</span>
                <button
                  onClick={() => navigate(`/dashboard/india/${marker.state_name!.toLowerCase().replace(/\\s+/g, '-')}`)}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  {marker.state_name}
                </button>
              </>
            )}
            {marker.city_name && marker.state_name && (
              <>
                <span className="text-gray-600">/</span>
                <button
                  onClick={() => navigate(`/dashboard/india/${marker.state_name!.toLowerCase().replace(/\\s+/g, '-')}/${marker.city_name!.toLowerCase().replace(/\\s+/g, '-')}`)}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  {marker.city_name}
                </button>
              </>
            )}
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">
              {waterType === "river" ? "River " : "Lake "} {marker.riverId || marker.lakeId}
            </span>
          </div>
        </div>
      </div>

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
            <div className="flex flex-col gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <span style={{ color: wqiStatus.dotColor }}>⬡</span>
                <span className="text-white font-bold">{waterType === "river" ? "River " : "Lake "} {marker.riverId || marker.lakeId}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 text-xs font-mono">{marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</span>
              </div>
              {(marker.city_name || marker.state_name) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span>📍</span>
                  <span>
                    {marker.city_name && <span className="text-white font-medium">{marker.city_name}</span>}
                    {marker.city_name && marker.state_name && <span className="mx-1 text-slate-600">,</span>}
                    {marker.state_name && <span className="text-white font-medium">{marker.state_name}</span>}
                    {(marker.city_name || marker.state_name) && <span className="mx-1 text-slate-600">,</span>}
                    <span className="text-slate-400">India</span>
                  </span>
                </div>
              )}
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
              @keyframes cw1 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
              @keyframes cw2 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
              @keyframes cw3 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
              @keyframes cfoam { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
              @keyframes caustic { 0%,100%{opacity:0.07} 50%{opacity:0.18} }
              @keyframes cb { 0%{transform:translateY(0) scale(1);opacity:0.7} 80%{opacity:0.2} 100%{transform:translateY(-70px) scale(0.4);opacity:0} }
              @keyframes cglint { 0%,100%{opacity:0;transform:scaleX(0.3)} 40%,60%{opacity:1;transform:scaleX(1)} }
            `}</style>

            {/* Top color bar */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${wqiStatus.dotColor}, #1e90ff, ${wqiStatus.dotColor})` }} />

            {/* Realistic water at bottom of card */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "42%", overflow: "hidden" }}>

              {/* Deep water gradient */}
              <div className="absolute inset-0" style={{
                background: `linear-gradient(180deg, transparent 0%, ${wqiStatus.dotColor}22 18%, ${wqiStatus.dotColor}50 60%, ${wqiStatus.dotColor}70 100%)`
              }} />

              {/* Caustic light patches */}
              {[10,28,50,68,85].map((l,i) => (
                <div key={i} className="absolute rounded-full" style={{
                  left:`${l}%`, top:`${30 + (i%3)*18}%`,
                  width: 40 + i*12, height: 8 + i*3,
                  background: `radial-gradient(ellipse, ${wqiStatus.textHex}28 0%, transparent 70%)`,
                  filter: "blur(3px)",
                  animation: `caustic ${2.2 + i*0.5}s ease-in-out infinite ${i*0.4}s`
                }} />
              ))}

              {/* Glint streaks */}
              {[18,42,70].map((l,i) => (
                <div key={i} className="absolute" style={{
                  left:`${l}%`, top:`${22 + i*20}%`,
                  width: 60, height: 2,
                  background: `linear-gradient(90deg, transparent, ${wqiStatus.textHex}80, transparent)`,
                  borderRadius: 2,
                  animation: `cglint ${1.8 + i*0.6}s ease-in-out infinite ${i*0.7}s`
                }} />
              ))}

              {/* Bubbles */}
              {[8,22,38,54,68,82].map((l,i) => (
                <div key={i} className="absolute rounded-full" style={{
                  left:`${l}%`,
                  bottom: `${4 + (i%4)*5}px`,
                  width: i%3===0 ? 7 : i%2===0 ? 5 : 3,
                  height: i%3===0 ? 7 : i%2===0 ? 5 : 3,
                  background: `radial-gradient(circle at 35% 35%, ${wqiStatus.textHex}90, ${wqiStatus.dotColor}30)`,
                  boxShadow: `0 0 4px ${wqiStatus.textHex}40, inset 0 1px 1px rgba(255,255,255,0.5)`,
                  animation: `cb ${2 + i*0.65}s ease-out infinite ${i*1.1}s`
                }} />
              ))}

              {/* Wave layer 3 — slow deep swell (background) */}
              <svg className="absolute top-0 left-0 h-full" style={{ width:"200%", animation:"cw3 18s linear infinite" }}
                viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,60 C100,40 200,80 300,60 C400,40 500,78 600,58 C700,38 800,76 900,58 C1000,40 1100,78 1200,60 C1300,42 1400,76 1600,58 L1600,120 L0,120 Z"
                  fill={wqiStatus.dotColor} opacity="0.20" />
              </svg>

              {/* Wave layer 2 — medium (midground) */}
              <svg className="absolute top-0 left-0 h-full" style={{ width:"200%", animation:"cw2 11s linear infinite" }}
                viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,48 C80,28 160,68 240,48 C320,28 400,66 480,46 C560,26 640,64 720,46 C800,28 880,64 960,46 C1040,28 1120,64 1200,46 C1280,28 1360,62 1600,46 L1600,120 L0,120 Z"
                  fill={wqiStatus.dotColor} opacity="0.30" />
              </svg>

              {/* Wave layer 1 — fast surface wave (foreground) */}
              <svg className="absolute top-0 left-0 h-full" style={{ width:"200%", animation:"cw1 7s linear infinite" }}
                viewBox="0 0 1600 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={wqiStatus.dotColor} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={wqiStatus.dotColor} stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                <path d="M0,38 C60,18 120,58 180,36 C240,14 300,54 360,34 C420,14 480,52 540,32 C600,12 660,50 720,30 C780,10 840,48 900,28 C960,8 1020,46 1080,28 C1140,10 1200,46 1260,28 C1320,10 1400,46 1600,30 L1600,120 L0,120 Z"
                  fill="url(#waveGrad)" />
              </svg>

              {/* Foam / white crest layer */}
              <svg className="absolute top-0 left-0" style={{ width:"200%", height:"28px", animation:"cfoam 7s linear infinite" }}
                viewBox="0 0 1600 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,14 C40,4 80,22 120,12 C160,2 200,20 240,12 C280,4 320,20 360,12 C400,4 440,20 480,12 C520,4 560,20 600,12 C640,4 680,20 720,12 C760,4 800,20 840,12 C880,4 920,20 960,12 C1000,4 1040,20 1080,12 C1120,4 1160,20 1200,12 C1240,4 1280,20 1320,12 C1360,4 1400,18 1440,12 C1480,6 1540,18 1600,12"
                  stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M0,18 C50,10 100,24 150,16 C200,8 250,22 300,16 C350,10 400,22 450,16 C500,10 550,22 600,16 C650,10 700,22 750,16 C800,10 850,22 900,16 C950,10 1000,22 1050,16 C1100,10 1150,22 1200,16 C1250,10 1300,22 1350,16 C1400,10 1500,20 1600,16"
                  stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>

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
                      background: "rgba(10,20,35,0.75)",
                      border: `1px solid rgba(255,255,255,0.13)`,
                      boxShadow: `0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`,
                      backdropFilter: "blur(10px)",
                    }}>
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        <span className="text-base flex-shrink-0">{paramIcons[key.split(" ")[0]] ?? "📊"}</span>
                        <span className="text-xs text-slate-300 font-medium leading-snug break-words">{key}</span>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xl font-black text-white">
                          {typeof value === "number" ? value.toFixed(2) : "N/A"}
                        </span>
                        <div className="w-16 h-0.5 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.10)" }}>
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
          <div className="flex-shrink-0 w-full lg:w-80 flex flex-col gap-3">
            {/* Map Card — terrain style matching dashboard */}
            <button
              onClick={() => navigate(`/map/${waterType === "river" ? "river" : "lake"}?lat=${marker.latitude}&lng=${marker.longitude}&zoom=15`)}
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
                    <span className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ background: wqiStatus.dotColor, boxShadow: `0 0 6px ${wqiStatus.dotColor}` }} />
                    This point
                  </div>
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    Live
                  </div>
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
                  {/* Current point — larger, glowing */}
                  <circle cx="60" cy="85" r="18" fill={wqiStatus.dotColor} opacity="0.2" />
                  <circle cx="60" cy="85" r="13" fill={wqiStatus.dotColor} />
                  <circle cx="60" cy="85" r="13" fill="none" stroke="white" strokeWidth="2.5" />
                  <text x="60" y="89" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui,sans-serif">{latestEntry?.wqi?.toFixed(0) ?? "?"}</text>
                  {/* Other points */}
                  <circle cx="120" cy="75" r="10" fill="#f97316" opacity="0.85" /><circle cx="120" cy="75" r="10" fill="none" stroke="white" strokeWidth="1.5" /><text x="120" y="79" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui,sans-serif">61</text>
                  <circle cx="175" cy="92" r="10" fill="#eab308" opacity="0.85" /><circle cx="175" cy="92" r="10" fill="none" stroke="white" strokeWidth="1.5" /><text x="175" y="96" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui,sans-serif">73</text>
                  <circle cx="225" cy="78" r="10" fill="#22c55e" opacity="0.85" /><circle cx="225" cy="78" r="10" fill="none" stroke="white" strokeWidth="1.5" /><text x="225" y="82" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui,sans-serif">88</text>
                  <circle cx="265" cy="95" r="9" fill="#3b82f6" opacity="0.85" /><circle cx="265" cy="95" r="9" fill="none" stroke="white" strokeWidth="1.5" /><text x="265" y="99" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui,sans-serif">91</text>
                  <circle cx="90" cy="145" r="9" fill="#ef4444" opacity="0.75" /><circle cx="90" cy="145" r="9" fill="none" stroke="white" strokeWidth="1.5" /><text x="90" y="149" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui,sans-serif">38</text>
                  <circle cx="200" cy="135" r="9" fill="#22c55e" opacity="0.75" /><circle cx="200" cy="135" r="9" fill="none" stroke="white" strokeWidth="1.5" /><text x="200" y="139" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui,sans-serif">82</text>
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

            {/* Compact threshold card */}
            {latestEntry?.wqi != null && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{
                background: "linear-gradient(145deg, #0c1825, #0f2035)",
                border: `1px solid ${wqiStatus.dotColor}30`,
              }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${wqiStatus.dotColor}18`, border: `1px solid ${wqiStatus.dotColor}35` }}>
                  <span className="text-sm">{latestEntry.wqi > 65 ? "↑" : "↓"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500 font-medium">Regional threshold</span>
                    <span className="text-xs font-bold" style={{ color: wqiStatus.textHex }}>{latestEntry.wqi > 65 ? "Above" : "Below"}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min((latestEntry.wqi / 100) * 100, 100)}%`,
                      background: `linear-gradient(90deg, ${wqiStatus.dotColor}, #1e90ff)`
                    }} />
                  </div>
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
              riverId={marker.riverId ?? null}
              waterType={waterType}
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

        {/* States WQI Section (Only for Lakes) */}
        {waterType === "lake" && (
          <div ref={statesRef} className="py-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: "#ffffff" }}>
                India's States
              </h2>
              <p className="text-slate-400 text-lg">
                Average Water Quality Index
              </p>
            </div>

            {/* Scrollable states grid */}
            {!statesLoading && states.length > 0 ? (
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
                  {states.map((state) => {
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

                        {/* WQI status badge — top right */}
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

                        {/* Text content — bottom */}
                        <div style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "16px 16px 14px",
                        }}>
                          {/* State name */}
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

                          {/* WQI value + coords row */}
                          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                            {/* WQI big number */}
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

                            {/* Lat/Lng */}
                            <div style={{ textAlign: "right" }}>
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

                          {/* Bottom color bar */}
                          <div style={{
                            marginTop: 10,
                            height: 2,
                            borderRadius: 2,
                            background: `linear-gradient(90deg, ${wqiStatus.color}, ${wqiStatus.color}30)`,
                            opacity: 0.7,
                          }} />
                        </div>

                        {/* Arrow icon — top left */}
                        <div style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          backdropFilter: "blur(6px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M3 11h8V3H7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 2l3 3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : statesLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-slate-400">Loading states...</div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-slate-400">No state data available</div>
              </div>
            )}
          </div>
        )}

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
    </div>
  );
}