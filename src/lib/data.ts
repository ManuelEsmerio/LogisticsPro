import type { Order, StaffMember } from './definitions';

// In-memory store for orders
let orders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    recipientName: 'John Doe',
    contactNumber: '555-1234',
    deliveryType: 'delivery',
    paymentStatus: 'paid',
    deliveryTimeSlot: 'morning',
    deliveryTime: null,
    latitude: 37.422,
    longitude: -122.084,
    createdAt: new Date('2023-10-26T10:00:00Z'),
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    address: '1 Infinite Loop, Cupertino, CA',
    recipientName: 'Jane Smith',
    contactNumber: '555-5678',
    deliveryType: 'delivery',
    paymentStatus: 'due',
    deliveryTimeSlot: 'afternoon',
    deliveryTime: null,
    latitude: 37.3318,
    longitude: -122.0312,
    createdAt: new Date('2023-10-26T11:30:00Z'),
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    address: 'Microsoft Campus, Redmond, WA',
    recipientName: 'Peter Jones',
    contactNumber: '555-8765',
    deliveryType: 'pickup',
    paymentStatus: 'paid',
    deliveryTimeSlot: null,
    deliveryTime: new Date('2023-10-27T16:00:00Z'),
    latitude: 47.639,
    longitude: -122.128,
    createdAt: new Date('2023-10-26T14:15:00Z'),
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    address: '2121 N Clark St, Chicago, IL',
    recipientName: 'Emily White',
    contactNumber: '555-4321',
    deliveryType: 'delivery',
    paymentStatus: 'paid',
    deliveryTimeSlot: 'morning',
    deliveryTime: null,
    latitude: 41.921,
    longitude: -87.641,
    createdAt: new Date('2023-10-27T09:00:00Z'),
  },
    {
    id: '5',
    orderNumber: 'ORD-005',
    address: 'Golden Gate Bridge, San Francisco, CA',
    recipientName: 'Michael Brown',
    contactNumber: '555-1122',
    deliveryType: 'delivery',
    paymentStatus: 'due',
    deliveryTimeSlot: 'evening',
    deliveryTime: null,
    latitude: 37.8199,
    longitude: -122.4783,
    createdAt: new Date('2023-10-27T10:30:00Z'),
  },
];

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

// In-memory store for staff
let staff: StaffMember[] = [
    { id: '1', name: 'Driver Dan', phone: '555-0101', vehicleId: 'TRUCK-01', createdAt: new Date() },
    { id: '2', name: 'Driver Dave', phone: '555-0102', vehicleId: 'VAN-02', createdAt: new Date() },
];

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
