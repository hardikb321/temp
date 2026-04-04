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

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 40%, #0d1117 100%)" }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Top bar: location + parameter pills */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 transition-colors hover:text-white"
              style={{ background: "#1a2235", border: "1px solid #1e2a3a" }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="#64748b" strokeWidth="2" /><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#64748b" strokeWidth="2" /></svg>
              <span className="text-white font-semibold">Lake {marker.lakeId}</span>
              <span className="text-slate-500">·</span>
              <span>{marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</span>
            </div>
          </div>
          {/* Parameter filter pills */}
          <div className="flex flex-wrap gap-2">
            {["WQI", "pH", "DO", "BOD", "Turbidity", "TDS"].map((p, i) => (
              <button key={p} className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={i === 0
                  ? { background: "#1e90ff", color: "#fff", border: "1px solid #1e90ff" }
                  : { background: "transparent", color: "#64748b", border: "1px solid #1e2a3a" }
                }>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN ROW: Hero card left + Map card right */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">

          {/* Hero WQI Card — inspired by AQI.in's live AQI card */}
          <div className="flex-1 rounded-2xl overflow-hidden relative" style={{
            background: "linear-gradient(145deg, #0f1923 0%, #1a2a3a 60%, #0f1f2e 100%)",
            border: "1px solid #1e3a5f",
            boxShadow: "0 0 40px rgba(30,144,255,0.1)"
          }}>
            {/* Subtle glow blob */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${wqiStatus.dotColor}22 0%, transparent 70%)` }} />

            <div className="relative p-6 md:p-8">
              {/* Live badge */}
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: wqiStatus.dotColor }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: wqiStatus.textHex }}>Live WQI</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-start gap-8">
                {/* WQI value + status */}
                <div className="min-w-[200px]">
                  <div className="text-7xl font-black tracking-tight mb-2" style={{ color: wqiStatus.textHex }}>
                    {latestEntry?.wqi?.toFixed(1) ?? "N/A"}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{wqiStatus.label}</div>
                  <p className="text-xs text-slate-500 mb-4">
                    {latestEntry?.created_at
                      ? `Recorded: ${new Date(latestEntry.created_at).toLocaleString()}`
                      : "No recent data"}
                  </p>
                  <WqiScaleBar wqi={latestEntry?.wqi ?? null} />
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px self-stretch" style={{ background: "#1e2a3a" }} />

                {/* Parameters grid — like AQI.in's PM2.5 / PM10 etc. */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {params.slice(0, 6).map(([key, value]) => (
                    <div key={key} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2a3a" }}>
                      <div className="text-sm text-slate-400 flex items-center gap-1.5">
                        <span>{paramIcons[key.split(" ")[0]] ?? "📊"}</span>
                        <span className="truncate">{key}</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {typeof value === "number" ? value.toFixed(2) : "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Map Card — right side, like AQI.in */}
          <div className="flex-shrink-0 w-full lg:w-64">
            <button
              onClick={() => navigate(`/map/lake`)}
              className="group w-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              style={{
                background: "linear-gradient(145deg, #0f1923, #1a2a3a)",
                border: "1px solid #1e3a5f",
                boxShadow: "0 0 30px rgba(30,144,255,0.12)",
              }}
            >
              {/* Map preview */}
              <div className="relative h-44 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg">
                  <rect width="260" height="180" fill="#0d1b2a" />
                  {[30,60,90,120,150].map(y => <line key={y} x1="0" y1={y} x2="260" y2={y} stroke="#1a2a3a" strokeWidth="0.5" />)}
                  {[50,100,150,200].map(x => <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#1a2a3a" strokeWidth="0.5" />)}
                  <path d="M 15 70 Q 65 50 110 75 T 245 65" stroke="#1e90ff" strokeWidth="2" fill="none" opacity="0.6" strokeDasharray="5 3" />
                  <path d="M 10 120 Q 60 105 110 125 T 250 115" stroke="#00bcd4" strokeWidth="1.5" fill="none" opacity="0.4" />
                  <circle cx="50" cy="75" r="10" fill="#ef4444" opacity="0.9" />
                  <text x="50" y="79" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">{latestEntry?.wqi?.toFixed(0) ?? "?"}</text>
                  <circle cx="105" cy="65" r="9" fill="#eab308" opacity="0.85" />
                  <text x="105" y="69" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">61</text>
                  <circle cx="155" cy="80" r="9" fill="#22c55e" opacity="0.85" />
                  <text x="155" y="84" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">82</text>
                  <circle cx="205" cy="68" r="8" fill="#3b82f6" opacity="0.85" />
                  <text x="205" y="72" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">91</text>
                  <circle cx="80" cy="125" r="8" fill="#ef4444" opacity="0.75" />
                  <text x="80" y="129" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">35</text>
                </svg>
                {/* Label overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(30,144,255,0.2)", border: "1px solid rgba(30,144,255,0.4)", color: "#60a5fa" }}>
                  <Map className="w-3 h-3" /> WQI Map
                </div>
                <div className="absolute top-2 right-2 p-1 rounded-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Maximize2 className="w-3 h-3 text-slate-300" />
                </div>
                {/* Current point highlight dot */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs" style={{ color: "#94a3b8" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: wqiStatus.dotColor }} />
                  This point
                </div>
              </div>
              {/* Footer */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-semibold">Open Full Map</div>
                  <div className="text-slate-500 text-xs">All monitoring points</div>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center group-hover:translate-x-0.5 transition-transform" style={{ background: "#1e90ff" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </button>

            {/* Comparison info — like AQI.in's "1.07x below" card */}
            {latestEntry?.wqi != null && (
              <div className="mt-3 rounded-xl p-4" style={{ background: "#1a2235", border: "1px solid #1e2a3a" }}>
                <div className="text-xs text-slate-500 mb-1">Compared to average</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold" style={{ color: wqiStatus.textHex }}>
                    {latestEntry.wqi > 65 ? "Above" : "Below"}
                  </span>
                  <span className="text-slate-400 text-xs">regional threshold</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid #1e2a3a" }}>
          {(["chart", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-3 text-sm font-semibold transition-colors border-b-2 capitalize"
              style={activeTab === tab
                ? { color: "#1e90ff", borderColor: "#1e90ff" }
                : { color: "#64748b", borderColor: "transparent" }
              }
            >
              {tab === "chart" ? "Year Trend Chart" : "Point History"}
            </button>
          ))}
        </div>

        {/* Chart Tab */}
        {activeTab === "chart" && (
          <div className="rounded-2xl p-6" style={{ background: "#161b27", border: "1px solid #1e2a3a" }}>
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
          <div className="rounded-2xl overflow-hidden" style={{ background: "#161b27", border: "1px solid #1e2a3a" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1e2a3a" }}>
              <div>
                <h3 className="text-white font-semibold">Point History</h3>
                <p className="text-slate-500 text-xs mt-0.5">{historyEntries.length} records found</p>
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <p className="text-slate-400 text-sm p-4">Loading history...</p>
              ) : error ? (
                <p className="text-red-400 text-sm p-4">{error}</p>
              ) : historyEntries.length === 0 ? (
                <p className="text-slate-500 text-sm p-4">No history available</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {historyEntries.map((entry, idx) => {
                    const isExpanded = expandedHistoryIdx === idx;
                    const st = getWqiStatus(entry.wqi);
                    return (
                      <div
                        key={idx}
                        className="rounded-xl cursor-pointer transition-colors"
                        style={{ background: "#1a2235", border: "1px solid #1e2a3a" }}
                        onClick={() => setExpandedHistoryIdx(isExpanded ? null : idx)}
                      >
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.dotColor }} />
                            <div>
                              <p className="text-white text-sm font-medium">
                                {new Date(entry.created_at).toLocaleString()}
                              </p>
                              {entry.wqi !== null && (
                                <p className="text-xs mt-0.5" style={{ color: st.textHex }}>
                                  WQI: {entry.wqi.toFixed(1)} · {st.label}
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{ color: "#475569" }}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                        {isExpanded && entry.parameters && (
                          <div className="px-5 pb-5 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {Object.entries(entry.parameters).map(([key, value]) => (
                              <div key={key} className="rounded-lg p-3" style={{ background: "#0f1923", border: "1px solid #1e2a3a" }}>
                                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1">
                                  <span>{paramIcons[key.split(" ")[0]] ?? "📊"}</span>
                                  <span className="truncate">{key}</span>
                                </p>
                                <p className="text-white font-bold">
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