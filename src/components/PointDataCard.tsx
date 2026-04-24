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
  basin?: string | null;
  sub_basin?: string | null;
}

interface MonthlyWqi {
  month: number;
  avg_wqi: number;
}

interface CcmeData {
  ccme_wqi: number | null;
  f1: number | null;
  f2: number | null;
  f3: number | null;
}

interface PointDataCardProps {
  marker: Marker | null;
  waterType?: WaterType;
  onClose: () => void;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWqiStatus(wqi: number | null | undefined): { label: string; dotColor: string } {
  if (wqi == null) return { label: "Unknown", dotColor: "#6b7280" };
  if (wqi <= 50) return { label: "Excellent", dotColor: "#3b82f6" };
  if (wqi <= 100) return { label: "Good", dotColor: "#22c55e" };
  if (wqi <= 150) return { label: "Moderate", dotColor: "#eab308" };
  if (wqi <= 200) return { label: "Poor", dotColor: "#f97316" };
  return { label: "Extremely poor", dotColor: "#ef4444" };
}

function getCcmeStatus(wqi: number | null | undefined): { label: string; dotColor: string } {
  if (wqi == null) return { label: "Unknown", dotColor: "#6b7280" };
  if (wqi < 50) return { label: "Poor", dotColor: "#ef4444" };
  if (wqi < 65) return { label: "Marginal", dotColor: "#f97316" };
  if (wqi < 80) return { label: "Fair", dotColor: "#eab308" };
  if (wqi < 95) return { label: "Good", dotColor: "#22c55e" };
  return { label: "Excellent", dotColor: "#1e3a8a" };
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
  const [wqiType, setWqiType] = useState<"standard" | "ccme">("standard");
  const [ccmeData, setCcmeData] = useState<CcmeData | null>(null);
  const [loadingCcme, setLoadingCcme] = useState(false);
  const [ccmeError, setCcmeError] = useState<string | null>(null);

  useEffect(() => {
    const objectId = marker?.lakeId || marker?.riverId;
    if (!objectId) { return; }

    setLoading(true);
    setError(null);

    const maxAge = 100;
    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    let url = `/api/${route}/marker-history?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}&limit=${maxAge}&offset=0`;
    if (wqiType === "ccme") {
      url = "";
    }

    if (!url) {
      setHistoryEntries([]);
      setError("CCME data endpoint not configured yet.");
      setLoading(false);
      return;
    }

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const rows: HistoryEntry[] = json?.data?.results ?? [];
        console.log("📦 Raw API response:", json);
  console.log("📋 History rows:", rows);
  console.log("🌊 First entry basin/sub_basin:", {
    basin: rows[0]?.basin,
    sub_basin: rows[0]?.sub_basin,
  });
        setHistoryEntries(rows);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load history");
        setHistoryEntries([]);
      })
      .finally(() => setLoading(false));
  }, [marker, waterType, wqiType]);

  useEffect(() => {
    const objectId = marker?.lakeId || marker?.riverId;
    if (!objectId) { return; }

    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    if (wqiType === "ccme") {
      setLoadingCcme(true);
      setCcmeError(null);
      fetch(`/api/${route}/latest-ccme?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load CCME data");
          return r.json();
        })
        .then((json) => {
          setCcmeData({
            ccme_wqi: json?.data?.ccme_wqi ?? null,
            f1: json?.data?.f1 ?? null,
            f2: json?.data?.f2 ?? null,
            f3: json?.data?.f3 ?? null,
          });
        })
        .catch((err) => {
          setCcmeError(err instanceof Error ? err.message : "Error fetching CCME data");
          setCcmeData(null);
        })
        .finally(() => setLoadingCcme(false));
      return;
    }

    fetch(`/api/${route}/marker-years?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch years");
        return r.json();
      })
      .then((json) => {
        const years: number[] = json?.data?.length ? json.data : [];
        if (years.length > 0) {
          years.sort((a, b) => b - a);
          const year = years[0];
          setChartYear(year);

          fetch(`/api/${route}/marker-chart?${idKey}=${encodeURIComponent(objectId)}&lat=${marker.latitude}&lng=${marker.longitude}&year=${year}`)
            .then((r) => r.json())
            .then((jsonChart) => setWqiData(jsonChart?.data?.wqi ?? []))
            .catch(() => setWqiData([]));
        }
      })
      .catch(() => {
        setChartYear(null);
        setWqiData([]);
      });
  }, [marker, waterType, wqiType]);

  const latestEntry = historyEntries[0] ?? null;

  const keyParameters = useMemo(() => {
    if (!latestEntry?.parameters) return [];
    const keys = Object.keys(latestEntry.parameters);
    return keys.slice(0, 4).map((key) => ({
      label: key,
      value: latestEntry.parameters[key],
    }));
  }, [latestEntry]);

  const wqiChartValues = useMemo(() => {
    const arr: (number | null)[] = new Array(12).fill(null);
    wqiData.forEach(({ month, avg_wqi }) => {
      if (avg_wqi != null) {
        arr[month - 1] = parseFloat(Number(avg_wqi).toFixed(1));
      }
    });
    return arr;
  }, [wqiData]);

  const datasets = useMemo(
    () => [
      {
        label: `${wqiType === "ccme" ? "CCME " : ""}WQI (${chartYear ?? "Year"})`,
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
    [wqiChartValues, chartYear, wqiType]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activeTab === "chart" && chartRef.current) {
      setTimeout(() => {
        chartRef.current?.resize();
      }, 0);
      return;
    }

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleViewDetails = () => {
    console.log("Card clicked! Marker:", marker);
    if (marker && marker.id) {
      console.log("Storing marker data with key: point_" + marker.id);
      const markerData = JSON.stringify(marker);
      console.log("Marker data to store:", markerData);
      sessionStorage.setItem(`point_${marker.id}`, markerData);

      const verify = sessionStorage.getItem(`point_${marker.id}`);
      console.log("Verification - data stored:", verify ? "YES" : "NO");

      const route = `/point/${encodeURIComponent(marker.id)}`;
      console.log("Navigating to route:", route);
      navigate(route);
    } else {
      console.error("Cannot navigate - marker or marker.id is missing", { marker });
    }
  };

  if (!marker) return null;

  const latestWqi = wqiType === "ccme"
    ? ccmeData?.ccme_wqi
    : (latestEntry?.wqi ?? marker.essentialParameters?.wqi);
  const statusInfo = wqiType === "ccme" ? getCcmeStatus(latestWqi) : getWqiStatus(latestWqi);
  const accentColor = statusInfo.dotColor;

  return (
    <>
      <div
        className="absolute inset-0 z-30"
        onClick={handleBackdropClick}
      />
      <div className="absolute top-4 left-4 z-40">
        <div
          className="w-75 max-h-[calc(100svh-18rem)] rounded-xl overflow-y-auto shadow-2xl border border-white/10 bg-card/95 backdrop-blur-md flex flex-col animate-scale-up hover:shadow-black/30 transition-shadow custom-scrollbar"
          style={{ boxShadow: `0 0 0 2px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.35)` }}
        >
          {/* Colored top accent bar */}
          <div className="h-1 w-full shrink-0" style={{ background: accentColor }} />

          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={handleViewDetails}>
              <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
              <span className="text-xs font-semibold text-foreground tracking-wide hover:underline hover:text-primary transition-colors pr-2">
                Water Quality Data (Click for details)
              </span>
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
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">WQI Index</p>
                <select
                  className="text-[9px] bg-card border border-border/50 rounded px-1 py-0.5 text-muted-foreground outline-none cursor-pointer"
                  value={wqiType}
                  onChange={(e) => {
                    const val = e.target.value as "standard" | "ccme";
                    setWqiType(val);
                    if (val === "ccme") setActiveTab("chart");
                  }}
                >
                  <option value="standard">Standard</option>
                  <option value="ccme">CCME</option>
                </select>
              </div>
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
            {/* Coordinates + ID */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="truncate">
                <span className="text-foreground/60">📍</span> {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
              </span>
              {(marker.lakeId || marker.riverId) && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted/40 text-[9px] font-mono">
                  ID: {marker.lakeId || marker.riverId}
                </span>
              )}
            </div>

            {/* City / State */}
            {(marker.city_name || marker.state_name) && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="text-foreground/60">📍</span>
                <span>
                  {marker.city_name && (
                    <span className="text-foreground font-medium">{marker.city_name}</span>
                  )}
                  {marker.city_name && marker.state_name && (
                    <span className="mx-1">,</span>
                  )}
                  {marker.state_name && (
                    <span className="text-foreground font-medium">{marker.state_name}</span>
                  )}
                </span>
              </div>
            )}
            
            {/* Basin / Sub-basin — rivers only */}
            {waterType === "river" && (latestEntry?.basin || latestEntry?.sub_basin) && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="text-foreground/60">🌊</span>
                <span>
                  {latestEntry.basin && (
                    <>
                      <span className="text-muted-foreground">Basin: </span>
                      <span className="text-foreground font-medium">{latestEntry.basin}</span>
                    </>
                  )}
                  {latestEntry.basin && latestEntry.sub_basin && (
                    <span className="mx-1">·</span>
                  )}
                  {latestEntry.sub_basin && (
                    <>
                      <span className="text-muted-foreground">Sub-basin: </span>
                      <span className="text-foreground font-medium">{latestEntry.sub_basin}</span>
                    </>
                  )}
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
          <div className="px-3 pb-3">
            <div className="flex mb-2 rounded-lg bg-muted/30 p-0.5 gap-0.5">
              {(["chart", "history"] as const)
                .filter((tab) => wqiType !== "ccme" || tab !== "history")
                .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
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

            {wqiType === "ccme" ? (
              <div className="rounded-lg bg-muted/10 p-3 flex flex-col gap-3 min-h-36">
                {loadingCcme ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground animate-pulse">Loading CCME data…</p>
                  </div>
                ) : ccmeError ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] text-destructive text-center">{ccmeError}</p>
                  </div>
                ) : !ccmeData || ccmeData.ccme_wqi == null ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground text-center">No CCME data available</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/20 border border-border/30 rounded py-1.5 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase">F1 (Scope)</span>
                        <span className="text-[11px] font-semibold text-foreground">
                          {ccmeData.f1 != null ? Number(ccmeData.f1).toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="bg-muted/20 border border-border/30 rounded py-1.5 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase">F2 (Frequency)</span>
                        <span className="text-[11px] font-semibold text-foreground">
                          {ccmeData.f2 != null ? Number(ccmeData.f2).toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="bg-muted/20 border border-border/30 rounded py-1.5 flex flex-col justify-center">
                        <span className="text-[9px] text-muted-foreground uppercase">F3 (Amplitude)</span>
                        <span className="text-[11px] font-semibold text-foreground">
                          {ccmeData.f3 != null ? Number(ccmeData.f3).toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className="flex justify-between items-end mb-1 px-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground">CCME Scale</span>
                        <span className="text-[10px] font-bold" style={{ color: getCcmeStatus(ccmeData.ccme_wqi).dotColor }}>
                          {Number(ccmeData.ccme_wqi).toFixed(1)} / 100
                        </span>
                      </div>

                      {/* CCME Progress Bar */}
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex relative">
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-white border border-black z-10 rounded-sm"
                          style={{ left: `calc(${Math.min(Math.max(ccmeData.ccme_wqi, 0), 100)}% - 2px)` }}
                        />
                        <div className="h-full w-[50%]" style={{ backgroundColor: "#ef4444" }} title="Poor (0-49)" />
                        <div className="h-full w-[15%]" style={{ backgroundColor: "#f97316" }} title="Marginal (50-64)" />
                        <div className="h-full w-[15%]" style={{ backgroundColor: "#eab308" }} title="Fair (65-79)" />
                        <div className="h-full w-[15%]" style={{ backgroundColor: "#22c55e" }} title="Good (80-94)" />
                        <div className="h-full w-[5%]" style={{ backgroundColor: "#1e3a8a" }} title="Excellent (95-100)" />
                      </div>
                      <div className="flex justify-between mt-1 px-1 opacity-70">
                        <span className="text-[8px] text-muted-foreground w-[50%]">Poor</span>
                        <span className="text-[8px] text-muted-foreground w-[15%] text-center">Marg.</span>
                        <span className="text-[8px] text-muted-foreground w-[15%] text-center">Fair</span>
                        <span className="text-[8px] text-muted-foreground w-[15%] text-center">Good</span>
                        <span className="text-[8px] text-muted-foreground w-[5%] text-right">Exc.</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === "chart" ? (
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
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: `${accentColor}22`, color: accentColor }}
                          >
                            {entry.wqi != null ? Number(entry.wqi).toFixed(1) : "—"}
                          </span>
                        </div>
                        {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] pt-1 border-t border-border/20">
                            {Object.entries(entry.parameters).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="truncate flex gap-1">
                                <span className="text-muted-foreground">{k.substring(0, 8)}:</span>
                                <span className="font-medium text-foreground">
                                  {v != null ? Number(v).toFixed(2) : "—"}
                                </span>
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