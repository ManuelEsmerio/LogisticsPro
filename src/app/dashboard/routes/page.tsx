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
import { confirmRouteAssignmentsAction, getClusteredRoutesAction, getRouteAssignmentsAction, recalculateRoutesAction, updateOrdersStatus } from '@/lib/actions';
import type { ClusteredRoute, Order, RouteAssignment, StaffMember } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, UniqueIdentifier, PointerSensor, useSensor, useSensors, pointerWithin, type CollisionDetection, MeasuringStrategy } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { AddDriverDialog } from '@/components/dashboard/routes/add-driver-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';


function formatDuration(duration: string): string {
    const seconds = parseInt(duration.replace('s', ''), 10);
    if (isNaN(seconds)) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
}

function sameOrderSet(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every(id => rightSet.has(id));
}

function UnassignedRouteCard({
    route,
    clusterIndex,
    isOverlay = false,
    onViewDetails
}: {
    route: ClusteredRoute;
    clusterIndex: number;
    isOverlay?: boolean;
    onViewDetails?: () => void;
}) {
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
                <div className="flex items-center gap-2">
                    {onViewDetails && (
                        <Button
                            variant="outline"
                            size="sm"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onViewDetails();
                            }}
                            className="h-7 px-2 text-[10px] font-bold"
                        >
                            Ver detalle
                        </Button>
                    )}
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing">drag_indicator</span>
                </div>
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

