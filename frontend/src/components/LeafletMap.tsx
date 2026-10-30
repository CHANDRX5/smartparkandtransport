import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  type?: 'parking' | 'user' | 'hospital' | 'fuel' | 'ev' | 'destination';
  availableSpaces?: number;
  totalCapacity?: number;
  hourlyRate?: number;
  onClick?: () => void;
  actionLabel?: string;
}

export type MapLayer = 'street' | 'satellite';

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][];
  height?: string;
  className?: string;
  /** If provided, a layer switcher control is shown */
  showLayerControl?: boolean;
  defaultLayer?: MapLayer;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [12.9716, 77.5946],
  zoom = 13,
  markers = [],
  routeCoordinates = [],
  height = '480px',
  className = '',
  showLayerControl = false,
  defaultLayer = 'street',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const currentLayerRef = useRef<MapLayer>(defaultLayer);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(center, zoom);

      // Street tile layer (OpenStreetMap)
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });

      // Satellite tile layer (Esri World Imagery — free, no API key needed)
      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA',
        }
      );

      streetLayerRef.current = streetLayer;
      satelliteLayerRef.current = satelliteLayer;

      // Add default layer
      if (defaultLayer === 'satellite') {
        satelliteLayer.addTo(map);
      } else {
        streetLayer.addTo(map);
      }
      currentLayerRef.current = defaultLayer;

      // Layer groups
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Layer switcher control
      if (showLayerControl) {
        const LayerControl = L.Control.extend({
          options: { position: 'topright' },
          onAdd: () => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.cssText = 'background:white;border:none;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);overflow:hidden;';

            const streetBtn = L.DomUtil.create('button', '', container);
            streetBtn.innerHTML = '🗺 Street';
            streetBtn.style.cssText = 'display:block;width:100%;padding:6px 10px;font-size:11px;font-weight:600;border:none;background:white;cursor:pointer;color:#374151;border-bottom:1px solid #e5e7eb;';

            const satBtn = L.DomUtil.create('button', '', container);
            satBtn.innerHTML = '🛰 Satellite';
            satBtn.style.cssText = 'display:block;width:100%;padding:6px 10px;font-size:11px;font-weight:600;border:none;background:white;cursor:pointer;color:#374151;';

            const updateActive = (layer: MapLayer) => {
              streetBtn.style.background = layer === 'street' ? '#EFF6FF' : 'white';
              streetBtn.style.color = layer === 'street' ? '#1d4ed8' : '#374151';
              satBtn.style.background = layer === 'satellite' ? '#EFF6FF' : 'white';
              satBtn.style.color = layer === 'satellite' ? '#1d4ed8' : '#374151';
            };

            updateActive(defaultLayer);

            L.DomEvent.on(streetBtn, 'click', () => {
              if (currentLayerRef.current !== 'street') {
                map.removeLayer(satelliteLayer);
                streetLayer.addTo(map);
                currentLayerRef.current = 'street';
                updateActive('street');
              }
            });

            L.DomEvent.on(satBtn, 'click', () => {
              if (currentLayerRef.current !== 'satellite') {
                map.removeLayer(streetLayer);
                satelliteLayer.addTo(map);
                currentLayerRef.current = 'satellite';
                updateActive('satellite');
              }
            });

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            return container;
          },
        });
        new LayerControl().addTo(map);
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Center
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const createCustomIcon = (type: string = 'parking', available?: number) => {
      let bg = '#2563eb';
      let iconChar = 'P';

      if (type === 'user') {
        bg = '#10b981';
        iconChar = '📍';
      } else if (type === 'ev') {
        bg = '#059669';
        iconChar = '⚡';
      } else if (type === 'hospital') {
        bg = '#ef4444';
        iconChar = '🏥';
      } else if (type === 'fuel') {
        bg = '#f59e0b';
        iconChar = '⛽';
      } else if (type === 'destination') {
        bg = '#dc2626';
        iconChar = '🏁';
      } else {
        if (available !== undefined && available <= 5) bg = '#e11d48';
      }

      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background-color: ${bg};
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${iconChar}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
      });
    };

    const bounds = L.latLngBounds([]);

    markers.forEach((m) => {
      const latlng: [number, number] = [m.lat, m.lng];
      bounds.extend(latlng);

      const marker = L.marker(latlng, {
        icon: createCustomIcon(m.type, m.availableSpaces),
      });

      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 180px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${m.title}</h4>
          ${m.subtitle ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">${m.subtitle}</p>` : ''}
          ${
            m.availableSpaces !== undefined
              ? `
              <div style="margin: 8px 0; padding: 6px; background: #f1f5f9; border-radius: 6px; display: flex; justify-content: space-between; font-size: 12px;">
                <span style="color: #475569;">Available Spots:</span>
                <strong style="color: ${m.availableSpaces > 5 ? '#059669' : '#dc2626'}">${m.availableSpaces} / ${m.totalCapacity || ''}</strong>
              </div>
            `
              : ''
          }
          ${
            m.hourlyRate !== undefined
              ? `<div style="font-size: 12px; margin-bottom: 8px;">Rate: <strong>₹${m.hourlyRate}/hr</strong></div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      if (m.onClick) marker.on('click', m.onClick);
      marker.addTo(markersLayer);
    });

    // Draw route polyline if provided
    if (routeCoordinates && routeCoordinates.length > 0) {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }
      const polyline = L.polyline(routeCoordinates, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);
      routePolylineRef.current = polyline;
      bounds.extend(polyline.getBounds());
    }

    if (markers.length > 1 || (routeCoordinates && routeCoordinates.length > 0)) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    } else {
      map.setView(center, zoom);
    }
  }, [markers, routeCoordinates, center, zoom]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className={`rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0 relative ${className}`}
    />
  );
};
