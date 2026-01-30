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
import { getClusteredRoutesAction, updateOrdersStatus } from '@/lib/actions';
import type { ClusteredRoute, Order, StaffMember } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, UniqueIdentifier } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { AddDriverDialog } from '@/components/dashboard/routes/add-driver-dialog';


function formatDuration(duration: string): string {
    const seconds = parseInt(duration.replace('s', ''), 10);
    if (isNaN(seconds)) return '0m';
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-4", config.color, isOverlay && "shadow-2xl ring-2 ring-primary")}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.text)}>{config.name}</span>
                    <h3 className="text-sm font-bold text-foreground">Bloque #{clusterIndex + 1}</h3>
                </div>
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing">drag_indicator</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                    <span className="text-[11px] font-medium">{route.orders.length} Pedidos</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="material-symbols-outlined text-sm">distance</span>
                    <span className="text-[11px] font-medium">{(route.distance / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="text-[11px] font-medium">Tiempo est: {formatDuration(route.duration)}</span>
                </div>
            </div>
        </div>
    );
}

function AssignedRouteCard({ route, clusterIndex, onUnassign }: { route: ClusteredRoute; clusterIndex: number; onUnassign: () => void; }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `cluster-${clusterIndex}`,
        data: { route, clusterIndex, type: 'cluster' },
        disabled: !route,
    });

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-card dark:bg-slate-800/60 border border-border dark:border-slate-700 rounded-xl p-4 m-4 shadow-sm cursor-grab active:cursor-grabbing">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-foreground">Bloque #{clusterIndex + 1}</h3>
                <Button variant="ghost" size="sm" onClick={onUnassign} className="text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1">
                    <span className="material-symbols-outlined text-base">close</span>
                    DESASIGNAR
                </Button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground space-y-2 pt-2 border-t border-border dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">inventory_2</span>
                    <span>{route.orders.length} Pedidos</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">distance</span>
                    <span>{(route.distance / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">timer</span>
                    <span>{formatDuration(route.duration)} est.</span>
                </div>
            </div>
        </div>
    );
}

