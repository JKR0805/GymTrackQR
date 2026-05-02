import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths (broken by bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India center
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 16;

const MapPicker = ({ lat, lng, radiusMeters = 200, onChange, height = 320 }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [locating, setLocating] = useState(false);

  const updateMarker = useCallback((map, newLat, newLng, radius) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    } else {
      markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        const currentRadius = circleRef.current ? circleRef.current.getRadius() : radius;
        if (circleRef.current) {
          circleRef.current.setLatLng([pos.lat, pos.lng]);
        }
        onChange?.({ lat: pos.lat, lng: pos.lng, radiusMeters: currentRadius });
      });
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([newLat, newLng]);
      circleRef.current.setRadius(radius);
    } else {
      circleRef.current = L.circle([newLat, newLng], {
        radius,
        color: "#d4a017",
        fillColor: "#d4a017",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
    }
  }, [onChange]);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const hasCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
    const center = hasCoords ? [Number(lat), Number(lng)] : DEFAULT_CENTER;
    const zoom = hasCoords ? LOCATED_ZOOM : DEFAULT_ZOOM;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    if (hasCoords) {
      updateMarker(map, Number(lat), Number(lng), Number(radiusMeters) || 200);
    }

    // Click to place marker
    map.on("click", (e) => {
      const radius = circleRef.current ? circleRef.current.getRadius() : Number(radiusMeters) || 200;
      updateMarker(map, e.latlng.lat, e.latlng.lng, radius);
      onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng, radiusMeters: radius });
    });

    mapInstanceRef.current = map;

    // Force a resize after mount (fixes grey tiles on initial render)
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external prop changes to map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const hasCoords = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
    if (hasCoords) {
      updateMarker(map, Number(lat), Number(lng), Number(radiusMeters) || 200);
    }
  }, [lat, lng, radiusMeters, updateMarker]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        const radius = Number(radiusMeters) || 200;
        if (map) {
          map.setView([latitude, longitude], LOCATED_ZOOM);
          updateMarker(map, latitude, longitude, radius);
        }
        onChange?.({ lat: latitude, lng: longitude, radiusMeters: radius });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="map-picker">
      <div ref={mapRef} style={{ height, width: "100%", borderRadius: 10, overflow: "hidden" }} />
      <div className="map-picker-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleLocateMe}
          disabled={locating}
        >
          {locating ? "Locating..." : "Use My Location"}
        </button>
        <span className="map-picker-hint">Click the map or drag the marker to set gym location</span>
      </div>
    </div>
  );
};

export default MapPicker;
