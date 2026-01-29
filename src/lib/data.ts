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


// Helper functions to generate mock data
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
    // Use different base coordinates for more variety
    const latBase = 40.7128 + ((simpleHash(address) % 100) - 50) / 100; // NYC area with more spread
    const lngBase = -74.0060 + ((simpleHash(address.split("").reverse().join("")) % 100) - 50) / 100;
    const lat = latBase + (hash % 1000) / 50000;
    const lng = lngBase + (((hash / 1000) | 0) % 1000) / 50000;
    return { latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) };
}

const addresses = [
    'Calle de Alcalá, 28014 Madrid, España',
    'Passeig de Gràcia, 92, 08008 Barcelona, España',
    'Avenida de la Constitución, 41004 Sevilla, España',
    'Calle de la Paz, 46003 Valencia, España',
    'Gran Vía, 28013 Madrid, España',
    'Avenida de los Insurgentes Sur 1581, Ciudad de México, CDMX, México',
    'Paseo de la Reforma 222, Juárez, 06600 Ciudad de México, CDMX, México',
    'Avenida Corrientes 1343, C1043 ABE, Buenos Aires, Argentina',
    'Calle 72 #10-34, Bogotá, Colombia',
    'Avenida Paulista 1578, São Paulo, SP, Brasil',
    'Plaza de Armas, Santiago, Región Metropolitana, Chile'
];

const recipientNames = [
    'Sofía García', 'Mateo Hernández', 'Valentina Martínez', 'Santiago López', 'Isabella González',
    'Sebastián Pérez', 'Camila Rodríguez', 'Matías Sánchez', 'Valeria Ramírez', 'Daniel Gómez'
];


const timeSlots: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
const paymentStatuses: Array<'paid' | 'due'> = ['paid', 'due'];
const deliveryTypes: Array<'delivery' | 'pickup'> = ['delivery', 'pickup'];

for (let i = 1; i <= 100; i++) {
    const address = addresses[i % addresses.length];
    const { latitude, longitude } = generateMockCoordinates(address + i); // add i to vary coords
    orders.push({
        id: String(i),
        orderNumber: `ORD-${String(i).padStart(3, '0')}`,
        address,
        recipientName: recipientNames[i % recipientNames.length],
        contactNumber: `555-${String(i).padStart(4, '0')}`,
        deliveryType: deliveryTypes[i % deliveryTypes.length],
        paymentStatus: paymentStatuses[i % paymentStatuses.length],
        deliveryTimeSlot: timeSlots[i % timeSlots.length],
        deliveryTime: null,
        latitude,
        longitude,
        createdAt: new Date(Date.now() - (100 - i) * 3600000), // created in last 100 hours
    });
}


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
  orders.push(newOrder);
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
