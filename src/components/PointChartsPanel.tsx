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
  lat: number;
  lng: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function PointChartsPanel({
  availableYears,
  year,
  onYearChange,
  lakeId,
  lat,
  lng,
}: PointChartsPanelProps) {
  const selectedYear = year ?? availableYears[0] ?? new Date().getFullYear();

  // ── WQI chart ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // ── Parameter chart ──
  const paramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramChartRef = useRef<Chart | null>(null);

  // ── State ──
  const [wqiData, setWqiData] = useState<MonthlyWqi[]>([]);
  const [parametersData, setParametersData] = useState<Record<string, MonthlyParam[]>>({});
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch chart data when year / marker changes ──
  useEffect(() => {
    if (!lakeId) return;
    setLoading(true);
    setError(null);

    fetch(
      `/api/lakes/marker-chart?lake_id=${encodeURIComponent(lakeId)}&lat=${lat}&lng=${lng}&year=${selectedYear}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setWqiData(json?.data?.wqi ?? []);
        setParametersData(json?.data?.parameters ?? {});
        setSelectedParam(null); // reset param selection on year change
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load chart data");
        setWqiData([]);
        setParametersData({});
      })
      .finally(() => setLoading(false));
  }, [lakeId, lat, lng, selectedYear]);

  // ── WQI chart values (sparse — null for months with no data) ──
  const wqiChartValues = useMemo(() => {
    const arr: (number | null)[] = new Array(12).fill(null);
    wqiData.forEach(({ month, avg_wqi }) => {
      arr[month - 1] = parseFloat(avg_wqi.toFixed(1));
    });
    return arr;
  }, [wqiData]);

  // ── Parameter chart values ──
  const paramChartValues = useMemo(() => {
    if (!selectedParam || !parametersData[selectedParam]) return new Array(12).fill(null);
    const arr: (number | null)[] = new Array(12).fill(null);
    parametersData[selectedParam].forEach(({ month, avg_value }) => {
      arr[month - 1] = parseFloat(avg_value.toFixed(2));
    });
    return arr;
  }, [selectedParam, parametersData]);

  // ── Build WQI chart ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: MONTH_LABELS,
        datasets: [{
          label: `WQI (${selectedYear})`,
          data: wqiChartValues,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.15)",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `WQI: ${ctx.parsed.y}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#a1a1aa" } },
          y: {
            min: 0,
            ticks: { color: "#a1a1aa" },
            grid: { color: "rgba(161,161,170,0.15)" },
            title: { display: true, text: "WQI", color: "#a1a1aa" },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [wqiChartValues, selectedYear]);

  // ── Build parameter chart ──
  useEffect(() => {
    const canvas = paramCanvasRef.current;
    if (!canvas || !selectedParam) return;
    if (paramChartRef.current) { paramChartRef.current.destroy(); paramChartRef.current = null; }

    paramChartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: MONTH_LABELS,
        datasets: [{
          label: selectedParam,
          data: paramChartValues,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.15)",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${selectedParam}: ${ctx.parsed.y}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#a1a1aa" } },
          y: {
            ticks: { color: "#a1a1aa" },
            grid: { color: "rgba(161,161,170,0.15)" },
            title: { display: true, text: selectedParam, color: "#a1a1aa" },
          },
        },
      },
    });

    return () => { paramChartRef.current?.destroy(); paramChartRef.current = null; };
  }, [paramChartValues, selectedParam]);

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
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* WQI chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Month vs WQI (hover to see values)</p>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8 animate-pulse">Loading chart…</p>
          ) : (
            <div className="h-56 w-full">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>

      {/* Parameter chart */}
      {!loading && Object.keys(parametersData).length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">Parameter</p>
            <p className="text-xs text-muted-foreground">Monthly average for selected parameter</p>
          </div>

          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={selectedParam ?? ""}
            onChange={(e) => setSelectedParam(e.target.value || null)}
          >
            <option value="">Select a parameter</option>
            {Object.keys(parametersData).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>

          {selectedParam && (
            <div className="rounded-lg border border-border bg-muted/10 p-3">
              <div className="h-56 w-full">
                <canvas ref={paramCanvasRef} />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}