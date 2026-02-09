import type { Order, StaffMember, RouteAssignment } from './definitions';
import { format, parse, isValid } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export function parseDeliveryTime(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string") {
        if (value.includes("T")) {
            const parsed = new Date(value);
            return isValid(parsed) ? parsed : null;
        }
        const parsedDMY = parse(value, "dd/MM/yyyy", new Date());
        if (isValid(parsedDMY)) return parsedDMY;
        const parsedYMD = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(parsedYMD)) return parsedYMD;
    }
    return null;
}

function normalizeDeliveryStatus(value: unknown): Order['deliveryStatus'] {
    switch (value) {
        case 'en_reparto':
        case 'entregado':
        case 'rechazado':
        case 'pendiente':
            return value;
        case 'confirmado':
            return 'en_reparto';
        case 'regresado':
            return 'rechazado';
        default:
            return 'pendiente';
    }
}

function formatDeliveryTime(value: Date | null | undefined): string | null {
    if (!value || !isValid(value)) return null;
    return value.toISOString();
}

async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
    try {
        const res = await fetch(`${API_URL}/orders?orderNumber=${encodeURIComponent(orderNumber)}`);
        if (!res.ok) return null;
        const orders = await res.json();
        const order = Array.isArray(orders) ? orders[0] : orders;
        if (!order) return null;
        return {
            ...order,
            id: order.id ?? order._id,
            createdAt: new Date(order.createdAt),
            deliveryTime: parseDeliveryTime(order.deliveryTime),
            deliveryStatus: normalizeDeliveryStatus(order.deliveryStatus),
            intentosEnvio: Number.isFinite(order.intentosEnvio) ? Number(order.intentosEnvio) : 0,
            incidencias: Array.isArray(order.incidencias) ? order.incidencias : [],
        };
    } catch (error) {
        console.error("getOrderByNumber error:", error);
        return null;
    }
}

async function ensureUniqueOrderNumber(orderNumber: string, excludeId?: string): Promise<void> {
    const existing = await getOrderByNumber(orderNumber);
    if (!existing) return;
    if (excludeId && existing.id === excludeId) return;
    throw new Error("ORDER_NUMBER_EXISTS");
}

// --- ORDERS ---

export async function getOrders(): Promise<Order[]> {
  try {
    console.log(`${API_URL}/orders?_sort=createdAt&_order=desc`);
    const res = await fetch(`${API_URL}/orders?_sort=createdAt&_order=desc`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();
    // Dates are strings in JSON, convert them back to Date objects
        return orders.map((order: any) => ({
            ...order,
            id: order.id ?? order._id,
            paymentStatus: order.paymentStatus ?? order.paymentsStatus ?? 'due',
            createdAt: new Date(order.createdAt),
            deliveryTime: parseDeliveryTime(order.deliveryTime),
            deliveryStatus: normalizeDeliveryStatus(order.deliveryStatus),
                        intentosEnvio: Number.isFinite(order.intentosEnvio) ? Number(order.intentosEnvio) : 0,
                        incidencias: Array.isArray(order.incidencias) ? order.incidencias : [],
        }));
  } catch (error) {
    console.error("getOrders error:", error);
    return [];
  }
}

export async function getLatestOrderNumber(): Promise<string | null> {
    try {
        const res = await fetch(`${API_URL}/orders`, { cache: "no-store" });
        if (!res.ok) return null;
        const orders = await res.json();
        const list = Array.isArray(orders) ? orders : [];
        if (list.length === 0) return null;
        const maxValue = list.reduce((max: number, order: any) => {
            const value = String(order?.orderNumber ?? "");
            const match = value.match(/#?FL-(\d+)/i) ?? value.match(/(\d+)/);
            const numeric = match ? Number(match[1]) : 0;
            return Number.isFinite(numeric) && numeric > max ? numeric : max;
        }, 0);
        if (maxValue <= 0) return null;
        return `#FL-${String(maxValue).padStart(3, "0")}`;
    } catch (error) {
        console.error("getLatestOrderNumber error:", error);
        return null;
    }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
    try {
        const res = await fetch(`${API_URL}/orders/${id}`);
        if (!res.ok) return undefined;
        const order = await res.json();
        return {
            ...order,
            id: order.id ?? order._id,
            paymentStatus: order.paymentStatus ?? order.paymentsStatus ?? 'due',
            createdAt: new Date(order.createdAt),
            deliveryTime: parseDeliveryTime(order.deliveryTime),
            deliveryStatus: normalizeDeliveryStatus(order.deliveryStatus),
            intentosEnvio: Number.isFinite(order.intentosEnvio) ? Number(order.intentosEnvio) : 0,
            incidencias: Array.isArray(order.incidencias) ? order.incidencias : [],
        };
    } catch (error) {
        console.error(`getOrderById(${id}) error:`, error);
        return undefined;
    }
}

export async function addOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    await ensureUniqueOrderNumber(orderData.orderNumber);
    const newOrderPayload = {
        ...orderData,
            deliveryStatus: normalizeDeliveryStatus(orderData.deliveryStatus),
        intentosEnvio: Number.isFinite(orderData.intentosEnvio) ? Number(orderData.intentosEnvio) : 0,
        incidencias: Array.isArray(orderData.incidencias) ? orderData.incidencias : [],
        createdAt: new Date().toISOString(),
        deliveryTime: formatDeliveryTime(orderData.deliveryTime),
    };
    const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderPayload),
    });
    if (!res.ok) throw new Error('Failed to add order');
    const newOrder = await res.json();
    return {
        ...newOrder,
        id: newOrder.id ?? newOrder._id,
        paymentStatus: newOrder.paymentStatus ?? newOrder.paymentsStatus ?? 'due',
        createdAt: new Date(newOrder.createdAt),
        deliveryTime: parseDeliveryTime(newOrder.deliveryTime),
            deliveryStatus: normalizeDeliveryStatus(newOrder.deliveryStatus),
        intentosEnvio: Number.isFinite(newOrder.intentosEnvio) ? Number(newOrder.intentosEnvio) : 0,
        incidencias: Array.isArray(newOrder.incidencias) ? newOrder.incidencias : [],
    };
}

