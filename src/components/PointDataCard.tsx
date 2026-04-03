"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Marker } from "./MyMap";

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
  onClose: () => void;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper to determine WQI status
function getWqiStatus(wqi: number | null | undefined): { label: string; color: string; bgColor: string } {
  if (wqi == null) return { label: "Unknown", color: "text-gray-500", bgColor: "bg-gray-100" };
  if (wqi < 40) return { label: "Bad", color: "text-red-600", bgColor: "bg-red-100" };
  if (wqi < 65) return { label: "Average", color: "text-yellow-600", bgColor: "bg-yellow-100" };
  return { label: "Good", color: "text-green-600", bgColor: "bg-green-100" };
}

export function PointDataCard({ marker, onClose }: PointDataCardProps) {
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
    if (!marker?.lakeId) {
      setHistoryEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const maxAge = 100;
    fetch(
      `/api/lakes/marker-history?lake_id=${encodeURIComponent(marker.lakeId)}&lat=${marker.latitude}&lng=${marker.longitude}&limit=${maxAge}&offset=0`
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
  }, [marker]);

  // Fetch chart data when marker changes
  useEffect(() => {
    if (!marker?.lakeId) {
      setWqiData([]);
      setChartYear(null);
      return;
    }

    const year = new Date().getFullYear();
    setChartYear(year);

    fetch(
      `/api/lakes/marker-chart?lake_id=${encodeURIComponent(marker.lakeId)}&lat=${marker.latitude}&lng=${marker.longitude}&year=${year}`
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
  }, [marker]);

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

  if (!marker) return null;

  const latestWqi = latestEntry?.wqi ?? marker.essentialParameters?.wqi;
  const statusInfo = getWqiStatus(latestWqi);

  return (
    <>
      <div
        className="absolute inset-0 z-30"
        onClick={handleBackdropClick}
      />
      <Card className="absolute top-4 left-4 z-40 w-[300px] max-h-[calc(100%-2rem)] flex flex-col shadow-2xl animate-scale-up border-border/50 bg-card/95 backdrop-blur-sm shadow-black/20">
        {/* Header with close button */}
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4 shrink-0">
          <CardTitle className="text-base font-semibold">Water Quality Data</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto flex-1 px-4 pb-4">
          {/* Latest WQI Section */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Latest Water Quality Index</p>
            <div className="text-3xl font-bold text-primary flex flex-col items-center justify-center gap-1.5">
              {latestWqi != null ? Number(latestWqi).toFixed(1) : "—"}
              <div
                className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                  statusInfo.bgColor
                } ${statusInfo.color}`}
              >
                {statusInfo.label}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="text-[10px] text-muted-foreground space-y-1">
            <p className="truncate">
              <span className="font-medium text-foreground">Coordinates:</span> {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
            </p>
            {marker.lakeId && (
              <p className="truncate">
                <span className="font-medium text-foreground">Lake ID:</span> {marker.lakeId}
              </p>
            )}
          </div>

          {/* Key Parameters Section */}
          {keyParameters.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Key Parameters (Latest)</p>
              <div className="grid grid-cols-2 gap-2">
                {keyParameters.map((param) => (
                  <div
                    key={param.label}
                    className="rounded-md border border-border/50 bg-muted/20 p-2 text-center"
                  >
                    <p className="text-[10px] text-muted-foreground truncate" title={param.label}>{param.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {param.value != null ? Number(param.value).toFixed(2) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart / History Tabs */}
          <div className="pt-1">
            <div className="flex border-b border-border/50 mb-3">
              <button
                type="button"
                className={`flex-1 text-[11px] font-semibold py-1.5 uppercase tracking-wider transition-colors ${
                  activeTab === "chart"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("chart")}
              >
                Recent Trend
              </button>
              <button
                type="button"
                className={`flex-1 text-[11px] font-semibold py-1.5 uppercase tracking-wider transition-colors ${
                  activeTab === "history"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("history")}
              >
                Point History
              </button>
            </div>

            {activeTab === "chart" ? (
              loading ? (
                <div className="h-36 rounded-lg border border-border/50 bg-muted/10 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground animate-pulse">Loading chart…</p>
                </div>
              ) : error ? (
                <div className="h-36 rounded-lg border border-border/50 bg-muted/10 flex items-center justify-center">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              ) : wqiChartValues.every((v) => v === null) ? (
                <div className="h-36 rounded-lg border border-border/50 bg-muted/10 flex items-center justify-center">
                  <p className="text-[10px] text-muted-foreground">No trend data available</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-muted/10 p-2">
                  <div className="h-36 w-full">
                    <canvas ref={canvasRef} />
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2 h-44 overflow-y-auto pr-1 custom-scrollbar">
                {historyEntries.length === 0 ? (
                  <div className="h-full rounded-lg border border-border/50 bg-muted/10 flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground">No history records found.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {historyEntries.map((entry, idx) => (
                      <li key={idx} className="rounded-md border border-border/50 bg-muted/10 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                          <span className="font-semibold text-primary px-2 py-0.5 rounded bg-primary/10">
                            WQI {entry.wqi != null ? Number(entry.wqi).toFixed(1) : "—"}
                          </span>
                        </div>
                        {entry.parameters && Object.keys(entry.parameters).length > 0 && (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] pt-1 border-t border-border/20">
                            {Object.entries(entry.parameters).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="truncate">
                                <span className="text-muted-foreground">{k.substring(0, 8)}:</span>{" "}
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

          {/* Last Updated */}
          {latestEntry && (
            <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/20">
              Last updated: {new Date(latestEntry.created_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
