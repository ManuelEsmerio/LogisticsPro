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
import { confirmRouteAssignmentsAction, finalizeRouteAction, getClusteredRoutesAction, getRouteAssignmentsAction, recalculateRoutesAction, reportRouteIssuesAction, updateOrdersStatus } from '@/lib/actions';
import type { ClusteredRoute, Order, RouteAssignment, StaffMember } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { parseDeliveryTime } from '@/lib/data';
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
    DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const OUT_OF_TOWN_MUNICIPALITIES = [
    'Magdalena',
    'Amatitan',
    'El Arenal',
    'El Salvador',
    'Santa Teresa',
    'San Martin',
    'Santa Ana',
];

type HistoryRouteSummary = {
    assignmentId: string;
    driverId: string;
    driverName: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
    orders: Order[];
    distance: number;
    duration: string;
    createdAt: string;
    finishedAt?: string | null;
    status?: 'pendiente' | 'confirmada' | 'finalizada';
};

type MergedRoute = ClusteredRoute & {
    mergeMeta?: {
        sourceIndex: number;
        targetIndex: number;
        sourceRoute: ClusteredRoute;
        targetRoute: ClusteredRoute;
    };
};


function formatIncidenceDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatOrderDate(value: Date | null | undefined) {
    if (!value) return 'Sin fecha';
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
    return parsed.toLocaleDateString('es-MX');
}

function formatDeliveryDate(value: Date | null | undefined) {
    if (!value) return 'Sin fecha';
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
    return parsed.toLocaleDateString('es-MX');
}

function formatDeliverySlot(slot: Order['deliveryTimeSlot']) {
    if (slot === 'morning') return 'Mañana';
    if (slot === 'afternoon') return 'Tarde';
    if (slot === 'evening') return 'Noche';
    return 'Sin franja';
}

function formatRouteTimestamp(value?: string | null) {
    if (!value) return 'Sin fecha';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRouteId(value: number) {
    const number = Math.max(1, value);
    return `LOG${String(number).padStart(3, '0')}`;
}

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function detectMunicipality(address: string) {
    const normalized = normalizeText(address);
    const match = OUT_OF_TOWN_MUNICIPALITIES.find(name => normalized.includes(normalizeText(name)));
    return match ?? null;
}

function getRouteMunicipality(orders: Order[]) {
    const matches = new Set<string>();
    orders.forEach(order => {
        const municipality = detectMunicipality(order.address);
        if (municipality) matches.add(municipality);
    });
    if (matches.size === 0) return 'Tequila';
    if (matches.size === 1) return Array.from(matches)[0];
    return 'Mixto';
}

const statusBadge = {
    pendiente: { label: 'Pendiente', className: 'bg-slate-500/10 text-slate-200 border border-slate-500/30' },
    en_reparto: { label: 'En reparto', className: 'bg-blue-500/10 text-blue-200 border border-blue-500/30' },
    entregado: { label: 'Entregado', className: 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30' },
    rechazado: { label: 'Rechazado', className: 'bg-orange-500/10 text-orange-200 border border-orange-500/30' },
};

function sameOrderSet(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every(id => rightSet.has(id));
}

function UnassignedRouteCard({
    route,
    clusterIndex,
    isOverlay = false,
    onViewDetails,
    onUnmerge
}: {
    route: MergedRoute;
    clusterIndex: number;
    isOverlay?: boolean;
    onViewDetails?: () => void;
    onUnmerge?: () => void;
}) {
    const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({
        id: `cluster-${clusterIndex}`,
        data: { route, clusterIndex, type: 'cluster' }
    });
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: `merge-${clusterIndex}`,
        data: { type: 'merge-target', clusterIndex },
    });

    const setNodeRef = (node: HTMLElement | null) => {
        setDragRef(node);
        setDropRef(node);
    };

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const zoneConfig = useMemo(() => ({
        morning: { color: 'border-l-zone-north', text: 'text-zone-north', name: 'RUTA A' },
        afternoon: { color: 'border-l-zone-center', text: 'text-zone-center', name: 'RUTA B' },
        evening: { color: 'border-l-zone-south', text: 'text-zone-south', name: 'RUTA C' },
    }), []);
    
    const config = zoneConfig[route.timeSlot || 'morning'];

    const retryCount = route.orders.filter(order => (order.intentosEnvio ?? 0) > 0).length;
    const municipalityLabel = getRouteMunicipality(route.orders);

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(
            "bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-4",
            config.color,
            isOverlay && "shadow-2xl ring-2 ring-primary",
            isOver && "ring-2 ring-blue-500/60"
        )}> 
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.text)}>{config.name}</span>
                    <h3 className="text-sm font-bold text-foreground">{formatRouteId(clusterIndex + 1)}</h3>
                    <span className="mt-1 inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {municipalityLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {route.mergeMeta && onUnmerge && (
                        <Button
                            variant="outline"
                            size="sm"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onUnmerge();
                            }}
                            className="h-7 px-2 text-[10px] font-bold"
                        >
                            Deshacer merge
                        </Button>
                    )}
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
                    {retryCount > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">⚠ {retryCount} reintentos</span>
                    )}
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing">drag_indicator</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-3">
                <span className="material-symbols-outlined text-sm">inventory_2</span>
                <span className="text-[11px] font-medium">{route.orders.length} Pedidos</span>
            </div>
        </div>
    );
}

function AssignedRouteCard({
    route,
    clusterIndex,
    onUnassign,
    isLocked,
    onViewDetails,
    onMarkDelivered,
    onReportIssue
}: {
    route: ClusteredRoute;
    clusterIndex: number;
    onUnassign: () => void;
    isLocked: boolean;
    onViewDetails: () => void;
    onMarkDelivered: () => void;
    onReportIssue: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `cluster-${clusterIndex}`,
        data: { route, clusterIndex, type: 'cluster' },
        disabled: !route || isLocked,
    });

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    const retryCount = route.orders.filter(order => (order.intentosEnvio ?? 0) > 0).length;
    const municipalityLabel = getRouteMunicipality(route.orders);

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-4 m-4 shadow-sm cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h3 className="font-semibold text-foreground">{formatRouteId(clusterIndex + 1)}</h3>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{municipalityLabel}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onViewDetails();
                    }}
                    className="text-[10px] font-bold text-rose-300 hover:text-rose-200"
                >
                    VER DETALLE
                </Button>
            </div>
            {isLocked ? (
                <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        En reparto
                    </div>
                    {retryCount > 0 && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">⚠ {retryCount} reintentos</div>
                    )}
                </div>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onUnassign();
                    }}
                    className="mt-2 text-[10px] font-bold text-muted-foreground hover:text-destructive"
                >
                    Desasignar
                </Button>
            )}
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-8 w-8 rounded-lg bg-slate-800/70 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                    </div>
                    <span>{route.orders.length} Pedido{route.orders.length === 1 ? '' : 's'}</span>
                </div>
                {isLocked && (
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onMarkDelivered();
                                        }}
                                        className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-400"
                                    >
                                        <span className="material-symbols-outlined text-base">done</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Marcar ruta como entregada</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onReportIssue();
                                        }}
                                        className="h-8 w-8 rounded-full bg-rose-500/15 text-rose-400"
                                    >
                                        <span className="material-symbols-outlined text-base">close</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reportar incidencia en la entrega</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
        </div>
    );
}

