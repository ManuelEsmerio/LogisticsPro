
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addOrder, deleteOrder, getOrders, updateOrder, addStaff, updateStaff, deleteStaff, getStaff, updateMultipleOrdersStatus, getRouteAssignments, addRouteAssignments } from "@/lib/data";
import { orderSchema, staffMemberSchema, type Order, type OrderFormValues, type StaffMember, type StaffMemberFormValues, type RouteAssignment, Waypoint } from "@/lib/definitions";
import { DBSCAN } from 'density-clustering';

// --- Real Geocoding with Google Maps API ---
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const fallbackCoordinates = { latitude: 20.8833, longitude: -103.8360 };

    if (!apiKey) {
        console.warn("GOOGLE_MAPS_API_KEY is not set. Using fallback coordinates.");
        return fallbackCoordinates;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results[0]) {
            const location = data.results[0].geometry.location;
            return {
                latitude: location.lat,
                longitude: location.lng,
            };
        } else {
            console.error('Geocoding failed:', data.status, data.error_message);
            return fallbackCoordinates;
        }
    } catch (error) {
        console.error('Error fetching from Geocoding API:', error);
        return fallbackCoordinates;
    }
}

async function optimizeRoute(waypoints: Waypoint[]) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || waypoints.length === 0) {
        return { orderedWaypoints: waypoints, distance: 0, duration: '0s' };
    }

    const API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const origin = waypoints[0];
    const intermediates = waypoints.slice(1);

    const requestBody = {
        origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        destination: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        intermediates: intermediates.map(wp => ({
            location: { latLng: { latitude: wp.latitude, longitude: wp.longitude } }
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        optimizeWaypointOrder: true,
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration'
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            return { orderedWaypoints: waypoints, distance: 0, duration: '0s' };
        }
        
        const route = data.routes[0];
        const distance = route.distanceMeters || 0;
        const duration = route.duration || '0s';


        if (route.optimizedIntermediateWaypointIndex) {
            const optimizedIndices = route.optimizedIntermediateWaypointIndex;
            const orderedWaypoints = [origin];
            optimizedIndices.forEach((index: number) => {
                orderedWaypoints.push(intermediates[index]);
            });
            return { orderedWaypoints, distance, duration };
        }
        // If optimization fails, return original order
        return { orderedWaypoints: waypoints, distance, duration };
    } catch (error) {
        console.error('Error calling Routes API:', error);
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
      deliveryTime: deliveryTimeType === 'exact_time' ? orderData.deliveryTime : null,
      deliveryTimeSlot: deliveryTimeType === 'timeslot' ? orderData.deliveryTimeSlot : null,
  };


  const { latitude, longitude } = await geocodeAddress(finalOrderData.address);

  try {
    if (id) {
      await updateOrder(id, { ...finalOrderData, latitude, longitude });
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


export async function getClusteredRoutesAction(timeSlot: 'morning' | 'afternoon' | 'evening') {
    try {
        const allOrders = await getOrders();
        const deliveryOrders = allOrders
            .filter(order =>
                order.deliveryType === 'delivery' &&
                order.deliveryTimeSlot === timeSlot &&
                (order.paymentStatus === 'due' || order.paymentStatus === 'assigned')
            );
        
        const allStaff = await getStaff();
        const allDrivers = allStaff.filter(s => s.role === 'Repartidor');
        const activeDrivers = allDrivers.filter(s => s.status === 'Activo');

        if (deliveryOrders.length === 0) {
            return { clusteredRoutes: [], staff: activeDrivers, allStaff: allDrivers };
        }

        const dataset = deliveryOrders.map(order => [order.latitude, order.longitude]);
        
        const scanner = new DBSCAN();
        const clustersIndices = scanner.run(dataset, 0.01, 2);


        const clusteredRoutesPromises = clustersIndices.map(async (clusterOrderIndices: number[]) => {
            const ordersInCluster = clusterOrderIndices.map(i => deliveryOrders[i]);

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

        return { clusteredRoutes, staff: activeDrivers, allStaff: allDrivers };

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
                order.deliveryTimeSlot === timeSlot &&
                (order.paymentStatus === 'due' || order.paymentStatus === 'assigned')
            );

        await Promise.all(
            deliveryOrders.map(async order => {
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
        if (!assignments.length) {
            return { message: 'No hay asignaciones para confirmar.' };
        }

        const existing = await getRouteAssignments(timeSlot);
        const existingDrivers = new Set(existing.map(a => a.driverId));
        const now = new Date().toISOString();

        const toCreate = assignments
            .filter(a => !existingDrivers.has(a.driverId))
            .map(a => ({
                ...a,
                timeSlot,
                createdAt: now,
                locked: true,
            }));

        if (toCreate.length > 0) {
            await addRouteAssignments(toCreate);
            const allOrderIds = toCreate.flatMap(a => a.orderIds);
            if (allOrderIds.length > 0) {
                await updateMultipleOrdersStatus(allOrderIds, 'assigned');
            }
        }

        revalidatePath('/dashboard/routes');
        return { message: 'Rutas confirmadas y despachadas.' };
    } catch (error) {
        console.error(error);
        return { message: 'No se pudieron confirmar las rutas.' };
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
