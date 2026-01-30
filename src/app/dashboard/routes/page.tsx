'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, UniqueIdentifier } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';


function formatDuration(duration: string): string {
    const seconds = parseInt(duration.replace('s', ''), 10);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
}

function UnassignedRouteCard({ route, clusterIndex, isOverlay = false }: { route: ClusteredRoute; clusterIndex: number; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `cluster-${clusterIndex}`,
        data: { route, clusterIndex, type: 'cluster' }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const zoneConfig = useMemo(() => ({
        morning: { color: 'border-l-zone-north', text: 'text-zone-north', name: 'ZONA NORTE' },
        afternoon: { color: 'border-l-zone-center', text: 'text-zone-center', name: 'ZONA CENTRO' },
        evening: { color: 'border-l-zone-south', text: 'text-zone-south', name: 'ZONA SUR' },
    }), []);
    
    const config = zoneConfig[route.timeSlot || 'morning'];

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("route-card", config.color, isOverlay && "shadow-2xl ring-2 ring-primary")}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.text)}>{config.name}</span>
                    <h3 className="text-sm font-bold text-slate-800">Bloque #{clusterIndex + 1}</h3>
                </div>
                <span className="material-symbols-outlined text-slate-300 cursor-grab active:cursor-grabbing">drag_indicator</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                    <span className="text-[11px] font-medium">{route.orders.length} Pedidos</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="material-symbols-outlined text-sm">distance</span>
                    <span className="text-[11px] font-medium">{(route.distance / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="text-[11px] font-medium">Tiempo est: {formatDuration(route.duration)}</span>
                </div>
            </div>
        </div>
    );
}

