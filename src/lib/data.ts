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
// Define some cluster centers in Tequila, Jalisco
const clusterCenters = [
    { name: 'Centro Histórico', lat: 20.8833, lng: -103.8360 }, // Downtown
    { name: 'La Villa', lat: 20.8875, lng: -103.8310 }, // North-East
    { name: 'El Calvario', lat: 20.8790, lng: -103.8400 }, // South-West
    { name: 'Buenos Aires', lat: 20.8890, lng: -103.8450 } // North-West
];

// Function to generate a coordinate near a cluster center
function generateClusteredCoordinates(cluster: { lat: number, lng: number }, seed: number) {
    // Smaller variation for tighter clusters, based on a seed
    const latVariation = ((seed * 3) % 40 - 20) / 20000; // ~ +/- 100 meters
    const lngVariation = ((seed * 7) % 40 - 20) / 20000; // ~ +/- 100 meters
    return {
        latitude: parseFloat((cluster.lat + latVariation).toFixed(6)),
        longitude: parseFloat((cluster.lng + lngVariation).toFixed(6))
    };
}

const addresses = [
    'Calle Jose Cuervo 5, Centro', 'Calle Sixto Gorjón 10, Centro', 'Calle Juarez 114, Centro',
    'Calle Ramon Corona 25, Centro', 'Calle Hidalgo 73, Centro', 'Calle Zaragoza 32, Centro',
    'Calle Abasolo 55, La Villa', 'Calle Morelos 12, La Villa', 'Calle Ocampo 9, El Calvario',
    'Calle de la Cruz 22, El Calvario', 'Calle Tabasco 58, Buenos Aires', 'Calle Albino Rojas 15, Buenos Aires'
];

const recipientNames = [
    'Alejandro Fernández', 'Mariana Rodríguez', 'Javier Gómez', 'Ximena Pérez', 'Carlos Martínez',
    'Guadalupe Sánchez', 'Miguel Ángel Torres', 'Sofía Ramírez', 'Diego Flores', 'Lucía Vázquez'
];


const timeSlots: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
const paymentStatuses: Array<'paid' | 'due'> = ['paid', 'due'];
const deliveryTypes: Array<'delivery' | 'pickup'> = ['delivery', 'pickup'];

for (let i = 1; i <= 100; i++) {
    // Assign each order to a cluster to ensure they are grouped
    const cluster = clusterCenters[i % clusterCenters.length];
    const { latitude, longitude } = generateClusteredCoordinates(cluster, i); 
    const address = `${addresses[i % addresses.length]}, Tequila, Jalisco`;
    
    orders.push({
        id: String(i),
        orderNumber: `ORD-${String(i).padStart(3, '0')}`,
        address,
        recipientName: recipientNames[i % recipientNames.length],
        contactNumber: `333-123-${String(i).padStart(4, '0')}`,
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
