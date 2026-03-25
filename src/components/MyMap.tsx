'use client';



import React from "react"

import { useState, useRef, useEffect, useCallback } from "react";
import * as turf from "@turf/turf";
import { Map, MapControls, MapMarker, MarkerContent, MapClusterLayer, MapDraftPointsLayer, MapPopup, type MapRef, useMap } from "@/components/ui/map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, History, BarChart2 } from "lucide-react";
import type { WaterType } from "@/types";
import { WATER_TYPE_LABELS } from "@/types";
import { validateAndSnapLake } from "@/lib/validateAndSnapLake";
import { PointChartsPanel } from "@/components/PointChartsPanel";
import { MapMVTClusterLayer, type PointClickPayload } from "@/components/ui/MapMVTClusterLayer"

export type MarkerColor = "red" | "blue" | "yellow" | "green";

export const MARKER_COLORS: { value: MarkerColor; label: string; bgClass: string }[] = [
  { value: "red", label: "Red", bgClass: "bg-red-500" },
  { value: "blue", label: "Blue", bgClass: "bg-blue-500" },
  { value: "yellow", label: "Yellow", bgClass: "bg-yellow-500" },
  { value: "green", label: "Green", bgClass: "bg-green-500" },
];

const MARKER_COLOR_HEX: Record<MarkerColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
  green: "#22c55e",
};

const COLOR_INDEX: Record<MarkerColor, number> = {
  red: 0,
  blue: 1,
  yellow: 2,
  green: 3,
};

const MARKER_COLOR_HEX_ARRAY: [string, string, string, string] = [
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#22c55e",
];

// Sample lake IDs for test data so that pagination over lakes can be exercised.
const SAMPLE_LAKE_IDS: string[] = Array.from({ length: 15 }, (_, i) => `TEST_LAKE_${i + 1}`);

export interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  color?: MarkerColor;
  /** Optional lake identifier when the point is associated with a lake */
  lakeId?: string;
  turbidity: number;
  ph: number;
  temperature?: number;
  bod?: number;
  conductivity?: number;
  aod?: number;
  /** 22 essential parameters (user fills them in the modal). */
  essentialParameters: Record<string, number>;
  timestamp: Date;
}

type EssentialParamKey = string;

const ESSENTIAL_PARAMETERS: { key: EssentialParamKey; label: string; unit?: string }[] = [
  { key: "Arsenic (As) [mg/L]",                  label: "Arsenic (As)",                 unit: "[mg/L]" },
  { key: "Cadmium (Cd) [mg/L]",                  label: "Cadmium (Cd)",                 unit: "[mg/L]" },
  { key: "Calcium (Ca) [mg/L]",                  label: "Calcium (Ca)",                 unit: "[mg/L]" },
  { key: "Chloride (Cl) [mg/L]",                 label: "Chloride (Cl)",                unit: "[mg/L]" },
  { key: "Chlorine (Cl2) [mg/L]",                label: "Chlorine (Cl2)",               unit: "[mg/L]" },
  { key: "Dissolved Oxygen (DO) [mg/L]",         label: "Dissolved Oxygen (DO)",        unit: "[mg/L]" },
  { key: "Fecal Coliform [MPN/100mL]",           label: "Fecal Coliform",               unit: "[MPN/100mL]" },
  { key: "Fluoride (F) [mg/L]",                  label: "Fluoride (F)",                 unit: "[mg/L]" },
  { key: "Iron (Fe) [mg/L]",                     label: "Iron (Fe)",                    unit: "[mg/L]" },
  { key: "Lead (Pb) [mg/L]",                     label: "Lead (Pb)",                    unit: "[mg/L]" },
  { key: "Magnesium (Mg) [mg/L]",                label: "Magnesium (Mg)",               unit: "[mg/L]" },
  { key: "Manganese (Mn) [mg/L]",                label: "Manganese (Mn)",               unit: "[mg/L]" },
  { key: "Nickel (Ni) [mg/L]",                   label: "Nickel (Ni)",                  unit: "[mg/L]" },
  { key: "Nitrate (NO3) Nitrogen [mg/L]",        label: "Nitrate (NO3) Nitrogen",       unit: "[mg/L]" },
  { key: "pH",                                   label: "pH",                           unit: "" },
  { key: "Total Alkalinity as CaCO3 [mg/L]",    label: "Total Alkalinity as CaCO3",    unit: "[mg/L]" },
  { key: "Total Coliforms [MPN/100mL]",          label: "Total Coliforms",              unit: "[MPN/100mL]" },
  { key: "Total Dissolved Solids (TDS) [mg/L]", label: "Total Dissolved Solids (TDS)", unit: "[mg/L]" },
  { key: "Total Hardness as CaCO3 [mg/L]",      label: "Total Hardness as CaCO3",      unit: "[mg/L]" },
  { key: "Turbidity [NTU]",                      label: "Turbidity",                    unit: "[NTU]" },
  { key: "Zinc (Zn) [mg/L]",                     label: "Zinc (Zn)",                    unit: "[mg/L]" },
];

export interface Session {
  id: string;
  createdAt: Date;
  waterType: WaterType;
  markers: Marker[];
  status: "accepted" | "rejected";
}

const ADDITIONAL_PARAMETERS = [
  { key: "conductivity", label: "Conductivity (μS/cm)", placeholder: "e.g., 500" },
  { key: "aod", label: "AOD", placeholder: "e.g., 0.5" },
  { key: "temperature", label: "Temperature (°C)", placeholder: "e.g., 25.5" },
  { key: "bod", label: "BOD (mg/L)", placeholder: "e.g., 3.0" },
] as const;

type AdditionalParamKey = typeof ADDITIONAL_PARAMETERS[number]["key"];

const COLORS: MarkerColor[] = ["red", "blue", "yellow", "green"];

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
const WATER_TYPE_MARKER_TILE_URL: Record<WaterType, string> = {
  ponds: "http://localhost:8000/api/ponds/markers/{z}/{x}/{y}.mvt",
  river: "http://localhost:8000/api/river/markers/{z}/{x}/{y}.mvt",
  lake:  "http://localhost:8000/api/lakes/markers/{z}/{x}/{y}.mvt",
};

const WATER_TYPE_TILE_CONFIG: Record<
  WaterType,
  {
    sourceId: string;
    fillLayerId: string;
    outlineLayerId: string;
    tileUrl: string;
    sourceLayer: string;
    fillColor: string;
    outlineColor: string;
  }
> = {
  ponds: {
    sourceId: "india-ponds",
    fillLayerId: "india-ponds-fill",
    outlineLayerId: "india-ponds-outline",
    tileUrl: "http://localhost:8080/data/india_ponds/{z}/{x}/{y}.pbf",
    sourceLayer: "ponds",
    fillColor: "#3fa34d",
    outlineColor: "#256d1b",
  },
  river: {
    sourceId: "india-river",
    fillLayerId: "india-river-fill",
    outlineLayerId: "india-river-outline",
    tileUrl: "http://localhost:8080/data/india_river/{z}/{x}/{y}.pbf",
    sourceLayer: "river",
    fillColor: "#2b8cbe",
    outlineColor: "#155b7a",
  },
  lake: {
    sourceId: "india-lakes",
    fillLayerId: "india-lakes-fill",
    outlineLayerId: "india-lakes-outline",
    tileUrl: "http://localhost:8080/data/india_lakes/{z}/{x}/{y}.pbf",
    sourceLayer: "lakes",
    fillColor: "#4a90d9",
    outlineColor: "#1a5fa8",
  },
};