export async function updateRouteAssignment(id: string, updates: Partial<Omit<RouteAssignment, 'id'>>): Promise<RouteAssignment | null> {
    const res = await fetch(`${API_URL}/routeAssignments?_id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    return await res.json();
}

export async function updateOrder(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<Order | null> {
    if (typeof updates.orderNumber === "string" && updates.orderNumber.trim()) {
        await ensureUniqueOrderNumber(updates.orderNumber.trim(), id);
    }
    const updatePayload = {
        ...updates,
        ...(updates.deliveryTime instanceof Date && { deliveryTime: formatDeliveryTime(updates.deliveryTime) }),
        ...(updates.deliveryTime === null && { deliveryTime: null }),
    };

    const res = await fetch(`${API_URL}/orders?_id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
    });
    if (!res.ok) return null;
    const updatedOrder = await res.json();
    return {
        ...updatedOrder,
        id: updatedOrder.id ?? updatedOrder._id,
        paymentStatus: updatedOrder.paymentStatus ?? updatedOrder.paymentsStatus ?? 'due',
        createdAt: new Date(updatedOrder.createdAt),
        deliveryTime: parseDeliveryTime(updatedOrder.deliveryTime),
        deliveryStatus: normalizeDeliveryStatus(updatedOrder.deliveryStatus),
    };
}

export async function deleteOrder(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/orders?_id=${id}`, {
        method: 'DELETE',
    });
    return res.ok;
}


// --- STAFF ---

export async function getStaff(): Promise<StaffMember[]> {
    try {
        console.log(`${API_URL}/deliveryStaff?_sort=createdAt&_order=desc`);
        const res = await fetch(`${API_URL}/deliveryStaff?_sort=createdAt&_order=desc`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch staff');
        const staff = await res.json();
        return staff.map((s: any) => ({
            ...s,
            id: s.id ?? s._id,
            createdAt: new Date(s.createdAt),
        }));
    } catch (error) {
        console.error("getStaff error:", error);
        return [];
    }
}

export async function addStaff(staffData: Omit<StaffMember, 'id' | 'createdAt' | 'status'>): Promise<StaffMember> {
    const newStaffPayload = {
        ...staffData,
        status: 'Activo',
        avatarUrl: staffData.avatarUrl || `https://picsum.photos/seed/${Date.now()}/100/100`,
        createdAt: new Date().toISOString(),
    };
    const res = await fetch(`${API_URL}/deliveryStaff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaffPayload),
    });
    if (!res.ok) throw new Error('Failed to add staff');
    const newStaff = await res.json();
    return {
        ...newStaff,
        id: newStaff.id ?? newStaff._id,
        createdAt: new Date(newStaff.createdAt),
    };
}

export async function updateStaff(id: string, updates: Partial<Omit<StaffMember, 'id' | 'createdAt'>>): Promise<StaffMember | null> {
    const res = await fetch(`${API_URL}/deliveryStaff?_id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const updatedStaff = await res.json();
    return {
        ...updatedStaff,
        id: updatedStaff.id ?? updatedStaff._id,
        createdAt: new Date(updatedStaff.createdAt),
    };
}

export async function deleteStaff(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/deliveryStaff?_id=${id}`, {
        method: 'DELETE',
    });
    return res.ok;
}

// --- BULK OPERATIONS ---
export async function updateMultipleOrdersStatus(orderIds: string[], status: Order['paymentStatus']): Promise<void> {
    try {
        await Promise.all(
            orderIds.map(id => 
                fetch(`${API_URL}/orders?_id=${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentStatus: status }),
                })
            )
        );
    } catch (error) {
        console.error("updateMultipleOrdersStatus error:", error);
        // We can decide if we want to throw or just log
    }
}

// --- ROUTE ASSIGNMENTS ---
export async function getRouteAssignments(timeSlot?: RouteAssignment['timeSlot']): Promise<RouteAssignment[]> {
    try {
        const url = timeSlot ? `${API_URL}/routeAssignments?timeSlot=${timeSlot}` : `${API_URL}/routeAssignments`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch route assignments');
        const assignments = await res.json();
        return (Array.isArray(assignments) ? assignments : []).map((assignment: any) => ({
            ...assignment,
            id: String(assignment.id ?? assignment._id ?? ''),
            status: assignment.status ?? (assignment.locked ? 'confirmada' : 'pendiente'),
            finishedAt: assignment.finishedAt ?? null,
        }));
    } catch (error) {
        console.error("getRouteAssignments error:", error);
        return [];
    }
}

export async function addRouteAssignments(assignments: Omit<RouteAssignment, 'id'>[]): Promise<RouteAssignment[]> {
    const created = await Promise.all(
        assignments.map(async assignment => {
            const res = await fetch(`${API_URL}/routeAssignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignment),
            });
            if (!res.ok) throw new Error('Failed to add route assignment');
            return res.json();
        })
    );
    return created.map((assignment: any) => ({
        ...assignment,
        id: String(assignment.id ?? assignment._id ?? ''),
    })) as RouteAssignment[];
}