function DriverColumn({ 
    driver, 
    route, 
    clusterIndex, 
    onUnassign,
    onRemove,
    activeCluster
}: { 
    driver: StaffMember, 
    route: ClusteredRoute | null, 
    clusterIndex: number | null,
    onUnassign: (clusterIndex: number) => void,
    onRemove: (driverId: string) => void,
    activeCluster: { route: ClusteredRoute, index: number } | null 
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: driver.id,
        data: { type: 'driver', driver }
    });

    const capacity = 12; // Mock capacity

    return (
        <div ref={setNodeRef} className={cn(
            "bg-card rounded-2xl border border-border shadow-sm flex flex-col min-w-[320px] transition-all", 
            isOver && !route && "border-primary border-2 border-dashed",
        )}>
            <div className={"p-5 border-b border-border bg-muted/30 dark:bg-slate-800/40 rounded-t-2xl"} >
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                        <Image alt={driver.name} src={driver.avatarUrl} width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-card dark:ring-slate-700 shadow-sm"/>
                        <span className={cn("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card", driver.status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400')}></span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-foreground">{driver.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{driver.role}</p>
                    </div>
                    {route && clusterIndex !== null && <div className="bg-zone-center/10 px-2 py-1 rounded-[6px] text-[10px] font-bold text-zone-center">RUTA #{clusterIndex + 1}</div>}
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-white hover:bg-destructive/20" onClick={() => onRemove(driver.id)}>
                        <span className="material-symbols-outlined text-base">close</span>
                    </Button>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Capacidad de Carga</span>
                        <span className="text-xs font-bold text-accent">{route?.orders.length || 0} / {capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="bg-accent h-full transition-all shadow-neon-glow" style={{width: `${((route?.orders.length || 0) / capacity) * 100}%`}}></div>
                    </div>
                </div>
            </div>
            
            <div className={cn("flex-1 flex flex-col min-h-0")}>
            {route && clusterIndex !== null ? (
                 <AssignedRouteCard route={route} clusterIndex={clusterIndex} onUnassign={() => onUnassign(clusterIndex)} />
            ) : isOver && activeCluster ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted dark:bg-slate-800 flex items-center justify-center text-muted-foreground dark:text-slate-500 mb-4">
                        <span className="material-symbols-outlined text-4xl">download</span>
                    </div>
                    <h3 className="font-bold text-lg text-foreground">Soltar para Asignar</h3>
                    <p className="text-sm text-muted-foreground">Asignará Bloque #{activeCluster.index + 1} automáticamente</p>
                </div>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 m-4 text-center">
                    <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-4xl mb-2">move_to_inbox</span>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Arrastra un bloque de ruta aquí</p>
                </div>
            )}
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
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [displayedStaff, setDisplayedStaff] = useState<StaffMember[]>([]);
    const [assignedRoutes, setAssignedRoutes] = useState<Record<string, number>>({}); // driverId -> clusterIndex
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);


    const activeCluster = useMemo(() => {
      if (typeof activeId === 'string' && activeId.startsWith('cluster-')) {
        const clusterIndex = parseInt(activeId.split('-')[1]);
        if(!isNaN(clusterIndex) && clusters[clusterIndex]) {
          return { route: clusters[clusterIndex], index: clusterIndex };
        }
      }
      return null;
    }, [activeId, clusters]);

    const unassignedDropRef = useDroppable({ id: 'unassigned' });


    useEffect(() => {
        setIsMounted(true);
        handleTimeSlotChange(timeSlot, true);
    }, []);

    const unassignedClusters = useMemo(() => {
        const assignedIndices = new Set(Object.values(assignedRoutes));
        return clusters.map((cluster, index) => ({ cluster, index }))
                       .filter(({ index }) => !assignedIndices.has(index));
    }, [clusters, assignedRoutes]);

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;

        if (!active || !over) return;

        const draggedData = active.data.current;
        if (draggedData?.type !== 'cluster') return;
        
        const draggedClusterIndex = draggedData.clusterIndex as number;
        const ordersInRoute = clusters[draggedClusterIndex]?.orders.map(o => o.id);
        if (!ordersInRoute) return;

        // Case 1: Dropped over the unassigned area
        if (over.id === 'unassigned') {
            const sourceDriverId = Object.keys(assignedRoutes).find(key => assignedRoutes[key] === draggedClusterIndex);
            if(sourceDriverId) {
                 startTransition(() => {
                    setAssignedRoutes(prev => {
                        const newAssignments = { ...prev };
                        delete newAssignments[sourceDriverId];
                        return newAssignments;
                    });
                    updateOrdersStatus(ordersInRoute, 'due');
                });
            }
            return;
        }
        
        // Case 2: Dropped over a driver column
        const overData = over.data.current;
        if (overData?.type === 'driver') {
            const targetDriverId = String(over.id);
            if (assignedRoutes[targetDriverId] !== undefined) {
                 toast({ variant: "destructive", title: "Asignación Fallida", description: "El transportista ya tiene una ruta asignada." });
                 return;
            }

            startTransition(() => {
                setAssignedRoutes(prev => {
                    const newAssignments = { ...prev };
                    const sourceDriverId = Object.keys(newAssignments).find(key => newAssignments[key] === draggedClusterIndex);
                    if (sourceDriverId) {
                        delete newAssignments[sourceDriverId];
                    }
                    newAssignments[targetDriverId] = draggedClusterIndex;
                    return newAssignments;
                });
                updateOrdersStatus(ordersInRoute, 'assigned');
            });
        }
    };


    const handleTimeSlotChange = (value: 'morning' | 'afternoon' | 'evening', initialLoad = false) => {
        if (!value) return;
        setTimeSlot(value);
        if (!initialLoad) {
            setClusters([]);
            setAllStaff([]);
            setDisplayedStaff([]);
            setAssignedRoutes({});
        }

        startTransition(async () => {
            const result = await getClusteredRoutesAction(value);
            if (result && result.clusteredRoutes) {
                setClusters(result.clusteredRoutes);
                if(result.staff && result.allStaff) {
                    setAllStaff(result.allStaff);
                    setDisplayedStaff(result.staff);
                }
            } else {
                 toast({ variant: "destructive", title: "Error", description: result.error || "No se pudieron obtener las rutas." });
            }
        });
    }

    const handleUnassign = (clusterIndexToUnassign: number) => {
        const ordersToUnassign = clusters[clusterIndexToUnassign]?.orders.map(o => o.id);
        startTransition(() => {
            setAssignedRoutes(prev => {
                const newAssignments = { ...prev };
                const driverId = Object.keys(newAssignments).find(key => newAssignments[key] === clusterIndexToUnassign);
                if (driverId) {
                    delete newAssignments[driverId];
                }
                return newAssignments;
            });
            if (ordersToUnassign) {
                updateOrdersStatus(ordersToUnassign, 'due');
            }
        });
    };

    const handleRemoveDriver = (driverId: string) => {
        startTransition(() => {
            const clusterIndexToUnassign = assignedRoutes[driverId];
            if (clusterIndexToUnassign !== undefined) {
                handleUnassign(clusterIndexToUnassign);
            }
            setDisplayedStaff(prev => prev.filter(d => d.id !== driverId));
        });
    };

    const handleAddDrivers = (newDrivers: StaffMember[]) => {
        startTransition(() => {
            setDisplayedStaff(prev => {
                const existingIds = new Set(prev.map(d => d.id));
                const driversToAdd = newDrivers.filter(d => !existingIds.has(d.id));
                return [...prev, ...driversToAdd];
            });
        });
        setIsAddDriverOpen(false);
    };

    
    return (
       <DndContext 
            onDragStart={(event) => setActiveId(event.active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
            collisionDetection={closestCenter}
        >
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-8 py-6 flex flex-col gap-4 bg-background border-b border-border shrink-0">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Optimización y Asignación de Rutas</h1>
                        <p className="text-muted-foreground text-sm mt-1">Arrastra bloques de rutas sugeridas a los transportistas disponibles.</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Franja Horaria</label>
                         <div className="relative">
                            <Select onValueChange={(value) => handleTimeSlotChange(value as any)} value={timeSlot} disabled={isPending}>
                                <SelectTrigger className="appearance-none bg-muted dark:bg-slate-card dark:border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[200px]">
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
                <aside ref={unassignedDropRef.setNodeRef} id="unassigned" data-id="unassigned" className="w-80 bg-background dark:bg-navy-dark border-r border-border flex flex-col shrink-0">
                    <div className="p-4 border-b border-border dark:bg-slate-card/30">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">auto_graph</span>
                                Rutas Sugeridas
                            </h2>
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unassignedClusters.length} BLOQUES</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {isPending && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                        {!isPending && unassignedClusters.map(({ cluster, index }) => <UnassignedRouteCard key={index} route={cluster} clusterIndex={index} />)}
                         {!isPending && unassignedClusters.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-10">No hay rutas sin asignar.</div>
                        )}
                    </div>
                </aside>
                <section className="flex-1 bg-background dark:bg-navy-dark/40 p-6 overflow-x-auto custom-scrollbar flex gap-6">
                    {isPending && Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-full min-w-[320px] rounded-2xl" />)}
                    
                    {!isPending && displayedStaff.map(driver => {
                       const assignedClusterIndex = assignedRoutes[driver.id];
                       const route = assignedClusterIndex !== undefined ? clusters[assignedClusterIndex] : null;
                       return <DriverColumn key={driver.id} driver={driver} route={route} clusterIndex={assignedClusterIndex} onUnassign={handleUnassign} onRemove={handleRemoveDriver} activeCluster={activeCluster} />
                    })}
                    
                    {!isPending && (
                         <div onClick={() => setIsAddDriverOpen(true)} className="min-w-[320px] flex items-center justify-center border-2 border-dashed border-border dark:border-slate-700 rounded-2xl bg-card/30 hover:bg-card/50 dark:hover:border-slate-600 transition-all cursor-pointer group">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-muted dark:bg-slate-800 flex items-center justify-center text-muted-foreground dark:text-slate-500 mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">person_add</span>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-widest">Añadir Transportista</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
            <footer className="h-20 bg-background border-t border-border flex items-center justify-between px-8 shrink-0 z-40">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-accent rounded-full animate-pulse shadow-neon-glow"></div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Eficiencia Operativa</p>
                            <p className="text-sm font-bold text-foreground">82.4% <span className="text-accent text-[10px] font-bold ml-1">↑ +2.1%</span></p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bloques Pendientes</p>
                            <p className="text-sm font-bold text-foreground">{unassignedClusters.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Activos</p>
                            <p className="text-sm font-bold text-foreground">{displayedStaff.length} Choferes</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="px-6 py-2.5 rounded-xl border-slate-200 dark:border-slate-700 text-sm font-bold text-secondary-text hover:bg-slate-800 hover:text-white transition-all">
                        Re-calcular Rutas
                    </Button>
                    <Button className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-blue-glow hover:bg-blue-500 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">local_shipping</span>
                        Confirmar y Despachar
                    </Button>
                </div>
            </footer>
        </div>
         <DragOverlay>
            {activeCluster ? <UnassignedRouteCard route={activeCluster.route} clusterIndex={activeCluster.index} isOverlay /> : null}
        </DragOverlay>
        <AddDriverDialog 
            open={isAddDriverOpen}
            onOpenChange={setIsAddDriverOpen}
            allDrivers={allStaff}
            displayedDrivers={displayedStaff}
            onAddDrivers={handleAddDrivers}
        />
       </DndContext>
    );
}