function WaterTypeLayer({ waterType }: { waterType: WaterType }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    // NOTE:
    // We intentionally look up the config *inside* the effect and
    // only depend on `waterType` (not the config object itself).
    // This prevents the layers from being torn down and re-added on
    // every React state change in the parent component, which caused
    // the visible "blinking" of tiles.
    const layerConfig = WATER_TYPE_TILE_CONFIG[waterType];

    // Remove existing layers
    if (map.getLayer(layerConfig.outlineLayerId)) {
      map.removeLayer(layerConfig.outlineLayerId);
    }

    if (map.getLayer(layerConfig.fillLayerId)) {
      map.removeLayer(layerConfig.fillLayerId);
    }

    // Remove source
    if (map.getSource(layerConfig.sourceId)) {
      map.removeSource(layerConfig.sourceId);
    }

    // Add vector tile source
    map.addSource(layerConfig.sourceId, {
      type: "vector",
      tiles: [layerConfig.tileUrl],
      minzoom: 5,
      maxzoom: 13,
    });

    // Fill layer
    map.addLayer({
      id: layerConfig.fillLayerId,
      type: "fill",
      source: layerConfig.sourceId,
      "source-layer": layerConfig.sourceLayer,
      paint: {
        "fill-color": layerConfig.fillColor,
        "fill-opacity": 0.5,
      },
    });

    // Outline layer
    map.addLayer({
      id: layerConfig.outlineLayerId,
      type: "line",
      source: layerConfig.sourceId,
      "source-layer": layerConfig.sourceLayer,
      paint: {
        "line-color": layerConfig.outlineColor,
        "line-width": 1,
      },
    });

    // Debug click handler
    const handleClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [layerConfig.fillLayerId, layerConfig.outlineLayerId],
      });

      if (features.length === 0) {
        console.debug("[VectorTile] No feature found");
        return;
      }

      console.debug("[VectorTile] Features", features);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);

      if (map.getLayer(layerConfig.outlineLayerId))
        map.removeLayer(layerConfig.outlineLayerId);

      if (map.getLayer(layerConfig.fillLayerId))
        map.removeLayer(layerConfig.fillLayerId);

      if (map.getSource(layerConfig.sourceId))
        map.removeSource(layerConfig.sourceId);
    };
  }, [map, isLoaded, waterType]);

  return null;
}


function generateSampleMarkers(count: number, centerLng: number, centerLat: number): Marker[] {
  const markers: Marker[] = [];
  const spreadLat = 0.4;
  const spreadLng = 0.4;
  for (let i = 0; i < count; i++) {
    const lat = centerLat + randomInRange(-spreadLat, spreadLat);
    const lng = centerLng + randomInRange(-spreadLng, spreadLng);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const lakeId = SAMPLE_LAKE_IDS[i % SAMPLE_LAKE_IDS.length];

    // Generate full set of 22 essential parameters for UI testing.
    const essentialParameters: Record<string, number> = {};
    ESSENTIAL_PARAMETERS.forEach((p) => {
      if (p.key === "turbidity_ntu") return void (essentialParameters[p.key] = randomInRange(1, 50));
      if (p.key === "ph") return void (essentialParameters[p.key] = randomInRange(6, 8.5));
      if (p.key === "dissolved_oxygen_do_mg_l") return void (essentialParameters[p.key] = randomInRange(0.5, 12));
      if (p.key === "fecal_coliform_mpn_100ml") return void (essentialParameters[p.key] = randomInRange(10, 1000));
      if (p.key === "total_coliforms_mpn_100ml") return void (essentialParameters[p.key] = randomInRange(10, 2000));
      if (p.key === "nitrate_no3_nitrogen_mg_l") return void (essentialParameters[p.key] = randomInRange(0.1, 20));
      // Default range for the rest (placeholder until backend fetch wiring).
      essentialParameters[p.key] = randomInRange(0.05, 100);
    });

    const turbidityVal = essentialParameters["turbidity_ntu"] ?? randomInRange(1, 50);
    const phVal = essentialParameters["ph"] ?? randomInRange(6, 8.5);
    markers.push({
      id: `sample-${Date.now()}-${i}`,
      latitude: lat,
      longitude: lng,
      color,
      lakeId,
      turbidity: turbidityVal,
      ph: phVal,
      temperature: randomInRange(15, 32),
      bod: randomInRange(1, 12),
      timestamp: new Date(),
      essentialParameters,
    });
  }
  return markers;
}

interface TempPin {
  latitude: number;
  longitude: number;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMapClick = (e: any) => {
      if (e.preventDefault) e.preventDefault();
      if (e.originalEvent?.preventDefault) e.originalEvent.preventDefault();

      const { lng, lat } = e.lngLat;
      onMapClick(lat, lng);
    };

    map.on("contextmenu", handleMapClick);

    return () => {
      map.off("contextmenu", handleMapClick);
    };
  }, [map, isLoaded, onMapClick]);

  return null;
}


interface MyMapProps {
  draftMarkers: Marker[];
  submittedMarkers: Marker[];
  onDraftMarkersChange: (markers: Marker[]) => void;
  onSubmitDraftMarkers: (markers: Marker[]) => void;
  onRejectDraftSession?: (markers: Marker[]) => void;
  onProcessingChange?: (locked: boolean) => void;
  mapRef?: React.RefObject<MapRef | null>;
  waterType?: WaterType;
}

