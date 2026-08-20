import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react';
import { hasValidCoordinates } from '../utils/geofence';

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const RING = '#0284c7';
const RING_FILL = 'rgba(14, 165, 233, 0.15)';
const RING_FILL_SELECTED = 'rgba(14, 165, 233, 0.28)';

const STREET_PROVIDERS = [
  {
    credit: '(c) Esri',
    url: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
  },
  {
    credit: '(c) OpenStreetMap, CARTO',
    url: (z, x, y) =>
      `https://${['a', 'b', 'c', 'd'][(x + y) % 4]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  },
  {
    credit: '(c) OpenStreetMap',
    url: (z, x, y) => `https://tile.openstreetmap.de/${z}/${x}/${y}.png`,
  },
  {
    credit: '(c) OpenStreetMap',
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
];

const SATELLITE_PROVIDERS = [
  {
    credit: '(c) Esri',
    url: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  },
  {
    credit: '(c) OpenStreetMap, CARTO',
    url: (z, x, y) =>
      `https://${['a', 'b', 'c', 'd'][(x + y) % 4]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mercatorX(lng) {
  return (lng + 180) / 360;
}

function mercatorY(lat) {
  const clamped = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin((clamped * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function mercatorYToLat(y) {
  const n = Math.PI - 2 * Math.PI * y;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function wrapTile(x, z) {
  const n = 2 ** z;
  return ((x % n) + n) % n;
}

function wrapLng(lng) {
  return ((((Number(lng) + 180) % 360) + 360) % 360) - 180;
}

function shortestLngDelta(from, to) {
  let delta = wrapLng(to) - wrapLng(from);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function MapTile({ z, x, y, left, top, src, onError }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      onError={onError}
      className="pointer-events-none absolute max-w-none"
      style={{ left, top, width: TILE_SIZE, height: TILE_SIZE, zIndex: 2 }}
    />
  );
}

export function zoomForRadius(latitude, radiusMeters, size) {
  const span = Math.max(120, Math.min(size?.width || 640, size?.height || 480));
  const targetPx = span * 0.32;
  const cos = Math.cos((clamp(latitude, -85, 85) * Math.PI) / 180);
  const metersPerPixelNeeded = Math.max(1, Number(radiusMeters) || 150) / targetPx;
  const zoom = Math.log2((156543.03392 * Math.max(0.2, cos)) / metersPerPixelNeeded);
  return clamp(Math.round(zoom), MIN_ZOOM, MAX_ZOOM);
}

export function zoomToFitSites(sites, size) {
  const valid = (sites || []).filter(hasValidCoordinates);
  if (!valid.length) return null;
  if (valid.length === 1) {
    return {
      center: { lat: Number(valid[0].latitude), lng: Number(valid[0].longitude) },
      zoom: zoomForRadius(Number(valid[0].latitude), Number(valid[0].radius) || 150, size),
    };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const site of valid) {
    const lat = Number(site.latitude);
    const lng = Number(site.longitude);
    const radius = Math.max(0, Number(site.radius) || 0);
    const dLat = radius / 111320;
    const dLng = radius / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    minLat = Math.min(minLat, lat - dLat);
    maxLat = Math.max(maxLat, lat + dLat);
    minLng = Math.min(minLng, lng - dLng);
    maxLng = Math.max(maxLng, lng + dLng);
  }

  const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  const latSpanM = (maxLat - minLat) * 111320;
  const lngSpanM = (maxLng - minLng) * 111320 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  return {
    center,
    zoom: zoomForRadius(center.lat, Math.max(latSpanM, lngSpanM, 80) / 2, size),
  };
}

function metersToPixels(lat, zoom, meters) {
  const cos = Math.cos((clamp(lat, -85, 85) * Math.PI) / 180);
  const metersPerPixel = (156543.03392 * Math.max(0.2, cos)) / 2 ** zoom;
  return Math.max(8, meters / metersPerPixel);
}

function project(lat, lng, center, zoom, width, height) {
  const scale = 2 ** zoom;
  return {
    x: (mercatorX(lng) - mercatorX(center.lng)) * scale * TILE_SIZE + width / 2,
    y: (mercatorY(lat) - mercatorY(center.lat)) * scale * TILE_SIZE + height / 2,
  };
}

function unproject(x, y, center, zoom, width, height) {
  const scale = 2 ** zoom;
  const mx = mercatorX(center.lng) + (x - width / 2) / (scale * TILE_SIZE);
  const my = mercatorY(center.lat) + (y - height / 2) / (scale * TILE_SIZE);
  return {
    lat: mercatorYToLat(my),
    lng: mx * 360 - 180,
  };
}

function formatMeters(value) {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
}

function formatCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(5) : '-';
}

function defaultView() {
  return { lat: 24.8607, lng: 67.0011, zoom: 12 };
}

/**
 * Lightweight OSM/Esri tile map with geofence rings. No extra mapping library.
 */
export function GeofenceMap({
  sites = [],
  selectedId,
  preview,
  overlappingIds = [],
  pickMode = false,
  fitKey,
  onSelect,
  onPick,
  onResetView,
  className = '',
}) {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const viewRef = useRef(defaultView());
  const flyRef = useRef(0);
  const [measured, setMeasured] = useState(false);
  const [basemap, setBasemap] = useState('street');
  const [providerIndex, setProviderIndex] = useState(0);
  const providerLockRef = useRef(false);
  const [size, setSize] = useState({ width: 640, height: 480 });
  const [view, setView] = useState(defaultView);
  const [hovered, setHovered] = useState(null);

  const commitView = useCallback((next) => {
    const resolved = {
      lat: clamp(next.lat, -85.05112878, 85.05112878),
      lng: wrapLng(next.lng),
      zoom: clamp(Math.round(next.zoom), MIN_ZOOM, MAX_ZOOM),
    };
    viewRef.current = resolved;
    setView(resolved);
    return resolved;
  }, []);

  const flyTo = useCallback(
    (target, { animate = true, duration = 520 } = {}) => {
      if (!Number.isFinite(target?.lat) || !Number.isFinite(target?.lng)) return;
      const dest = {
        lat: clamp(target.lat, -85.05112878, 85.05112878),
        lng: wrapLng(target.lng),
        zoom: clamp(Math.round(Number.isFinite(target.zoom) ? target.zoom : viewRef.current.zoom), MIN_ZOOM, MAX_ZOOM),
      };
      cancelAnimationFrame(flyRef.current);
      if (!animate) {
        commitView(dest);
        return;
      }
      const start = viewRef.current;
      const dLng = shortestLngDelta(start.lng, dest.lng);
      const t0 = performance.now();
      const step = (now) => {
        const t = easeOutCubic(Math.min(1, (now - t0) / duration));
        commitView({
          lat: start.lat + (dest.lat - start.lat) * t,
          lng: start.lng + dLng * t,
          zoom: dest.zoom,
        });
        if (t < 1) flyRef.current = requestAnimationFrame(step);
      };
      flyRef.current = requestAnimationFrame(step);
    },
    [commitView]
  );

  const cameraTarget = useMemo(() => {
    if (preview && hasValidCoordinates(preview)) {
      const previewSite = {
        latitude: Number(preview.latitude),
        longitude: Number(preview.longitude),
        radius: Number(preview.radius) || 150,
      };
      const overlapSet = new Set((overlappingIds || []).map((id) => String(id)));
      const cluster = [
        previewSite,
        ...sites.filter((site) => overlapSet.has(String(site.id))),
      ];
      return (
        zoomToFitSites(cluster, size) || {
          center: { lat: previewSite.latitude, lng: previewSite.longitude },
          zoom: zoomForRadius(previewSite.latitude, previewSite.radius, size),
        }
      );
    }
    if (selectedId) {
      const site = sites.find((row) => String(row.id) === String(selectedId));
      if (site && hasValidCoordinates(site)) {
        return {
          center: { lat: Number(site.latitude), lng: Number(site.longitude) },
          zoom: zoomForRadius(Number(site.latitude), Number(site.radius) || 150, size),
        };
      }
    }
    return zoomToFitSites(sites, size) || { center: { lat: 24.8607, lng: 67.0011 }, zoom: 12 };
  }, [preview, overlappingIds, selectedId, sites, size]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) return;
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
      setMeasured(true);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!measured || !cameraTarget?.center) return undefined;
    if (!preview && !sites.length && !selectedId) return undefined;
    flyTo({ lat: cameraTarget.center.lat, lng: cameraTarget.center.lng, zoom: cameraTarget.zoom });
    return () => cancelAnimationFrame(flyRef.current);
  }, [fitKey, measured, flyTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const providers = basemap === 'satellite' ? SATELLITE_PROVIDERS : STREET_PROVIDERS;
  const activeProvider = providers[Math.min(providerIndex, providers.length - 1)];

  useEffect(() => {
    setProviderIndex(0);
    providerLockRef.current = false;
  }, [basemap]);

  const handleTileError = useCallback(() => {
    if (providerLockRef.current) return;
    providerLockRef.current = true;
    setProviderIndex((current) => {
      const next = current + 1 < providers.length ? current + 1 : current;
      if (next === current) providerLockRef.current = false;
      return next;
    });
  }, [providers.length]);

  useEffect(() => {
    providerLockRef.current = false;
  }, [providerIndex]);

  const tiles = useMemo(() => {
    const z = clamp(Math.round(view.zoom), MIN_ZOOM, MAX_ZOOM);
    const cols = Math.ceil(size.width / TILE_SIZE) + 3;
    const rows = Math.ceil(size.height / TILE_SIZE) + 3;
    const originX = mercatorX(view.lng) * 2 ** z;
    const originY = mercatorY(view.lat) * 2 ** z;
    const startX = Math.floor(originX - size.width / (2 * TILE_SIZE)) - 1;
    const startY = Math.floor(originY - size.height / (2 * TILE_SIZE)) - 1;
    const list = [];
    for (let y = startY; y < startY + rows; y += 1) {
      if (y < 0 || y >= 2 ** z) continue;
      for (let x = startX; x < startX + cols; x += 1) {
        const tx = wrapTile(x, z);
        list.push({
          key: `${basemap}-${z}-${tx}-${y}-${x}`,
          z,
          x: tx,
          y,
          left: (x - originX) * TILE_SIZE + size.width / 2,
          top: (y - originY) * TILE_SIZE + size.height / 2,
        });
      }
    }
    return list;
  }, [view, size, basemap]);

  const overlapSet = useMemo(() => new Set((overlappingIds || []).map((id) => String(id))), [overlappingIds]);

  const rings = useMemo(() => {
    const points = sites
      .filter(hasValidCoordinates)
      .map((site) => {
        const lat = Number(site.latitude);
        const lng = Number(site.longitude);
        const radius = Number(site.radius) || 100;
        const point = project(lat, lng, view, view.zoom, size.width, size.height);
        return {
          id: site.id,
          name: site.name,
          latitude: lat,
          longitude: lng,
          radius,
          selected: String(site.id) === String(selectedId),
          overlapping: overlapSet.has(String(site.id)),
          r: metersToPixels(lat, view.zoom, radius),
          ...point,
        };
      });
    if (preview && hasValidCoordinates(preview)) {
      const point = project(preview.latitude, preview.longitude, view, view.zoom, size.width, size.height);
      points.push({
        id: 'preview',
        name: preview.name || 'New location',
        latitude: Number(preview.latitude),
        longitude: Number(preview.longitude),
        radius: Number(preview.radius) || 100,
        selected: true,
        preview: true,
        overlapping: Boolean(preview.overlapping),
        r: metersToPixels(preview.latitude, view.zoom, Number(preview.radius) || 100),
        ...point,
      });
    }
    return points.sort((a, b) => b.r - a.r);
  }, [sites, preview, selectedId, overlapSet, view, size]);

  const onPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    const rect = rootRef.current.getBoundingClientRect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      origin: { ...viewRef.current },
      moved: false,
      px: event.clientX - rect.left,
      py: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setHovered(null);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const scale = 2 ** drag.origin.zoom * TILE_SIZE;
    commitView({
      lat: mercatorYToLat(mercatorY(drag.origin.lat) - dy / scale),
      lng: drag.origin.lng - (dx / scale) * 360,
      zoom: drag.origin.zoom,
    });
  };

  const onPointerUp = (event) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    if (!pickMode || !onPick) return;
    const point = unproject(drag.px, drag.py, viewRef.current, viewRef.current.zoom, size.width, size.height);
    onPick(point);
  };

  const nudgeZoom = (delta) => {
    const current = viewRef.current;
    const next = clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM);
    if (next === current.zoom) return;
    commitView({ ...current, zoom: next });
  };

  const handleReset = (event) => {
    event.stopPropagation();
    onResetView?.();
    const fit = zoomToFitSites(sites, size) || defaultView();
    const target = fit.center ? { lat: fit.center.lat, lng: fit.center.lng, zoom: fit.zoom } : fit;
    flyTo(target);
  };

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();
      const current = viewRef.current;
      const next = clamp(current.zoom + (event.deltaY < 0 ? 1 : -1), MIN_ZOOM, MAX_ZOOM);
      if (next === current.zoom) return;
      const rect = rootRef.current.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const before = unproject(px, py, current, current.zoom, size.width, size.height);
      const afterAnchor = unproject(px, py, { ...current, zoom: next }, next, size.width, size.height);
      commitView({
        zoom: next,
        lat: current.lat + (before.lat - afterAnchor.lat),
        lng: current.lng + (before.lng - afterAnchor.lng),
      });
    },
    [commitView, size]
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  useEffect(() => () => cancelAnimationFrame(flyRef.current), []);

  return (
    <div
      ref={rootRef}
      className={`geofence-map relative overflow-hidden bg-[#E8EEF2] ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      role="presentation"
      data-lenis-prevent
    >
      <div className="geofence-map-base absolute inset-0" aria-hidden />

      {tiles.map((tile) => (
        <MapTile
          key={`${activeProvider.credit}-${tile.key}`}
          z={tile.z}
          x={tile.x}
          y={tile.y}
          left={tile.left}
          top={tile.top}
          src={activeProvider.url(tile.z, tile.x, tile.y)}
          onError={handleTileError}
        />
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {rings.map((ring) => {
          const fill = ring.selected || ring.preview ? RING_FILL_SELECTED : RING_FILL;
          return (
            <g key={ring.id}>
              {ring.selected && (
                <circle
                  cx={ring.x}
                  cy={ring.y}
                  r={ring.r + 6}
                  fill="none"
                  stroke={RING}
                  strokeOpacity="0.35"
                  strokeWidth="6"
                />
              )}
              <circle
                cx={ring.x}
                cy={ring.y}
                r={ring.r}
                fill={fill}
                stroke={RING}
                strokeOpacity={ring.selected ? 0.98 : 0.9}
                strokeWidth={ring.selected ? 2.5 : 1.5}
              />
              <circle cx={ring.x} cy={ring.y} r={5} fill={RING} stroke="#fff" strokeWidth="2" />
            </g>
          );
        })}
      </svg>

      {onSelect &&
        !pickMode &&
        [...rings]
          .filter((ring) => ring.id !== 'preview')
          .sort((a, b) => b.r - a.r)
          .map((ring) => {
            const hit = Math.max(28, ring.r * 2);
            return (
              <button
                key={`hit-${ring.id}`}
                type="button"
                aria-label={`Select ${ring.name}`}
                title={ring.name}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(ring.id);
                }}
                onMouseEnter={() => setHovered(ring)}
                onMouseLeave={() => setHovered((current) => (current?.id === ring.id ? null : current))}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: ring.x,
                  top: ring.y,
                  width: hit,
                  height: hit,
                  zIndex: ring.selected ? 8 : Math.max(4, Math.round(700 - ring.r)),
                }}
              />
            );
          })}

      {hovered && (
        <div
          className="pointer-events-none absolute z-[7] min-w-[9rem] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-md"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <p className="text-xs font-semibold text-slate-800">{hovered.name}</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
            {formatCoord(hovered.latitude)}, {formatCoord(hovered.longitude)}
            {hovered.radius ? ` • ${formatMeters(hovered.radius)}` : ''}
          </p>
        </div>
      )}

      {pickMode && (
        <p className="pointer-events-none absolute left-3 top-3 z-[6] rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
          Click the map to set the centre
        </p>
      )}

      <div
        className="geofence-map-controls absolute right-3 top-3 z-[6] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ControlButton label="Zoom in" onClick={() => nudgeZoom(1)}>
          <Plus size={16} strokeWidth={2.2} />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => nudgeZoom(-1)}>
          <Minus size={16} strokeWidth={2.2} />
        </ControlButton>
        <ControlButton label="Fit all geofences" onClick={handleReset}>
          <LocateFixed size={15} strokeWidth={2.2} />
        </ControlButton>
        <ControlButton
          label={basemap === 'satellite' ? 'Show street map' : 'Show satellite'}
          pressed={basemap === 'satellite'}
          onClick={() => setBasemap((current) => (current === 'street' ? 'satellite' : 'street'))}
        >
          <Layers size={15} strokeWidth={2.2} />
        </ControlButton>
      </div>

      <p className="pointer-events-none absolute bottom-2 right-3 z-[3] text-[10px] text-slate-500">
        {activeProvider.credit}
      </p>
    </div>
  );
}

function ControlButton({ label, onClick, pressed = false, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed || undefined}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 ${
        pressed ? 'bg-[#F0FAFF] text-[#0284c7]' : 'bg-white'
      }`}
    >
      {children}
    </button>
  );
}
