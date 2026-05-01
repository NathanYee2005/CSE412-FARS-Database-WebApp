import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

function HeatLayer({ crashes }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const points = (crashes ?? [])
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => [Number(c.latitude), Number(c.longitude), c.fatals ?? 1]);
    if (points.length) {
      layerRef.current = L.heatLayer(points, { radius: 20, blur: 15, maxZoom: 10 }).addTo(map);
    }
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [crashes, map]);

  return null;
}

export default function CrashMap({ crashes }) {
  return (
    <MapContainer
      center={[40, -100]}
      zoom={4}
      style={{ height: '500px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <HeatLayer crashes={crashes} />
    </MapContainer>
  );
}
