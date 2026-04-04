"use client";

import MapLibreGL from "maplibre-gl";
import { useEffect, useId } from "react";
import { useMap } from "@/components/ui/map";

export type WqiColorStop = [number, string];

export type PointClickPayload = {
  lngLat: { lng: number; lat: number };
  properties: Record<string, unknown>;
  lake_id: string | null;
};

export type MapMVTClusterLayerProps = {
  tileUrl: string;
  clusterColor?: string;
  pointColor?: string;
  wqiColorStops?: WqiColorStop[];
  onClusterClick?: (coords: [number, number], pointCount: number) => void;
  onPointClick?: (payload: PointClickPayload) => void;
};

// FIX: ["to-number", ["get", "avg_wqi"], 0] — MVT encodes all values as strings,
// "step" requires a number. The second arg (0) is the fallback if coercion fails.
function buildWqiColorExpr(
  stops: WqiColorStop[],
  fallback: string
): MapLibreGL.ExpressionSpecification {
  const expr: unknown[] = ["step", ["to-number", ["get", "avg_wqi"], 0], fallback];
  for (const [threshold, color] of stops) {
    expr.push(threshold, color);
  }
  return expr as MapLibreGL.ExpressionSpecification;
}

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

  // FIX: MVT booleans come through as integers 1/0, not JS true/false.
  // Also coerce with to-number for safety.
  const isClusterFilter  = ["==", ["to-number", ["get", "is_cluster"], 0], 1] as MapLibreGL.ExpressionSpecification;
  const notClusterFilter = ["==", ["to-number", ["get", "is_cluster"], 0], 0] as MapLibreGL.ExpressionSpecification;

  useEffect(() => {
    if (!isLoaded || !map) return;

    try {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "vector",
          tiles: [tileUrl],
          minzoom: 0,
          maxzoom: 22,
        });
      }
    } catch (err) {
      console.error("[MapMVTClusterLayer] addSource failed:", err);
      return;
    }

    const clusterFill: MapLibreGL.ExpressionSpecification = wqiColorStops
      ? buildWqiColorExpr(wqiColorStops, clusterColor)
      : clusterColor as unknown as MapLibreGL.ExpressionSpecification;

    const pointFill: MapLibreGL.ExpressionSpecification = wqiColorStops
      ? buildWqiColorExpr(wqiColorStops, pointColor)
      : pointColor as unknown as MapLibreGL.ExpressionSpecification;

    // Cluster circles
    try {
      if (!map.getLayer(clusterLayerId)) {
        map.addLayer({
          id: clusterLayerId,
          type: "circle",
          source: sourceId,
          "source-layer": "markers",
          filter: isClusterFilter,
          paint: {
            "circle-color": clusterFill,
            // FIX: coerce point_count string → number before interpolating
            "circle-radius": [
              "interpolate", ["linear"],
              ["to-number", ["get", "point_count"], 1],
              1,    16,
              100,  28,
              500,  36,
              1000, 40,
            ] as MapLibreGL.ExpressionSpecification,
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
    } catch (err) {
      console.error("[MapMVTClusterLayer] cluster circle layer failed:", err);
    }

    // Count label — no text-font (satellite style has no glyph server)
    try {
      if (!map.getLayer(countLayerId)) {
        map.addLayer({
          id: countLayerId,
          type: "symbol",
          source: sourceId,
          "source-layer": "markers",
          filter: isClusterFilter,
          layout: {
            // FIX: to-number first, then to-string for display
            "text-field": ["to-string", ["to-number", ["get", "point_count"], 0]],
            "text-size": 12,
            // text-font intentionally omitted — satellite style has no glyph server
          },
          paint: { "text-color": "#ffffff" },
        });
      }
    } catch (err) {
      console.warn("[MapMVTClusterLayer] count label skipped (non-fatal):", err);
    }

    // Individual points
    try {
      if (!map.getLayer(pointLayerId)) {
        map.addLayer({
          id: pointLayerId,
          type: "circle",
          source: sourceId,
          "source-layer": "markers",
          filter: notClusterFilter,
          paint: {
            "circle-color": pointFill,
            "circle-radius": 6,
            "circle-opacity": 0.9,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
    } catch (err) {
      console.error("[MapMVTClusterLayer] point layer failed:", err);
    }

    return () => {
      try {
        if (map.getLayer(countLayerId))   map.removeLayer(countLayerId);
        if (map.getLayer(pointLayerId))   map.removeLayer(pointLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId))      map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, tileUrl]);

 

  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClusterClick = (
      e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }
    ) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
      if (!features.length) return;
      const feature = features[0];
      const coords  = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const count   = Number(feature.properties?.point_count ?? 0);
      if (onClusterClick) {
        onClusterClick(coords, count);
      } else {
        map.flyTo({ center: coords, zoom: Math.min(map.getZoom() + 2, 22), duration: 800 });
      }
    };

    const handlePointClick = (e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const features = map.queryRenderedFeatures(e.point, { layers: [pointLayerId] });
      if (!features.length) return;

      if (onPointClick) {
        const payload: PointClickPayload = {
          lngLat: e.lngLat,
          properties: features[0].properties,
          lake_id: (features[0].properties.lake_id as string) ?? null,
        };
        onPointClick(payload);
      }
    };

    const enterPtr = () => { map.getCanvas().style.cursor = "pointer"; };
    const leavePtr = () => { map.getCanvas().style.cursor = ""; };

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