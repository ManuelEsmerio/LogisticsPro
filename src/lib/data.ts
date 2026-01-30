import type { Order, StaffMember } from './definitions';

const API_URL = 'http://127.0.0.1:3001';

// --- ORDERS ---

export async function getOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_URL}/orders?_sort=createdAt&_order=desc`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();
    // Dates are strings in JSON, convert them back to Date objects
    return orders.map((order: any) => ({
      ...order,
      createdAt: new Date(order.createdAt),
      deliveryTime: order.deliveryTime ? new Date(order.deliveryTime) : null,
    }));
  } catch (error) {
    console.error("getOrders error:", error);
    return [];
  }
}

export async function getOrderById(id: string): Promise<Order | undefined> {
    try {
        const res = await fetch(`${API_URL}/orders/${id}`);
        if (!res.ok) return undefined;
        const order = await res.json();
        return {
            ...order,
            createdAt: new Date(order.createdAt),
            deliveryTime: order.deliveryTime ? new Date(order.deliveryTime) : null,
        };
    } catch (error) {
        console.error(`getOrderById(${id}) error:`, error);
        return undefined;
    }
}

export async function addOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const newOrderPayload = {
        ...orderData,
        createdAt: new Date().toISOString(),
        deliveryTime: orderData.deliveryTime ? orderData.deliveryTime.toISOString() : null,
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
        createdAt: new Date(newOrder.createdAt),
        deliveryTime: newOrder.deliveryTime ? new Date(newOrder.deliveryTime) : null,
    };
}

export async function updateOrder(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<Order | null> {
    const updatePayload = {
        ...updates,
        ...(updates.deliveryTime && { deliveryTime: updates.deliveryTime.toISOString() }),
    };

    const res = await fetch(`${API_URL}/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
    });
    if (!res.ok) return null;
    const updatedOrder = await res.json();
    return {
        ...updatedOrder,
        createdAt: new Date(updatedOrder.createdAt),
        deliveryTime: updatedOrder.deliveryTime ? new Date(updatedOrder.deliveryTime) : null,
    };
}

export async function deleteOrder(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/orders/${id}`, {
        method: 'DELETE',
    });
    return res.ok;
}


// --- STAFF ---

export async function getStaff(): Promise<StaffMember[]> {
    try {
        const res = await fetch(`${API_URL}/staff?_sort=createdAt&_order=desc`);
        if (!res.ok) throw new Error('Failed to fetch staff');
        const staff = await res.json();
        return staff.map((s: any) => ({
            ...s,
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
    const res = await fetch(`${API_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaffPayload),
    });
    if (!res.ok) throw new Error('Failed to add staff');
    const newStaff = await res.json();
    return {
        ...newStaff,
        createdAt: new Date(newStaff.createdAt),
    };
}

export async function updateStaff(id: string, updates: Partial<Omit<StaffMember, 'id' | 'createdAt'>>): Promise<StaffMember | null> {
    const res = await fetch(`${API_URL}/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const updatedStaff = await res.json();
    return {
        ...updatedStaff,
        createdAt: new Date(updatedStaff.createdAt),
    };
}

export async function deleteStaff(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}/staff/${id}`, {
        method: 'DELETE',
    });
    return res.ok;
}

// --- BULK OPERATIONS ---
export async function updateMultipleOrdersStatus(orderIds: string[], status: Order['paymentStatus']): Promise<void> {
    try {
        await Promise.all(
            orderIds.map(id => 
                fetch(`${API_URL}/orders/${id}`, {
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