export function MyMap({
  draftMarkers,
  submittedMarkers,
  onDraftMarkersChange,
  onSubmitDraftMarkers,
  onRejectDraftSession,
  onProcessingChange,
  mapRef: externalMapRef,
  waterType,
}: MyMapProps) {
  const internalMapRef = useRef<MapRef>(null);
  const mapRef = externalMapRef || internalMapRef;
  const [tempPin, setTempPin] = useState<TempPin | null>(null);
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [turbidity, setTurbidity] = useState<string>("");
  const [ph, setPh] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [bod, setBod] = useState<string>("");
  const [isEssentialModalOpen, setIsEssentialModalOpen] = useState(false);
  const [essentialDraft, setEssentialDraft] = useState<Record<string, string>>({});
  const [essentialError, setEssentialError] = useState<string | null>(null);
  const [essentialParameters, setEssentialParameters] = useState<Record<string, number>>({});
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerColor, setMarkerColor] = useState<MarkerColor>("red");
  const [selectedAdditionalParams, setSelectedAdditionalParams] = useState<AdditionalParamKey[]>([]);
  const [conductivity, setConductivity] = useState<string>("");
  const [aod, setAod] = useState<string>("");
  const [selectedClusterPoint, setSelectedClusterPoint] = useState<{
    coordinates: [number, number];
    marker: Marker;
  } | null>(null);
  const [markerHistoryPanelMarker, setMarkerHistoryPanelMarker] = useState<Marker | null>(null);
  const [historyPanelVisible, setHistoryPanelVisible] = useState(false);
  const [pointHistoryPanelTab, setPointHistoryPanelTab] = useState<"history" | "charts">("history");
  const [chartYear, setChartYear] = useState<number | null>(null);
  const [samplePointIds, setSamplePointIds] = useState<Set<string>>(new Set());
  const [lakeId, setLakeId] = useState<string | null>(null);
  const [isResolvingLakeId, setIsResolvingLakeId] = useState(false);
  type LakeSnapStatus =
    | { type: "idle" }
    | { type: "inside"; lakeId: string; lakeName?: string }
    | { type: "snapped"; lakeId: string; lakeName?: string; distanceMeters: number }
    | { type: "error"; message: string };
  const [lakeSnapStatus, setLakeSnapStatus] = useState<LakeSnapStatus>({ type: "idle" });
  const [draftPage, setDraftPage] = useState(0);
  const DRAFT_PAGE_SIZE = 10;
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "processing" | "awaitingDecision" | "accepted" | "rejected"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSubmitMarkers, setPendingSubmitMarkers] = useState<Marker[] | null>(null);

  const allMarkers = React.useMemo(
    () => [...submittedMarkers, ...draftMarkers],
    [submittedMarkers, draftMarkers]
  );

  const submittedIdSet = React.useMemo(() => new Set(submittedMarkers.map((m) => m.id)), [submittedMarkers]);

  const resetDraftFormState = useCallback(() => {
    setEditingMarkerId(null);
    setTempPin(null);
    setLatitude("");
    setLongitude("");
    setTurbidity("");
    setPh("");
    setTemperature("");
    setBod("");
    setMarkerColor("red");
    setConductivity("");
    setAod("");
    setSelectedAdditionalParams([]);
    setEssentialDraft({});
    setEssentialError(null);
    setIsEssentialModalOpen(false);
    setEssentialParameters({});
    setLakeId(null);
    setLakeSnapStatus({ type: "idle" });
    setSelectedClusterPoint(null);
    setMarkerHistoryPanelMarker(null);
  }, []);

  useEffect(() => {
    if (markerHistoryPanelMarker) {
      setHistoryPanelVisible(false);
      setPointHistoryPanelTab("history");
      const y = new Date(markerHistoryPanelMarker.timestamp).getFullYear();
      setChartYear(y);
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setHistoryPanelVisible(true));
      });
      return () => cancelAnimationFrame(t);
    } else {
      setHistoryPanelVisible(false);
    }
  }, [markerHistoryPanelMarker]);

  // Ensure MapLibre correctly repaints when the slide-over opens/closes.
  useEffect(() => {
    if (!mapRef.current) return;
    const t = requestAnimationFrame(() => {
      try {
        mapRef.current?.resize();
        mapRef.current?.triggerRepaint();
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(t);
  }, [markerHistoryPanelMarker, mapRef]);

  // Warn on refresh/close when there are unsaved changes or pending actions.
  const hasUnsavedChangesRef = useRef(false);
  const formOrDraftDirty =
    draftMarkers.length > 0 ||
    isSubmittingDraft ||
    tempPin !== null ||
    editingMarkerId !== null ||
    latitude !== "" ||
    longitude !== "" ||
    turbidity !== "" ||
    ph !== "" ||
    temperature !== "" ||
    bod !== "";
  useEffect(() => {
    hasUnsavedChangesRef.current = formOrDraftDirty;
  }, [formOrDraftDirty]);
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        (e as unknown as { returnValue: string }).returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleAddSamplePoints = useCallback(() => {
    const centerLng = 77.209;
    const centerLat = 28.614;
    const newMarkers = generateSampleMarkers(50, centerLng, centerLat);
    onDraftMarkersChange([...draftMarkers, ...newMarkers]);
    setSamplePointIds((prev) => {
      const next = new Set(prev);
      newMarkers.forEach((m) => next.add(m.id));
      return next;
    });
  }, [draftMarkers, onDraftMarkersChange]);

  const handleDeleteSamplePoints = useCallback(() => {
    const idsToRemove = samplePointIds;
    onDraftMarkersChange(draftMarkers.filter((m) => !idsToRemove.has(m.id)));
    setSamplePointIds(new Set());
  }, [draftMarkers, onDraftMarkersChange, samplePointIds]);

  const toPointFeature = (marker: Marker) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [marker.longitude, marker.latitude] as [number, number],
    },
    properties: {
      id: marker.id,
      color: marker.color ?? "red",
      colorIndex: COLOR_INDEX[marker.color ?? "red"],
      colorHex: MARKER_COLOR_HEX[marker.color ?? "red"],
      lakeId: marker.lakeId,
      turbidity: marker.turbidity,
      ph: marker.ph,
      temperature: marker.temperature,
      bod: marker.bod,
      conductivity: marker.conductivity,
      aod: marker.aod,
      timestamp: marker.timestamp.toISOString(),
    },
  });

  // Clustering only for submitted points (e.g. from backend later).
  // const submittedMarkersGeoJSON = React.useMemo(
  //   (): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  //     type: "FeatureCollection",
  //     features: submittedMarkers.map(toPointFeature),
  //   }),
  //   [submittedMarkers]
  // );

  // Draft points: no clustering, shown with pulsing style in a separate layer.
  const draftMarkersGeoJSON = React.useMemo(
    (): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
      type: "FeatureCollection",
      features: draftMarkers.map(toPointFeature),
    }),
    [draftMarkers]
  );

  const handleSetLakeId = useCallback(async () => {
    if (waterType !== "lake") return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setLakeSnapStatus({ type: "error", message: "Please enter valid latitude and longitude values." });
      return;
    }

    setIsResolvingLakeId(true);
    setLakeSnapStatus({ type: "idle" });
    setLakeId(null);

    try {
      const response = await fetch("/api/lakes/validate-or-snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setLakeSnapStatus({ type: "error", message: "No associated lake found (point is more than 50 m from any lake)." });
          return;
        }
        const errBody = await response.json().catch(() => ({}));
        setLakeSnapStatus({ type: "error", message: (errBody as any)?.message ?? `Server error ${response.status}` });
        return;
      }

      const json = await response.json();
      const data = json?.data ?? json;

      if (!data.snapped) {
        // Point is already inside a lake — keep original coordinates as-is
        const resolvedId = String(data.lake?.hylak_id ?? data.lakeId ?? "");
        const resolvedName: string | undefined = data.lake?.lake_name ?? data.lakeName;
        setLakeId(resolvedId);
        setLakeSnapStatus({ type: "inside", lakeId: resolvedId, lakeName: resolvedName });
        console.debug("[LakeSet] Point inside lake", resolvedId);
      } else {
        // Point was outside but within 50 m — shift pin to snapped boundary point
        const snappedLat: number = data.latitude;
        const snappedLng: number = data.longitude;
        const resolvedId = String(data.lakeId ?? "");
        const resolvedName: string | undefined = data.lakeName;
        const dist: number = data.distanceMeters ?? 0;

        setLakeId(resolvedId);
        setLatitude(snappedLat.toString());
        setLongitude(snappedLng.toString());
        setTempPin({ latitude: snappedLat, longitude: snappedLng });
        setLakeSnapStatus({ type: "snapped", lakeId: resolvedId, lakeName: resolvedName, distanceMeters: dist });
        console.debug("[LakeSet] Point snapped to lake boundary", resolvedId, { snappedLat, snappedLng, dist });
      }
    } catch (error) {
      console.error("[LakeSet] Failed to resolve lakeId", error);
      setLakeSnapStatus({ type: "error", message: "Unable to resolve lake. Please try again." });
    } finally {
      setIsResolvingLakeId(false);
    }
  }, [waterType, latitude, longitude]);

  const handleAddMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    let lat = parseFloat(latitude);
    let lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude values");
      return;
    }

    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90");
      return;
    }

    if (lng < -180 || lng > 180) {
      alert("Longitude must be between -180 and 180");
      return;
    }

    // For lakes, resolve lake_id explicitly via the Set button.
    const resolvedLakeId = lakeId;
    if (waterType === "lake" && !resolvedLakeId) {
      alert('Please press "Set" to resolve lake_id before saving.');
      return;
    }

    // Enforce minimum 20m distance between points (draft+submitted, using possibly snapped coordinates)
    const newPoint = turf.point([lng, lat]);
    const tooClose = allMarkers.some((marker) => {
      // When editing, ignore the marker being edited in distance check
      if (editingMarkerId && marker.id === editingMarkerId) return false;
      const existingPoint = turf.point([marker.longitude, marker.latitude]);
      const distanceMeters = turf.distance(newPoint, existingPoint, { units: "meters" });
      return distanceMeters < 20;
    });

    if (tooClose) {
      alert("Points must be at least 20 meters apart. Please choose a different location.");
      return;
    }

    const missingEssential = ESSENTIAL_PARAMETERS.find(
      (p) => !essentialParameters || essentialParameters[p.key] == null || !Number.isFinite(essentialParameters[p.key])
    );
    if (missingEssential) {
      setIsEssentialModalOpen(true);
      setEssentialError("Please fill all essential parameters before saving.");
      return;
    }

    const turb = essentialParameters["Turbidity [NTU]"];
    const phVal = essentialParameters["pH"];

    // Optional additional parameters
    let tempVal: number | undefined = undefined;
    let bodVal: number | undefined = undefined;
    if (selectedAdditionalParams.includes("temperature")) {
      tempVal = parseFloat(temperature);
      if (isNaN(tempVal)) {
        alert("Please enter a valid value for Temperature");
        return;
      }
    }
    if (selectedAdditionalParams.includes("bod")) {
      bodVal = parseFloat(bod);
      if (isNaN(bodVal as number)) {
        alert("Please enter a valid value for BOD");
        return;
      }
    }

    const condVal = conductivity ? parseFloat(conductivity) : undefined;
    const aodVal = aod ? parseFloat(aod) : undefined;

    if (selectedAdditionalParams.includes("conductivity") && (conductivity === "" || isNaN(condVal!))) {
      alert("Please enter a valid value for Conductivity");
      return;
    }
    if (selectedAdditionalParams.includes("aod") && (aod === "" || isNaN(aodVal!))) {
      alert("Please enter a valid value for AOD");
      return;
    }

    if (editingMarkerId) {
      // Update existing marker
      const updatedMarkers = draftMarkers.map((marker) =>
        marker.id === editingMarkerId
          ? {
              ...marker,
              latitude: lat,
              longitude: lng,
              color: markerColor,
              lakeId: resolvedLakeId ?? marker.lakeId,
              turbidity: turb,
              ph: phVal,
              temperature: tempVal,
              bod: bodVal,
              conductivity: condVal,
              aod: aodVal,
              essentialParameters: { ...essentialParameters },
            }
          : marker
      );
      onDraftMarkersChange(updatedMarkers);
       setEditingMarkerId(null);
     } else {
       // Add new marker
       const newMarker: Marker = {
         id: Date.now().toString(),
         latitude: lat,
         longitude: lng,
         color: markerColor,
         lakeId: resolvedLakeId ?? undefined,
         turbidity: turb,
         ph: phVal,
        temperature: tempVal,
        bod: bodVal,
         conductivity: condVal,
         aod: aodVal,
         timestamp: new Date(),
        essentialParameters: { ...essentialParameters },
       };
      const updatedMarkers = [...draftMarkers, newMarker];
      onDraftMarkersChange(updatedMarkers);
     }
    setLatitude("");
    setLongitude("");
    setTurbidity("");
    setPh("");
    setTemperature("");
    setBod("");
    setMarkerColor("red");
    setConductivity("");
    setAod("");
    setSelectedAdditionalParams([]);
    setEssentialDraft({});
    setEssentialParameters({});
    setEssentialError(null);
    setIsEssentialModalOpen(false);
    setTempPin(null);
    setLakeId(null);
    setLakeSnapStatus({ type: "idle" });
  };

  const handleRemoveMarker = (id: string) => {
    const updatedMarkers = draftMarkers.filter((marker) => marker.id !== id);
    onDraftMarkersChange(updatedMarkers);
    if (samplePointIds.has(id)) {
      setSamplePointIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    if (editingMarkerId === id) {
      setEditingMarkerId(null);
      setLatitude("");
      setLongitude("");
      setTurbidity("");
      setPh("");
      setTemperature("");
      setBod("");
      setMarkerColor("red");
      setConductivity("");
      setAod("");
      setSelectedAdditionalParams([]);
      setEssentialDraft({});
      setEssentialParameters({});
      setEssentialError(null);
      setIsEssentialModalOpen(false);
      setLakeId(null);
    }
    setSelectedClusterPoint(null);
  };

  const handleEditMarker = (marker: Marker) => {
    setEditingMarkerId(marker.id);
    setLatitude(marker.latitude.toString());
    setLongitude(marker.longitude.toString());
    setMarkerColor(marker.color ?? "red");
    setTurbidity(marker.turbidity.toString());
    setPh(marker.ph.toString());
    setTemperature(marker.temperature != null ? marker.temperature.toString() : "");
    setBod(marker.bod != null ? marker.bod.toString() : "");
    setLakeId(marker.lakeId ?? null);
    setLakeSnapStatus({ type: "idle" });

    // Populate essential params draft for the modal.
    const nextEssentialDraft: Record<string, string> = {};
    ESSENTIAL_PARAMETERS.forEach((p) => {
      const v = marker.essentialParameters?.[p.key];
      nextEssentialDraft[p.key] = v != null ? String(v) : "";
    });
    // Keep turbidity/ph in sync if they are stored separately.
    nextEssentialDraft["Turbidity [NTU]"] = nextEssentialDraft["Turbidity [NTU]"] ?? marker.turbidity.toString();
    nextEssentialDraft["pH"] = nextEssentialDraft["pH"] ?? marker.ph.toString();
    setEssentialDraft(nextEssentialDraft);
    setEssentialParameters(marker.essentialParameters ?? {});
    setEssentialError(null);
    
    // Set additional params if they exist
    const additionalParams: AdditionalParamKey[] = [];
    if (marker.conductivity !== undefined) {
      additionalParams.push("conductivity");
      setConductivity(marker.conductivity.toString());
    } else {
      setConductivity("");
    }
    if (marker.aod !== undefined) {
      additionalParams.push("aod");
      setAod(marker.aod.toString());
    } else {
      setAod("");
    }
    if (marker.temperature !== undefined) {
      additionalParams.push("temperature");
    } else {
      // no-op
    }
    if (marker.bod !== undefined) {
      additionalParams.push("bod");
    } else {
      // no-op
    }
    setSelectedAdditionalParams(additionalParams);
    setDraftPage(0);
  };

  const handleCancelEdit = () => {
    setEditingMarkerId(null);
    setLatitude("");
    setLongitude("");
    setTurbidity("");
    setPh("");
    setTemperature("");
    setBod("");
    setMarkerColor("red");
    setConductivity("");
    setAod("");
    setSelectedAdditionalParams([]);
    setLakeId(null);
    setLakeSnapStatus({ type: "idle" });
    setSelectedClusterPoint(null);
    setEssentialDraft({});
    setEssentialError(null);
    setEssentialParameters({});
    setIsEssentialModalOpen(false);
    setDraftPage(0);
  };

  const toggleAdditionalParam = (paramKey: AdditionalParamKey) => {
    setSelectedAdditionalParams(prev => 
      prev.includes(paramKey) 
        ? prev.filter(p => p !== paramKey)
        : [...prev, paramKey]
    );
  };

  const handleMarkerClick = (marker: Marker) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [marker.longitude, marker.latitude],
        zoom: 14,
        duration: 1500,
      });
    }
  };


  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setTempPin({ latitude: lat, longitude: lng });
      setLatitude(lat.toString());
      setLongitude(lng.toString());
      setSelectedClusterPoint(null);
      // lake_id and status are reset when a new pin is placed
      setLakeId(null);
      setLakeSnapStatus({ type: "idle" });
    },
    []
  );
  useEffect(() => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) return;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

  setTempPin({ latitude: lat, longitude: lng });

  if (mapRef.current) {
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 1000,
    });
  }
}, [latitude, longitude]);

  // Memoize map style so MapLibre style is not reset on every React render.
  const mapStyles = React.useMemo(
    () => ({
      light: {
        version: 8 as const,
        sources: {
          "esri-satellite": {
            type: "raster" as const,
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
          "esri-labels": {
            type: "raster" as const,
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: "esri-satellite-layer", type: "raster" as const, source: "esri-satellite" },
          { id: "esri-labels-layer", type: "raster" as const, source: "esri-labels" },
        ],
      },
      dark: {
        version: 8 as const,
        sources: {
          "esri-satellite": {
            type: "raster" as const,
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
          "esri-labels": {
            type: "raster" as const,
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: "esri-satellite-layer", type: "raster" as const, source: "esri-satellite" },
          { id: "esri-labels-layer", type: "raster" as const, source: "esri-labels" },
        ],
      },
    }),
    []
  );

  // ─── Point history: real backend fetch ───────────────────────────────────────
  interface HistoryEntry {
    parameters: Record<string, number | string>;
    wqi: number;
    created_by: string;
    created_at: string;
  }

  const [pointHistoryEntries, setPointHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState<number | null>(null);
  const HISTORY_PAGE_LIMIT = 20;

  // Reset + fetch whenever the selected marker changes
  useEffect(() => {
    if (!markerHistoryPanelMarker) {
      setPointHistoryEntries([]);
      setHistoryPage(1);
      setHistoryHasMore(false);
      setHistoryError(null);
      return;
    }

    const { lakeId: lid, latitude: lat, longitude: lng } = markerHistoryPanelMarker;
    if (!lid) {
      setPointHistoryEntries([]);
      setHistoryError("No lake_id associated with this point.");
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    setPointHistoryEntries([]);
    setHistoryPage(1);

    fetch(
      `/api/lakes/marker-history?lake_id=${encodeURIComponent(lid)}&lat=${lat}&lng=${lng}&page=1&limit=${HISTORY_PAGE_LIMIT}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const rows: HistoryEntry[] = json?.data?.results ?? [];
        setPointHistoryEntries(rows);
        setHistoryHasMore(rows.length === HISTORY_PAGE_LIMIT);
        setHistoryPage(1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHistoryError(err instanceof Error ? err.message : "Failed to load history");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, [markerHistoryPanelMarker]);

  // Load next page
  const loadMoreHistory = useCallback(() => {
    if (!markerHistoryPanelMarker || historyLoading || !historyHasMore) return;
    const { lakeId: lid, latitude: lat, longitude: lng } = markerHistoryPanelMarker;
    if (!lid) return;

    const nextPage = historyPage + 1;
    setHistoryLoading(true);

    fetch(
      `/api/lakes/marker-history?lake_id=${encodeURIComponent(lid)}&lat=${lat}&lng=${lng}&page=${nextPage}&limit=${HISTORY_PAGE_LIMIT}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const rows: HistoryEntry[] = json?.data?.results ?? [];
        setPointHistoryEntries((prev) => [...prev, ...rows]);
        setHistoryHasMore(rows.length === HISTORY_PAGE_LIMIT);
        setHistoryPage(nextPage);
      })
      .catch((err: unknown) => {
        setHistoryError(err instanceof Error ? err.message : "Failed to load more");
      })
      .finally(() => setHistoryLoading(false));
  }, [markerHistoryPanelMarker, historyLoading, historyHasMore, historyPage]);

  const availableYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 20; y--) years.push(y);
    return years;
  }, []);

  return (
    <div className="flex gap-4 w-full relative">
      <Card className="flex-1 h-[500px] p-0 overflow-hidden">
        <Map
  ref={mapRef}
  center={[77.2090, 28.6139]}
  zoom={5}
 styles={mapStyles}
>
          <MapControls showLocate={true} />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {waterType && <WaterTypeLayer key={waterType} waterType={waterType} />}
          {/* Submitted points only: clustered (backend data would go here). */}
          {waterType === "lake" && (
             <MapMVTClusterLayer
            tileUrl={WATER_TYPE_MARKER_TILE_URL[waterType ?? "lake"]}
            // Optional: colour circles by water quality index.
            // Remove wqiColorStops to use the flat clusterColor / pointColor instead.
            wqiColorStops={[
              [40,  "#ef4444"],   // poor   — red
              [65,  "#f59e0b"],   // fair   — amber
              [85,  "#3b82f6"],   // good   — blue
              [100, "#22c55e"],   // excellent — green
            ]}
            onClusterClick={(coords, pointCount) => {
              void pointCount;
              mapRef.current?.flyTo({
                center: coords,
                zoom: Math.min((mapRef.current?.getZoom() ?? 5) + 2, 18),
                duration: 800,
              });
            }}
            onPointClick={({ lngLat, properties }: PointClickPayload) => {
              // The MVT tile now exposes: id, lake_id, avg_wqi, lat, lng (4326).
              // lat/lng from the tile properties are the exact coordinates stored in
              // the DB — use them so marker-history queries hit the right row.
              const exactLat = properties.lat != null ? Number(properties.lat) : lngLat.lat;
              const exactLng = properties.lng != null ? Number(properties.lng) : lngLat.lng;
              const syntheticMarker: Marker = {
                id:        String(properties.id ?? ""),
                latitude:  exactLat,
                longitude: exactLng,
                lakeId:    properties.lake_id != null ? String(properties.lake_id) : undefined,
                turbidity: 0,
                ph:        0,
                // avg_wqi available — surface it if your popup uses it
                essentialParameters: {
                  wqi: properties.avg_wqi ?? 0,
                },
                timestamp: new Date(),
              };
              setSelectedClusterPoint({
                coordinates: [lngLat.lng, lngLat.lat],
                marker: syntheticMarker,
              });
              setMarkerHistoryPanelMarker(syntheticMarker);
            }}
          />
          )}
          {/* Draft points: no clustering, pulsing style so they stand out. */}
          {draftMarkers.length > 0 && (
            <MapDraftPointsLayer
              data={draftMarkersGeoJSON}
              pointColor="#f59e0b"
              pointColorProperty="colorHex"
              onPointClick={(feature, coordinates) => {
                const markerId = feature.properties?.id;
                const marker = draftMarkers.find((m) => m.id === markerId);
                if (marker) {
                  setSelectedClusterPoint({ coordinates, marker });
                  setMarkerHistoryPanelMarker(null);
                }
              }}
            />
          )}

          {tempPin && (
            <>
              <MapMarker
                longitude={tempPin.longitude}
                latitude={tempPin.latitude}

              >
                <MarkerContent>
                  <div
                    className="relative h-6 w-6 rounded-full border-2 border-white bg-blue-500 shadow-lg"
                    title="Temporary pin"
                  />
                </MarkerContent>
              </MapMarker>
              <MapPopup
                longitude={tempPin.longitude}
                latitude={tempPin.latitude}
                closeButton={true}
                onClose={() => {
                  setTempPin(null);
                  // If we were creating a new marker from this temp pin,
                  // clear the coordinate and lake association when user closes it.
                  if (!editingMarkerId) {
                    setLatitude("");
                    setLongitude("");
                    setLakeId(null);
                  }
                }}
              >
                <div className="text-sm">
                  <p className="font-medium mb-1">Coordinates</p>
                  <p className="text-xs">
                    <span className="font-medium">Lat:</span> {tempPin.latitude.toString()}
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Lng:</span> {tempPin.longitude.toString()}
                  </p>
                </div>
              </MapPopup>
            </>
          )}

          {selectedClusterPoint && (
            <MapPopup
              key={`${selectedClusterPoint.coordinates[0]}-${selectedClusterPoint.coordinates[1]}`}
              longitude={selectedClusterPoint.coordinates[0]}
              latitude={selectedClusterPoint.coordinates[1]}
              onClose={() => setSelectedClusterPoint(null)}
              closeOnClick={false}
              focusAfterOpen={false}
              closeButton
            >
              <div className="space-y-2 p-2">
                <p className="text-sm font-semibold">Water Quality Data</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <span className="font-medium">Turbidity:</span>
                    <br />
                    {selectedClusterPoint.marker.turbidity} NTU
                  </div>
                  <div>
                    <span className="font-medium">pH:</span>
                    <br />
                    {selectedClusterPoint.marker.ph}
                  </div>
                  <div>
                    <span className="font-medium">Temperature:</span>
                    <br />
                    {selectedClusterPoint.marker.temperature}°C
                  </div>
                  <div>
                    <span className="font-medium">BOD:</span>
                    <br />
                    {selectedClusterPoint.marker.bod} mg/L
                  </div>
                  {selectedClusterPoint.marker.conductivity != null && (
                    <div>
                      <span className="font-medium">Conductivity:</span>
                      <br />
                      {selectedClusterPoint.marker.conductivity} μS/cm
                    </div>
                  )}
                  {selectedClusterPoint.marker.aod != null && (
                    <div>
                      <span className="font-medium">AOD:</span>
                      <br />
                      {selectedClusterPoint.marker.aod}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  {!submittedIdSet.has(selectedClusterPoint.marker.id) ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleEditMarker(selectedClusterPoint.marker);
                          setSelectedClusterPoint(null);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          handleRemoveMarker(selectedClusterPoint.marker.id);
                          setSelectedClusterPoint(null);
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Submitted point (locked)</p>
                  )}
                </div>
              </div>
            </MapPopup>
          )}
        </Map>
      </Card>

<Card className="w-96 h-fit">
        <CardHeader>
          <CardTitle>
            {editingMarkerId ? "Edit Marker" : "Add Marker"}
            {waterType && (
              <span className="font-normal text-muted-foreground ml-1">
                ({WATER_TYPE_LABELS[waterType]})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMarker} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="latitude" className="text-sm font-medium">
                  Latitude
                </label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 28.6139"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="longitude" className="text-sm font-medium">
                  Longitude
                </label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 77.2090"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>

            {waterType === "lake" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSetLakeId}
                    disabled={isResolvingLakeId || !latitude || !longitude}
                  >
                    {isResolvingLakeId ? "Checking..." : "Set Lake"}
                  </Button>
                  {lakeSnapStatus.type === "idle" && !lakeId && (
                    <p className="text-xs text-muted-foreground">Click to validate coordinates against lake data</p>
                  )}
                </div>
                {lakeSnapStatus.type === "inside" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Inside lake{lakeSnapStatus.lakeName ? ` "${lakeSnapStatus.lakeName}"` : ""} — lake_id: {lakeSnapStatus.lakeId}
                  </p>
                )}
                {lakeSnapStatus.type === "snapped" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⟳ Snapped to nearest boundary ({lakeSnapStatus.distanceMeters.toFixed(1)} m away){lakeSnapStatus.lakeName ? ` — "${lakeSnapStatus.lakeName}"` : ""} — lake_id: {lakeSnapStatus.lakeId}
                  </p>
                )}
                {lakeSnapStatus.type === "error" && (
                  <p className="text-xs text-destructive">{lakeSnapStatus.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Marker color</label>
              <div className="flex gap-2">
                {MARKER_COLORS.map(({ value, label, bgClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMarkerColor(value)}
                    className={`h-8 w-8 rounded-full border-2 shadow-sm transition-all ${bgClass} ${
                      markerColor === value ? "border-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" : "border-white hover:scale-105"
                    }`}
                    title={label}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Red, Blue, Yellow, Green</p>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-3 text-muted-foreground">Essential Parameters</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // If user already filled essentialParameters, sync draft strings from it.
                  const nextDraft: Record<string, string> = { ...essentialDraft };
                  if (Object.keys(nextDraft).length === 0 || Object.values(nextDraft).every((v) => v === "")) {
                    ESSENTIAL_PARAMETERS.forEach((p) => {
                      const v = essentialParameters?.[p.key];
                      nextDraft[p.key] = v != null ? String(v) : "";
                    });
                    setEssentialDraft(nextDraft);
                  }
                  setEssentialError(null);
                  setIsEssentialModalOpen(true);
                }}
              >
                {ESSENTIAL_PARAMETERS.every((p) => essentialParameters?.[p.key] != null)
                  ? "Edit essential parameters"
                  : "Fill essential parameters"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                All 22 essential parameters are mandatory (decimals allowed).
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Essential filled:{" "}
                {
                  ESSENTIAL_PARAMETERS.reduce(
                    (acc, p) => acc + (essentialDraft[p.key] ? 1 : 0),
                    0
                  )
                }
                /{ESSENTIAL_PARAMETERS.length}
              </p>
              {essentialError && <p className="text-xs text-destructive mt-2">{essentialError}</p>}
            </div>

            {waterType === "lake" && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-1">Lake association</p>
                {!lakeId && lakeSnapStatus.type === "idle" && (
                  <p className="text-xs text-muted-foreground">
                    Right-click on the map (or enter coordinates) then press &quot;Set Lake&quot; to resolve the lake_id.
                  </p>
                )}
                {lakeSnapStatus.type === "inside" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Point is inside the lake boundary. lake_id: <span className="font-medium">{lakeSnapStatus.lakeId}</span>
                  </p>
                )}
                {lakeSnapStatus.type === "snapped" && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⟳ Pin shifted to nearest lake boundary ({lakeSnapStatus.distanceMeters.toFixed(1)} m).
                    </p>
                    <p className="text-xs text-muted-foreground">
                      lake_id: <span className="font-medium text-foreground">{lakeSnapStatus.lakeId}</span>
                      {lakeSnapStatus.lakeName ? ` — ${lakeSnapStatus.lakeName}` : ""}
                    </p>
                  </div>
                )}
                {lakeSnapStatus.type === "error" && (
                  <p className="text-xs text-destructive">{lakeSnapStatus.message}</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Additional Parameters</p>
                <div className="relative">
                  <select
                    className="appearance-none bg-card border border-input rounded-md px-3 py-1.5 pr-8 text-sm cursor-pointer text-foreground hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        toggleAdditionalParam(e.target.value as AdditionalParamKey);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Add Parameter</option>
                    {ADDITIONAL_PARAMETERS.filter(param => !selectedAdditionalParams.includes(param.key)).map((param) => (
                      <option key={param.key} value={param.key}>
                        {param.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                </div>
              </div>
              
              {selectedAdditionalParams.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAdditionalParams.map((paramKey) => {
                    const param = ADDITIONAL_PARAMETERS.find(p => p.key === paramKey);
                    return (
                      <span
                        key={paramKey}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs"
                      >
                        {param?.label.split(" ")[0]}
                        <button
                          type="button"
                          onClick={() => toggleAdditionalParam(paramKey)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3l6 6M9 3l-6 6" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              
              {selectedAdditionalParams.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedAdditionalParams.includes("temperature") && (
                    <div className="space-y-2">
                      <label htmlFor="temperature" className="text-sm font-medium">
                        Temperature (°C)
                      </label>
                      <Input
                        id="temperature"
                        type="number"
                        step="any"
                        placeholder="e.g., 25.5"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                      />
                    </div>
                  )}
                  {selectedAdditionalParams.includes("bod") && (
                    <div className="space-y-2">
                      <label htmlFor="bod" className="text-sm font-medium">
                        BOD (mg/L)
                      </label>
                      <Input
                        id="bod"
                        type="number"
                        step="any"
                        placeholder="e.g., 3.0"
                        value={bod}
                        onChange={(e) => setBod(e.target.value)}
                      />
                    </div>
                  )}
                  {selectedAdditionalParams.includes("conductivity") && (
                    <div className="space-y-2">
                      <label htmlFor="conductivity" className="text-sm font-medium">
                        Conductivity (μS/cm)
                      </label>
                      <Input
                        id="conductivity"
                        type="number"
                        step="any"
                        placeholder="e.g., 500"
                        value={conductivity}
                        onChange={(e) => setConductivity(e.target.value)}
                      />
                    </div>
                  )}
                  {selectedAdditionalParams.includes("aod") && (
                    <div className="space-y-2">
                      <label htmlFor="aod" className="text-sm font-medium">
                        AOD
                      </label>
                      <Input
                        id="aod"
                        type="number"
                        step="any"
                        placeholder="e.g., 0.5"
                        value={aod}
                        onChange={(e) => setAod(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmittingDraft}>
                {editingMarkerId ? "Update Marker" : "Add Marker"}
              </Button>
              {editingMarkerId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="bg-transparent">
                  Cancel
                </Button>
              )}
            </div>

            {draftMarkers.length > 0 && (
              <Button
                type="button"
                variant="default"
                className="w-full"
                disabled={isSubmittingDraft || draftMarkers.length === 0}
                onClick={async () => {
  if (draftMarkers.length === 0 || isSubmittingDraft) return;

  const snapshot = draftMarkers.map((m) => ({ ...m }));
  setPendingSubmitMarkers(snapshot);
  onDraftMarkersChange([]);
  resetDraftFormState();
  setDraftPage(0);
  setSubmitError(null);
  setIsSubmittingDraft(true);
  setSubmitStatus("processing");
  onProcessingChange?.(true);

  // ── Build the payload the backend expects ──────────────────────
  const markers = snapshot.map((m) => ({
    lake_id:     m.lakeId != null ? Number(m.lakeId) : undefined,
    lat:         m.latitude,
    lng:         m.longitude,
    parameters:  m.essentialParameters,           // already a flat { key: number } map
    observed_at: m.timestamp.toISOString(),
  }));

  try {
    const res = await fetch("http://localhost:8000/api/lakes/submit", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ markers }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.message ?? `Server error ${res.status}`;
      setSubmitError(msg);
      setSubmitStatus("idle");
      setIsSubmittingDraft(false);
      onProcessingChange?.(false);
      // Restore draft markers so the user doesn't lose their work
      onDraftMarkersChange(snapshot);
      return;
    }

    // Backend accepted → show Accept / Reject decision UI
    setSubmitStatus("awaitingDecision");
  } catch (networkErr) {
    setSubmitError("Network error — please check your connection and try again.");
    setSubmitStatus("idle");
    setIsSubmittingDraft(false);
    onProcessingChange?.(false);
    onDraftMarkersChange(snapshot);  // restore on failure
  }
}}
              >
                {isSubmittingDraft
                  ? submitStatus === "processing"
                    ? "Processing…"
                    : submitStatus === "awaitingDecision"
                      ? "Awaiting decision…"
                      : "Submit"
                  : `Submit (${draftMarkers.length})`}
              </Button>
            )}
          </form>

          {isEssentialModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Essential Parameters (22)</p>
                    <p className="text-xs text-muted-foreground">Fill all values (decimals allowed), then save.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEssentialModalOpen(false)}
                    className="h-8 w-8 p-0"
                    aria-label="Close essential parameters"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    {ESSENTIAL_PARAMETERS.map((p) => {
                      const displayLabel =
                        p.key === "magnesium_mg_l_1"
                          ? `${p.label} (1)`
                          : p.key === "magnesium_mg_l_2"
                            ? `${p.label} (2)`
                            : p.label;
                      return (
                        <div key={p.key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            {displayLabel}
                          </label>
                          <Input
                            type="number"
                            step="any"
                            value={essentialDraft[p.key] ?? ""}
                            placeholder={p.unit ? `e.g., 1 ${p.unit}` : "e.g., 1"}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEssentialDraft((prev) => ({
                                ...prev,
                                [p.key]: v,
                              }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {essentialError && (
                    <p className="text-xs text-destructive mt-3">{essentialError}</p>
                  )}
                </div>

                <div className="p-4 border-t border-border flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => {
                      const parsed: Record<string, number> = {};
                      let ok = true;
                      ESSENTIAL_PARAMETERS.forEach((p) => {
                        const raw = essentialDraft[p.key] ?? "";
                        const num = parseFloat(raw);
                        if (raw === "" || Number.isNaN(num) || !Number.isFinite(num)) {
                          ok = false;
                        }
                        parsed[p.key] = num;
                      });
                      if (!ok) {
                        setEssentialError("Please fill all essential parameters with valid numbers.");
                        return;
                      }
                      setEssentialParameters(parsed);
                      // Keep turbidity/pH inputs in sync (they are used in existing popup/history code).
                      setTurbidity(String(parsed["Turbidity [NTU]"]));
                      setPh(String(parsed["pH"]));
                      setEssentialError(null);
                      setIsEssentialModalOpen(false);
                    }}
                    disabled={
                      !ESSENTIAL_PARAMETERS.every((p) => {
                        const raw = essentialDraft[p.key] ?? "";
                        const num = parseFloat(raw);
                        return raw !== "" && !Number.isNaN(num) && Number.isFinite(num);
                      })
                    }
                  >
                    Save & Close
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Test data</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAddSamplePoints}>
                Add 50 random points
              </Button>
              {samplePointIds.size > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={handleDeleteSamplePoints}>
                  Delete sample points ({samplePointIds.size})
                </Button>
              )}
            </div>
          </div>

          {((draftMarkers.length > 0) || (isSubmittingDraft && pendingSubmitMarkers && pendingSubmitMarkers.length > 0)) && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">
                {isSubmittingDraft && pendingSubmitMarkers
                  ? `Submitting (${pendingSubmitMarkers.length})…`
                  : `Draft markers (${draftMarkers.length})`}
                {waterType && ` — ${WATER_TYPE_LABELS[waterType]}`}
                <span className="ml-2 text-xs text-muted-foreground">
                  Submitted in history: {submittedMarkers.length}
                </span>
              </p>
              {draftMarkers.length > 0 && (
              <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {draftMarkers
                  .slice(
                    draftPage * DRAFT_PAGE_SIZE,
                    draftPage * DRAFT_PAGE_SIZE + DRAFT_PAGE_SIZE
                  )
                  .map((marker) => (
                  <div
                    key={marker.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleMarkerClick(marker)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleMarkerClick(marker);
                      }
                    }}
                    className="text-xs p-3 bg-muted rounded space-y-2 cursor-pointer hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMarker(marker);
                          }}
                          className={`h-6 px-2 ${editingMarkerId === marker.id ? "bg-primary text-primary-foreground" : ""}`}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMarker(marker.id);
                          }}
                          className="h-6 px-2"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                      <span>Turbidity: {marker.turbidity} NTU</span>
                      <span>pH: {marker.ph}</span>
                      {marker.temperature != null && <span>Temp: {marker.temperature}°C</span>}
                      {marker.bod != null && <span>BOD: {marker.bod} mg/L</span>}
                      {marker.conductivity !== undefined && (
                        <span>Cond: {marker.conductivity} μS/cm</span>
                      )}
                      {marker.aod !== undefined && (
                        <span>AOD: {marker.aod}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {draftMarkers.length > DRAFT_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    disabled={draftPage === 0}
                    onClick={() => setDraftPage((p) => Math.max(0, p - 1))}
                    className="px-2 py-1 rounded border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    Prev
                  </button>
                  <span>
                    Page {draftPage + 1} of{" "}
                    {Math.ceil(draftMarkers.length / DRAFT_PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    disabled={(draftPage + 1) * DRAFT_PAGE_SIZE >= draftMarkers.length}
                    onClick={() =>
                      setDraftPage((p) =>
                        (p + 1) * DRAFT_PAGE_SIZE >= draftMarkers.length ? p : p + 1
                      )
                    }
                    className="px-2 py-1 rounded border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    Next
                  </button>
                </div>
              )}
              </>
              )}

              {/* Submission status & confirmation UI */}
              {submitStatus === "processing" && (
                <p className="mt-2 text-sm text-muted-foreground">Processing…</p>
              )}
              {submitError && (
                <p className="mt-2 text-xs text-destructive">{submitError}</p>
              )}
              {submitStatus === "awaitingDecision" && (
                <div className="mt-3 p-2 border border-border rounded bg-muted/60 space-y-2 text-xs">
                  <p className="font-medium text-foreground">
                    Processing complete. Apply these points?
                  </p>
                  <p className="text-muted-foreground">
                    Accept to save these points to the map and history, or reject to record a
                    rejected session in your profile (points are not saved; you can retry from profile).
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!pendingSubmitMarkers) return;
                        // Accept: commit processed markers to submitted + sessions via parent.
                        onSubmitDraftMarkers(pendingSubmitMarkers);
                        mapRef.current?.triggerRepaint();
                        setPendingSubmitMarkers(null);
                        resetDraftFormState();
                        onDraftMarkersChange([]);
                        setSubmitStatus("accepted");
                        setIsSubmittingDraft(false);
                        setDraftPage(0);
                        onProcessingChange?.(false);
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Reject: record a rejected session in profile only (no map/history update).
                        // Clear draft markers and form so points disappear from map, like Accept.
                        if (pendingSubmitMarkers && onRejectDraftSession) {
                          onRejectDraftSession(pendingSubmitMarkers);
                        }
                        setPendingSubmitMarkers(null);
                        onDraftMarkersChange([]);
                        resetDraftFormState();
                        setSubmitStatus("rejected");
                        setIsSubmittingDraft(false);
                        setDraftPage(0);
                        onProcessingChange?.(false);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
              {submitStatus === "accepted" && !isSubmittingDraft && (
                <p className="mt-2 text-xs text-emerald-500">
                  Submission processed and saved.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Point history slide-over panel with History / Charts tabs on left boundary */}
      {markerHistoryPanelMarker && (
        <div
          className={`fixed right-0 top-0 z-50 h-full flex transition-transform duration-300 ease-out ${
            historyPanelVisible ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label="Point history and charts"
        >
          {/* Protruding tabs on the left edge of the box */}
          <div className="flex flex-col gap-1 self-center py-4 -mr-px">
            <button
              type="button"
              onClick={() => setPointHistoryPanelTab("history")}
              className={`flex items-center justify-center w-11 h-14 rounded-l-md border border-r-0 border-border shadow-md text-xs font-medium transition-colors ${
                pointHistoryPanelTab === "history"
                  ? "bg-card text-foreground"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted"
              }`}
              title="History"
              aria-pressed={pointHistoryPanelTab === "history"}
            >
              <span className="[writing-mode:vertical-rl] rotate-180">History</span>
            </button>
            <button
              type="button"
              onClick={() => setPointHistoryPanelTab("charts")}
              className={`flex items-center justify-center w-11 h-14 rounded-l-md border border-r-0 border-border shadow-md text-xs font-medium transition-colors ${
                pointHistoryPanelTab === "charts"
                  ? "bg-card text-foreground"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted"
              }`}
              title="Charts"
              aria-pressed={pointHistoryPanelTab === "charts"}
            >
              <span className="[writing-mode:vertical-rl] rotate-180">Charts</span>
            </button>
          </div>

          {/* Main panel content */}
          <aside className="w-full max-w-md h-full bg-card border-l border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                {pointHistoryPanelTab === "history" ? (
                  <History className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <BarChart2 className="h-5 w-5 text-muted-foreground" />
                )}
                {pointHistoryPanelTab === "history" ? "Point History" : "Charts"}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMarkerHistoryPanelMarker(null)}
                className="h-8 w-8 p-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {pointHistoryPanelTab === "history" && (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    {markerHistoryPanelMarker.latitude.toString()}, {markerHistoryPanelMarker.longitude.toString()}
                  </p>
                  {markerHistoryPanelMarker.lakeId && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Lake ID: <span className="font-medium text-foreground">{markerHistoryPanelMarker.lakeId}</span>
                    </p>
                  )}

                  {/* Error state */}
                  {historyError && (
                    <p className="text-xs text-destructive mb-3">{historyError}</p>
                  )}

                  {/* Loading first page */}
                  {historyLoading && pointHistoryEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground animate-pulse">Loading history…</p>
                  )}

                  {/* Empty state */}
                  {!historyLoading && !historyError && pointHistoryEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground">No history records found for this point.</p>
                  )}

                  {/* History list */}
                  {pointHistoryEntries.length > 0 && (
                    <ul className="space-y-3">
                      {pointHistoryEntries.map((entry, index) => (
                        <li
                          key={index}
                          className="p-4 rounded-lg border border-border bg-muted/30 space-y-2"
                        >
                          {/* Header: date + WQI */}
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              WQI {entry.wqi != null ? Number(entry.wqi).toFixed(1) : "—"}
                            </span>
                          </div>
                          {/* Parameters: top 4 collapsed, all expanded */}
                          {entry.parameters && Object.keys(entry.parameters).length > 0 && (() => {
                            const allParams = Object.entries(entry.parameters);
                            const isExpanded = expandedHistoryIndex === index;
                            const visible = isExpanded ? allParams : allParams.slice(0, 4);
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-2">
                                  {visible.map(([key, val]) => (
                                    <div key={key} className="min-w-0">
                                      <span className="text-muted-foreground break-words">{key}:</span>{" "}
                                      <span className="font-medium">{val != null ? String(val) : "—"}</span>
                                    </div>
                                  ))}
                                </div>
                                {allParams.length > 4 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedHistoryIndex(isExpanded ? null : index)}
                                    className="mt-2 text-xs text-primary hover:underline"
                                  >
                                    {isExpanded ? "Show less ▲" : `+${allParams.length - 4} more ▼`}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Load more */}
                  {historyHasMore && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={loadMoreHistory}
                      disabled={historyLoading}
                    >
                      {historyLoading ? "Loading…" : "Load more"}
                    </Button>
                  )}
                </>
              )}
              {pointHistoryPanelTab === "charts" && (
                <PointChartsPanel
                  availableYears={availableYears}
                  year={chartYear}
                  onYearChange={setChartYear}
                />
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}