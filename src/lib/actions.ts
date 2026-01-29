
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addOrder, deleteOrder, getOrders, updateOrder, addStaff, updateStaff, deleteStaff, getStaff } from "@/lib/data";
import { orderSchema, staffMemberSchema, type Order, type OrderFormValues, type StaffMemberFormValues } from "@/lib/definitions";
import { clusterRoutes } from "@/ai/flows/cluster-routes";

// --- Improved Mock Geocoding ---

// Define some cluster centers in Tequila, Jalisco
const clusterCenters = [
    { name: 'Centro Histórico', lat: 20.8833, lng: -103.8360 }, // Downtown
    { name: 'La Villa', lat: 20.8875, lng: -103.8310 }, // North-East
    { name: 'El Calvario', lat: 20.8790, lng: -103.8400 }, // South-West
    { name: 'Buenos Aires', lat: 20.8890, lng: -103.8450 } // North-West
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Assigns an address to a deterministic cluster and generates coordinates
function generateClusteredCoordinates(address: string) {
    const hash = simpleHash(address);
    // Assign to a cluster based on the hash
    const cluster = clusterCenters[hash % clusterCenters.length];

    // Smaller variation for tighter clusters
    const latVariation = ((hash * 3) % 40 - 20) / 20000; // ~ +/- 100 meters
    const lngVariation = ((hash * 7) % 40 - 20) / 20000; // ~ +/- 100 meters

    return {
        latitude: parseFloat((cluster.lat + latVariation).toFixed(6)),
        longitude: parseFloat((cluster.lng + lngVariation).toFixed(6))
    };
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

  // Use the new clustered coordinate generation
  const { latitude, longitude } = generateClusteredCoordinates(orderData.address);

  try {
    if (id) {
      await updateOrder(id, { ...orderData, latitude, longitude });
    } else {
      await addOrder({ ...orderData, latitude, longitude });
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
            .filter(order => order.deliveryType === 'delivery' && order.deliveryTimeSlot === timeSlot && order.paymentStatus === 'due')
            .map(order => ({
                orderNumber: order.orderNumber,
                address: order.address,
                latitude: order.latitude,
                longitude: order.longitude,
                deliveryTimeSlot: order.deliveryTimeSlot!,
            }));
        
        if (deliveryOrders.length === 0) {
            return { clusteredRoutes: [], staff: await getStaff() };
        }

        const result = await clusterRoutes({ orders: deliveryOrders });
        return { clusteredRoutes: result.clusteredRoutes, staff: await getStaff() };

    } catch (error) {
        console.error(error);
        return { error: 'No se pudieron obtener las rutas agrupadas.' };
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
  
  const { id, ...staffData } = validatedFields.data;

  try {
    if (id) {
      await updateStaff(id, staffData);
    } else {
      await addStaff(staffData);
    }
  } catch (error) {
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
