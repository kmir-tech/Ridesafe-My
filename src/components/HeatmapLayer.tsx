"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface HeatmapLayerProps {
  visible: boolean;
  points: [number, number, number][];
}

export default function HeatmapLayer({ visible, points }: HeatmapLayerProps) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);

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
