"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { X } from "lucide-react";
import type { Marker } from "./MyMap";
import type { WaterType } from "@/types";

interface HistoryEntry {
  created_at: string;
  wqi: number | null;
  parameters: Record<string, number | null>;
}

interface MonthlyWqi {
  month: number;
  avg_wqi: number;
}

interface PointDataCardProps {
  marker: Marker | null;
  waterType?: WaterType;
  onClose: () => void;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper to determine WQI status — matches PointDetailPage
function getWqiStatus(wqi: number | null | undefined): { label: string; dotColor: string } {
  if (wqi == null) return { label: "Unknown", dotColor: "#6b7280" };
  if (wqi < 40) return { label: "Poor", dotColor: "#ef4444" };
  if (wqi < 65) return { label: "Moderate", dotColor: "#eab308" };
  if (wqi < 85) return { label: "Good", dotColor: "#22c55e" };
  return { label: "Excellent", dotColor: "#06b6d4" };
}

export function PointDataCard({ marker, waterType = "lake", onClose }: PointDataCardProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wqiData, setWqiData] = useState<MonthlyWqi[]>([]);
  const [chartYear, setChartYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"chart" | "history">("chart");

  // Fetch point history when marker changes
  useEffect(() => {
    const objectId = marker?.lakeId || marker?.riverId;
    if (!objectId) {
      setHistoryEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const maxAge = 100;
    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";
    
    fetch(
      `/api/${route}/marker-history?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}&limit=${maxAge}&offset=0`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const rows: HistoryEntry[] = json?.data?.results ?? [];
        setHistoryEntries(rows);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load history");
        setHistoryEntries([]);
      })
      .finally(() => setLoading(false));
  }, [marker, waterType]);

  // Fetch chart data when marker changes
  useEffect(() => {
    const objectId = marker?.lakeId || marker?.riverId;
    if (!objectId) {
      setWqiData([]);
      setChartYear(null);
      return;
    }

    const year = new Date().getFullYear();
    setChartYear(year);

    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    fetch(
      `/api/${route}/marker-chart?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}&year=${year}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setWqiData(json?.data?.wqi ?? []);
      })
      .catch((_err: unknown) => {
        setWqiData([]);
      });
  }, [marker, waterType]);

  // Get the latest entry
  const latestEntry = historyEntries[0] ?? null;

  // Get key parameters from latest entry
  const keyParameters = useMemo(() => {
    if (!latestEntry?.parameters) return [];
    const keys = Object.keys(latestEntry.parameters);
    // Show first 4 parameters (pH, DO, BOD, Conductivity, etc.)
    return keys.slice(0, 4).map((key) => ({
      label: key,
      value: latestEntry.parameters[key],
    }));
  }, [latestEntry]);

  // Prepare WQI chart data
  const wqiChartValues = useMemo(() => {
    const arr: (number | null)[] = new Array(12).fill(null);
    wqiData.forEach(({ month, avg_wqi }) => {
      arr[month - 1] = parseFloat(avg_wqi.toFixed(1));
    });
    return arr;
  }, [wqiData]);

  // Build chart dataset
  const datasets = useMemo(
    () => [
      {
        label: `WQI (${chartYear ?? "Year"})`,
        data: wqiChartValues,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.12)",
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false,
        spanGaps: true,
      },
    ],
    [wqiChartValues, chartYear]
  );

  // Create/update chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If switching back to chart tab, resize and redraw
    if (activeTab === "chart" && chartRef.current) {
      setTimeout(() => {
        chartRef.current?.resize();
      }, 0);
      return;
    }

    // Initialize chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: { labels: MONTH_LABELS, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#a1a1aa",
              boxWidth: 12,
              padding: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#a1a1aa" },
          },
          y: {
            min: 0,
            ticks: { color: "#3b82f6" },
            grid: { color: "rgba(161,161,170,0.15)" },
            title: { display: true, text: "WQI", color: "#3b82f6", font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [datasets, wqiChartValues, activeTab]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Navigate to detail page
  const handleViewDetails = () => {
    console.log("Card clicked! Marker:", marker);
    if (marker && marker.id) {
      console.log("Storing marker data with key: point_" + marker.id);
      const markerData = JSON.stringify(marker);
      console.log("Marker data to store:", markerData);
      sessionStorage.setItem(`point_${marker.id}`, markerData);
      
      // Verify it was stored
      const verify = sessionStorage.getItem(`point_${marker.id}`);
      console.log("Verification - data stored:", verify ? "YES" : "NO");
      
      const route = `/point/${encodeURIComponent(marker.id)}`;
      console.log("Navigating to route:", route);
      navigate(route);
    } else {
      console.error("Cannot navigate - marker or marker.id is missing", {marker});
    }
  };

  if (!marker) return null;

  const latestWqi = latestEntry?.wqi ?? marker.essentialParameters?.wqi;
  const statusInfo = getWqiStatus(latestWqi);

  // Colored accent based on WQI status
  const accentColor = statusInfo.dotColor;

  return (
    <>
      <div
        className="absolute inset-0 z-30"
        onClick={handleBackdropClick}
      />
      <div
        onClick={handleViewDetails}
        className="absolute top-4 left-4 z-40 cursor-pointer"
      >
        <div
          className="w-[300px] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-card/95 backdrop-blur-md flex flex-col animate-scale-up hover:shadow-black/30 transition-shadow"
          style={{ boxShadow: `0 0 0 2px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.35)` }}
        >
          {/* Colored top accent bar */}
          <div className="h-1 w-full shrink-0" style={{ background: accentColor }} />

          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
              <span className="text-xs font-semibold text-foreground tracking-wide">Water Quality Data</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* WQI Hero */}
          <div className="flex items-center gap-3 px-3 py-2 bg-muted/20 mx-3 rounded-lg mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">WQI Index</p>
              <p className="text-2xl font-bold leading-none" style={{ color: accentColor }}>
                {latestWqi != null ? Number(latestWqi).toFixed(1) : "—"}
              </p>
            </div>
            <div
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0"
              style={{ background: `${accentColor}22`, color: accentColor }}
            >
              {statusInfo.label}
            </div>
          </div>

          {/* Coordinates + Location Info */}
          <div className="px-3 pb-2 space-y-1.5">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="truncate">
                <span className="text-foreground/60">📍</span> {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
              </span>
              {marker.lakeId && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted/40 text-[9px] font-mono">
                  ID: {marker.lakeId}
                </span>
              )}
            </div>
            {(marker.city_name || marker.state_name) && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="text-foreground/60">📍</span>
                <span>
                  {marker.city_name && <span className="text-foreground font-medium">{marker.city_name}</span>}
                  {marker.city_name && marker.state_name && <span className="mx-1">,</span>}
                  {marker.state_name && <span className="text-foreground font-medium">{marker.state_name}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Key Parameters */}
          {keyParameters.length > 0 && (
            <div className="px-3 pb-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Key Parameters</p>
              <div className="grid grid-cols-2 gap-1.5">
                {keyParameters.map((param) => (
                  <div
                    key={param.label}
                    className="rounded-md bg-muted/20 border border-border/30 px-2 py-1.5 flex justify-between items-center gap-1"
                  >
                    <p className="text-[10px] text-muted-foreground truncate">{param.label}</p>
                    <p className="text-[11px] font-semibold text-foreground shrink-0">
                      {param.value != null ? Number(param.value).toFixed(2) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex mb-2 rounded-lg bg-muted/30 p-0.5 gap-0.5">
              {(["chart", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
                  className={`flex-1 text-[10px] font-semibold py-1 rounded-md transition-all ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "chart" ? "Recent Trend" : "Point History"}
                </button>
              ))}
            </div>

            {activeTab === "chart" ? (
              loading ? (
                <div className="h-36 rounded-lg bg-muted/10 flex items-center justify-center">
                  <p className="text-[10px] text-muted-foreground animate-pulse">Loading chart…</p>
                </div>
              ) : error ? (
                <div className="h-36 rounded-lg bg-muted/10 flex items-center justify-center">
                  <p className="text-[10px] text-destructive">{error}</p>
                </div>
              ) : wqiChartValues.every((v) => v === null) ? (
                <div className="h-36 rounded-lg bg-muted/10 flex items-center justify-center">
                  <p className="text-[10px] text-muted-foreground">No trend data available</p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/10 p-1.5">
                  <div className="h-36 w-full">
                    <canvas ref={canvasRef} />
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-1.5 h-36 overflow-y-auto pr-0.5 custom-scrollbar">
                {historyEntries.length === 0 ? (
                  <div className="h-full rounded-lg bg-muted/10 flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground">No history records found.</p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {historyEntries.map((entry, idx) => (
                      <li key={idx} className="rounded-md border border-border/30 bg-muted/10 px-2.5 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${accentColor}22`, color: accentColor }}>
                            {entry.wqi != null ? Number(entry.wqi).toFixed(1) : "—"}
                          </span>
                        </div>
                        {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] pt-1 border-t border-border/20">
                            {Object.entries(entry.parameters).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="truncate flex gap-1">
                                <span className="text-muted-foreground">{k.substring(0, 8)}:</span>
                                <span className="font-medium text-foreground">{v != null ? Number(v).toFixed(2) : "—"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {latestEntry && (
            <div className="px-3 py-1.5 border-t border-border/20 bg-muted/10">
              <p className="text-[9px] text-muted-foreground text-center">
                Last updated: {new Date(latestEntry.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}