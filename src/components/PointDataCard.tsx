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
  }, [datasets, wqiChartValues]);

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
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <Card className="w-full max-w-md shadow-2xl animate-scale-up">
        {/* Header with close button */}
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Water Quality Data</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Latest WQI Section */}
          <div className="rounded-lg border-2 border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Latest Water Quality Index</p>
            <div className="text-4xl font-bold text-primary mb-2">
              {latestWqi != null ? Number(latestWqi).toFixed(1) : "—"}
            </div>
            <div
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                statusInfo.bgColor
              } ${statusInfo.color}`}
            >
              {statusInfo.label}
            </div>
          </div>

          {/* Location */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Coordinates:</span> {marker.latitude.toFixed(4)},
              {marker.longitude.toFixed(4)}
            </p>
            {marker.lakeId && (
              <p>
                <span className="font-medium text-foreground">Lake ID:</span> {marker.lakeId}
              </p>
            )}
          </div>

          {/* Key Parameters Section */}
          {keyParameters.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Key Parameters (Latest)</p>
              <div className="grid grid-cols-2 gap-3">
                {keyParameters.map((param) => (
                  <div
                    key={param.label}
                    className="rounded-lg border border-border bg-muted/50 p-3 text-center"
                  >
                    <p className="text-xs text-muted-foreground truncate">{param.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {param.value != null ? Number(param.value).toFixed(2) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div>
            <p className="text-sm font-medium mb-2">Recent Year Trend</p>
            {loading ? (
  <div className="h-48 rounded-lg border border-border bg-muted/10 flex items-center justify-center">
    <p className="text-xs text-muted-foreground animate-pulse">Loading chart…</p>
  </div>
) : error ? (
  <div className="h-48 rounded-lg border border-border bg-muted/10 flex items-center justify-center">
    <p className="text-xs text-destructive">{error}</p>
  </div>
) : (
  <div className="rounded-lg border border-border bg-muted/10 p-3">
    <div className="h-48 w-full">
      <canvas ref={canvasRef} />
    </div>
  </div>
)}
          </div>

          {/* Last Updated */}
          {latestEntry && (
            <p className="text-xs text-muted-foreground text-center">
              Last updated: {new Date(latestEntry.created_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
