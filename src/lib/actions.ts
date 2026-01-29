
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addOrder, deleteOrder, getOrders, updateOrder, addStaff, updateStaff, deleteStaff, getStaff } from "@/lib/data";
import { orderSchema, staffMemberSchema, type Order, type OrderFormValues, type StaffMemberFormValues } from "@/lib/definitions";
import { clusterRoutes } from "@/ai/flows/cluster-routes";

// --- Real Geocoding with Google Maps API ---
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Default coordinates for Tequila, Jalisco, if API key is missing or fails.
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


export async function saveOrder(data: OrderFormValues) {
  const validatedFields = orderSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Campos incompletos. No se pudo guardar el pedido.",
    };
  }
  
  const { id, deliveryTimeType, ...orderData } = validatedFields.data;

  // Use real geocoding
  const { latitude, longitude } = await geocodeAddress(orderData.address);

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
