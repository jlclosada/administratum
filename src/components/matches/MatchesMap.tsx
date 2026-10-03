import { matchDay } from "@/lib/matches";
import type { Match } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// OpenStreetMap's own tiles (free with attribution; fine for this traffic),
// darkened with a CSS filter (.map-tiles-dark) to sit in the dark theme.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const pin = (label: string, highlight = false) =>
  L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center">
      <span style="background:${highlight ? "#f5e3b5" : "#d8c08a"};color:#141416;font:600 11px/1 system-ui;padding:5px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.5)">${label}</span>
      <span style="width:2px;height:8px;background:#d8c08a"></span></div>`,
    iconSize: [0, 0],
  });

/** Games on a map (OpenStreetMap). Online games have no pin. */
export function MatchesMap({
  matches,
  center,
  className,
  single = false,
}: {
  matches: Match[];
  center?: { lat: number; lng: number } | null;
  className?: string;
  /** One game (detail page): no navigation, fixed zoom. */
  single?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: !single }).setView(
      [center?.lat ?? 40.2, center?.lng ?? -3.7],
      center ? 10 : 5,
    );
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18, className: "map-tiles-dark" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // Created once; markers and view update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const located = matches.filter((m) => m.lat != null && m.lng != null);
    for (const m of located) {
      const marker = L.marker([m.lat!, m.lng!], { icon: pin(single ? m.city || "Aquí" : matchDay(m.startsOn)), keyboard: !single });
      if (!single) marker.on("click", () => navigate(`/partidas/${m.id}`));
      marker.addTo(layer.current);
    }
    if (center && !single) {
      L.circleMarker([center.lat, center.lng], { radius: 6, color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.9, weight: 2 }).addTo(layer.current);
    }
    const points: L.LatLngExpression[] = located.map((m) => [m.lat!, m.lng!]);
    if (center && !single) points.push([center.lat, center.lng]);
    if (single && points[0]) map.current.setView(points[0], 13);
    else if (points.length > 1) map.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 12 });
    else if (points[0]) map.current.setView(points[0], 11);
  }, [matches, center, single, navigate]);

  return <div ref={el} className={className ?? "h-[480px] w-full overflow-hidden rounded-2xl border border-border/60"} role="region" aria-label="Mapa de partidas" />;
}
