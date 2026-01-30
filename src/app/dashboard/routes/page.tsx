'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getClusteredRoutesAction } from '@/lib/actions';
import type { ClusteredRoute, Order, StaffMember } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MainNav } from '@/components/dashboard/main-nav';
import Logo from '@/components/logo';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/dashboard/user-nav';
import { cn } from '@/lib/utils';
import Image from 'next/image';

function UnassignedOrderCard({ order }: { order: Order }) {
    const zoneConfig = {
        morning: { color: 'border-l-zone-north', text: 'text-zone-north', name: 'ZONA NORTE' },
        afternoon: { color: 'border-l-zone-center', text: 'text-zone-center', name: 'ZONA CENTRO' },
        evening: { color: 'border-l-zone-south', text: 'text-zone-south', name: 'ZONA SUR' },
    }
    const config = zoneConfig[order.deliveryTimeSlot || 'morning'];
    
    return (
        <div className={cn("bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-4", config.color)}>
            <div className="flex justify-between items-start mb-1">
                <span className={cn("text-[10px] font-bold", config.text)}>{config.name} • {order.orderNumber}</span>
                <span className="material-symbols-outlined text-slate-300 text-lg">drag_indicator</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{order.address}</p>
            <div className="flex items-center gap-3 mt-2 text-slate-400">
                <span className="flex items-center gap-1 text-[11px]"><span className="material-symbols-outlined text-sm">schedule</span> {order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                {order.priority === 'Alta' && <span className="flex items-center gap-1 text-[11px]"><span className="material-symbols-outlined text-sm">priority_high</span> Urgente</span>}
            </div>
        </div>
    );
}

function DriverColumn({ driver, route, onAssignRoute }: { driver: StaffMember, route: ClusteredRoute | null, onAssignRoute: (driverId: string, routeId: number) => void }) {
    const orders = route?.orders || [];
    const capacity = 12; // Mock capacity

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-w-[300px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                        <Image alt={driver.name} src={driver.avatarUrl} width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"/>
                        {driver.status === 'Activo' && <span className="absolute -bottom-1 -right-1 bg-accent w-3.5 h-3.5 rounded-full border-2 border-white"></span>}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-primary">{driver.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{driver.role}</p>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Capacidad de Carga</span>
                        <span className="text-xs font-bold text-primary">{orders.length} / {capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-accent h-full transition-all" style={{width: `${(orders.length / capacity) * 100}%`}}></div>
                    </div>
                </div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar bg-white">
                {orders.map((order, index) => (
                    <div key={order.orderNumber} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm group hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-primary text-xs">#{index + 1} • {order.address.split(',')[0]}</span>
                            <span className="material-symbols-outlined text-slate-300 text-sm">drag_handle</span>
                        </div>
                        <p className="text-slate-600 font-medium text-xs">{order.address}</p>
                    </div>
                ))}
                <div className="h-16 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-xl">add_circle</span>
                    <span className="text-[10px] font-bold uppercase mt-1">Soltar pedido</span>
                </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                 <div className="flex justify-between items-center">
                    <div className="text-[10px] font-medium text-slate-500">
                        <p className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">timer</span> {orders.length > 0 ? '2h 15m est.' : 'N/A'}</p>
                        <p className="flex items-center gap-1 mt-0.5"><span className="material-symbols-outlined text-xs">distance</span> {orders.length > 0 ? '14.2 km' : 'N/A'}</p>
                    </div>
                    <button className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">map</span>
                    </button>
                </div>
            </div>
        </div>
    );
}


export default function RoutesPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening'>('morning');
    const [clusters, setClusters] = useState<ClusteredRoute[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [assignedDrivers, setAssignedDrivers] = useState<Record<number, string>>({});

    useEffect(() => {
        setIsMounted(true);
        handleTimeSlotChange(timeSlot);
    }, []);

    const handleTimeSlotChange = (value: 'morning' | 'afternoon' | 'evening') => {
        setTimeSlot(value);
        setClusters([]);
        setAllOrders([]);
        setAssignedDrivers({});
        startTransition(async () => {
            const result = await getClusteredRoutesAction(value);
            if (result && !result.error) {
                setClusters(result.clusteredRoutes);

                const ordersFromClusters = result.clusteredRoutes.flatMap(c => c.orders);
                setAllOrders(ordersFromClusters);
                
                if(result.staff) {
                    setStaff(result.staff);
                }
            } else {
                 toast({ variant: "destructive", title: "Error", description: result.error });
            }
        });
    }

    const unassignedOrders = allOrders.filter(order => 
        !Object.values(assignedDrivers).some(driverId => {
            const assignedClusterIndex = Object.keys(assignedDrivers).find(key => assignedDrivers[parseInt(key)] === driverId);
            if (assignedClusterIndex === undefined) return false;
            const assignedCluster = clusters[parseInt(assignedClusterIndex)];
            return assignedCluster?.orders.some(o => o.orderNumber === order.orderNumber);
        })
    );
    
    return (
       <div className="bg-silk-gray font-sans text-slate-900 min-h-screen flex flex-col overflow-hidden">
            <header className="h-14 bg-navy-dark flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-12 h-full">
                    <Logo />
                    <MainNav />
                </div>
                <div className="flex items-center gap-6">
                    <div className="relative group hidden sm:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <Input className="bg-white/10 border-none rounded-lg py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 w-64 focus:ring-1 focus:ring-white/20 transition-all" placeholder="Buscar pedido..." type="text"/>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <UserNav />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 py-6 flex flex-col gap-4 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-primary tracking-tight">Optimización y Asignación de Rutas</h1>
                            <p className="text-slate-500 text-sm mt-1">Selecciona un horario para optimizar las rutas de entrega y asignarlas a los transportistas.</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Franja Horaria</label>
                             <div className="relative">
                                <Select onValueChange={handleTimeSlotChange} defaultValue={timeSlot} disabled={isPending}>
                                    <SelectTrigger className="appearance-none bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/10 cursor-pointer min-w-[200px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="morning">Mañana (08:00 - 13:00)</SelectItem>
                                        <SelectItem value="afternoon">Tarde (13:00 - 18:00)</SelectItem>
                                        <SelectItem value="evening">Noche (18:00 - 22:00)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="flex-1 flex overflow-hidden">
                    <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                        <div className="p-4 border-b border-slate-200 bg-white/50">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">list_alt</span>
                                    Pedidos sin asignar
                                </h2>
                                <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unassignedOrders.length}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {isPending && Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                            {!isPending && unassignedOrders.map(order => <UnassignedOrderCard key={order.id} order={order} />)}
                             {!isPending && unassignedOrders.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-10">No hay pedidos sin asignar.</div>
                            )}
                        </div>
                    </aside>
                    <section className="flex-1 bg-silk-gray p-6 overflow-x-auto custom-scrollbar flex gap-6">
                        {isPending && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-full min-w-[300px] rounded-2xl" />)}
                        
                        {!isPending && staff.map(driver => {
                            const assignedClusterIndex = Object.keys(assignedDrivers).find(key => assignedDrivers[parseInt(key)] === driver.id);
                            const route = assignedClusterIndex !== undefined ? clusters[parseInt(assignedClusterIndex)] : null;
                            return <DriverColumn key={driver.id} driver={driver} route={route} onAssignRoute={() => {}} />
                        })}
                        
                        {!isPending && (
                             <div className="min-w-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/40 hover:bg-white hover:border-slate-300 transition-all cursor-pointer group">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-2xl">person_add</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Añadir Transportista</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <button className="fixed bottom-24 right-8 bg-navy-dark text-white p-4 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all z-50 flex items-center gap-2">
                <span className="material-symbols-outlined">map</span>
                <span className="text-sm font-semibold pr-1">Ver Mapa</span>
            </button>
            <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-8 shrink-0 z-40">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eficiencia Operativa</p>
                            <p className="text-sm font-bold text-primary">82.4% <span className="text-accent text-[10px] font-bold ml-1">↑ +2.1%</span></p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pedidos</p>
                            <p className="text-sm font-bold text-primary">{allOrders.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activos</p>
                            <p className="text-sm font-bold text-primary">{staff.length} Choferes</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="px-6 py-2.5 rounded-xl border-slate-200 text-sm font-bold text-primary hover:bg-slate-50 transition-all">
                        Previsualizar Rutas
                    </Button>
                    <Button className="px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-slate-800 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">local_shipping</span>
                        Confirmar y Despachar
                    </Button>
                </div>
            </footer>
       </div>
    );
}

