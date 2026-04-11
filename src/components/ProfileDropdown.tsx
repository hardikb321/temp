"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User, X, History, Mail, Phone, Award as IdCard, ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { Marker } from "./MyMap";
import type { WaterType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  userId: string;
}

/** One row from GET /submissions */
interface SubmissionRow {
  id: string;
  status: "pending" | "processing" | "accepted" | "rejected" | "error";
  created_at: string;
  processed_at: string | null;
}

/** One row from GET /submissions/:id/lakes or rivers */
interface LakeRow {
  lake_id?: string;
  river_id?: string;
  marker_count: string | number;
}

/** One row from GET /submissions/:id/markers */
interface MarkerRow {
  lake_id?: string | null;
  river_id?: string | null;
  lat: string | number;
  lng: string | number;
  parameters: Record<string, number>;
  satellite_data?: unknown;
  wqi?: number | null;
  created_at: string;
}

interface ProfileDropdownProps {
  user: UserProfile;
  /** Called when user wants to re-submit rejected points — passes pre-filled Marker[] */
  onRejectedSessionResubmit?: (markers: Marker[]) => void;
  /** True while a submission is in-flight (locks the rejected retry button) */
  isProcessingSubmit?: boolean;
  /** Called when user clicks a point in lake detail — fly map to that location */
  onPointClick?: (lat: number, lng: number) => void;
  waterType?: WaterType;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE = "http://localhost:8000";          // same origin; adjust if your API is on a different host
const SUBMISSIONS_LIMIT = 10;
const MARKERS_LIMIT = 20;

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** Convert a MarkerRow (from the API) into the Marker shape that MyMap uses.
 *
 * The `parameters` JSONB column can be stored in two formats depending on
 * how/when the submission was made:
 *   1. Display-name keys  — e.g. "Iron (Fe) [mg/L]": 1   (rivers, temp_markers)
 *   2. Snake-case keys    — e.g. "iron_fe_mg_l": 1        (normalised lake rows)
 *
 * Each lookup below tries the snake_case key first, then falls back to the
 * display-name key so both formats are handled correctly.
 */
function rowToMarker(row: MarkerRow): Marker {
  const p = row.parameters ?? {};

  // ── DEBUG: log the raw parameters object from DB so we can see exact keys ──
  console.group(`[rowToMarker] row @ lat=${row.lat} lng=${row.lng}`);
  console.log("[rowToMarker] RAW row:", JSON.stringify(row, null, 2));
  console.log("[rowToMarker] parameters keys:", Object.keys(p));
  console.log("[rowToMarker] parameters values:", JSON.stringify(p, null, 2));
  console.groupEnd();

  /** Pick a value by trying snakeKey first, then displayKey, defaulting to 0. */
  function pick(snakeKey: string, displayKey: string): number {
    const bySnake   = p[snakeKey];
    const byDisplay = p[displayKey];
    const v = bySnake ?? byDisplay;
    if (v == null) {
      console.warn(`[rowToMarker] MISS — neither "${snakeKey}" nor "${displayKey}" found in parameters`);
    }
    return v != null ? Number(v) : 0;
  }

  const essentialParameters: Record<string, number> = {
    "Arsenic (As) [mg/L]":                  pick("arsenic_as_mg_l",                   "Arsenic (As) [mg/L]"),
    "Cadmium (Cd) [mg/L]":                  pick("cadmium_cd_mg_l",                   "Cadmium (Cd) [mg/L]"),
    "Calcium (Ca) [mg/L]":                  pick("calcium_ca_mg_l",                   "Calcium (Ca) [mg/L]"),
    "Chloride (Cl) [mg/L]":                 pick("chloride_cl_mg_l",                  "Chloride (Cl) [mg/L]"),
    "Chlorine (Cl2) [mg/L]":               pick("chlorine_cl2_mg_l",                 "Chlorine (Cl2) [mg/L]"),
    "Dissolved Oxygen (DO) [mg/L]":         pick("dissolved_oxygen_do_mg_l",          "Dissolved Oxygen (DO) [mg/L]"),
    "Fecal Coliform [MPN/100mL]":           pick("fecal_coliform_mpn_100ml",          "Fecal Coliform [MPN/100mL]"),
    "Fluoride (F) [mg/L]":                  pick("fluoride_f_mg_l",                   "Fluoride (F) [mg/L]"),
    "Iron (Fe) [mg/L]":                     pick("iron_fe_mg_l",                      "Iron (Fe) [mg/L]"),
    "Lead (Pb) [mg/L]":                     pick("lead_pb_mg_l",                      "Lead (Pb) [mg/L]"),
    "Magnesium (Mg) [mg/L]":               pick("magnesium_mg_l_1",                  "Magnesium (Mg) [mg/L]"),
    "Manganese (Mn) [mg/L]":               pick("manganese_mn_mg_l",                 "Manganese (Mn) [mg/L]"),
    "Nickel (Ni) [mg/L]":                   pick("nickel_ni_mg_l",                    "Nickel (Ni) [mg/L]"),
    "Nitrate (NO3) Nitrogen [mg/L]":        pick("nitrate_no3_nitrogen_mg_l",         "Nitrate (NO3) Nitrogen [mg/L]"),
    "pH":                                   pick("ph",                                "pH"),
    "Total Alkalinity as CaCO3 [mg/L]":    pick("total_alkalinity_as_caco3_mg_l",    "Total Alkalinity as CaCO3 [mg/L]"),
    "Total Coliforms [MPN/100mL]":          pick("total_coliforms_mpn_100ml",         "Total Coliforms [MPN/100mL]"),
    "Total Dissolved Solids (TDS) [mg/L]": pick("tds_mg_l",                          "Total Dissolved Solids (TDS) [mg/L]"),
    "Total Hardness as CaCO3 [mg/L]":      pick("total_hardness_as_caco3_mg_l",      "Total Hardness as CaCO3 [mg/L]"),
    "Turbidity [NTU]":                      pick("turbidity_ntu",                     "Turbidity [NTU]"),
    "Zinc (Zn) [mg/L]":                     pick("zinc_zn_mg_l",                      "Zinc (Zn) [mg/L]"),
  };

  // Additional optional params — also try both key styles
  

  return {
    id: `${row.river_id ?? row.lake_id}-${row.lat}-${row.lng}-${row.created_at}`,
    latitude:   Number(row.lat),
    longitude:  Number(row.lng),
    lakeId:     row.lake_id ?? undefined,
    riverId:    row.river_id ?? undefined,
    turbidity:  essentialParameters["Turbidity [NTU]"],
    ph:         essentialParameters["pH"],
    additionalParameters: {},
    essentialParameters,
    timestamp: new Date(row.created_at),
  };
}
// ─── Component ────────────────────────────────────────────────────────────────

type ViewMode = "sessions" | "sessionDetail" | "lakeDetail";

export function ProfileDropdown({
  user,
  onRejectedSessionResubmit,
  isProcessingSubmit,
  onPointClick,
  waterType = "lake"
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // navigation state
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null);
  const [selectedLakeId, setSelectedLakeId] = useState<string | null>(null);

  // ── sessions list ──
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // ── lakes list (sessionDetail) ──
  const [lakes, setLakes] = useState<LakeRow[]>([]);
  const [lakesLoading, setLakesLoading] = useState(false);
  const [lakesError, setLakesError] = useState<string | null>(null);
  const [lakesPage, setLakesPage] = useState(0);
  const LAKES_PAGE_SIZE = 10;

  // ── markers list (lakeDetail) ──
  const [markers, setMarkers] = useState<MarkerRow[]>([]);
  const [markersPage, setMarkersPage] = useState(1);
  const [markersHasMore, setMarkersHasMore] = useState(false);
  const [markersLoading, setMarkersLoading] = useState(false);
  const [markersError, setMarkersError] = useState<string | null>(null);

  // ── rejected: auto-fetch all markers for re-submit ──
  const [rejectedFetching, setRejectedFetching] = useState(false);
  const [rejectedError, setRejectedError] = useState<string | null>(null);

  // ─── close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── reset on close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setViewMode("sessions");
      setSelectedSubmission(null);
      setSelectedLakeId(null);
      setLakes([]);
      setMarkers([]);
      setSessionsPage(1);
      setSessionsHasMore(false);
      setSessionsError(null);
      setLakesError(null);
      setMarkersError(null);
      setRejectedError(null);
    }
  }, [isOpen]);

  // ─── fetch submissions when dropdown opens ────────────────────────────────
  const fetchSubmissions = useCallback(async (page: number, replace: boolean) => {
    setSessionsLoading(true);
    if (replace) setSessionsError(null);
    
    const route = waterType === "river" ? "rivers" : "lakes";
    try {
      const res = await fetch(
        `${BASE}/api/${route}/submissions?page=${page}&limit=${SUBMISSIONS_LIMIT}`,
        
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows: SubmissionRow[] = json?.data?.submissions ?? [];
      setSubmissions((prev) => (replace ? rows : [...prev, ...rows]));
      setSessionsHasMore(rows.length === SUBMISSIONS_LIMIT);
      setSessionsPage(page);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [waterType]);

  useEffect(() => {
    if (isOpen) fetchSubmissions(1, true);
  }, [isOpen, fetchSubmissions]);

  // ─── fetch lakes when entering sessionDetail ─────────────────────────────
  const fetchLakes = useCallback(async (submissionId: string) => {
    setLakesLoading(true);
    setLakesError(null);
    setLakes([]);
    setLakesPage(0);
    
    const route = waterType === "river" ? "rivers" : "lakes";
    try {
      const res = await fetch(
        `${BASE}/api/${route}/submissions/${submissionId}/lakes`,
        
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setLakes(json?.data?.[route] ?? json?.data?.lakes ?? json?.data?.rivers ?? []);
    } catch (err) {
      setLakesError(err instanceof Error ? err.message : `Failed to load ${waterType}s`);
    } finally {
      setLakesLoading(false);
    }
  }, [waterType]);

  // ─── fetch markers when entering lakeDetail ───────────────────────────────
    const fetchMarkers = useCallback(async (submissionId: string, lakeId: string, page: number, replace: boolean) => {
    setMarkersLoading(true);
    if (replace) { setMarkersError(null); setMarkers([]); }
    
    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    try {
      const res = await fetch(
        `${BASE}/api/${route}/submissions/${submissionId}/markers?${idKey}=${encodeURIComponent(lakeId)}&page=${page}&limit=${MARKERS_LIMIT}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows: MarkerRow[] = json?.data?.markers ?? [];
      console.log("[fetchMarkers] RAW API response:", JSON.stringify(json, null, 2));
      console.log("[fetchMarkers] Parsed marker rows:", rows.length, rows);
      
      setMarkers((prev) => (replace ? rows : [...prev, ...rows]));
      setMarkersHasMore(rows.length === MARKERS_LIMIT);
      setMarkersPage(page);
    } catch (err) {
      setMarkersError(err instanceof Error ? err.message : "Failed to load markers");
    } finally {
      setMarkersLoading(false);
    }
  }, [waterType]);

  // ─── fetch ALL markers for a rejected session then pass back to parent ────
  const handleRejectedResubmit = useCallback(async (submission: SubmissionRow) => {
    if (isProcessingSubmit || rejectedFetching) return;
    setRejectedFetching(true);
    setRejectedError(null);

    const route = waterType === "river" ? "rivers" : "lakes";
    const idKey = waterType === "river" ? "river_id" : "lake_id";

    try {
      // 1. Get lakes for this submission
      const lakesRes = await fetch(
        `${BASE}/api/${route}/submissions/${submission.id}/lakes`,
        
      );
      if (!lakesRes.ok) throw new Error(`HTTP ${lakesRes.status}`);
      const lakesJson = await lakesRes.json();
      const lakeRows: LakeRow[] = lakesJson?.data?.[route] ?? lakesJson?.data?.lakes ?? lakesJson?.data?.rivers ?? [];

      // 2. For every lake, paginate through all markers
      const allMarkers: Marker[] = [];
      for (const lake of lakeRows) {
        let page = 1;
        let hasMore = true;
        const currentId = waterType === "river" ? lake.river_id : lake.lake_id;
        while (hasMore && currentId) {
          const mRes = await fetch(
            `${BASE}/api/${route}/submissions/${submission.id}/markers?${idKey}=${encodeURIComponent(currentId)}&page=${page}&limit=100`,
            
          );
          if (!mRes.ok) throw new Error(`HTTP ${mRes.status}`);
          const mJson = await mRes.json();
          const rows: MarkerRow[] = mJson?.data?.markers ?? [];
          console.log("[resubmit] RAW markers response page", page, ":", JSON.stringify(mJson, null, 2));
          console.log("[resubmit] MarkerRow count:", rows.length);
          if (rows.length > 0) console.log("[resubmit] First row parameters:", JSON.stringify(rows[0].parameters, null, 2));
          const mapped = rows.map(rowToMarker);
          console.log("[resubmit] Mapped Marker essentialParameters[0]:", mapped[0]?.essentialParameters);
          allMarkers.push(...mapped);
          hasMore = rows.length === 100;
          page++;
        }
      }

      if (allMarkers.length === 0) {
        setRejectedError("No points found for this session.");
        return;
      }

      console.log("[resubmit] FINAL allMarkers to pass to map:", allMarkers.length);
      console.log("[resubmit] Sample essentialParameters:", JSON.stringify(allMarkers[0]?.essentialParameters, null, 2));
      onRejectedSessionResubmit?.(allMarkers);
      setIsOpen(false);
    } catch (err) {
      setRejectedError(err instanceof Error ? err.message : "Failed to fetch points");
    } finally {
      setRejectedFetching(false);
    }
  }, [isProcessingSubmit, rejectedFetching, onRejectedSessionResubmit, waterType]);

  // ─── navigation helpers ───────────────────────────────────────────────────
  const goToSessionDetail = (submission: SubmissionRow) => {
    setSelectedSubmission(submission);
    setViewMode("sessionDetail");
    fetchLakes(submission.id);
  };

  const goToLakeDetail = (lakeId: string) => {
    if (!selectedSubmission) return;
    setSelectedLakeId(lakeId);
    setViewMode("lakeDetail");
    fetchMarkers(selectedSubmission.id, lakeId, 1, true);
  };

  const goBack = () => {
    if (viewMode === "lakeDetail") {
      setViewMode("sessionDetail");
      setSelectedLakeId(null);
      setMarkers([]);
    } else {
      setViewMode("sessions");
      setSelectedSubmission(null);
      setLakes([]);
    }
  };

  const loadMoreMarkers = () => {
    if (!selectedSubmission || !selectedLakeId || markersLoading || !markersHasMore) return;
    fetchMarkers(selectedSubmission.id, selectedLakeId, markersPage + 1, false);
  };

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
        aria-label="Profile"
      >
        <User className="h-5 w-5 text-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg">Profile</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── User Details ── */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">Water Quality Analyst</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">ID: {user.userId}</span>
              </div>
            </div>
          </div>

          {/* ── History Section ── */}
          <div className="p-4">
            {/* Section header with optional back arrow */}
            <div className="flex items-center gap-2 mb-3">
              {viewMode !== "sessions" && (
                <button
                  type="button"
                  onClick={goBack}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <History className="h-4 w-4 text-muted-foreground" />
              {viewMode === "sessions" && (
                <h4 className="font-medium text-sm">Input Sessions</h4>
              )}
              {viewMode === "sessionDetail" && selectedSubmission && (
                <h4 className="font-medium text-sm truncate">
                  Session • {fmtDate(selectedSubmission.created_at)}{" "}
                  {fmtTime(selectedSubmission.created_at)}
                </h4>
              )}
              {viewMode === "lakeDetail" && selectedLakeId && (
                <h4 className="font-medium text-sm truncate">Lake • {selectedLakeId}</h4>
              )}
              {/* refresh button on session list */}
              {viewMode === "sessions" && !sessionsLoading && (
                <button
                  type="button"
                  onClick={() => fetchSubmissions(1, true)}
                  className="ml-auto p-1 rounded hover:bg-muted transition-colors"
                  aria-label="Refresh sessions"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* ── VIEW: sessions ── */}
            {viewMode === "sessions" && (
              <>
                {sessionsLoading && submissions.length === 0 && (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading sessions…
                  </div>
                )}

                {sessionsError && (
                  <div className="flex items-center gap-2 text-destructive text-xs py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {sessionsError}
                  </div>
                )}

                {!sessionsLoading && !sessionsError && submissions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sessions recorded yet
                  </p>
                )}

                {submissions.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {submissions.map((sub) => {
                      const isRejected = sub.status === "error";
                      const isError = sub.status === "error";
                      const isPending = sub.status === "pending" || sub.status === "processing";

                      if (isRejected) {
                        // Rejected: show retry button + error if any
                        return (
                          <div
                            key={sub.id}
                            className="w-full text-left p-3 bg-muted/50 rounded-md text-xs space-y-1 border border-transparent"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">
                                {fmtDate(sub.created_at)} {fmtTime(sub.created_at)}
                              </span>
                              <span className="text-[11px] font-medium text-red-500 shrink-0">
                                Error
                              </span>
                            </div>
                            {sub.processed_at && (
                              <p className="text-[11px] text-muted-foreground">
                                Processed: {fmtDate(sub.processed_at)} {fmtTime(sub.processed_at)}
                              </p>
                            )}
                            <button
                              type="button"
                              disabled={isProcessingSubmit || rejectedFetching}
                              onClick={() => handleRejectedResubmit(sub)}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                            >
                              {rejectedFetching ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Fetching…
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3" />
                                  Re-submit
                                </>
                              )}
                            </button>
                            {rejectedError && (
                              <p className="text-[11px] text-destructive">{rejectedError}</p>
                            )}
                          </div>
                        );
                      }

                      // Accepted / pending / processing / error: clickable row
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          disabled={isPending || isError}
                          onClick={() => {
                            if (!isPending && !isError) goToSessionDetail(sub);
                          }}
                          className={`w-full text-left p-3 bg-muted/50 rounded-md text-xs space-y-1 transition-colors ${
                            isPending || isError
                              ? "opacity-60 cursor-default"
                              : "hover:bg-muted cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {fmtDate(sub.created_at)} {fmtTime(sub.created_at)}
                            </span>
                            <span
                              className={`text-[11px] font-medium shrink-0 ${
                                sub.status === "accepted"
                                  ? "text-emerald-500"
                                  : isError
                                  ? "text-destructive"
                                  : "text-amber-500"
                              }`}
                            >
                              {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                            </span>
                          </div>
                          {sub.processed_at && (
                            <p className="text-[11px] text-muted-foreground">
                              Processed: {fmtDate(sub.processed_at)} {fmtTime(sub.processed_at)}
                            </p>
                          )}
                          {isPending && (
                            <p className="text-[11px] text-muted-foreground italic">
                              Processing… click unavailable until complete.
                            </p>
                          )}
                        </button>
                      );
                    })}

                    {/* Load more button */}
                    {sessionsHasMore && (
                      <button
                        type="button"
                        disabled={sessionsLoading}
                        onClick={() => fetchSubmissions(sessionsPage + 1, false)}
                        className="w-full text-center py-1.5 text-[11px] text-primary hover:underline disabled:opacity-50"
                      >
                        {sessionsLoading ? (
                          <span className="flex items-center justify-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                          </span>
                        ) : (
                          "Load more"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── VIEW: sessionDetail — list of lakes ── */}
            {viewMode === "sessionDetail" && selectedSubmission && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {lakesLoading && (
                  <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading lakes…
                  </div>
                )}
                {lakesError && (
                  <div className="flex items-center gap-2 text-destructive text-xs py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {lakesError}
                  </div>
                )}
                {!lakesLoading && !lakesError && lakes.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No lakes found for this submission.
                  </p>
                )}

                {lakes
                  .slice(lakesPage * LAKES_PAGE_SIZE, lakesPage * LAKES_PAGE_SIZE + LAKES_PAGE_SIZE)
                  .map((lake) => {
                    const rowId = waterType === "river" ? lake.river_id : lake.lake_id;
                    const displayLabel = waterType === "river" ? `river_id: ${rowId}` : `lake_id: ${rowId}`;
                    return (
                      <button
                        key={rowId}
                        type="button"
                        onClick={() => { if(rowId) goToLakeDetail(rowId) }}
                        className="w-full text-left px-3 py-2 rounded-md bg-muted/40 hover:bg-muted text-xs transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{displayLabel}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {lake.marker_count} point{Number(lake.marker_count) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                {lakes.length > LAKES_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      disabled={lakesPage === 0}
                      onClick={() => setLakesPage((p) => Math.max(0, p - 1))}
                      className="px-2 py-1 rounded border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                    >
                      Prev
                    </button>
                    <span>
                      Page {lakesPage + 1} of {Math.ceil(lakes.length / LAKES_PAGE_SIZE)}
                    </span>
                    <button
                      type="button"
                      disabled={(lakesPage + 1) * LAKES_PAGE_SIZE >= lakes.length}
                      onClick={() =>
                        setLakesPage((p) =>
                          (p + 1) * LAKES_PAGE_SIZE >= lakes.length ? p : p + 1
                        )
                      }
                      className="px-2 py-1 rounded border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── VIEW: lakeDetail — list of markers ── */}
            {viewMode === "lakeDetail" && selectedSubmission && selectedLakeId && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {markersLoading && markers.length === 0 && (
                  <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading markers…
                  </div>
                )}
                {markersError && (
                  <div className="flex items-center gap-2 text-destructive text-xs py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {markersError}
                  </div>
                )}
                {!markersLoading && !markersError && markers.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No markers found.</p>
                )}

                {markers.map((entry, i) => {
                  const params = entry.parameters ?? {};
                  const paramEntries = Object.entries(params).filter(
                    ([k]) => k !== "conductivity" && k !== "aod" && k !== "temperature" && k !== "bod"
                  );
                  return (
                    <div
                      key={i}
                      className="p-3 bg-muted/50 rounded-md text-xs space-y-1 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => {
                        onPointClick?.(Number(entry.lat), Number(entry.lng));
                        window.dispatchEvent(
                          new CustomEvent("flyToPoint", {
                            detail: { lat: Number(entry.lat), lng: Number(entry.lng) },
                          })
                        );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {Number(entry.lat).toString()}, {Number(entry.lng).toString()}
                        </span>
                        {entry.wqi != null && (
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            WQI {Number(entry.wqi).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {fmtDate(entry.created_at)} {fmtTime(entry.created_at)}
                      </p>
                      {/* Top essential params */}
                      {paramEntries.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-1">
                          {paramEntries.slice(0, 6).map(([k, v]) => (
                            <span key={k} className="truncate">
                              <span className="font-medium text-foreground/80">
                                {k.split(" ")[0]}:
                              </span>{" "}
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Load more markers */}
                {markersHasMore && (
                  <button
                    type="button"
                    disabled={markersLoading}
                    onClick={loadMoreMarkers}
                    className="w-full text-center py-1.5 text-[11px] text-primary hover:underline disabled:opacity-50"
                  >
                    {markersLoading ? (
                      <span className="flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                      </span>
                    ) : (
                      "Load more"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}