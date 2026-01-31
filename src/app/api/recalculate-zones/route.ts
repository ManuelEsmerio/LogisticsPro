import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JSON_SERVER_URL = process.env.JSON_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9002';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const NOMINATIM_URL = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org/search';

const TIME_WINDOWS = [
  { key: '09:00-11:00', start: 9 * 60, end: 11 * 60 },
  { key: '11:00-13:00', start: 11 * 60, end: 13 * 60 },
  { key: '13:00-15:00', start: 13 * 60, end: 15 * 60 },
];

type OrderRecord = {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  delivery_start: string;
  delivery_end: string;
  deliveryTimeSlot?: 'morning' | 'afternoon' | 'evening' | null;
  geocoded: boolean;
  zoned: boolean;
  zone_id: string | null;
};

type ZoneRecord = {
  id: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  time_window: string;
  orders: string[];
  driver_id?: string | null;
  driver_name?: string | null;
};

type StaffRecord = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type GeocodeCacheRecord = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  provider: 'osm' | 'google';
  createdAt: string;
};

function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getWindowKey(order: OrderRecord) {
  if (order.delivery_start && order.delivery_end) {
    const start = parseTimeToMinutes(order.delivery_start);
    const end = parseTimeToMinutes(order.delivery_end);
    const window = TIME_WINDOWS.find(w => start >= w.start && end <= w.end);
    if (window) return window.key;
  }

  switch (order.deliveryTimeSlot) {
    case 'morning':
      return '09:00-11:00';
    case 'afternoon':
      return '11:00-13:00';
    case 'evening':
      return '13:00-15:00';
    default:
      return null;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getCachedGeocode(address: string): Promise<GeocodeCacheRecord | null> {
  const res = await fetch(`${JSON_SERVER_URL}/geocodeCache?address=${encodeURIComponent(address)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const cached = (await res.json()) as GeocodeCacheRecord[];
  return cached[0] ?? null;
}

async function saveGeocodeCache(entry: Omit<GeocodeCacheRecord, 'id'>) {
  return postJsonServer('/geocodeCache', entry);
}

async function geocodeWithOSM(address: string) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'LogisticsPro/1.0 (contact: support@example.com)',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

async function geocodeWithGoogle(address: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not set');
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status !== 'OK' || !data.results?.length) {
    return null;
  }
  const location = data.results[0].geometry.location;
  return { lat: location.lat, lng: location.lng };
}

async function geocodeAddress(address: string) {
  const cached = await getCachedGeocode(address);
  if (cached) return { lat: cached.lat, lng: cached.lng, provider: cached.provider };

  const osm = await geocodeWithOSM(address);
  if (osm) {
    await saveGeocodeCache({
      address,
      lat: osm.lat,
      lng: osm.lng,
      provider: 'osm',
      createdAt: new Date().toISOString(),
    });
    return { ...osm, provider: 'osm' };
  }

  const google = await geocodeWithGoogle(address);
  if (google) {
    await saveGeocodeCache({
      address,
      lat: google.lat,
      lng: google.lng,
      provider: 'google',
      createdAt: new Date().toISOString(),
    });
    return { ...google, provider: 'google' };
  }

  throw new Error('Geocoding failed');
}

async function patchJsonServer(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${JSON_SERVER_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to update ${path}`);
  }
  return res.json();
}

async function postJsonServer(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${JSON_SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to create ${path}`);
  }
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { radiusKm } = await request.json().catch(() => ({ radiusKm: undefined }));
    const radius = typeof radiusKm === 'number' ? radiusKm : Number(process.env.ZONE_RADIUS_KM ?? 2);

    const [ordersRes, zonesRes, staffRes] = await Promise.all([
      fetch(`${JSON_SERVER_URL}/orders`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/zones`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/staff`, { cache: 'no-store' }),
    ]);

    if (!ordersRes.ok || !zonesRes.ok || !staffRes.ok) {
      return NextResponse.json({
        error: 'No se pudieron cargar datos base.',
        detail: `orders:${ordersRes.status} zones:${zonesRes.status} staff:${staffRes.status}`
      }, { status: 500 });
    }

    const orders = (await ordersRes.json()) as OrderRecord[];
    const zones = (await zonesRes.json()) as ZoneRecord[];
    const staff = (await staffRes.json()) as StaffRecord[];

    const drivers = staff.filter(s => s.role === 'Repartidor' && s.status === 'Activo');
    let driverIndex = 0;

    const candidates = orders.filter(order =>
      ((order.geocoded ?? false) === false || (order.zoned ?? false) === false) &&
      (order.delivery_start || order.delivery_end || order.deliveryTimeSlot)
    );

    const geocodeTargets = candidates.filter(order => !order.geocoded);
    await Promise.all(
      geocodeTargets.map(async order => {
        const { lat, lng } = await geocodeAddress(order.address);
        await patchJsonServer(`/orders/${order.id}`, { lat, lng, geocoded: true });
        order.lat = lat;
        order.lng = lng;
        order.geocoded = true;
      })
    );

    const unzoned = candidates.filter(order => !order.zoned && order.lat !== null && order.lng !== null);
    const assignments: Array<{ order: OrderRecord; zoneId: string }> = [];

    const zonesByWindow = new Map<string, ZoneRecord[]>();
    zones.forEach(zone => {
      if (!zonesByWindow.has(zone.time_window)) {
        zonesByWindow.set(zone.time_window, []);
      }
      zonesByWindow.get(zone.time_window)!.push(zone);
    });

    for (const order of unzoned) {
      const windowKey = getWindowKey(order);
      if (!windowKey) continue;
      const existingZones = zonesByWindow.get(windowKey) ?? [];

      let closestZone: ZoneRecord | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const zone of existingZones) {
        const distance = haversineKm(order.lat!, order.lng!, zone.center_lat, zone.center_lng);
        if (distance <= zone.radius_km && distance < closestDistance) {
          closestZone = zone;
          closestDistance = distance;
        }
      }

      if (closestZone) {
        assignments.push({ order, zoneId: closestZone.id });
        if (!closestZone.orders.includes(order.id)) {
          closestZone.orders.push(order.id);
        }
      }
    }

    const assignedOrderIds = new Set(assignments.map(a => a.order.id));
    const remaining = unzoned.filter(order => !assignedOrderIds.has(order.id));

    const createdZones: ZoneRecord[] = [];
    for (const window of TIME_WINDOWS) {
      const windowOrders = remaining.filter(order => getWindowKey(order) === window.key);
      const visited = new Set<string>();

      for (const order of windowOrders) {
        if (visited.has(order.id)) continue;

        const zoneOrders = [order];
        visited.add(order.id);

        for (const other of windowOrders) {
          if (visited.has(other.id)) continue;
          const distance = haversineKm(order.lat!, order.lng!, other.lat!, other.lng!);
          if (distance <= radius) {
            zoneOrders.push(other);
            visited.add(other.id);
          }
        }

        const driver = drivers.length > 0 ? drivers[driverIndex % drivers.length] : null;
        if (drivers.length > 0) driverIndex += 1;

        const newZone: ZoneRecord = {
          id: crypto.randomUUID(),
          center_lat: order.lat!,
          center_lng: order.lng!,
          radius_km: radius,
          time_window: window.key,
          orders: zoneOrders.map(o => o.id),
          driver_id: driver?.id ?? null,
          driver_name: driver?.name ?? null,
        };

        createdZones.push(newZone);
        zoneOrders.forEach(o => assignments.push({ order: o, zoneId: newZone.id }));
      }
    }

    await Promise.all(
      zones.map(zone =>
        patchJsonServer(`/zones/${zone.id}`, {
          orders: zone.orders,
          driver_id: zone.driver_id ?? null,
          driver_name: zone.driver_name ?? null,
        })
      )
    );

    await Promise.all(createdZones.map(zone => postJsonServer('/zones', zone)));

    await Promise.all(
      assignments.map(({ order, zoneId }) =>
        patchJsonServer(`/orders/${order.id}`, { zoned: true, zone_id: zoneId })
      )
    );

    return NextResponse.json({
      updatedOrders: assignments.length,
      createdZones: createdZones.length,
    });
  } catch (error) {
    console.error('recalculate-zones error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error al recalcular zonas.', detail: message }, { status: 500 });
  }
}
