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

const mockOrders: Omit<Order, 'id' | 'createdAt'>[] = [
    {
        orderNumber: '#FL-8942',
        recipientName: 'Elena Rodriguez',
        product: 'Arreglo Floral Premium',
        address: 'Calle Ramon Corona 86, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0001',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8845,
        longitude: -103.8365,
        priority: 'Alta',
    },
    {
        orderNumber: '#FL-8951',
        recipientName: 'Marcos Valenzuela',
        product: 'Ramo de Rosas (12)',
        address: 'Calle Sixto Gorjón 83, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0002',
        deliveryType: 'delivery',
        paymentStatus: 'assigned',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8833,
        longitude: -103.8359,
        priority: 'Media',
    },
    {
        orderNumber: '#FL-8959',
        recipientName: 'Roberto Gil',
        product: 'Orquídea Blanca',
        address: 'Calle Jose Cuervo 73, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0003',
        deliveryType: 'delivery',
        paymentStatus: 'paid',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8829,
        longitude: -103.8373,
        priority: 'Baja',
    },
     {
        orderNumber: '#FL-8960',
        recipientName: 'Ana Sofía',
        product: 'Caja de Tulipanes',
        address: 'Calle Sixto Gorjón 1, Centro, Tequila, Jalisco',
        contactNumber: '333-123-0004',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.8838,
        longitude: -103.8362,
        priority: 'Media',
    },
    {
        orderNumber: '#FL-8965',
        recipientName: 'Luis Hernandez',
        product: 'Ramo Silvestre',
        address: 'Calle Tabasco 255, La Villa, Tequila, Jalisco',
        contactNumber: '333-123-0005',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8880,
        longitude: -103.8315,
        priority: 'Alta',
    },
    {
        orderNumber: '#FL-8970',
        recipientName: 'Fernanda Díaz',
        product: 'Girasoles (6)',
        address: 'Calle Abasolo 55, La Villa, Tequila, Jalisco',
        contactNumber: '333-123-0006',
        deliveryType: 'delivery',
        paymentStatus: 'assigned',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8872,
        longitude: -103.8305,
        priority: 'Baja',
    },
     {
        orderNumber: '#FL-8971',
        recipientName: 'Javier Moreno',
        product: 'Planta de interior',
        address: 'Calle Morelos 12, La Villa, Tequila, Jalisco',
        contactNumber: '333-123-0007',
        deliveryType: 'pickup',
        paymentStatus: 'paid',
        deliveryTimeSlot: null,
        deliveryTime: new Date(),
        latitude: 20.8865,
        longitude: -103.8320,
        priority: 'Media',
    },
     {
        orderNumber: '#FL-8975',
        recipientName: 'Héctor Jiménez',
        product: 'Cesta de Frutas y Flores',
        address: 'Calle de la Cruz 22, El Calvario, Tequila, Jalisco',
        contactNumber: '333-123-0008',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'evening',
        deliveryTime: null,
        latitude: 20.8795,
        longitude: -103.8405,
        priority: 'Media',
    },
    {
        orderNumber: '#FL-8980',
        recipientName: 'Gabriela Castillo',
        product: 'Arreglo de Lirios',
        address: 'Calle Ocampo 9, El Calvario, Tequila, Jalisco',
        contactNumber: '333-123-0009',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'evening',
        deliveryTime: null,
        latitude: 20.8805,
        longitude: -103.8415,
        priority: 'Alta',
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
