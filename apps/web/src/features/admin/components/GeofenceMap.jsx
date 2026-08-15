import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const RING = '#00B0FF';

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

export function zoomForRadius(latitude, radiusMeters, size) {
  const span = Math.max(120, Math.min(size?.width || 640, size?.height || 480));
  const targetPx = span * 0.32;
  const cos = Math.cos((clamp(latitude, -85, 85) * Math.PI) / 180);
  const metersPerPixelNeeded = Math.max(1, Number(radiusMeters) || 150) / targetPx;
  const zoom = Math.log2((156543.03392 * Math.max(0.2, cos)) / metersPerPixelNeeded);
  return clamp(Math.round(zoom), MIN_ZOOM, MAX_ZOOM);
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

/**
 * Lightweight OSM tile map with geofence rings. No extra mapping library -
 * enough to place, inspect and compare site radii without covering the page.
 */
export function GeofenceMap({
  center,
  zoom = 13,
  sites = [],
  selectedId,
  preview,
  pickMode = false,
  onSelect,
  onPick,
  className = '',
}) {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const [size, setSize] = useState({ width: 640, height: 480 });
  const [view, setView] = useState({
    lat: Number(center?.lat) || 0,
    lng: Number(center?.lng) || 0,
    zoom,
  });

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width && rect.height) setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)) return;
    setView((current) => ({
      lat: center.lat,
      lng: center.lng,
      zoom: Number.isFinite(zoom) ? zoom : current.zoom,
    }));
  }, [center?.lat, center?.lng, zoom]);

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
          key: `${z}-${tx}-${y}-${x}`,
          src: `https://tile.openstreetmap.org/${z}/${tx}/${y}.png`,
          left: (x - originX) * TILE_SIZE + size.width / 2,
          top: (y - originY) * TILE_SIZE + size.height / 2,
        });
      }
    }
    return list;
  }, [view, size]);

  const rings = useMemo(() => {
    const points = sites
      .filter((site) => Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude)))
      .map((site) => {
        const point = project(Number(site.latitude), Number(site.longitude), view, view.zoom, size.width, size.height);
        return {
          id: site.id,
          name: site.name,
          selected: site.id === selectedId,
          r: metersToPixels(Number(site.latitude), view.zoom, Number(site.radius) || 100),
          ...point,
        };
      });
    if (preview && Number.isFinite(preview.latitude) && Number.isFinite(preview.longitude)) {
      const point = project(preview.latitude, preview.longitude, view, view.zoom, size.width, size.height);
      points.push({
        id: 'preview',
        name: preview.name || 'New location',
        selected: true,
        preview: true,
        r: metersToPixels(preview.latitude, view.zoom, Number(preview.radius) || 100),
        ...point,
      });
    }
    return points;
  }, [sites, preview, selectedId, view, size]);

  const onPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    const rect = rootRef.current.getBoundingClientRect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      origin: { ...view },
      moved: false,
      px: event.clientX - rect.left,
      py: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const scale = 2 ** drag.origin.zoom * TILE_SIZE;
    setView({
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
    const point = unproject(drag.px, drag.py, view, view.zoom, size.width, size.height);
    onPick(point);
  };

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();
      const next = clamp(view.zoom + (event.deltaY < 0 ? 1 : -1), MIN_ZOOM, MAX_ZOOM);
      if (next === view.zoom) return;
      const rect = rootRef.current.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const before = unproject(px, py, view, view.zoom, size.width, size.height);
      const afterAnchor = unproject(px, py, { lat: view.lat, lng: view.lng, zoom: next }, next, size.width, size.height);
      setView({
        zoom: next,
        lat: view.lat + (before.lat - afterAnchor.lat),
        lng: view.lng + (before.lng - afterAnchor.lng),
      });
    },
    [view, size]
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [onWheel]);

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
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
        />
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {rings.map((ring) => (
          <g key={ring.id}>
            <circle
              cx={ring.x}
              cy={ring.y}
              r={ring.r}
              fill={ring.selected ? 'rgba(0,176,255,0.14)' : 'rgba(0,176,255,0.05)'}
              stroke={RING}
              strokeOpacity={ring.selected ? 0.95 : 0.35}
              strokeWidth={ring.selected ? 2 : 1}
            />
            <circle cx={ring.x} cy={ring.y} r={4.5} fill={RING} stroke="#fff" strokeWidth="1.5" />
          </g>
        ))}
      </svg>

      {onSelect &&
        !pickMode &&
        rings
          .filter((ring) => ring.id !== 'preview')
          .map((ring) => (
            <button
              key={`hit-${ring.id}`}
              type="button"
              aria-label={ring.name}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(ring.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: ring.x, top: ring.y, width: Math.max(18, ring.r * 0.2), height: Math.max(18, ring.r * 0.2) }}
            />
          ))}

      {pickMode && (
        <p className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
          Click the map to set the centre
        </p>
      )}

      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-500">
        (c) OpenStreetMap
      </p>
    </div>
  );
}
