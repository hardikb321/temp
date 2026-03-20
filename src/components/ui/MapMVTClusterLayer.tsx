/**
 * MapMVTClusterLayer
 *
 * Drop this component into map.tsx (or its own file) alongside the existing
 * MapClusterLayer.  It replaces the client-side supercluster approach with a
 * MapLibre vector-tile source that fetches pre-built cluster tiles directly
 * from your backend:
 *
 *   GET /api/lakes/markers/:z/:x/:y.mvt
 *
 * The backend already handles all zoom-level cluster tables (z2, z4, z6, z9,
 * z11, z13) and serves individual markers at z ≥ 14 — so the frontend just
 * needs to load the tiles and style two layers:
 *   • "markers" source-layer, is_cluster === true  → cluster circle + count label
 *   • "markers" source-layer, is_cluster === false → individual point circle
 *
 * Props
 * ──────
 *  tileUrl         Full URL template, e.g.
 *                  "http://localhost:3000/api/lakes/markers/{z}/{x}/{y}.mvt"
 *  clusterColor    CSS hex for cluster circles          (default #51bbd6)
 *  pointColor      CSS hex for individual point circles (default #3b82f6)
 *  wqiColorStops   Optional colour ramp driven by avg_wqi (overrides clusterColor /
 *                  pointColor).  Format: [wqi_threshold, color][]
 *                  e.g. [[50, "#ef4444"], [75, "#f59e0b"], [100, "#22c55e"]]
 *  onClusterClick  Called when a cluster bubble is clicked. Default: zoom +2.
 *  onPointClick    Called when an individual marker is clicked.
 *                  Receives { lngLat, properties } — properties include id, lake_id, avg_wqi.
 */

"use client";

import MapLibreGL from "maplibre-gl";
import { useEffect, useId } from "react";
import { useMap } from "@/components/ui/map"; // adjust to wherever your useMap hook lives

// ─── Types ────────────────────────────────────────────────────────────────────

export type WqiColorStop = [number, string]; // [threshold, cssColor]

export type PointClickPayload = {
  lngLat: { lng: number; lat: number };
  properties: {
    id?: string | number;
    lake_id?: string | number;
    avg_wqi?: number;
    [key: string]: unknown;
  };
};

export type MapMVTClusterLayerProps = {
  /** MVT tile URL template — must contain {z}/{x}/{y} */
  tileUrl: string;
  /** Hex color for cluster circles (ignored when wqiColorStops is set) */
  clusterColor?: string;
  /** Hex color for individual point circles (ignored when wqiColorStops is set) */
  pointColor?: string;
  /**
   * Drive circle colour from avg_wqi property.
   * Array of [wqi_threshold, color] pairs, ascending.
   * e.g. [[50, "#ef4444"], [75, "#eab308"], [100, "#22c55e"]]
   */
  wqiColorStops?: WqiColorStop[];
  /**
   * Called when a cluster bubble is clicked.
   * Receives cluster coordinates and point_count.
   * Default behaviour: flyTo + zoom +2.
   */
  onClusterClick?: (coords: [number, number], pointCount: number) => void;
  /**
   * Called when an individual (non-cluster) marker is clicked.
   */
  onPointClick?: (payload: PointClickPayload) => void;
};

// ─── Helper: build MapLibre expression from WQI colour stops ─────────────────

