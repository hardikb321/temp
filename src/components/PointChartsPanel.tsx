"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

interface MonthlyWqi {
  month: number;
  avg_wqi: number;
}

interface MonthlyParam {
  month: number;
  avg_value: number;
}

interface PointChartsPanelProps {
  availableYears: number[];
  year: number | null;
  onYearChange: (year: number) => void;
  lakeId: string | null;
  riverId?: string | null;
  waterType?: "lake" | "river" | string;
  lat: number;
  lng: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Distinct colors for each parameter (skip blue — that's WQI)
const PARAM_COLORS = [
  { border: "#f59e0b", bg: "rgba(245,158,11,0.12)" },   // amber
  { border: "#10b981", bg: "rgba(16,185,129,0.12)" },   // emerald
  { border: "#ec4899", bg: "rgba(236,72,153,0.12)" },   // pink
  { border: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },   // violet
  { border: "#ef4444", bg: "rgba(239,68,68,0.12)" },    // red
  { border: "#06b6d4", bg: "rgba(6,182,212,0.12)" },    // cyan
  { border: "#f97316", bg: "rgba(249,115,22,0.12)" },   // orange
  { border: "#84cc16", bg: "rgba(132,204,22,0.12)" },   // lime
];

export function PointChartsPanel({
  availableYears,
  year,
  onYearChange,
  lakeId,
  riverId,
  waterType = "lake",
  lat,
  lng,
}: PointChartsPanelProps) {
  const selectedYear = year ?? availableYears[0] ?? new Date().getFullYear();

  // Single chart canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // State
  const [wqiData, setWqiData] = useState<MonthlyWqi[]>([]);
  const [parametersData, setParametersData] = useState<Record<string, MonthlyParam[]>>({});
  // Multiple selected params (ordered for stable color assignment)
  const [activeParams, setActiveParams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch when year / marker changes
  useEffect(() => {
    const objectId = waterType === "river" ? riverId : lakeId;
    if (!objectId) return;
    setLoading(true);
    setError(null);

    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    fetch(
      `/api/${route}/marker-chart?${idKey}=${encodeURIComponent(objectId)}&lat=${lat}&lng=${lng}&year=${selectedYear}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setWqiData(json?.data?.wqi ?? []);
        setParametersData(json?.data?.parameters ?? {});
        setActiveParams([]); // reset on year change
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load chart data");
        setWqiData([]);
        setParametersData({});
      })
      .finally(() => setLoading(false));
  }, [lakeId, riverId, waterType, lat, lng, selectedYear]);

  // WQI values (sparse)
  const wqiChartValues = useMemo(() => {
    const arr: (number | null)[] = new Array(12).fill(null);
    wqiData.forEach(({ month, avg_wqi }) => {
      arr[month - 1] = parseFloat(avg_wqi.toFixed(1));
    });
    return arr;
  }, [wqiData]);

  // Build all datasets: WQI first, then each active param
  const datasets = useMemo(() => {
    const wqiDataset = {
      label: `WQI (${selectedYear})`,
      data: wqiChartValues,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.12)",
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: false,
      spanGaps: true,
      yAxisID: "y",
    };

    const paramDatasets = activeParams.map((param, idx) => {
      const color = PARAM_COLORS[idx % PARAM_COLORS.length];
      const arr: (number | null)[] = new Array(12).fill(null);
      (parametersData[param] ?? []).forEach(({ month, avg_value }) => {
        arr[month - 1] = parseFloat(avg_value.toFixed(2));
      });
      return {
        label: param,
        data: arr,
        borderColor: color.border,
        backgroundColor: color.bg,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false,
        spanGaps: true,
        yAxisID: "y1", // secondary axis so scales don't clash
      };
    });

    return [wqiDataset, ...paramDatasets];
  }, [wqiChartValues, activeParams, parametersData, selectedYear]);

  // Build / rebuild the single chart whenever datasets change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const hasParams = activeParams.length > 0;

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
            position: "left",
            min: 0,
            ticks: { color: "#3b82f6" },
            grid: { color: "rgba(161,161,170,0.15)" },
            title: { display: true, text: "WQI", color: "#3b82f6", font: { size: 11 } },
          },
          // Only show right axis when params are active
          ...(hasParams
            ? {
                y1: {
                  position: "right",
                  ticks: { color: "#a1a1aa" },
                  grid: { drawOnChartArea: false },
                  title: {
                    display: true,
                    text: activeParams.length === 1 ? activeParams[0] : "Parameters",
                    color: "#a1a1aa",
                    font: { size: 11 },
                  },
                },
              }
            : {}),
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [datasets, activeParams]);

  // Add a parameter (select handler)
  const handleParamAdd = (param: string) => {
    if (!param || activeParams.includes(param)) return;
    setActiveParams((prev) => [...prev, param]);
  };

  // Remove a parameter chip
  const handleParamRemove = (param: string) => {
    setActiveParams((prev) => prev.filter((p) => p !== param));
  };

  const availableParamKeys = Object.keys(parametersData);
  const unselectedParams = availableParamKeys.filter((k) => !activeParams.includes(k));

  return (
    <div className="space-y-4">

      {/* Year selector */}
      <div>
        <p className="text-sm font-medium text-foreground">Year</p>
        <p className="text-xs text-muted-foreground">Monthly averages for selected year</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Select year</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Combined chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Month vs WQI &amp; Parameters (hover to see values)</p>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8 animate-pulse">Loading chart…</p>
          ) : (
            <div className="h-64 w-full">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>

      {/* Parameter selector — only show after data is loaded */}
      {!loading && availableParamKeys.length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">Parameters</p>
            <p className="text-xs text-muted-foreground">Overlay parameters on the chart</p>
          </div>

          {/* Dropdown — only show params not yet active */}
          {unselectedParams.length > 0 && (
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value=""
              onChange={(e) => handleParamAdd(e.target.value)}
            >
              <option value="">Add a parameter…</option>
              {unselectedParams.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          )}

          {/* Active param chips */}
          {activeParams.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeParams.map((param, idx) => {
                const color = PARAM_COLORS[idx % PARAM_COLORS.length];
                return (
                  <span
                    key={param}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: color.bg,
                      border: `1.5px solid ${color.border}`,
                      color: color.border,
                    }}
                  >
                    {/* Colored dot matching the chart line */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color.border }}
                    />
                    {param}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleParamRemove(param)}
                      className="ml-0.5 rounded-full hover:opacity-70 transition-opacity leading-none"
                      aria-label={`Remove ${param}`}
                      style={{ color: color.border }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}