function DriverColumn({ driver, route, clusterIndex }: { driver: StaffMember, route: ClusteredRoute | null, clusterIndex: number | null }) {
    const { isOver, setNodeRef } = useDroppable({
        id: driver.id,
        data: { type: 'driver', driver }
    });
    const orders = route?.orders || [];
    const capacity = 12; // Mock capacity

    return (
        <div ref={setNodeRef} className={cn("driver-column", isOver && "bg-slate-100", route && "border-primary ring-2 ring-primary/5")}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                        <Image alt={driver.name} src={driver.avatarUrl} width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"/>
                        <span className={cn("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white", driver.status === 'Activo' ? 'bg-accent' : 'bg-slate-300')}></span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-primary">{driver.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{driver.role}</p>
                    </div>
                    {route && clusterIndex !== null && <div className="bg-zone-center/10 px-2 py-1 rounded text-[10px] font-bold text-zone-center">RUTA #{clusterIndex + 1}</div>}
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
            
            {route ? (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar bg-white">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secuencia de Entrega</span>
                             <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        {orders.map((order, index) => (
                            <div key={order.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-primary/20 transition-all cursor-move">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-primary text-[11px]">#{index + 1} • {order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    <span className="material-symbols-outlined text-slate-300 text-xs">reorder</span>
                                </div>
                                <p className="text-slate-600 font-medium text-[11px] truncate">{order.address}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                         <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                             <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> {formatDuration(route.duration)} est.</span>
                             <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">distance</span> {(route.distance / 1000).toFixed(1)} km</span>
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-slate-100 m-4 rounded-xl">
                    <span className="material-symbols-outlined text-slate-200 text-4xl mb-2">move_to_inbox</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Arrastra un bloque de ruta aquí</p>
                </div>
            )}
        </div>
    );
}

export default function RoutesPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening'>('morning');
    const [clusters, setClusters] = useState<ClusteredRoute[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [assignedRoutes, setAssignedRoutes] = useState<Record<string, number>>({}); // driverId -> clusterIndex
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    const activeCluster = useMemo(() => {
      if (typeof activeId === 'string' && activeId.startsWith('cluster-')) {
        const clusterIndex = parseInt(activeId.split('-')[1]);
        if(!isNaN(clusterIndex) && clusters[clusterIndex]) {
          return { route: clusters[clusterIndex], index: clusterIndex };
        }
      }
      return null;
    }, [activeId, clusters]);

    const { setNodeRef: unassignedDropRef } = useDroppable({ id: 'unassigned' });


    useEffect(() => {
        setIsMounted(true);
        handleTimeSlotChange(timeSlot);
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || !active.data.current || active.data.current.type !== 'cluster') return;
    
        const draggedClusterIndex = active.data.current.clusterIndex as number;
        const targetId = over.id;
    
        startTransition(() => {
            setAssignedRoutes(prev => {
                const newAssignments = { ...prev };
    
                const sourceDriverId = Object.keys(newAssignments).find(key => newAssignments[key] === draggedClusterIndex);
                if (sourceDriverId) {
                    delete newAssignments[sourceDriverId];
                }
    
                if (targetId && targetId !== 'unassigned') { // If dropped on a driver
                    const targetDriverId = String(targetId);
                    const currentRouteOfTarget = newAssignments[targetDriverId];
    
                    // Swap: find the driver who had the route we are dropping on and give them the old route of our source
                    if (currentRouteOfTarget !== undefined && sourceDriverId) {
                        newAssignments[sourceDriverId] = currentRouteOfTarget;
                    }
                    newAssignments[targetDriverId] = draggedClusterIndex;
                }
                
                return newAssignments;
            });
        });
    };

    const handleTimeSlotChange = (value: 'morning' | 'afternoon' | 'evening') => {
        setTimeSlot(value);
        setClusters([]);
        setStaff([]);
        setAssignedRoutes({});
        startTransition(async () => {
            const result = await getClusteredRoutesAction(value);
            if (result && result.clusteredRoutes) {
                setClusters(result.clusteredRoutes);
                if(result.staff) {
                    setStaff(result.staff);
                }
            } else {
                 toast({ variant: "destructive", title: "Error", description: result.error || "No se pudieron obtener las rutas." });
            }
        });
    }

    const unassignedClusters = useMemo(() => {
        const assignedIndices = new Set(Object.values(assignedRoutes));
        return clusters.map((cluster, index) => ({ cluster, index }))
                       .filter(({ index }) => !assignedIndices.has(index));
    }, [clusters, assignedRoutes]);
    
    return (
       <DndContext 
            onDragStart={(event) => setActiveId(event.active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
            collisionDetection={closestCenter}
        >
        <div className="px-8 py-6 flex flex-col gap-4 bg-white border-b border-slate-200 shrink-0">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Optimización y Asignación de Rutas</h1>
                    <p className="text-slate-500 text-sm mt-1">Arrastra bloques de rutas sugeridas a los transportistas disponibles.</p>
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
            <aside ref={unassignedDropRef} id="unassigned" className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 bg-white/50">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">auto_graph</span>
                            Rutas Sugeridas
                        </h2>
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unassignedClusters.length} BLOQUES</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {isPending && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                    {!isPending && unassignedClusters.map(({ cluster, index }) => <UnassignedRouteCard key={index} route={cluster} clusterIndex={index} />)}
                     {!isPending && unassignedClusters.length === 0 && (
                        <div className="text-center text-slate-400 text-sm py-10">No hay rutas sin asignar.</div>
                    )}
                </div>
            </aside>
            <section className="flex-1 bg-silk-gray p-6 overflow-x-auto custom-scrollbar flex gap-6">
                {isPending && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-full min-w-[320px] rounded-2xl" />)}
                
                {!isPending && staff.map(driver => {
                   const assignedClusterIndex = assignedRoutes[driver.id];
                   const route = assignedClusterIndex !== undefined ? clusters[assignedClusterIndex] : null;
                   return <DriverColumn key={driver.id} driver={driver} route={route} clusterIndex={assignedClusterIndex} />
                })}
                
                {!isPending && (
                     <div className="min-w-[320px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/40 hover:bg-white hover:border-slate-300 transition-all cursor-pointer group">
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bloques Pendientes</p>
                        <p className="text-sm font-bold text-primary">{unassignedClusters.length}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activos</p>
                        <p className="text-sm font-bold text-primary">{staff.length} Choferes</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" className="px-6 py-2.5 rounded-xl border-slate-200 text-sm font-bold text-primary hover:bg-slate-50 transition-all">
                    Re-calcular Rutas
                </Button>
                <Button className="px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-slate-800 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">local_shipping</span>
                    Confirmar y Despachar
                </Button>
            </div>
        </footer>
         <DragOverlay>
            {activeCluster ? <UnassignedRouteCard route={activeCluster.route} clusterIndex={activeCluster.index} isOverlay /> : null}
        </DragOverlay>
       </DndContext>
    );
}