function buildWqiColorExpr(
  stops: WqiColorStop[],
  fallback: string
): MapLibreGL.ExpressionSpecification {
  // ["step", ["get", "avg_wqi"], fallback, t1, c1, t2, c2, ...]
  const expr: unknown[] = ["step", ["get", "avg_wqi"], fallback];
  for (const [threshold, color] of stops) {
    expr.push(threshold, color);
  }
  return expr as MapLibreGL.ExpressionSpecification;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MapMVTClusterLayer({
  tileUrl,
  clusterColor = "#51bbd6",
  pointColor = "#3b82f6",
  wqiColorStops,
  onClusterClick,
  onPointClick,
}: MapMVTClusterLayerProps) {
  const { map, isLoaded } = useMap();
  const uid = useId();

  const sourceId       = `mvt-markers-${uid}`;
  const clusterLayerId = `mvt-clusters-${uid}`;
  const countLayerId   = `mvt-cluster-count-${uid}`;
  const pointLayerId   = `mvt-points-${uid}`;

  // ── 1. Add source + layers on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Vector tile source — MapLibre requests tiles at the current zoom level,
    // and your backend returns the appropriate pre-clustered table.
    map.addSource(sourceId, {
      type: "vector",
      tiles: [tileUrl],
      minzoom: 0,
      maxzoom: 22,
    });

    // Cluster colour expression
    const clusterFill: MapLibreGL.ExpressionSpecification = wqiColorStops
      ? buildWqiColorExpr(wqiColorStops, clusterColor)
      : clusterColor as unknown as MapLibreGL.ExpressionSpecification;

    // Individual point colour expression
    const pointFill: MapLibreGL.ExpressionSpecification = wqiColorStops
      ? buildWqiColorExpr(wqiColorStops, pointColor)
      : pointColor as unknown as MapLibreGL.ExpressionSpecification;

    // ── Cluster circle layer ─────────────────────────────────────────────────
    map.addLayer({
      id: clusterLayerId,
      type: "circle",
      source: sourceId,
      "source-layer": "markers",   // matches the MVT layer name in your SQL
      filter: ["==", ["get", "is_cluster"], true],
      paint: {
        "circle-color": clusterFill,
        // Scale radius with point_count (capped at 40 px)
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "point_count"],
          1,   16,
          100, 28,
          500, 36,
          1000, 40,
        ] as MapLibreGL.ExpressionSpecification,
        "circle-opacity": 0.85,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // ── Cluster count label ──────────────────────────────────────────────────
    map.addLayer({
      id: countLayerId,
      type: "symbol",
      source: sourceId,
      "source-layer": "markers",
      filter: ["==", ["get", "is_cluster"], true],
      layout: {
        "text-field": ["to-string", ["get", "point_count"]],
        "text-size": 12,
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // ── Individual point layer ───────────────────────────────────────────────
    map.addLayer({
      id: pointLayerId,
      type: "circle",
      source: sourceId,
      "source-layer": "markers",
      filter: ["==", ["get", "is_cluster"], false],
      paint: {
        "circle-color": pointFill,
        "circle-radius": 6,
        "circle-opacity": 0.9,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
      },
    });

    return () => {
      try {
        if (map.getLayer(countLayerId))   map.removeLayer(countLayerId);
        if (map.getLayer(pointLayerId))   map.removeLayer(pointLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId))      map.removeSource(sourceId);
      } catch {
        // ignore — map may already be destroyed
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // ── 2. Reload tiles when the URL changes (e.g. auth token rotation) ─────────
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.VectorTileSource | undefined;
    if (!source) return;
    // VectorTileSource doesn't expose setTiles in the public API before v4 —
    // workaround: remove & re-add the source.  The mount effect handles that
    // when the component remounts due to tileUrl change, so we just force it:
    if ((source as any).tiles?.[0] !== tileUrl) {
      try {
        if (map.getLayer(countLayerId))   map.removeLayer(countLayerId);
        if (map.getLayer(pointLayerId))   map.removeLayer(pointLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        map.removeSource(sourceId);
      } catch { /* ignore */ }
      // The mount effect above will re-add everything on next render.
    }
  }, [tileUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Click + cursor handlers ───────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Cluster click — zoom in (or call custom handler)
    const handleClusterClick = (
      e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }
    ) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
      if (!features.length) return;

      const feature   = features[0];
      const coords    = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const count     = (feature.properties?.point_count as number) ?? 0;

      if (onClusterClick) {
        onClusterClick(coords, count);
      } else {
        // Default: zoom +2 toward the cluster
        map.flyTo({
          center: coords,
          zoom: Math.min(map.getZoom() + 2, 22),
          duration: 800,
        });
      }
    };

    // Individual marker click
    const handlePointClick = (
      e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }
    ) => {
      if (!onPointClick) return;
      const features = map.queryRenderedFeatures(e.point, { layers: [pointLayerId] });
      if (!features.length) return;

      const feature = features[0];
      const coords  = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      // Correct for world copies
      let lng = coords[0];
      while (Math.abs(e.lngLat.lng - lng) > 180) {
        lng += e.lngLat.lng > lng ? 360 : -360;
      }

      onPointClick({
        lngLat: { lng, lat: coords[1] },
        properties: feature.properties ?? {},
      });
    };

    // Cursor helpers
    const setCursor  = (cur: string) => () => { map.getCanvas().style.cursor = cur; };
    const enterPtr   = setCursor("pointer");
    const leavePtr   = setCursor("");

    map.on("click",      clusterLayerId, handleClusterClick);
    map.on("click",      pointLayerId,   handlePointClick);
    map.on("mouseenter", clusterLayerId, enterPtr);
    map.on("mouseleave", clusterLayerId, leavePtr);
    map.on("mouseenter", pointLayerId,   enterPtr);
    map.on("mouseleave", pointLayerId,   leavePtr);

    return () => {
      map.off("click",      clusterLayerId, handleClusterClick);
      map.off("click",      pointLayerId,   handlePointClick);
      map.off("mouseenter", clusterLayerId, enterPtr);
      map.off("mouseleave", clusterLayerId, leavePtr);
      map.off("mouseenter", pointLayerId,   enterPtr);
      map.off("mouseleave", pointLayerId,   leavePtr);
    };
  }, [isLoaded, map, clusterLayerId, pointLayerId, onClusterClick, onPointClick]);

  return null;
}