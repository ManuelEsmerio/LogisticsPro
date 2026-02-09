
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addOrder, deleteOrder, getOrders, updateOrder, addStaff, updateStaff, deleteStaff, getStaff, updateMultipleOrdersStatus, getRouteAssignments, addRouteAssignments, updateRouteAssignment, getOrderById } from "@/lib/data";
import { orderSchema, staffMemberSchema, type Order, type OrderFormValues, type StaffMember, type StaffMemberFormValues, type RouteAssignment, Waypoint } from "@/lib/definitions";
import { DBSCAN } from 'density-clustering';

const GEO_CACHE_TTL_MS = Number(process.env.GEO_CACHE_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000));
const GEO_CACHE_MAX = Number(process.env.GEO_CACHE_MAX ?? '5000');
const geoCache = new Map<string, { latitude: number; longitude: number; ts: number }>();

const OUT_OF_TOWN_MUNICIPALITIES = [
    'magdalena',
    'amatitan',
    'el arenal',
    'el salvador',
    'santa teresa',
    'san martin',
    'santa ana',
];

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function detectOutOfTownMunicipality(address: string) {
    const normalized = normalizeText(address);
    return OUT_OF_TOWN_MUNICIPALITIES.find(name => normalized.includes(normalizeText(name))) ?? null;
}

function normalizeAddress(address: string) {
    return address.trim().toLowerCase();
}

function getCachedGeocode(address: string) {
    const key = normalizeAddress(address);
    const entry = geoCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > GEO_CACHE_TTL_MS) {
        geoCache.delete(key);
        return null;
    }
    return { latitude: entry.latitude, longitude: entry.longitude };
}

function setCachedGeocode(address: string, coords: { latitude: number; longitude: number }) {
    const key = normalizeAddress(address);
    if (geoCache.size >= GEO_CACHE_MAX) {
        const firstKey = geoCache.keys().next().value;
        if (firstKey) geoCache.delete(firstKey);
    }
    geoCache.set(key, { ...coords, ts: Date.now() });
}

// --- Real Geocoding with OpenRouteService ---
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const apiKey = process.env.OPENROUTE_API_KEY;
    const fallbackCoordinates = { latitude: 20.8833, longitude: -103.8360 };

    const cached = getCachedGeocode(address);
    if (cached) return cached;

    if (!apiKey) {
        console.warn("OPENROUTE_API_KEY is not set. Using fallback coordinates.");
        return fallbackCoordinates;
    }

    try {
        const url = new URL("https://api.openrouteservice.org/geocode/search");
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("text", address);
        url.searchParams.set("boundary.country", "MEX");
        url.searchParams.set("size", "1");

        const response = await fetch(url.toString());

        if (!response.ok) {
            console.error("Geocoding failed:", response.status, response.statusText);
            return fallbackCoordinates;
        }

        const data = await response.json();
        const coords = data?.features?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
            console.error("Geocoding failed: empty response");
            return fallbackCoordinates;
        }

        const [longitude, latitude] = coords;
        const result = { latitude, longitude };
        setCachedGeocode(address, result);
        return result;
    } catch (error) {
        console.error("Error fetching from OpenRouteService Geocoding:", error);
        return fallbackCoordinates;
    }
}

async function optimizeRoute(waypoints: Waypoint[]) {
    const apiKey = process.env.OPENROUTE_API_KEY;
    if (!apiKey || waypoints.length === 0) {
        return { orderedWaypoints: waypoints, distance: 0, duration: '0s' };
    }

    try {
        if (waypoints.length === 1) {
            return { orderedWaypoints: waypoints, distance: 0, duration: '0s' };
        }

        const origin = waypoints[0];
        const intermediates = waypoints.slice(1);
        const jobs = intermediates.map((wp, index) => ({
            id: index + 1,
            location: [wp.longitude, wp.latitude],
        }));

        const requestBody = {
            jobs,
            vehicles: [
                {
                    id: 1,
                    profile: "driving-car",
                    start: [origin.longitude, origin.latitude],
                    end: [origin.longitude, origin.latitude],
                },
            ],
        };

        const response = await fetch("https://api.openrouteservice.org/optimization", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error("Optimization failed:", response.status, response.statusText);
            return { orderedWaypoints: waypoints, distance: 0, duration: '0s' };
        }

        const data = await response.json();
        const route = data?.routes?.[0];
        const steps = Array.isArray(route?.steps) ? route.steps : [];
        const orderedIntermediates = steps
            .filter((step: { type?: string }) => step?.type === "job")
            .map((step: { job: number }) => intermediates[(step.job ?? 1) - 1])
            .filter(Boolean);

        const orderedWaypoints = [origin, ...orderedIntermediates];
        const distance = Number.isFinite(route?.distance) ? route.distance : 0;
        const durationSeconds = Number.isFinite(route?.duration) ? route.duration : 0;

        return { orderedWaypoints, distance, duration: `${Math.round(durationSeconds)}s` };
    } catch (error) {
        console.error("Error calling OpenRouteService Optimization:", error);
        return { orderedWaypoints: waypoints, distance: 0, duration: '0s' }; // Fallback
    }
}


