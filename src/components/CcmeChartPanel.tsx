"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

interface CcmeDataPoint {
  year: number;
  ccme_wqi: number;
  f1: number;
  f2: number;
  f3: number;
}

interface CcmeChartPanelProps {
  lakeId?: string | null;
  riverId?: string | null;
  waterType?: "lake" | "river" | string;
  lat: number;
  lng: number;
}

const PARAM_COLORS = [
  { border: "#f59e0b", bg: "rgba(245,158,11,0.12)" },   // amber (F1)
  { border: "#10b981", bg: "rgba(16,185,129,0.12)" },   // emerald (F2)
  { border: "#ec4899", bg: "rgba(236,72,153,0.12)" },   // pink (F3)
];

const PARAM_KEYS = ["f1", "f2", "f3"];
const PARAM_LABELS: Record<string, string> = {
  f1: "F1 (Scope)",
  f2: "F2 (Frequency)",
  f3: "F3 (Amplitude)",
};

export function CcmeChartPanel({
  lakeId,
  riverId,
  waterType = "lake",
  lat,
  lng,
}: CcmeChartPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const [ccmeData, setCcmeData] = useState<CcmeDataPoint[]>([]);
  const [activeParams, setActiveParams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const objectId = waterType === "river" ? riverId : lakeId;
    if (!objectId) return;

    setLoading(true);
    setError(null);

    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";
    
    // For CCME chart, we hit the new route
    const url = `/api/${route}/ccme-chart?${idKey}=${encodeURIComponent(objectId)}&lat=${lat}&lng=${lng}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json) => {
        const data = json?.data?.data ?? json?.data ?? [];
        setCcmeData(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load CCME chart data.");
        setCcmeData([]);
      })
      .finally(() => setLoading(false));
  }, [lakeId, riverId, waterType, lat, lng]);

  const yearsLabels = useMemo(() => ccmeData.map(d => d.year.toString()), [ccmeData]);

  const wqiChartValues = useMemo(() => ccmeData.map(d => parseFloat(d.ccme_wqi.toFixed(1))), [ccmeData]);

  const datasets = useMemo(() => {
    const wqiDataset = {
      label: "CCME WQI",
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
      const arr = ccmeData.map(d => parseFloat((d[param as keyof CcmeDataPoint] as number).toFixed(1)));
      return {
        label: PARAM_LABELS[param] || param.toUpperCase(),
        data: arr,
        borderColor: color.border,
        backgroundColor: color.bg,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false,
        spanGaps: true,
        yAxisID: "y1",
      };
    });

    return [wqiDataset, ...paramDatasets];
  }, [wqiChartValues, activeParams, ccmeData]);

  // Build chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const hasParams = activeParams.length > 0;

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: { labels: yearsLabels, datasets },
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
            max: 100, // CCME WQI is out of 100
            ticks: { color: "#3b82f6" },
            grid: { color: "rgba(161,161,170,0.15)" },
            title: { display: true, text: "CCME WQI Score", color: "#3b82f6", font: { size: 11 } },
          },
          ...(hasParams
            ? {
                y1: {
                  position: "right",
                  min: 0,
                  max: 100,
                  ticks: { color: "#a1a1aa" },
                  grid: { drawOnChartArea: false },
                  title: {
                    display: true,
                    text: activeParams.length === 1 ? PARAM_LABELS[activeParams[0]] : "Parameter Scores",
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
  }, [datasets, activeParams, yearsLabels]);

  const handleParamAdd = (param: string) => {
    if (!param || activeParams.includes(param)) return;
    setActiveParams((prev) => [...prev, param]);
  };

  const handleParamRemove = (param: string) => {
    setActiveParams((prev) => prev.filter((p) => p !== param));
  };

  const unselectedParams = PARAM_KEYS.filter((k) => !activeParams.includes(k));

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Combined chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Yearly CCME WQI &amp; Overlay Parameters (hover to see values)</p>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8 animate-pulse">Loading CCME chart…</p>
          ) : ccmeData.length === 0 && !error ? (
            <p className="text-xs text-muted-foreground text-center py-8">No CCME chart data available.</p>
          ) : (
            <div className="h-64 w-full">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>

      {/* Parameter selector */}
      {!loading && ccmeData.length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">Parameters</p>
            <p className="text-xs text-muted-foreground">Overlay parameters on the chart</p>
          </div>

          {unselectedParams.length > 0 && (
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value=""
              onChange={(e) => handleParamAdd(e.target.value)}
            >
              <option value="">Add a parameter…</option>
              {unselectedParams.map((key) => (
                <option key={key} value={key}>{PARAM_LABELS[key]}</option>
              ))}
            </select>
          )}

          {activeParams.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeParams.map((param, idx) => {
                const color = PARAM_COLORS[idx % PARAM_COLORS.length];
                return (
                  <div
                    key={param}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border"
                    style={{
                      borderColor: color.border,
                      backgroundColor: color.bg,
                      color: "#e4e4e7" // text-zinc-200
                    }}
                  >
                    <span>{PARAM_LABELS[param] || param.toUpperCase()}</span>
                    <button
                      onClick={() => handleParamRemove(param)}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/20"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10" height="10" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