function HistoryRouteCard({
    summary,
    index,
    onViewDetails,
}: {
    summary: HistoryRouteSummary;
    index: number;
    onViewDetails: () => void;
}) {
    const zoneLabels = {
        morning: 'RUTA A',
        afternoon: 'RUTA B',
        evening: 'RUTA C',
    };
    const deliveredCount = summary.orders.filter(order => order.deliveryStatus === 'entregado').length;
    const returnedCount = summary.orders.filter(order => order.deliveryStatus === 'rechazado').length;
    const timestamp = formatRouteTimestamp(summary.finishedAt ?? summary.createdAt);
    const municipalityLabel = getRouteMunicipality(summary.orders);

    const statusLabel = 'Entregado';
    const retryLabel = returnedCount > 0 ? `⚠ ${returnedCount} reintentos` : null;

    return (
        <div className="rounded-xl border border-border bg-muted/20 dark:bg-slate-800/40 p-4 space-y-3 opacity-70 grayscale">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{zoneLabels[summary.timeSlot]}</p>
                    <p className="text-sm font-semibold text-foreground">{formatRouteId(index + 1)}</p>
                    <p className="text-xs text-muted-foreground">{timestamp}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{municipalityLabel}</p>
                </div>
                <span className="material-symbols-outlined text-sm text-muted-foreground">lock</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewDetails}
                    className="h-7 px-2 text-[10px] font-bold"
                >
                    Ver detalle
                </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="material-symbols-outlined text-sm">inventory_2</span>
                <span>{summary.orders.length} pedidos</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {statusLabel}
            </div>
            {retryLabel && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {retryLabel}
                </div>
            )}
        </div>
    );
}