export async function saveOrder(data: OrderFormValues) {
  const validatedFields = orderSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Campos incompletos. No se pudo guardar el pedido.",
    };
  }
  
    const { id, deliveryTimeType, ...orderData } = validatedFields.data;

  // Ensure nullable fields are handled correctly
  const finalOrderData = {
      ...orderData,
      deliveryTime: orderData.deliveryTime,
      deliveryTimeSlot: deliveryTimeType === 'timeslot' ? orderData.deliveryTimeSlot : null,
  };


  const { latitude, longitude } = await geocodeAddress(finalOrderData.address);

  try {
        if (id) {
            const existing = await getOrderById(id);
            if (existing && (existing.deliveryStatus === 'en_reparto' || existing.deliveryStatus === 'entregado')) {
                return { message: 'No se puede modificar un pedido en reparto o entregado.' };
            }
            const updated = await updateOrder(id, { ...finalOrderData, latitude, longitude });
            if (!updated) {
                    throw new Error("Update failed");
            }
        } else {
            await addOrder({ ...finalOrderData, latitude, longitude });
        }
  } catch (error) {
    return { message: "Error de base de datos: No se pudo guardar el pedido." };
  }

  revalidatePath("/dashboard");
  return { message: `Pedido ${id ? 'actualizado' : 'creado'} con éxito.` };
}


export async function deleteOrderAction(id: string) {
    try {
        await deleteOrder(id);
        revalidatePath('/dashboard');
        return { message: 'Pedido eliminado.' };
    } catch (error) {
        return { message: 'Error de base de datos: No se pudo eliminar el pedido.' };
    }
}


