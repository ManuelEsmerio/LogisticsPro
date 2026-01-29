import type { Order, StaffMember } from './definitions';

// In-memory store for orders
let orders: Order[] = [];

// In-memory store for staff
let staff: StaffMember[] = [
    { id: '1', name: 'Juan Pérez', createdAt: new Date() },
    { id: '2', name: 'Ana Gómez', createdAt: new Date() },
    { id: '3', name: 'Carlos Rodríguez', createdAt: new Date() },
    { id: '4', name: 'Laura Fernández', createdAt: new Date() },
    { id: '5', name: 'Miguel González', createdAt: new Date() },
];

// --- High-Quality Mock Data for Tequila, Jalisco ---

const mockOrders: Omit<Order, 'id' | 'createdAt'>[] = [
    // --- Cluster 1: Centro Histórico (Morning) ---
    {
        orderNumber: 'ORD-001',
        recipientName: 'Hotel Solar de las Animas',
        address: 'Calle Ramon Corona 86, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0001',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8845,
        longitude: -103.8365,
    },
    {
        orderNumber: 'ORD-002',
        recipientName: 'Restaurante La Antigua Casona',
        address: 'Calle Sixto Gorjón 83, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0002',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8833,
        longitude: -103.8359,
    },
    {
        orderNumber: 'ORD-003',
        recipientName: 'Destilería La Rojeña',
        address: 'Calle Jose Cuervo 73, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0003',
        deliveryType: 'delivery',
        paymentStatus: 'paid', // This one won't be clustered
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8829,
        longitude: -103.8373,
    },
     {
        orderNumber: 'ORD-004',
        recipientName: 'Plaza Principal de Tequila',
        address: 'Calle Sixto Gorjón 1, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0004',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8838,
        longitude: -103.8362,
    },

    // --- Cluster 2: La Villa (Afternoon) ---
    {
        orderNumber: 'ORD-005',
        recipientName: 'Tequila Fortaleza',
        address: 'Calle Tabasco 255, La Villa, Tequila, Jalisco',
        contactNumber: '333-123-0005',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8880,
        longitude: -103.8315,
    },
    {
        orderNumber: 'ORD-006',
        recipientName: 'Vecino de La Villa',
        address: 'Calle Abasolo 55, La Villa, Tequila, Jalisco',
        contactNumber: '333-123-0006',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8872,
        longitude: -103.8305,
    },
     {
        orderNumber: 'ORD-007',
        recipientName: 'Otro Vecino de La Villa',
        address: 'Calle Morelos 12, La Villa, Tequila, Jalisco',
        contactNumber: '333-123-0007',
        deliveryType: 'pickup', // This one won't be clustered
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8865,
        longitude: -103.8320,
    },

    // --- Cluster 3: El Calvario (Afternoon) ---
     {
        orderNumber: 'ORD-008',
        recipientName: 'Capilla del Calvario',
        address: 'Calle de la Cruz 22, El Calvario, Tequila, Jalisco',
        contactNumber: '333-123-0008',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8795,
        longitude: -103.8405,
    },
    {
        orderNumber: 'ORD-009',
        recipientName: 'Residente de El Calvario',
        address: 'Calle Ocampo 9, El Calvario, Tequila, Jalisco',
        contactNumber: '333-123-0009',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8805,
        longitude: -103.8415,
    },

    // --- Cluster 4: Evening Deliveries ---
    {
        orderNumber: 'ORD-010',
        recipientName: 'Bar La Capilla',
        address: 'Calle Hidalgo 34, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0010',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'evening',
        deliveryTime: null,
        latitude: 20.8831,
        longitude: -103.8350,
    },
    {
        orderNumber: 'ORD-011',
        recipientName: 'Tequila Orendain',
        address: 'Av. Juan P. de Orendain 49, Tequila, Jalisco',
        contactNumber: '333-123-0011',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'evening',
        deliveryTime: null,
        latitude: 20.8890,
        longitude: -103.8290,
    },
];


// Populate the in-memory store
mockOrders.forEach((order, index) => {
    orders.push({
        ...order,
        id: String(index + 1),
        createdAt: new Date(Date.now() - (mockOrders.length - index) * 3600000), // created in last few hours
    });
});


// Simulate network latency
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getOrders(): Promise<Order[]> {
  await sleep(500);
  return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  await sleep(200);
  return orders.find(order => order.id === id);
}

export async function addOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
  await sleep(300);
  const newOrder: Order = {
    ...orderData,
    id: String(Date.now()),
    createdAt: new Date(),
  };
  orders.unshift(newOrder);
  return newOrder;
}

export async function updateOrder(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>): Promise<Order | null> {
  await sleep(300);
  const orderIndex = orders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return null;
  }
  orders[orderIndex] = { ...orders[orderIndex], ...updates };
  return orders[orderIndex];
}

export async function deleteOrder(id: string): Promise<boolean> {
  await sleep(300);
  const initialLength = orders.length;
  orders = orders.filter(order => order.id !== id);
  return orders.length < initialLength;
}

export async function getStaff(): Promise<StaffMember[]> {
    await sleep(500);
    return staff.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function addStaff(staffData: Omit<StaffMember, 'id' | 'createdAt'>): Promise<StaffMember> {
    await sleep(300);
    const newStaffMember: StaffMember = {
        ...staffData,
        id: String(Date.now()),
        createdAt: new Date(),
    };
    staff.push(newStaffMember);
    return newStaffMember;
}

export async function updateStaff(id: string, updates: Partial<Omit<StaffMember, 'id' | 'createdAt'>>): Promise<StaffMember | null> {
    await sleep(300);
    const staffIndex = staff.findIndex(s => s.id === id);
    if (staffIndex === -1) {
        return null;
    }
    staff[staffIndex] = { ...staff[staffIndex], ...updates };
    return staff[staffIndex];
}

export async function deleteStaff(id: string): Promise<boolean> {
    await sleep(300);
    const initialLength = staff.length;
    staff = staff.filter(s => s.id !== id);
    return staff.length < initialLength;
}