function DriverColumn({ 
    driver, 
    routes,
    historyRoutes,
    onUnassign,
    onRemove,
    activeCluster,
    onViewDetails,
    onMarkDelivered,
    onReportIssue,
    onOpenHistory,
    onOpenDriverInfo
}: { 
    driver: StaffMember, 
    routes: Array<{ route: ClusteredRoute; clusterIndex: number; isLocked: boolean }>,
    historyRoutes: HistoryRouteSummary[],
    onUnassign: (driverId: string, clusterIndex: number) => void,
    onRemove: (driverId: string) => void,
    activeCluster: { route: ClusteredRoute, index: number } | null,
    onViewDetails: (driver: StaffMember | null, route: ClusteredRoute, clusterIndex?: number, meta?: { title?: string; subtitle?: string }) => void,
    onMarkDelivered: (driver: StaffMember, route: ClusteredRoute, clusterIndex: number) => void,
    onReportIssue: (driver: StaffMember, route: ClusteredRoute, clusterIndex: number) => void,
    onOpenHistory: (driver: StaffMember) => void,
    onOpenDriverInfo: (driver: StaffMember) => void
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: driver.id,
        data: { type: 'driver', driver }
    });

    const capacity = 12; // Mock capacity
    const activeRouteCount = routes.length;
    const activeOrderCount = routes.reduce((total, item) => total + item.route.orders.length, 0);

    return (
        <div ref={setNodeRef} className={cn(
            "bg-slate-900/70 rounded-3xl border border-slate-800 shadow-sm flex flex-col min-w-[320px] transition-all", 
            isOver && routes.length === 0 && "border-primary border-2 border-dashed",
        )}>
            <div className={"p-5 border-b border-slate-800/80 bg-slate-900/80 rounded-t-3xl"} >
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                        <Image alt={driver.name} src={driver.avatarUrl} width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-card dark:ring-slate-700 shadow-sm"/>
                        <span className={cn("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card", driver.status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400')}></span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-foreground">{driver.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{driver.role}</p>
                    </div>
                    {activeRouteCount > 0 && (
                        <div className="bg-rose-500/20 text-rose-200 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            RUTAS: {activeRouteCount}
                        </div>
                    )}
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-white hover:bg-slate-700/40">
                                <span className="material-symbols-outlined text-base">more_horiz</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() => {
                                    onOpenHistory(driver);
                                }}
                            >
                                <span className="material-symbols-outlined text-base">history</span>
                                Ver historial de pedidos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    onOpenDriverInfo(driver);
                                }}
                            >
                                <span className="material-symbols-outlined text-base">info</span>
                                Ver informacion
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => {
                                    onRemove(driver.id);
                                }}
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                                Quitar repartidor
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Capacidad de Carga</span>
                        <span className="text-xs font-bold text-rose-300">{activeOrderCount} / {capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full transition-all shadow-neon-glow" style={{width: `${Math.min((activeOrderCount / capacity) * 100, 100)}%`}}></div>
                    </div>
                </div>
            </div>
            
            <div className={cn("flex-1 flex flex-col min-h-0")}>
              {routes.length > 0 ? (
                  <div className="flex flex-col gap-3 p-4">
                      {routes.map(item => (
                          <AssignedRouteCard
                              key={`route-${driver.id}-${item.clusterIndex}`}
                              route={item.route}
                              clusterIndex={item.clusterIndex}
                              onUnassign={() => onUnassign(driver.id, item.clusterIndex)}
                              isLocked={item.isLocked}
                              onViewDetails={() => onViewDetails(driver, item.route, item.clusterIndex)}
                              onMarkDelivered={() => onMarkDelivered(driver, item.route, item.clusterIndex)}
                              onReportIssue={() => onReportIssue(driver, item.route, item.clusterIndex)}
                          />
                      ))}
                  </div>
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
            {historyRoutes.length > 0 && (
                <div className="border-t border-border px-4 py-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Historial de rutas</p>
                    {historyRoutes.map((summary, index) => (
                        <HistoryRouteCard
                            key={`${summary.assignmentId}-${index}`}
                            summary={summary}
                            index={index}
                            onViewDetails={() => {
                                onViewDetails(driver, {
                                    timeSlot: summary.timeSlot,
                                    orders: summary.orders,
                                    distance: summary.distance,
                                    duration: summary.duration,
                                }, undefined, {
                                    title: 'Detalle de ruta finalizada',
                                    subtitle: `${summary.driverName} · ${formatRouteTimestamp(summary.finishedAt ?? summary.createdAt)}`,
                                });
                            }}
                        />
                    ))}
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
    const [deliveryDateFilter, setDeliveryDateFilter] = useState<string>(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [clusters, setClusters] = useState<MergedRoute[]>([]);
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [displayedStaff, setDisplayedStaff] = useState<StaffMember[]>([]);
    const [assignedRoutes, setAssignedRoutes] = useState<Record<string, number[]>>({}); // driverId -> cluster indices
    const [assignedClusters, setAssignedClusters] = useState<Record<number, string>>({}); // clusterIndex -> driverId
    const [clusterLocks, setClusterLocks] = useState<Record<number, boolean>>({});
    const [assignmentIdsByCluster, setAssignmentIdsByCluster] = useState<Record<number, string>>({});
    const [routeAssignments, setRouteAssignments] = useState<RouteAssignment[]>([]);
    const [ordersCache, setOrdersCache] = useState<Order[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailData, setDetailData] = useState<{ driver?: StaffMember | null; route: ClusteredRoute; clusterIndex?: number; meta?: { title?: string; subtitle?: string } } | null>(null);
    const [isRecalcConfirmOpen, setIsRecalcConfirmOpen] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isRegrouping, setIsRegrouping] = useState(false);
    const [isDeliverConfirmOpen, setIsDeliverConfirmOpen] = useState(false);
    const [deliverContext, setDeliverContext] = useState<{ driver: StaffMember; route: ClusteredRoute; clusterIndex: number; assignmentId: string } | null>(null);
    const [isDeliverSubmitting, setIsDeliverSubmitting] = useState(false);
    const [isIssueOpen, setIsIssueOpen] = useState(false);
    const [issueContext, setIssueContext] = useState<{ driver: StaffMember; route: ClusteredRoute; clusterIndex: number; assignmentId: string } | null>(null);
    const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
    const [issueReason, setIssueReason] = useState<string>('Cliente ausente');
    const [isIssueSubmitting, setIsIssueSubmitting] = useState(false);
    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyDriver, setHistoryDriver] = useState<StaffMember | null>(null);
    const [isDriverInfoOpen, setIsDriverInfoOpen] = useState(false);
    const [infoDriver, setInfoDriver] = useState<StaffMember | null>(null);
    const [isMergeOpen, setIsMergeOpen] = useState(false);
    const [mergeContext, setMergeContext] = useState<{ sourceIndex: number; targetIndex: number } | null>(null);
    const [isUnmergeOpen, setIsUnmergeOpen] = useState(false);
    const [unmergeIndex, setUnmergeIndex] = useState<number | null>(null);
    const driverNameById = useMemo(() => new Map(allStaff.map(staff => [staff.id, staff.name])), [allStaff]);
    const ordersById = useMemo(() => new Map(ordersCache.map(order => [order.id, order])), [ordersCache]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        })
    );

    const collisionDetection: CollisionDetection = (args) => {
        const pointer = pointerWithin(args);
        if (args.active?.data?.current?.type === 'cluster' && pointer.length > 0) {
            const mergeTargets = pointer.filter(item => {
                const container = args.droppableContainers.find(entry => entry.id === item.id);
                return container?.data?.current?.type === 'merge-target';
            });
            if (mergeTargets.length > 0) return mergeTargets;

            const unassignedTargets = pointer.filter(item => {
                const container = args.droppableContainers.find(entry => entry.id === item.id);
                return container?.data?.current?.type === 'unassigned';
            });
            if (unassignedTargets.length > 0) return unassignedTargets;
        }
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
        handleTimeSlotChange(timeSlot, true, deliveryDateFilter);
    }, []);

    const unassignedClusters = useMemo(() => {
        return clusters
            .map((cluster, index) => ({ cluster, index }))
            .filter(({ cluster, index }) => cluster.orders.length > 0 && !assignedClusters[index]);
    }, [clusters, assignedClusters]);

    const issueReasons = useMemo(() => (
        [
            'Cliente ausente',
            'Dirección incorrecta',
            'Rechazo',
            'Sin respuesta',
            'Domicilio cerrado',
            'Otros',
        ]
    ), []);

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;

        if (!active || !over) return;

        const draggedData = active.data.current;
        if (draggedData?.type !== 'cluster') return;
        
        const draggedClusterIndex = draggedData.clusterIndex as number;
        const ordersInRoute = clusters[draggedClusterIndex]?.orders.map(o => o.id);
        if (!ordersInRoute) return;

        const overIsMergeTarget = over.data.current?.type === 'merge-target'
            && typeof over.data.current?.clusterIndex === 'number';
        const isUnassignedDrop = over.id === 'unassigned'
            || over.id === 'unassigned-list'
            || over.data.current?.type === 'unassigned'
            || overIsMergeTarget;

        // Case 1: Dropped over the unassigned area or a card inside it
        if (overIsMergeTarget) {
            const targetIndex = Number(over.data.current?.clusterIndex);
            if (targetIndex !== draggedClusterIndex) {
                if (assignedClusters[draggedClusterIndex] || assignedClusters[targetIndex]) {
                    toast({ variant: "destructive", title: "Ruta asignada", description: "Solo puedes unir rutas sin asignar." });
                    return;
                }
                const sourceRoute = clusters[draggedClusterIndex];
                const targetRoute = clusters[targetIndex];
                if (sourceRoute?.mergeMeta || targetRoute?.mergeMeta) {
                    toast({ variant: "destructive", title: "Ruta combinada", description: "No puedes unir rutas que ya fueron combinadas." });
                    return;
                }
                if (sourceRoute?.timeSlot !== targetRoute?.timeSlot) {
                    toast({ variant: "destructive", title: "Franja distinta", description: "Solo puedes unir rutas de la misma franja horaria." });
                    return;
                }
                setMergeContext({ sourceIndex: draggedClusterIndex, targetIndex });
                setIsMergeOpen(true);
                return;
            }
        }

        if (isUnassignedDrop) {
            const sourceDriverId = assignedClusters[draggedClusterIndex];
            if (!sourceDriverId) return;
            if (clusterLocks[draggedClusterIndex]) {
                toast({ variant: "destructive", title: "Ruta confirmada", description: "Esta ruta ya fue confirmada y no puede desasignarse." });
                return;
            }
            startTransition(() => {
                setAssignedRoutes(prev => {
                    const next = { ...prev };
                    const updated = (next[sourceDriverId] ?? []).filter(index => index !== draggedClusterIndex);
                    if (updated.length > 0) {
                        next[sourceDriverId] = updated;
                    } else {
                        delete next[sourceDriverId];
                    }
                    return next;
                });
                setAssignedClusters(prev => {
                    const next = { ...prev };
                    delete next[draggedClusterIndex];
                    return next;
                });
                updateOrdersStatus(ordersInRoute, 'due');
            });
            return;
        }
        
        // Case 2: Dropped over a driver column
        const overData = over.data.current;
           if (overData?.type === 'driver') {
              const targetDriverId = String(over.id);
              const sourceDriverId = assignedClusters[draggedClusterIndex];
              if (clusterLocks[draggedClusterIndex]) {
                  toast({ variant: "destructive", title: "Ruta confirmada", description: "Esta ruta ya fue confirmada y no puede reasignarse." });
                  return;
              }
              if (sourceDriverId === targetDriverId) return;

              startTransition(() => {
                  setAssignedRoutes(prev => {
                      const next = { ...prev };
                      if (sourceDriverId) {
                          const updated = (next[sourceDriverId] ?? []).filter(index => index !== draggedClusterIndex);
                          if (updated.length > 0) {
                              next[sourceDriverId] = updated;
                          } else {
                              delete next[sourceDriverId];
                          }
                      }
                      const targetList = new Set(next[targetDriverId] ?? []);
                      targetList.add(draggedClusterIndex);
                      next[targetDriverId] = Array.from(targetList);
                      return next;
                  });
                  setAssignedClusters(prev => ({ ...prev, [draggedClusterIndex]: targetDriverId }));
                  updateOrdersStatus(ordersInRoute, 'assigned');
              });
        }
    };

    const parseDurationSeconds = (duration: string) => {
        const seconds = parseInt(duration.replace('s', ''), 10);
        return Number.isFinite(seconds) ? seconds : 0;
    };

    const handleConfirmMerge = () => {
        if (!mergeContext) return;
        const { sourceIndex, targetIndex } = mergeContext;
        const sourceRoute = clusters[sourceIndex];
        const targetRoute = clusters[targetIndex];
        if (!sourceRoute || !targetRoute) return;

        const mergedOrders = [...targetRoute.orders, ...sourceRoute.orders]
            .filter((order, index, array) => array.findIndex(item => item.id === order.id) === index);
        const mergedDistance = targetRoute.distance + sourceRoute.distance;
        const mergedDurationSeconds = parseDurationSeconds(targetRoute.duration) + parseDurationSeconds(sourceRoute.duration);

        const mergedRoute: MergedRoute = {
            timeSlot: targetRoute.timeSlot,
            orders: mergedOrders,
            distance: mergedDistance,
            duration: `${mergedDurationSeconds}s`,
            mergeMeta: {
                sourceIndex,
                targetIndex,
                sourceRoute: {
                    ...sourceRoute,
                    orders: [...sourceRoute.orders],
                },
                targetRoute: {
                    ...targetRoute,
                    orders: [...targetRoute.orders],
                },
            },
        };

        setClusters(prev => prev.map((cluster, index) => {
            if (index === targetIndex) return mergedRoute;
            if (index === sourceIndex) {
                return { ...cluster, orders: [], distance: 0, duration: '0s', mergeMeta: undefined };
            }
            return cluster;
        }));
        setIsMergeOpen(false);
        setMergeContext(null);
    };

    const handleRequestUnmerge = (index: number) => {
        setUnmergeIndex(index);
        setIsUnmergeOpen(true);
    };

    const handleConfirmUnmerge = () => {
        if (unmergeIndex === null) return;
        const mergedRoute = clusters[unmergeIndex];
        const meta = mergedRoute?.mergeMeta;
        if (!meta) {
            setIsUnmergeOpen(false);
            setUnmergeIndex(null);
            return;
        }
        setClusters(prev => prev.map((cluster, index) => {
            if (index === meta.targetIndex) return { ...meta.targetRoute, mergeMeta: undefined };
            if (index === meta.sourceIndex) return { ...meta.sourceRoute, mergeMeta: undefined };
            return cluster;
        }));
        setIsUnmergeOpen(false);
        setUnmergeIndex(null);
    };


    const handleTimeSlotChange = (value: 'morning' | 'afternoon' | 'evening', initialLoad = false, deliveryDate?: string) => {
        if (!value) return;
        setTimeSlot(value);
        if (!initialLoad) {
            setClusters([]);
            setAllStaff([]);
            setDisplayedStaff([]);
            setAssignedRoutes({});
            setAssignedClusters({});
            setClusterLocks({});
            setAssignmentIdsByCluster({});
            setRouteAssignments([]);
            setOrdersCache([]);
        }

        startTransition(async () => {
            const [result, assignmentsResult, ordersRes] = await Promise.all([
                getClusteredRoutesAction(value, deliveryDate ?? deliveryDateFilter),
                getRouteAssignmentsAction(value),
                fetch(`${API_URL}/orders?_sort=createdAt&_order=desc`, { cache: "no-store" })
            ]);

            if (result && result.clusteredRoutes) {
                let nextClusters = [...result.clusteredRoutes];
                const assignmentMap: Record<string, number[]> = {};
                const clusterDriverMap: Record<number, string> = {};
                const clusterLockMap: Record<number, boolean> = {};
                const assignmentIdMap: Record<number, string> = {};

                const assignmentsRaw: RouteAssignment[] = assignmentsResult?.assignments ?? [];

                let allOrders: Order[] = [];
                if (ordersRes.ok) {
                    const raw = await ordersRes.json();
                    allOrders = (Array.isArray(raw) ? raw : []).map((order: any) => ({
                        ...order,
                        id: order.id ?? order._id,
                        paymentStatus: order.paymentStatus ?? order.paymentsStatus ?? 'due',
                        createdAt: new Date(order.createdAt),
                        deliveryTime: parseDeliveryTime(order.deliveryTime),
                        deliveryStatus: order.deliveryStatus === 'confirmado'
                            ? 'en_reparto'
                            : order.deliveryStatus === 'regresado'
                                ? 'rechazado'
                                : (order.deliveryStatus ?? 'pendiente'),
                        intentosEnvio: Number.isFinite(order.intentosEnvio) ? Number(order.intentosEnvio) : 0,
                        incidencias: Array.isArray(order.incidencias) ? order.incidencias : [],
                        lastAssignmentId: order.lastAssignmentId,
                        lastDriverId: order.lastDriverId,
                        lastRouteStatus: order.lastRouteStatus,
                        deliveredAt: order.deliveredAt ?? null,
                    }));
                }
                setOrdersCache(allOrders);

                const orderLookup = new Map<string, Order>();
                allOrders.forEach(order => orderLookup.set(order.id, order));

                const assignments: RouteAssignment[] = assignmentsRaw.filter(assignment => {
                    const dateValue = deliveryDate ?? deliveryDateFilter;
                    if (!dateValue) return true;
                    return assignment.orderIds.some(orderId => {
                        const order = orderLookup.get(orderId);
                        if (!order?.deliveryTime) return false;
                        const deliveryDateValue = new Date(order.deliveryTime);
                        if (Number.isNaN(deliveryDateValue.getTime())) return false;
                        const yyyy = deliveryDateValue.getFullYear();
                        const mm = String(deliveryDateValue.getMonth() + 1).padStart(2, '0');
                        const dd = String(deliveryDateValue.getDate()).padStart(2, '0');
                        return `${yyyy}-${mm}-${dd}` === dateValue;
                    });
                });
                setRouteAssignments(assignments);

                assignments.forEach(assignment => {
                    const assignmentOrders = assignment.orderIds
                        .map(id => orderLookup.get(id))
                        .filter((order): order is Order => !!order);

                    if (assignment.status === 'finalizada') {
                        return;
                    }

                    const assignmentOrderIds = assignment.orderIds;
                    let matchIndex = nextClusters.findIndex(cluster =>
                        sameOrderSet(cluster.orders.map((order: Order) => order.id), assignmentOrderIds)
                    );

                    if (matchIndex === -1) {
                        if (assignmentOrders.length > 0) {
                            nextClusters.push({
                                timeSlot: assignment.timeSlot,
                                orders: assignmentOrders,
                                distance: assignment.distance,
                                duration: assignment.duration,
                            });
                            matchIndex = nextClusters.length - 1;
                        }
                    }

                    if (matchIndex !== -1) {
                        assignmentMap[assignment.driverId] = [
                            ...(assignmentMap[assignment.driverId] ?? []),
                            matchIndex,
                        ];
                        clusterDriverMap[matchIndex] = assignment.driverId;
                        clusterLockMap[matchIndex] = assignment.locked;
                        if (assignment.id) {
                            assignmentIdMap[matchIndex] = assignment.id;
                        }
                    }
                });

                setClusters(nextClusters);
                setAssignedRoutes(assignmentMap);
                setAssignedClusters(clusterDriverMap);
                setClusterLocks(clusterLockMap);
                setAssignmentIdsByCluster(assignmentIdMap);

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
        if (clusterLocks[clusterIndexToUnassign]) {
            toast({ variant: "destructive", title: "Ruta confirmada", description: "Esta ruta ya fue confirmada y no puede desasignarse." });
            return;
        }
        const ordersToUnassign = clusters[clusterIndexToUnassign]?.orders.map(o => o.id);
        startTransition(() => {
            setAssignedRoutes(prev => {
                const next = { ...prev };
                const updated = (next[driverId] ?? []).filter(index => index !== clusterIndexToUnassign);
                if (updated.length > 0) {
                    next[driverId] = updated;
                } else {
                    delete next[driverId];
                }
                return next;
            });
            setAssignedClusters(prev => {
                const next = { ...prev };
                delete next[clusterIndexToUnassign];
                return next;
            });
            if (ordersToUnassign) {
                updateOrdersStatus(ordersToUnassign, 'due');
            }
        });
    };

    const handleDeliveryDateChange = (value: string) => {
        setDeliveryDateFilter(value);
        handleTimeSlotChange(timeSlot, false, value);
    };

    const handleResetToToday = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;
        handleDeliveryDateChange(today);
    };

    const todayDate = useMemo(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    const handleRemoveDriver = (driverId: string) => {
        startTransition(() => {
            const clustersToUnassign = assignedRoutes[driverId] ?? [];
            const hasLocked = clustersToUnassign.some(clusterIndex => clusterLocks[clusterIndex]);
            if (hasLocked) {
                toast({ variant: "destructive", title: "Ruta confirmada", description: "No puedes quitar este transportista con rutas confirmadas." });
                return;
            }
            clustersToUnassign.forEach(clusterIndex => handleUnassign(driverId, clusterIndex));
            setDisplayedStaff(prev => prev.filter(d => d.id !== driverId));
        });
    };

    const handleMarkDelivered = (driver: StaffMember, route: ClusteredRoute, clusterIndex: number) => {
        const assignmentId = assignmentIdsByCluster[clusterIndex];
        if (!assignmentId) {
            toast({ variant: "destructive", title: "Ruta no confirmada", description: "Confirma la ruta antes de marcarla como entregada." });
            return;
        }
        setDeliverContext({ driver, route, clusterIndex, assignmentId });
        setIsDeliverConfirmOpen(true);
    };

    const handleReportIssue = (driver: StaffMember, route: ClusteredRoute, clusterIndex: number) => {
        const assignmentId = assignmentIdsByCluster[clusterIndex];
        if (!assignmentId) {
            toast({ variant: "destructive", title: "Ruta no confirmada", description: "Confirma la ruta antes de reportar incidencias." });
            return;
        }
        setIssueContext({ driver, route, clusterIndex, assignmentId });
        setSelectedIssueIds([]);
        setIssueReason('Cliente ausente');
        setIsIssueOpen(true);
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

    const handleViewDetails = (driver: StaffMember | null, route: ClusteredRoute, clusterIndex?: number, meta?: { title?: string; subtitle?: string }) => {
        setDetailData({ driver, route, clusterIndex, meta });
        setIsDetailOpen(true);
    };

    const handleOpenHistory = (driver: StaffMember) => {
        setHistoryDriver(driver);
        setTimeout(() => setIsHistoryOpen(true), 0);
    };

    const handleOpenDriverInfo = (driver: StaffMember) => {
        setInfoDriver(driver);
        setTimeout(() => setIsDriverInfoOpen(true), 0);
    };

    const assignedRouteSummaries = useMemo(() => {
        const items: Array<{ driver: StaffMember; clusterIndex: number; route: ClusteredRoute; isLocked: boolean }> = [];
        displayedStaff.forEach(driver => {
            const clusterIndices = assignedRoutes[driver.id] ?? [];
            clusterIndices.forEach(clusterIndex => {
                const route = clusters[clusterIndex];
                if (!route) return;
                items.push({
                    driver,
                    clusterIndex,
                    route,
                    isLocked: !!clusterLocks[clusterIndex],
                });
            });
        });
        return items;
    }, [displayedStaff, assignedRoutes, clusters, clusterLocks]);

    const assignableRoutes = useMemo(
        () => assignedRouteSummaries.filter(item => !item.isLocked),
        [assignedRouteSummaries]
    );

    const assignableDrivers = useMemo(() => {
        const grouped = new Map<string, { driver: StaffMember; routes: Array<{ clusterIndex: number; route: ClusteredRoute }> }>();
        assignableRoutes.forEach(item => {
            const current = grouped.get(item.driver.id);
            if (current) {
                current.routes.push({ clusterIndex: item.clusterIndex, route: item.route });
            } else {
                grouped.set(item.driver.id, { driver: item.driver, routes: [{ clusterIndex: item.clusterIndex, route: item.route }] });
            }
        });
        return Array.from(grouped.values());
    }, [assignableRoutes]);

    const driverHistoryAssignments = useMemo(() => {
        if (!historyDriver) return [];
        return routeAssignments
            .filter(assignment => assignment.driverId === historyDriver.id && assignment.status === 'finalizada')
            .map(assignment => ({
                ...assignment,
                orders: ordersCache
                    .filter(order => order.lastAssignmentId === assignment.id)
                    .concat(
                        assignment.orderIds
                            .map(id => ordersById.get(id))
                            .filter((order): order is Order => !!order)
                    )
                    .filter((order, index, array) => array.findIndex(item => item.id === order.id) === index),
            }))
            .sort((a, b) => String(b.finishedAt ?? b.createdAt).localeCompare(String(a.finishedAt ?? a.createdAt)));
    }, [historyDriver, routeAssignments, ordersById, ordersCache]);

    useEffect(() => {
        if (!isConfirmOpen) return;
        setSelectedDriverIds(assignableDrivers.map(item => item.driver.id));
    }, [isConfirmOpen, assignableDrivers]);

    const historyRoutesByDriver = useMemo(() => {
        const grouped: Record<string, HistoryRouteSummary[]> = {};
        routeAssignments
            .filter(assignment => assignment.status === 'finalizada')
            .forEach(assignment => {
                const orders = assignment.orderIds
                    .map(id => ordersById.get(id))
                    .filter((order): order is Order => !!order);
                const summary: HistoryRouteSummary = {
                    assignmentId: assignment.id,
                    driverId: assignment.driverId,
                    driverName: assignment.driverName,
                    timeSlot: assignment.timeSlot,
                    orders,
                    distance: assignment.distance,
                    duration: assignment.duration,
                    createdAt: assignment.createdAt,
                    finishedAt: assignment.finishedAt,
                    status: assignment.status,
                };
                if (!grouped[assignment.driverId]) grouped[assignment.driverId] = [];
                grouped[assignment.driverId].push(summary);
            });
        return grouped;
    }, [routeAssignments, ordersById]);

    const handleConfirmDispatch = () => {
        if (assignableRoutes.length === 0) {
            toast({ variant: "destructive", title: "Sin asignaciones", description: "No hay rutas nuevas para confirmar." });
            return;
        }
        if (selectedDriverIds.length === 0) {
            toast({ variant: "destructive", title: "Seleccion requerida", description: "Selecciona al menos un repartidor." });
            return;
        }

        startTransition(async () => {
            const selectedSet = new Set(selectedDriverIds);
            const assignmentsPayload = assignableRoutes
                .filter(item => selectedSet.has(item.driver.id))
                .map(item => ({
                driverId: item.driver.id,
                driverName: item.driver.name,
                orderIds: item.route.orders.map(order => order.id),
                distance: item.route.distance,
                duration: item.route.duration,
            }));

            const result = await confirmRouteAssignmentsAction(timeSlot, assignmentsPayload);
            if (result?.message?.includes('confirmadas')) {
                setClusterLocks(prev => {
                    const updated = { ...prev };
                    assignableRoutes.forEach(item => {
                        updated[item.clusterIndex] = true;
                    });
                    return updated;
                });
                handleTimeSlotChange(timeSlot);
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
                    setAssignedClusters({});
                    setClusterLocks({});
                    setAssignmentIdsByCluster({});
                    setRouteAssignments([]);
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

    const handleConfirmDelivered = () => {
        if (!deliverContext) return;
        setIsDeliverSubmitting(true);
        startTransition(async () => {
            try {
                const res = await finalizeRouteAction({
                    assignmentId: deliverContext.assignmentId,
                    orderIds: deliverContext.route.orders.map(order => order.id),
                });
                if (res?.message?.includes('finalizada')) {
                    const now = new Date().toISOString();
                    setRouteAssignments(prev => prev.map(assignment => (
                        assignment.id === deliverContext.assignmentId
                            ? { ...assignment, status: 'finalizada', finishedAt: now, locked: false }
                            : assignment
                    )));
                    setAssignedRoutes(prev => {
                        const next = { ...prev };
                        const current = next[deliverContext.driver.id] ?? [];
                        const updated = current.filter(index => index !== deliverContext.clusterIndex);
                        if (updated.length > 0) {
                            next[deliverContext.driver.id] = updated;
                        } else {
                            delete next[deliverContext.driver.id];
                        }
                        return next;
                    });
                    setAssignedClusters(prev => {
                        const next = { ...prev };
                        delete next[deliverContext.clusterIndex];
                        return next;
                    });
                    setClusterLocks(prev => {
                        const next = { ...prev };
                        delete next[deliverContext.clusterIndex];
                        return next;
                    });
                    setAssignmentIdsByCluster(prev => {
                        const next = { ...prev };
                        delete next[deliverContext.clusterIndex];
                        return next;
                    });
                    toast({ title: "Ruta finalizada", description: "Pedidos marcados como entregados." });
                    setIsDeliverConfirmOpen(false);
                    setDeliverContext(null);
                    handleTimeSlotChange(timeSlot);
                } else {
                    toast({ variant: "destructive", title: "Error", description: res?.message || "No se pudo finalizar la ruta." });
                }
            } finally {
                setIsDeliverSubmitting(false);
            }
        });
    };

    const handleConfirmIssues = () => {
        if (!issueContext) return;
        if (selectedIssueIds.length === 0) {
            toast({ variant: "destructive", title: "Seleccion requerida", description: "Selecciona al menos un pedido con incidencia." });
            return;
        }
        setIsIssueSubmitting(true);
        startTransition(async () => {
            try {
                const res = await reportRouteIssuesAction({
                    assignmentId: issueContext.assignmentId,
                    driverId: issueContext.driver.id,
                    orderIds: issueContext.route.orders.map(order => order.id),
                    failedOrderIds: selectedIssueIds,
                    motivo: issueReason,
                });
                if (res?.message?.includes('Incidencias')) {
                    const now = new Date().toISOString();
                    setRouteAssignments(prev => prev.map(assignment => (
                        assignment.id === issueContext.assignmentId
                            ? { ...assignment, status: 'finalizada', finishedAt: now, locked: false }
                            : assignment
                    )));
                    setAssignedRoutes(prev => {
                        const next = { ...prev };
                        const current = next[issueContext.driver.id] ?? [];
                        const updated = current.filter(index => index !== issueContext.clusterIndex);
                        if (updated.length > 0) {
                            next[issueContext.driver.id] = updated;
                        } else {
                            delete next[issueContext.driver.id];
                        }
                        return next;
                    });
                    setAssignedClusters(prev => {
                        const next = { ...prev };
                        delete next[issueContext.clusterIndex];
                        return next;
                    });
                    setClusterLocks(prev => {
                        const next = { ...prev };
                        delete next[issueContext.clusterIndex];
                        return next;
                    });
                    setAssignmentIdsByCluster(prev => {
                        const next = { ...prev };
                        delete next[issueContext.clusterIndex];
                        return next;
                    });
                    toast({ title: "Incidencias registradas", description: "Pedidos actualizados correctamente." });
                    setIsIssueOpen(false);
                    setIssueContext(null);
                    handleTimeSlotChange(timeSlot);
                } else {
                    toast({ variant: "destructive", title: "Error", description: res?.message || "No se pudieron registrar las incidencias." });
                }
            } finally {
                setIsIssueSubmitting(false);
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
                         <div className="relative flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1.5 text-xs">
                                <span className="text-muted-foreground">Fecha</span>
                                <input
                                    type="date"
                                    value={deliveryDateFilter}
                                    onChange={(event) => handleDeliveryDateChange(event.target.value)}
                                    className="bg-transparent text-xs outline-none"
                                    aria-label="Filtrar por fecha de entrega"
                                />
                                {deliveryDateFilter !== todayDate && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetToToday}
                                        className="h-7 px-2 text-[10px] font-bold"
                                    >
                                        Hoy
                                    </Button>
                                )}
                            </div>
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
                                onUnmerge={() => handleRequestUnmerge(index)}
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
                              const driverRoutes = (assignedRoutes[driver.id] ?? [])
                                  .map(clusterIndex => ({
                                      clusterIndex,
                                      route: clusters[clusterIndex],
                                      isLocked: !!clusterLocks[clusterIndex],
                                  }))
                                  .filter(item => !!item.route) as Array<{ route: ClusteredRoute; clusterIndex: number; isLocked: boolean }>;
                              return (
                                     <DriverColumn
                                          key={driver.id}
                                          driver={driver}
                                          routes={driverRoutes}
                                          historyRoutes={historyRoutesByDriver[driver.id] ?? []}
                                          onUnassign={handleUnassign}
                                          onRemove={handleRemoveDriver}
                                          activeCluster={activeCluster}
                                          onViewDetails={handleViewDetails}
                                          onMarkDelivered={handleMarkDelivered}
                                          onReportIssue={handleReportIssue}
                                          onOpenHistory={handleOpenHistory}
                                          onOpenDriverInfo={handleOpenDriverInfo}
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
                    <DialogTitle>{detailData?.meta?.title ?? 'Detalle de ruta confirmada'}</DialogTitle>
                    <DialogDescription>
                        {detailData?.meta?.subtitle
                            ?? (detailData
                                ? `${detailData.driver ? `Repartidor: ${detailData.driver.name} · ` : 'Sin asignar · '}${typeof detailData.clusterIndex === 'number' ? formatRouteId(detailData.clusterIndex + 1) : 'Ruta finalizada'} · ${getRouteMunicipality(detailData.route.orders)}`
                                : 'Sin detalles')}
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
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-muted-foreground">Pedido: {formatOrderDate(order.createdAt)}</span>
                                    <span className="text-sky-400">Entrega: {formatDeliveryDate(order.deliveryTime)}</span>
                                    <span className="text-violet-400">Franja: {formatDeliverySlot(order.deliveryTimeSlot)}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                        statusBadge[order.deliveryStatus ?? 'pendiente']?.className ?? statusBadge.pendiente.className
                                    )}>
                                        {statusBadge[order.deliveryStatus ?? 'pendiente']?.label ?? statusBadge.pendiente.label}
                                    </span>
                                    {(order.intentosEnvio ?? 0) > 0 && (
                                        <span className="text-[10px] font-bold text-amber-500">⚠ {order.intentosEnvio} intento(s)</span>
                                    )}
                                </div>
                                {Array.isArray(order.incidencias) && order.incidencias.length > 0 && (
                                    <div className="mt-3 rounded-md border border-border bg-muted/40 p-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Historial</p>
                                        <div className="mt-2 space-y-1">
                                            {order.incidencias.map((incidencia, index) => {
                                                const driverName = incidencia.repartidorId
                                                    ? (driverNameById.get(incidencia.repartidorId) ?? incidencia.repartidorId)
                                                    : 'No asignado';
                                                return (
                                                    <div key={`${order.id}-inc-${index}`} className="text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground">{formatIncidenceDate(incidencia.fecha)}</span>
                                                        <span className="mx-1">·</span>
                                                        <span>{incidencia.motivo}</span>
                                                        <span className="mx-1">·</span>
                                                        <span>Enviado por: {driverName}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Historial de pedidos enviados</DialogTitle>
                    <DialogDescription>
                        {historyDriver ? `Repartidor: ${historyDriver.name}` : 'Sin repartidor seleccionado'}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-2 space-y-4 max-h-[520px] overflow-y-auto pr-2">
                    {driverHistoryAssignments.length === 0 && (
                        <div className="text-sm text-muted-foreground">Sin historial disponible.</div>
                    )}
                    {driverHistoryAssignments.map((assignment) => {
                        const zoneLabel = assignment.timeSlot === 'morning'
                            ? 'ZONA A'
                            : assignment.timeSlot === 'afternoon'
                                ? 'ZONA B'
                                : 'ZONA C';
                        const hasRejected = assignment.orders.some(order => order.deliveryStatus === 'rechazado');
                        const routeStatus = hasRejected ? 'Entregado con incidencias' : 'Entregado';
                        return (
                            <div key={assignment.id} className="rounded-xl border border-border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{zoneLabel}</p>
                                        <p className="text-sm font-semibold text-foreground">{formatRouteTimestamp(assignment.finishedAt ?? assignment.createdAt)}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{routeStatus}</span>
                                </div>
                                <div className="space-y-2">
                                    {assignment.orders.map(order => (
                                        <div key={order.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{order.orderNumber} · {order.recipientName}</p>
                                                <p className="text-xs text-muted-foreground">{order.product}</p>
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                statusBadge[order.deliveryStatus ?? 'pendiente']?.className ?? statusBadge.pendiente.className
                                            )}>
                                                {statusBadge[order.deliveryStatus ?? 'pendiente']?.label ?? statusBadge.pendiente.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={isDriverInfoOpen} onOpenChange={setIsDriverInfoOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Informacion del repartidor</DialogTitle>
                    <DialogDescription>
                        {infoDriver ? infoDriver.name : 'Sin repartidor seleccionado'}
                    </DialogDescription>
                </DialogHeader>
                {infoDriver ? (
                    <div className="mt-2 space-y-3">
                        <div className="rounded-lg border border-border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rol</span>
                                <span className="text-sm font-semibold text-foreground">{infoDriver.role}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
                                <span className="text-sm font-semibold text-foreground">{infoDriver.status}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefono</span>
                                <span className="text-sm font-semibold text-foreground">{infoDriver.phone}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo</span>
                                <span className="text-sm font-semibold text-foreground">{infoDriver.email || 'No registrado'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Turno</span>
                                <span className="text-sm font-semibold text-foreground">{infoDriver.shift}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehiculo</span>
                                <span className="text-sm font-semibold text-foreground">{infoDriver.vehicleType}</span>
                            </div>
                            {infoDriver.licenseNumber && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Licencia</span>
                                    <span className="text-sm font-semibold text-foreground">{infoDriver.licenseNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">Sin informacion disponible.</div>
                )}
            </DialogContent>
        </Dialog>
        <AlertDialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unir rutas</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta accion combinara los pedidos de ambas rutas en una sola.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-6 border-t border-border pt-4">
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmMerge();
                            }}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            Confirmar merge
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isUnmergeOpen} onOpenChange={setIsUnmergeOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Deshacer merge</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta accion separara la ruta en los bloques originales.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-6 border-t border-border pt-4">
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmUnmerge();
                            }}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar y despachar rutas</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se guardarán las asignaciones de los repartidores con ruta. Una vez confirmadas no podrán desasignarse.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-4 space-y-3">
                    {assignableDrivers.length === 0 && (
                        <div className="text-sm text-muted-foreground">No hay rutas asignadas.</div>
                    )}
                    {assignableDrivers.length > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-border p-3 text-xs text-muted-foreground">
                            <span>Seleccionar todos</span>
                            <Checkbox
                                checked={selectedDriverIds.length === assignableDrivers.length}
                                onCheckedChange={(value) => {
                                    if (value) {
                                        setSelectedDriverIds(assignableDrivers.map(item => item.driver.id));
                                    } else {
                                        setSelectedDriverIds([]);
                                    }
                                }}
                            />
                        </div>
                    )}
                    {assignableDrivers.map(item => (
                        <label key={item.driver.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
                            <div>
                                <p className="text-sm font-semibold text-foreground">{item.driver.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {item.routes.length} rutas · {item.routes.reduce((total, routeItem) => total + routeItem.route.orders.length, 0)} pedidos
                                </p>
                            </div>
                            <Checkbox
                                checked={selectedDriverIds.includes(item.driver.id)}
                                onCheckedChange={(value) => {
                                    setSelectedDriverIds(prev => {
                                        if (value) return Array.from(new Set([...prev, item.driver.id]));
                                        return prev.filter(id => id !== item.driver.id);
                                    });
                                }}
                            />
                        </label>
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
                        disabled={assignableRoutes.length === 0 || selectedDriverIds.length === 0}
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
        <AlertDialog open={isDeliverConfirmOpen} onOpenChange={setIsDeliverConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Marcar ruta como entregada</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se marcaran como entregados todos los pedidos de esta ruta.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {deliverContext && (
                    <div className="mt-4 rounded-lg border border-border p-3">
                        <p className="text-sm font-semibold text-foreground">{deliverContext.driver.name}</p>
                        <p className="text-xs text-muted-foreground">Bloque #{deliverContext.clusterIndex + 1} · {deliverContext.route.orders.length} pedidos</p>
                    </div>
                )}
                <div className="mt-6 border-t border-border pt-4">
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeliverSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmDelivered();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500"
                            disabled={isDeliverSubmitting}
                        >
                            {isDeliverSubmitting ? 'Procesando...' : 'Confirmar entrega'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Reportar error de entrega</DialogTitle>
                    <DialogDescription>
                        Selecciona los pedidos con incidencia y confirma el motivo.
                    </DialogDescription>
                </DialogHeader>
                {issueContext ? (
                    <div className="mt-2 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                            <div>
                                <p className="text-sm font-semibold text-foreground">{issueContext.driver.name}</p>
                                <p className="text-xs text-muted-foreground">Bloque #{issueContext.clusterIndex + 1} · {issueContext.route.orders.length} pedidos</p>
                            </div>
                            <div className="min-w-[220px]">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Motivo</label>
                                <Select value={issueReason} onValueChange={setIssueReason}>
                                    <SelectTrigger className="h-8 mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {issueReasons.map(reason => (
                                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                            {issueContext.route.orders.map(order => {
                                const checked = selectedIssueIds.includes(order.id);
                                return (
                                    <label key={order.id} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(value) => {
                                                setSelectedIssueIds(prev => {
                                                    if (value) return Array.from(new Set([...prev, order.id]));
                                                    return prev.filter(id => id !== order.id);
                                                });
                                            }}
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{order.orderNumber} · {order.recipientName}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{order.address}</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                    statusBadge[order.deliveryStatus ?? 'pendiente']?.className ?? statusBadge.pendiente.className
                                                )}>
                                                    {statusBadge[order.deliveryStatus ?? 'pendiente']?.label ?? statusBadge.pendiente.label}
                                                </span>
                                                {(order.intentosEnvio ?? 0) > 0 && (
                                                    <span className="text-[10px] font-bold text-amber-500">⚠ {order.intentosEnvio} intento(s)</span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Seleccionados: {selectedIssueIds.length}</span>
                            <span>Debe haber al menos uno</span>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsIssueOpen(false)} disabled={isIssueSubmitting}>Cancelar</Button>
                            <Button onClick={handleConfirmIssues} disabled={isIssueSubmitting} className="bg-amber-500 hover:bg-amber-400">
                                {isIssueSubmitting ? 'Procesando...' : 'Confirmar incidencias'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">Sin datos de ruta.</div>
                )}
            </DialogContent>
        </Dialog>
       </DndContext>
    );
}