function AssignedRouteCard({
    route,
    clusterIndex,
    onUnassign,
    isLocked,
    onViewDetails
}: {
    route: ClusteredRoute;
    clusterIndex: number;
    onUnassign: () => void;
    isLocked: boolean;
    onViewDetails: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `cluster-${clusterIndex}`,
        data: { route, clusterIndex, type: 'cluster' },
        disabled: !route || isLocked,
    });

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-card dark:bg-slate-800/60 border border-border dark:border-slate-700 rounded-xl p-4 m-4 shadow-sm cursor-grab active:cursor-grabbing">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-foreground">Bloque #{clusterIndex + 1}</h3>
                {!isLocked ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            onUnassign();
                        }}
                        className="text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                        DESASIGNAR
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Confirmada</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onViewDetails();
                            }}
                            className="h-7 px-2 text-[10px] font-bold"
                        >
                            Ver detalle
                        </Button>
                    </div>
                )}
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
    activeCluster,
    isLocked,
    onViewDetails
}: { 
    driver: StaffMember, 
    route: ClusteredRoute | null, 
    clusterIndex: number | null,
    onUnassign: (driverId: string, clusterIndex: number) => void,
    onRemove: (driverId: string) => void,
    activeCluster: { route: ClusteredRoute, index: number } | null,
    isLocked: boolean,
    onViewDetails: (driver: StaffMember, route: ClusteredRoute, clusterIndex: number) => void
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
                  <AssignedRouteCard
                    route={route}
                    clusterIndex={clusterIndex}
                    onUnassign={() => onUnassign(driver.id, clusterIndex)}
                    isLocked={isLocked}
                    onViewDetails={() => onViewDetails(driver, route, clusterIndex)}
                  />
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
    const [lockedDrivers, setLockedDrivers] = useState<Record<string, boolean>>({});
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailData, setDetailData] = useState<{ driver?: StaffMember | null; route: ClusteredRoute; clusterIndex: number } | null>(null);
    const [isRecalcConfirmOpen, setIsRecalcConfirmOpen] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isRegrouping, setIsRegrouping] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        })
    );

    const collisionDetection: CollisionDetection = (args) => {
        const pointer = pointerWithin(args);
        return pointer.length > 0 ? pointer : closestCenter(args);
    };


    const activeCluster = useMemo(() => {
      if (typeof activeId === 'string' && activeId.startsWith('cluster-')) {
        const clusterIndex = parseInt(activeId.split('-')[1]);
        if(!isNaN(clusterIndex) && clusters[clusterIndex]) {
          return { route: clusters[clusterIndex], index: clusterIndex };
        }
      }
      return null;
    }, [activeId, clusters]);

    const unassignedDropRef = useDroppable({ id: 'unassigned', data: { type: 'unassigned' } });
    const unassignedListRef = useDroppable({ id: 'unassigned-list', data: { type: 'unassigned' } });


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

        const assignedIndices = new Set(Object.values(assignedRoutes));
        const overIsUnassignedCard = typeof over.id === 'string'
            && over.id.startsWith('cluster-')
            && !isNaN(Number(over.id.split('-')[1]))
            && !assignedIndices.has(Number(over.id.split('-')[1]));
        const isUnassignedDrop = over.id === 'unassigned'
            || over.id === 'unassigned-list'
            || over.data.current?.type === 'unassigned'
            || overIsUnassignedCard;

        // Case 1: Dropped over the unassigned area or a card inside it
        if (isUnassignedDrop) {
            const sourceDriverId = Object.keys(assignedRoutes).find(key => assignedRoutes[key] === draggedClusterIndex);
            if (sourceDriverId) {
                if (lockedDrivers[sourceDriverId]) {
                    toast({ variant: "destructive", title: "Ruta confirmada", description: "Esta ruta ya fue confirmada y no puede desasignarse." });
                    return;
                }
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
              if (lockedDrivers[targetDriverId]) {
                  toast({ variant: "destructive", title: "Ruta confirmada", description: "Este transportista ya tiene una ruta confirmada." });
                  return;
              }
              const existingAssignment = assignedRoutes[targetDriverId];
              if (existingAssignment !== undefined && existingAssignment !== draggedClusterIndex) {
                  toast({ variant: "destructive", title: "Asignación Fallida", description: "El transportista ya tiene una ruta asignada." });
                  return;
              }

            startTransition(() => {
                setAssignedRoutes(prev => {
                    const newAssignments = { ...prev };
                    const sourceDriverId = Object.keys(newAssignments).find(key => newAssignments[key] === draggedClusterIndex);
                    if (sourceDriverId) {
                        if (lockedDrivers[sourceDriverId]) {
                            return newAssignments;
                        }
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
            setLockedDrivers({});
        }

        startTransition(async () => {
            const [result, assignmentsResult] = await Promise.all([
                getClusteredRoutesAction(value),
                getRouteAssignmentsAction(value)
            ]);

            if (result && result.clusteredRoutes) {
                let nextClusters = [...result.clusteredRoutes];
                const assignmentMap: Record<string, number> = {};
                const lockedMap: Record<string, boolean> = {};

                const assignments: RouteAssignment[] = assignmentsResult?.assignments ?? [];
                const orderLookup = new Map<string, Order>();
                nextClusters.forEach(cluster => {
                    cluster.orders.forEach(order => orderLookup.set(order.id, order));
                });

                assignments.forEach(assignment => {
                    lockedMap[assignment.driverId] = assignment.locked;
                    const assignmentOrderIds = assignment.orderIds;
                    let matchIndex = nextClusters.findIndex(cluster =>
                        sameOrderSet(cluster.orders.map(o => o.id), assignmentOrderIds)
                    );

                    if (matchIndex === -1) {
                        const orders = assignmentOrderIds
                            .map(id => orderLookup.get(id))
                            .filter((order): order is Order => !!order);
                        if (orders.length > 0) {
                            nextClusters.push({
                                timeSlot: assignment.timeSlot,
                                orders,
                                distance: assignment.distance,
                                duration: assignment.duration,
                            });
                            matchIndex = nextClusters.length - 1;
                        }
                    }

                    if (matchIndex !== -1) {
                        assignmentMap[assignment.driverId] = matchIndex;
                    }
                });

                setClusters(nextClusters);
                setAssignedRoutes(assignmentMap);
                setLockedDrivers(lockedMap);

                if (result.staff && result.allStaff) {
                    setAllStaff(result.allStaff);
                    setDisplayedStaff(result.staff);
                }
            } else {
                toast({ variant: "destructive", title: "Error", description: result.error || "No se pudieron obtener las rutas." });
            }
        });
    }

    const handleUnassign = (driverId: string, clusterIndexToUnassign: number) => {
        if (lockedDrivers[driverId]) {
            toast({ variant: "destructive", title: "Ruta confirmada", description: "Esta ruta ya fue confirmada y no puede desasignarse." });
            return;
        }
        const ordersToUnassign = clusters[clusterIndexToUnassign]?.orders.map(o => o.id);
        startTransition(() => {
            setAssignedRoutes(prev => {
                const newAssignments = { ...prev };
                delete newAssignments[driverId];
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
                handleUnassign(driverId, clusterIndexToUnassign);
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

    const handleViewDetails = (driver: StaffMember | null, route: ClusteredRoute, clusterIndex: number) => {
        setDetailData({ driver, route, clusterIndex });
        setIsDetailOpen(true);
    };

    const assignedDriverSummaries = useMemo(() => {
        return displayedStaff
            .map(driver => {
                const clusterIndex = assignedRoutes[driver.id];
                if (clusterIndex === undefined) return null;
                const route = clusters[clusterIndex];
                if (!route) return null;
                return {
                    driver,
                    clusterIndex,
                    route,
                    isLocked: !!lockedDrivers[driver.id],
                };
            })
            .filter((item): item is { driver: StaffMember; clusterIndex: number; route: ClusteredRoute; isLocked: boolean } => !!item);
    }, [displayedStaff, assignedRoutes, clusters, lockedDrivers]);

    const assignableDrivers = useMemo(
        () => assignedDriverSummaries.filter(item => !item.isLocked),
        [assignedDriverSummaries]
    );

    const handleConfirmDispatch = () => {
        if (assignableDrivers.length === 0) {
            toast({ variant: "destructive", title: "Sin asignaciones", description: "No hay rutas nuevas para confirmar." });
            return;
        }

        startTransition(async () => {
            const assignmentsPayload = assignableDrivers.map(item => ({
                driverId: item.driver.id,
                driverName: item.driver.name,
                orderIds: item.route.orders.map(order => order.id),
                distance: item.route.distance,
                duration: item.route.duration,
            }));

            const result = await confirmRouteAssignmentsAction(timeSlot, assignmentsPayload);
            if (result?.message?.includes('confirmadas')) {
                setLockedDrivers(prev => {
                    const updated = { ...prev };
                    assignableDrivers.forEach(item => {
                        updated[item.driver.id] = true;
                    });
                    return updated;
                });
                toast({ title: "Rutas confirmadas", description: "Se guardaron las asignaciones." });
            } else {
                toast({ variant: "destructive", title: "Error", description: result?.message || "No se pudieron confirmar las rutas." });
            }
            setIsConfirmOpen(false);
        });
    };

    const handleRegroupRoutes = () => {
        setIsRegrouping(true);
        startTransition(async () => {
            try {
                const result = await recalculateRoutesAction(timeSlot);
                if (result && result.clusteredRoutes) {
                    setClusters(result.clusteredRoutes);
                    setAssignedRoutes({});
                    setLockedDrivers({});
                    if (result.staff && result.allStaff) {
                        setAllStaff(result.allStaff);
                        setDisplayedStaff(result.staff);
                    }
                } else {
                    toast({ variant: "destructive", title: "Error", description: result.error || "No se pudieron reagrupar las rutas." });
                }
            } finally {
                setIsRegrouping(false);
            }
        });
    };

    
    return (
                <DndContext 
                    sensors={sensors}
            onDragStart={(event) => setActiveId(event.active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
                    collisionDetection={collisionDetection}
                    measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
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
                    <div ref={unassignedListRef.setNodeRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {unassignedDropRef.isOver && activeCluster && (
                            <div className="rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 px-4 py-3 text-center text-sm font-semibold text-primary">
                                Soltar aqui para desasignar Bloque #{activeCluster.index + 1}
                            </div>
                        )}
                        {isPending && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                        {!isPending && unassignedClusters.map(({ cluster, index }) => (
                            <UnassignedRouteCard
                                key={index}
                                route={cluster}
                                clusterIndex={index}
                                onViewDetails={() => handleViewDetails(null, cluster, index)}
                            />
                        ))}
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
                              return (
                                     <DriverColumn
                                          key={driver.id}
                                          driver={driver}
                                          route={route}
                                          clusterIndex={assignedClusterIndex}
                                          onUnassign={handleUnassign}
                                          onRemove={handleRemoveDriver}
                                          activeCluster={activeCluster}
                                          isLocked={!!lockedDrivers[driver.id]}
                                    onViewDetails={handleViewDetails}
                                     />
                              );
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
                    <Button
                        variant="outline"
                        onClick={handleRegroupRoutes}
                        className="px-6 py-2.5 rounded-xl border-slate-200 dark:border-slate-700 text-sm font-bold text-secondary-text hover:bg-slate-800 hover:text-white transition-all"
                        disabled={isPending || isRegrouping}
                    >
                        {isRegrouping ? 'Reagrupando...' : 'Reagrupar Rutas'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsRecalcConfirmOpen(true)}
                        className="px-6 py-2.5 rounded-xl border-slate-200 dark:border-slate-700 text-sm font-bold text-secondary-text hover:bg-slate-800 hover:text-white transition-all"
                        disabled={isPending || isRecalculating}
                    >
                        Re-calcular Rutas
                    </Button>
                    <Button
                        onClick={() => setIsConfirmOpen(true)}
                        className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-blue-glow hover:bg-blue-500 transition-all flex items-center gap-2"
                    >
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
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Detalle de ruta confirmada</DialogTitle>
                    <DialogDescription>
                        {detailData
                            ? `${detailData.driver ? `Repartidor: ${detailData.driver.name} · ` : 'Sin asignar · '}Bloque #${detailData.clusterIndex + 1}`
                            : 'Sin detalles'}
                    </DialogDescription>
                </DialogHeader>
                {detailData && (
                    <div className="mt-2 space-y-3 max-h-[420px] overflow-y-auto pr-2">
                        {detailData.route.orders.map(order => (
                            <div key={order.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-foreground">{order.orderNumber} · {order.recipientName}</p>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        {order.priority}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{order.address}</p>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar y despachar rutas</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se guardarán las asignaciones de los repartidores con ruta. Una vez confirmadas no podrán desasignarse.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-4 space-y-3">
                    {assignedDriverSummaries.length === 0 && (
                        <div className="text-sm text-muted-foreground">No hay rutas asignadas.</div>
                    )}
                    {assignedDriverSummaries.map(item => (
                        <div key={item.driver.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                                <p className="text-sm font-semibold text-foreground">{item.driver.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    Bloque #{item.clusterIndex + 1} · {item.route.orders.length} pedidos · {(item.route.distance / 1000).toFixed(1)} km
                                </p>
                            </div>
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", item.isLocked ? "text-emerald-400" : "text-blue-400")}
                            >
                                {item.isLocked ? 'Confirmada' : 'Pendiente'}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 border-t border-border pt-4">
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(event) => {
                            event.preventDefault();
                            handleConfirmDispatch();
                        }}
                        className="bg-blue-600 hover:bg-blue-500"
                        disabled={assignableDrivers.length === 0}
                    >
                        Confirmar y despachar
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isRecalcConfirmOpen} onOpenChange={setIsRecalcConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Recalcular zonas</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se recalcularán las zonas para pedidos nuevos o sin zonificar. Esto no genera rutas y mantiene la zonificación actual.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-6 border-t border-border pt-4">
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                setIsRecalculating(true);
                                startTransition(async () => {
                                    try {
                                        const res = await fetch('/api/recalculate-zones', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ radiusKm: 2 })
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            toast({
                                                variant: "destructive",
                                                title: "Error",
                                                description: data.detail || "No se pudieron recalcular las zonas."
                                            });
                                            return;
                                        }
                                        toast({
                                            title: "Zonas recalculadas",
                                            description: `Actualizadas: ${data.updatedOrders ?? 0} pedidos · Nuevas zonas: ${data.createdZones ?? 0}.`
                                        });
                                    } finally {
                                        setIsRecalculating(false);
                                        setIsRecalcConfirmOpen(false);
                                    }
                                });
                            }}
                            className="bg-blue-600 hover:bg-blue-500"
                            disabled={isRecalculating}
                        >
                            {isRecalculating ? 'Recalculando...' : 'Confirmar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
       </DndContext>
    );
}
