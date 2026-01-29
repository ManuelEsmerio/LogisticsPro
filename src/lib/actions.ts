"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addOrder, deleteOrder, getOrders, updateOrder, addStaff, updateStaff, deleteStaff, getStaff } from "@/lib/data";
import { orderSchema, staffMemberSchema, type Order, type OrderFormValues, type StaffMemberFormValues } from "@/lib/definitions";
import { clusterRoutes } from "@/ai/flows/cluster-routes";

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function generateMockCoordinates(address: string) {
    const hash = simpleHash(address);
    const latBase = 40.7128;
    const lngBase = -74.0060;
    const lat = latBase + (hash % 10000) / 50000;
    const lng = lngBase + (((hash / 10000) | 0) % 10000) / 50000;
    return { latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) };
}


export async function saveOrder(data: OrderFormValues) {
  const validatedFields = orderSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to save order.",
    };
  }
  
  const { id, deliveryTimeType, ...orderData } = validatedFields.data;

  // In a real app, you'd use a geocoding service here.
  // For this demo, we generate mock coordinates based on the address.
  const { latitude, longitude } = generateMockCoordinates(orderData.address);

  try {
    if (id) {
      await updateOrder(id, { ...orderData, latitude, longitude });
    } else {
      await addOrder({ ...orderData, latitude, longitude });
    }
  } catch (error) {
    return { message: "Database Error: Failed to save order." };
  }

  revalidatePath("/dashboard");
  return { message: `Successfully ${id ? 'updated' : 'created'} order.` };
}


export async function deleteOrderAction(id: string) {
    try {
        await deleteOrder(id);
        revalidatePath('/dashboard');
        return { message: 'Deleted Order.' };
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Order.' };
    }
}


export async function getClusteredRoutesAction(timeSlot: 'morning' | 'afternoon' | 'evening') {
    try {
        const allOrders = await getOrders();
        const deliveryOrders = allOrders
            .filter(order => order.deliveryType === 'delivery' && order.deliveryTimeSlot === timeSlot)
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
        return { error: 'Failed to get clustered routes.' };
    }
}

export async function saveStaff(data: StaffMemberFormValues) {
  const validatedFields = staffMemberSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to save staff member.",
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
    return { message: "Database Error: Failed to save staff member." };
  }

  revalidatePath("/dashboard/staff");
  return { message: `Successfully ${id ? 'updated' : 'created'} staff member.` };
}

export async function deleteStaffAction(id: string) {
    try {
        await deleteStaff(id);
        revalidatePath('/dashboard/staff');
        return { message: 'Deleted Staff Member.' };
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Staff Member.' };
    }
}