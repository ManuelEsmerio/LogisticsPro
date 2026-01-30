import type { Order, StaffMember } from './definitions';
import { PlaceHolderImages } from './placeholder-images';

// In-memory store for orders
let orders: Order[] = [];

const staffAvatar1 = PlaceHolderImages.find(p => p.id === 'staff-1')?.imageUrl ?? "https://picsum.photos/seed/1/100/100";
const staffAvatar2 = PlaceHolderImages.find(p => p.id === 'staff-2')?.imageUrl ?? "https://picsum.photos/seed/2/100/100";
const staffAvatar3 = PlaceHolderImages.find(p => p.id === 'staff-3')?.imageUrl ?? "https://picsum.photos/seed/3/100/100";
const staffAvatar4 = PlaceHolderImages.find(p => p.id === 'staff-4')?.imageUrl ?? "https://picsum.photos/seed/4/100/100";
const staffAvatar5 = PlaceHolderImages.find(p => p.id === 'staff-5')?.imageUrl ?? "https://picsum.photos/seed/5/100/100";
const staffAvatar6 = PlaceHolderImages.find(p => p.id === 'staff-6')?.imageUrl ?? "https://picsum.photos/seed/6/100/100";


// In-memory store for staff
let staff: StaffMember[] = [
    { 
        id: '1', 
        name: 'Juan Pérez', 
        email: 'jperez@logistics.pro',
        phone: '600 111 222',
        role: 'Repartidor',
        status: 'Activo',
        shift: 'Mañana (08:00 - 16:00)',
        avatarUrl: staffAvatar1,
        createdAt: new Date('2023-01-15'),
        vehicleType: 'moto',
        licenseNumber: 'B-1234XYZ'
    },
    { 
        id: '2', 
        name: 'Ana Gómez', 
        email: 'agomez@logistics.pro',
        phone: '611 222 333',
        role: 'Administrador',
        status: 'Activo',
        shift: 'Intermedio (10:00 - 18:00)',
        avatarUrl: staffAvatar2,
        createdAt: new Date('2022-03-22'),
        vehicleType: 'ninguno',
    },
    { 
        id: '3', 
        name: 'Carlos Rodríguez', 
        email: 'crodriguez@logistics.pro',
        phone: '622 333 444',
        role: 'Florista Senior',
        status: 'Inactivo',
        shift: 'Tarde (14:00 - 22:00)',
        avatarUrl: staffAvatar3,
        createdAt: new Date('2023-11-10'),
        vehicleType: 'ninguno'
    },
    { 
        id: '4', 
        name: 'Laura Fernández', 
        email: 'lfernandez@logistics.pro',
        phone: '633 444 555',
        role: 'Repartidor',
        status: 'Activo',
        shift: 'Mañana (08:00 - 16:00)',
        avatarUrl: staffAvatar4,
        createdAt: new Date('2024-02-05'),
        vehicleType: 'bici',
        licenseNumber: 'C-5678ABC'
    },
    { 
        id: '5', 
        name: 'Miguel González', 
        email: 'mgonzalez@logistics.pro',
        phone: '644 555 666',
        role: 'Gerente',
        status: 'Activo',
        shift: 'Intermedio (09:00 - 17:00)',
        avatarUrl: staffAvatar5,
        createdAt: new Date('2021-08-01'),
        vehicleType: 'ninguno'
    },
    { 
        id: '6', 
        name: 'Sofía Reyes', 
        email: 'sreyes@logistics.pro',
        phone: '655 666 777',
        role: 'Repartidor',
        status: 'Inactivo',
        shift: 'Tarde (14:00 - 22:00)',
        avatarUrl: staffAvatar6,
        createdAt: new Date('2023-09-20'),
        vehicleType: 'furgoneta',
        licenseNumber: 'D-9012DEF'
    },
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
    // New Orders for more clusters
    {
        orderNumber: '#FL-9001',
        recipientName: 'Ricardo Ponce',
        product: 'Ramo de Girasoles',
        address: 'Carretera a la Estancia 12, El Ranchito, Jalisco',
        contactNumber: '333-123-9001',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.9010,
        longitude: -103.8550,
        priority: 'Media',
    },
    {
        orderNumber: '#FL-9002',
        recipientName: 'Patricia Solis',
        product: 'Caja de Rosas Rojas',
        address: 'Privada las Flores 5, El Ranchito, Jalisco',
        contactNumber: '333-123-9002',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'morning',
        deliveryTime: null,
        latitude: 20.9015,
        longitude: -103.8545,
        priority: 'Alta',
    },
    {
        orderNumber: '#FL-9003',
        recipientName: 'David Peña',
        product: 'Ramo de Tulipanes',
        address: 'Hacienda San Martín 40, San Martin, Jalisco',
        contactNumber: '333-123-9003',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8650,
        longitude: -103.8100,
        priority: 'Baja',
    },
     {
        orderNumber: '#FL-9004',
        recipientName: 'Verónica Luna',
        product: 'Centro de Mesa',
        address: 'Calle Hidalgo 200, San Martin, Jalisco',
        contactNumber: '333-123-9004',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'afternoon',
        deliveryTime: null,
        latitude: 20.8655,
        longitude: -103.8115,
        priority: 'Media',
    },
    {
        orderNumber: '#FL-9005',
        recipientName: 'Oscar Nieto',
        product: 'Planta Suculenta',
        address: 'Calle del Sol 1, La Cima, Jalisco',
        contactNumber: '333-123-9005',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'evening',
        deliveryTime: null,
        latitude: 20.8950,
        longitude: -103.8200,
        priority: 'Baja',
    },
    {
        orderNumber: '#FL-9006',
        recipientName: 'Isabel Torres',
        product: 'Ramo de Gerberas',
        address: 'Avenida Luna 50, La Cima, Jalisco',
        contactNumber: '333-123-9006',
        deliveryType: 'delivery',
        paymentStatus: 'due',
        deliveryTimeSlot: 'evening',
        deliveryTime: null,
        latitude: 20.8955,
        longitude: -103.8210,
        priority: 'Media',
    },
];


// Populate the in-memory store if it's empty
if (orders.length === 0) {
    mockOrders.forEach((order, index) => {
        orders.push({
            ...order,
            id: String(index + 1),
            createdAt: new Date(Date.now() - (mockOrders.length - index) * 3600000), // created in last few hours
        });
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

export async function addStaff(staffData: Omit<StaffMember, 'id' | 'createdAt' | 'status'>): Promise<StaffMember> {
    await sleep(300);
    const newStaffMember: StaffMember = {
        id: String(Date.now()),
        status: 'Activo',
        avatarUrl: staffData.avatarUrl || `https://picsum.photos/seed/${Date.now()}/100/100`,
        createdAt: new Date(),
        ...staffData,
    };
    staff.unshift(newStaffMember);
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

export async function updateMultipleOrdersStatus(orderIds: string[], status: Order['paymentStatus']): Promise<void> {
  await sleep(50); // a quick update
  orders = orders.map(order => 
      orderIds.includes(order.id) 
          ? { ...order, paymentStatus: status } 
          : order
  );
}
