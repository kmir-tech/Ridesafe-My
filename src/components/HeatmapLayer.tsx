"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface HeatmapLayerProps {
  visible: boolean;
  points: [number, number, number][];
  onBoundsChange?: (bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number }) => void;
}

export default function HeatmapLayer({ visible, points, onBoundsChange }: HeatmapLayerProps) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Report bounds changes when heatmap is visible
  useEffect(() => {
    if (!visible || !onBoundsChange) return;

    const reportBounds = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        onBoundsChange({
          latMin: b.getSouth(),
          latMax: b.getNorth(),
          lonMin: b.getWest(),
          lonMax: b.getEast(),
        });
      }, 2000);
    };

    // Report initial bounds
    reportBounds();
    map.on("moveend", reportBounds);
    map.on("zoomend", reportBounds);

    return () => {
      map.off("moveend", reportBounds);
      map.off("zoomend", reportBounds);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [visible, map, onBoundsChange]);

  useEffect(() => {
    if (!visible || points.length === 0) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    // Dynamically import leaflet.heat to avoid SSR issues
    import("leaflet.heat").then(() => {
      // leaflet.heat patches the global L object
      const L = (window as typeof window & { L: typeof import("leaflet") }).L;
      if (!L || typeof (L as unknown as Record<string, unknown>).heatLayer !== "function") return;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }

      const heatLayer = (L as unknown as { heatLayer: (pts: [number, number, number][], opts: object) => L.Layer }).heatLayer(points, {
        radius: 50,
        blur: 30,
        maxZoom: 10,
        max: 1.0,
        gradient: {
          "0.0": "#22c55e",
          "0.5": "#eab308",
          "1.0": "#ef4444",
        },
      });

      layerRef.current = heatLayer;
      heatLayer.addTo(map);
    }).catch(() => {});

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [visible, points, map]);

  return null;
}