function formatDeliveryDate(value: Date | null | undefined) {
    if (!value || Number.isNaN(value.getTime())) return null;
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export async function getClusteredRoutesAction(timeSlot: 'morning' | 'afternoon' | 'evening', deliveryDate?: string) {
    try {
    const epsilon = Number(process.env.ROUTE_CLUSTER_EPSILON ?? '0.005');
    const minPoints = Number(process.env.ROUTE_CLUSTER_MIN_POINTS ?? '1');
    const clusterEpsilon = Number.isFinite(epsilon) ? epsilon : 0.005;
    const clusterMinPoints = Number.isFinite(minPoints) ? minPoints : 1;
        const allOrders = await getOrders();
        const deliveryOrders = allOrders
            .filter(order =>
                order.deliveryType === 'delivery' &&
                (order.deliveryTimeSlot === null || order.deliveryTimeSlot === timeSlot) &&
                (order.paymentStatus === 'due' || order.paymentStatus === 'assigned') &&
                ['pendiente', 'rechazado'].includes(order.deliveryStatus ?? 'pendiente')
            )
            .filter(order => {
                if (!deliveryDate) return true;
                const orderDate = formatDeliveryDate(order.deliveryTime ?? null);
                return orderDate === deliveryDate;
            });
        
        const allStaff = await getStaff();
        const allDrivers = allStaff.filter(s => s.role === 'Repartidor');
        const activeDrivers = allDrivers.filter(s => s.status === 'Activo');

        if (deliveryOrders.length === 0) {
            return { clusteredRoutes: [], staff: activeDrivers, allStaff: allDrivers };
        }

        const outOfTownGroups = new Map<string, Order[]>();
        const localOrders: Order[] = [];

        deliveryOrders.forEach(order => {
            const municipality = detectOutOfTownMunicipality(order.address);
            if (municipality) {
                const existing = outOfTownGroups.get(municipality) ?? [];
                existing.push(order);
                outOfTownGroups.set(municipality, existing);
            } else {
                localOrders.push(order);
            }
        });

        const outOfTownClusters = await Promise.all(
            Array.from(outOfTownGroups.entries()).map(async ([, orders]) => {
                const waypoints: Waypoint[] = orders.map(order => ({
                    orderNumber: order.orderNumber,
                    address: order.address,
                    latitude: order.latitude,
                    longitude: order.longitude,
                }));

                const { orderedWaypoints, distance, duration } = await optimizeRoute(waypoints);

                const orderedOrders = orderedWaypoints.map(wp =>
                    orders.find(o => o.orderNumber === wp.orderNumber)
                ).filter((o): o is Order => !!o);

                return {
                    timeSlot,
                    orders: orderedOrders,
                    distance,
                    duration,
                };
            })
        );

        const dataset = localOrders.map(order => [order.latitude, order.longitude]);
        
        const scanner = new DBSCAN();
        const clustersIndices = scanner.run(dataset, clusterEpsilon, clusterMinPoints);


        const clusteredRoutesPromises = clustersIndices.map(async (clusterOrderIndices: number[]) => {
            const ordersInCluster = clusterOrderIndices.map(i => localOrders[i]);

            const waypoints: Waypoint[] = ordersInCluster.map(order => ({
                orderNumber: order.orderNumber,
                address: order.address,
                latitude: order.latitude,
                longitude: order.longitude,
            }));

            const { orderedWaypoints, distance, duration } = await optimizeRoute(waypoints);

            const orderedOrders = orderedWaypoints.map(wp => 
                ordersInCluster.find(o => o.orderNumber === wp.orderNumber)
            ).filter((o): o is Order => !!o);

            return {
                timeSlot,
                orders: orderedOrders,
                distance,
                duration,
            };
        });

        const clusteredRoutes = await Promise.all(clusteredRoutesPromises);

        return { clusteredRoutes: [...outOfTownClusters, ...clusteredRoutes], staff: activeDrivers, allStaff: allDrivers };

    } catch (error) {
        console.error(error);
        return { error: 'No se pudieron obtener las rutas agrupadas.' };
    }
}

export async function recalculateRoutesAction(timeSlot: 'morning' | 'afternoon' | 'evening') {
    try {
        const allOrders = await getOrders();
        const deliveryOrders = allOrders
            .filter(order =>
                order.deliveryType === 'delivery' &&
                (order.deliveryTimeSlot === null || order.deliveryTimeSlot === timeSlot) &&
                (order.paymentStatus === 'due' || order.paymentStatus === 'assigned')
            );

        await Promise.all(
            deliveryOrders.map(async order => {
                const hasCoords = Number.isFinite(order.latitude) && Number.isFinite(order.longitude) && (order.latitude !== 0 || order.longitude !== 0);
                if (hasCoords) return;
                const { latitude, longitude } = await geocodeAddress(order.address);
                await updateOrder(order.id, { latitude, longitude });
            })
        );

        const result = await getClusteredRoutesAction(timeSlot);
        return result;
    } catch (error) {
        console.error(error);
        return { error: 'No se pudieron recalcular las rutas.' };
    }
}

export async function getRouteAssignmentsAction(timeSlot: RouteAssignment['timeSlot']) {
    try {
        const assignments = await getRouteAssignments(timeSlot);
        return { assignments };
    } catch (error) {
        console.error(error);
        return { error: 'No se pudieron obtener las asignaciones.' };
    }
}

export async function confirmRouteAssignmentsAction(
    timeSlot: RouteAssignment['timeSlot'],
    assignments: Array<Pick<RouteAssignment, 'driverId' | 'driverName' | 'orderIds' | 'distance' | 'duration'>>
) {
    try {
        console.log("confirmRouteAssignmentsAction", {
            timeSlot,
            assignments: assignments.map(item => ({
                driverId: item.driverId,
                orderCount: item.orderIds.length,
            })),
        });
        if (!assignments.length) {
            return { message: 'No hay asignaciones para confirmar.' };
        }

        const now = new Date().toISOString();

        const toCreate = assignments.map(a => ({
            ...a,
            timeSlot,
            createdAt: now,
            locked: true,
            status: 'confirmada' as const,
            finishedAt: null,
        }));

        if (toCreate.length > 0) {
            console.log("confirmRouteAssignmentsAction creating", {
                count: toCreate.length,
                orderCount: toCreate.flatMap(item => item.orderIds).length,
            });
            const created = await addRouteAssignments(toCreate);
            const allOrderIds = toCreate.flatMap(a => a.orderIds);
            if (allOrderIds.length > 0) {
                await updateMultipleOrdersStatus(allOrderIds, 'assigned');
            }
            await Promise.all(
                created.flatMap(assignment =>
                    assignment.orderIds.map(orderId => updateOrder(orderId, {
                        deliveryStatus: 'en_reparto',
                        lastAssignmentId: assignment.id,
                        lastDriverId: assignment.driverId,
                        lastRouteStatus: 'en_reparto',
                    }))
                )
            );
        }

        revalidatePath('/dashboard/routes');
        return { message: 'Rutas confirmadas y despachadas.' };
    } catch (error) {
        console.error(error);
        return { message: 'No se pudieron confirmar las rutas.' };
    }
}

export async function finalizeRouteAction(params: {
    assignmentId: string;
    orderIds: string[];
}) {
    try {
        const { assignmentId, orderIds } = params;
        console.log("finalizeRouteAction", { assignmentId, orderCount: orderIds.length });
        if (!assignmentId || orderIds.length === 0) {
            return { message: 'No hay pedidos para finalizar.' };
        }

        await Promise.all(
            orderIds.map(orderId => updateOrder(orderId, {
                deliveryStatus: 'entregado',
                paymentStatus: 'paid',
                lastAssignmentId: assignmentId,
                lastRouteStatus: 'entregado',
                deliveredAt: new Date().toISOString(),
            }))
        );

        const updated = await updateRouteAssignment(assignmentId, {
            status: 'finalizada',
            finishedAt: new Date().toISOString(),
            locked: false,
        });
        if (!updated) {
            console.error("finalizeRouteAction: updateRouteAssignment failed", { assignmentId });
        }
        console.log("finalizeRouteAction completed", { assignmentId });

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/routes');
        return { message: 'Ruta finalizada.' };
    } catch (error) {
        console.error(error);
        return { message: 'No se pudo finalizar la ruta.' };
    }
}

export async function reportRouteIssuesAction(params: {
    assignmentId: string;
    driverId: string;
    orderIds: string[];
    failedOrderIds: string[];
    motivo: string;
}) {
    try {
        const { assignmentId, driverId, orderIds, failedOrderIds, motivo } = params;
        console.log("reportRouteIssuesAction", {
            assignmentId,
            driverId,
            orderCount: orderIds.length,
            failedCount: failedOrderIds.length,
            motivo,
        });
        if (!assignmentId || orderIds.length === 0) {
            return { message: 'No hay pedidos para procesar.' };
        }
        if (failedOrderIds.length === 0) {
            return { message: 'Selecciona al menos un pedido con incidencia.' };
        }

        const failedSet = new Set(failedOrderIds);
        const now = new Date().toISOString();

        await Promise.all(
            orderIds.map(async orderId => {
                if (failedSet.has(orderId)) {
                    const existing = await getOrderById(orderId);
                    const currentIntentos = Number.isFinite(existing?.intentosEnvio)
                        ? Number(existing?.intentosEnvio)
                        : 0;
                    const incidencias = Array.isArray(existing?.incidencias) ? existing?.incidencias : [];

                    await updateOrder(orderId, {
                        deliveryStatus: 'rechazado',
                        paymentStatus: 'due',
                        intentosEnvio: currentIntentos + 1,
                        incidencias: [
                            ...incidencias,
                            { fecha: now, motivo, repartidorId: driverId },
                        ],
                        lastAssignmentId: assignmentId,
                        lastDriverId: driverId,
                        lastRouteStatus: 'rechazado',
                        deliveredAt: null,
                    });
                    return;
                }

                await updateOrder(orderId, {
                    deliveryStatus: 'entregado',
                    paymentStatus: 'paid',
                    lastAssignmentId: assignmentId,
                    lastDriverId: driverId,
                    lastRouteStatus: 'entregado',
                    deliveredAt: now,
                });
            })
        );

        const updated = await updateRouteAssignment(assignmentId, {
            status: 'finalizada',
            finishedAt: now,
            locked: false,
        });
        if (!updated) {
            console.error("reportRouteIssuesAction: updateRouteAssignment failed", { assignmentId });
        }

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/routes');
        return { message: 'Incidencias registradas.' };
    } catch (error) {
        console.error(error);
        return { message: 'No se pudieron registrar las incidencias.' };
    }
}

export async function saveStaff(data: StaffMemberFormValues) {
  const validatedFields = staffMemberSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Campos incompletos. No se pudo guardar el miembro del personal.",
    };
  }
  
  const { id, firstName, lastName, ...staffData } = validatedFields.data;
  const name = `${firstName} ${lastName}`;
  const dataToSave = { ...staffData, name };


  try {
    if (id) {
      await updateStaff(id, dataToSave);
    } else {
      await addStaff(dataToSave as Omit<StaffMember, 'id' | 'createdAt' | 'status'>);
    }
  } catch (error) {
    console.error(error);
    return { message: "Error de base de datos: No se pudo guardar el miembro del personal." };
  }

  revalidatePath("/dashboard/staff");
  return { message: `Miembro del personal ${id ? 'actualizado' : 'creado'} con éxito.` };
}

export async function deleteStaffAction(id: string) {
    try {
        await deleteStaff(id);
        revalidatePath('/dashboard/staff');
        return { message: 'Miembro del personal eliminado.' };
    } catch (error) {
        return { message: 'Error de base de datos: No se pudo eliminar al miembro del personal.' };
    }
}

export async function updateOrdersStatus(orderIds: string[], status: Order['paymentStatus']) {
    try {
        await updateMultipleOrdersStatus(orderIds, status);
    } catch (error) {
        console.error(error);
        return { message: 'Error de base de datos: No se pudo actualizar el estado del pedido.' };
    }
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/routes');
}
