'use client';

import { useEffect, useMemo, useRef } from 'react';
import { decodePolyline } from '@/lib/polyline';
import type { StravaActivity } from '@/types/strava';

// Leaflet CSS must be imported
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  activities: StravaActivity[];
  selectedId?: number | null;
  height?: string;
}

export function RouteMap({ activities, selectedId, height = '600px' }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Polyline[]>([]);

  // Decode all polylines
  const routes = useMemo(() => {
    return activities
      .filter(a => a.map?.summary_polyline)
      .map(a => ({
        id: a.id,
        name: a.name,
        date: a.start_date,
        distance: a.distance,
        pace: a.average_speed > 0 ? 1000 / a.average_speed : 0,
        coords: decodePolyline(a.map.summary_polyline!),
      }))
      .filter(r => r.coords.length > 0);
  }, [activities]);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    // Dynamically import Leaflet (SSR safe)
    import('leaflet').then(L => {
      if (mapInstance.current) {
        // Clear existing layers
        layersRef.current.forEach(l => l.remove());
        layersRef.current = [];
      } else {
        // Initialize map
        mapInstance.current = L.map(mapRef.current!, {
          preferCanvas: true, // Canvas renderer for better perf
          zoomControl: true,
        }).setView([41.9, 12.5], 12); // Default: Rome

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(mapInstance.current);
      }

      const map = mapInstance.current!;
      const allPoints: [number, number][] = [];

      // Draw routes
      routes.forEach(route => {
        const isSelected = selectedId === route.id;
        const latLngs = route.coords.map(([lat, lng]) => L.latLng(lat, lng));
        allPoints.push(...route.coords);

        const polyline = L.polyline(latLngs, {
          color: isSelected ? '#ff4d00' : 'rgba(255, 77, 0, 0.3)',
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1 : 0.6,
        }).addTo(map);

        polyline.bindTooltip(
          `<strong>${route.name}</strong><br>${(route.distance / 1000).toFixed(1)} km`,
          { sticky: true }
        );

        layersRef.current.push(polyline);
      });

      // Fit bounds to all routes
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => L.latLng(lat, lng)));
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      // If a selected route, center on it
      if (selectedId) {
        const selected = routes.find(r => r.id === selectedId);
        if (selected?.coords.length) {
          const bounds = L.latLngBounds(selected.coords.map(([lat, lng]) => L.latLng(lat, lng)));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    });

    return () => {
      // Don't destroy map on re-render, just clear layers
    };
  }, [routes, selectedId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden border border-border"
    />
  );
}
