'use client';

import { useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getClusteredRoutesAction } from '@/lib/actions';
import type { ClusteredRoute, StaffMember } from '@/lib/definitions';
import { Loader2, X, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const clusterColors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f97316', // orange-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#14b8a6', // teal-500
];

export default function RoutesPage() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
    const [clusters, setClusters] = useState<ClusteredRoute[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [assignedDrivers, setAssignedDrivers] = useState<Record<number, string>>({});

    const handleTimeSlotChange = (value: 'morning' | 'afternoon' | 'evening') => {
        setTimeSlot(value);
        setClusters([]);
        setAssignedDrivers({});
        startTransition(async () => {
            const result = await getClusteredRoutesAction(value);
            if (result && !result.error) {
                setClusters(result.clusteredRoutes);
                if(result.staff) {
                    setStaff(result.staff);
                }
            }
        });
    }

    const handleRemoveOrder = (clusterIndex: number, orderIndex: number) => {
        setClusters(prevClusters => {
            const newClusters = [...prevClusters];
            const updatedOrders = newClusters[clusterIndex].orders.filter((_, i) => i !== orderIndex);
            
            if (updatedOrders.length > 0) {
                 newClusters[clusterIndex] = {
                    ...newClusters[clusterIndex],
                    orders: updatedOrders
                };
                return newClusters;
            } else {
                // Remove cluster if no orders left
                return newClusters.filter((_, i) => i !== clusterIndex);
            }
        });
    };

    const handleAssignDriver = (clusterIndex: number, driverName: string) => {
        setAssignedDrivers(prev => ({ ...prev, [clusterIndex]: driverName }));
        toast({
            title: "Driver Assigned",
            description: `${driverName} has been assigned to Cluster ${clusterIndex + 1}.`,
        });
    };

    const boundingBox = clusters.length > 0 ? clusters.reduce((acc, cluster) => {
        cluster.orders.forEach(order => {
            acc.minLat = Math.min(acc.minLat, order.latitude);
            acc.maxLat = Math.max(acc.maxLat, order.latitude);
            acc.minLng = Math.min(acc.minLng, order.longitude);
            acc.maxLng = Math.max(acc.maxLng, order.longitude);
        });
        return acc;
    }, { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }) : null;

    const getPosition = (lat: number, lng: number) => {
        if (!boundingBox || (boundingBox.maxLat === boundingBox.minLat) || (boundingBox.maxLng === boundingBox.minLng)) {
            return { top: '50%', left: '50%' };
        }
        const top = ((boundingBox.maxLat - lat) / (boundingBox.maxLat - boundingBox.minLat)) * 100;
        const left = ((lng - boundingBox.minLng) / (boundingBox.maxLng - boundingBox.minLng)) * 100;
        return { top: `${top}%`, left: `${left}%` };
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="font-headline text-lg font-semibold md:text-2xl">
                AI-Powered Route Clustering & Assignment
            </h1>
            <div className="flex flex-1 flex-col gap-4 rounded-lg border p-4 shadow-sm">
                <p className="text-muted-foreground">
                    Select a time slot to group delivery orders and assign them to drivers.
                </p>
                <Select onValueChange={handleTimeSlotChange} disabled={isPending}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative w-full h-96 rounded-lg bg-muted border overflow-hidden">
                    {isPending && (
                         <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                         </div>
                    )}
                    {!isPending && timeSlot && clusters.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-muted-foreground">No delivery orders found for this time slot.</p>
                        </div>
                    )}
                     {!isPending && !timeSlot && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-muted-foreground">Please select a time slot to see route clusters.</p>
                        </div>
                    )}
                    {clusters.map((cluster, clusterIndex) => (
                        cluster.orders.map((order, orderIndex) => {
                            const { top, left } = getPosition(order.latitude, order.longitude);
                            return (
                                <div
                                    key={`${clusterIndex}-${orderIndex}`}
                                    className="absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{ top, left }}
                                >
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: clusterColors[clusterIndex % clusterColors.length] }} />
                                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs whitespace-nowrap bg-background/80 px-1 rounded-sm">{order.orderNumber}</div>
                                </div>
                            )
                        })
                    ))}
                </div>
                <div className="space-y-4">
                    {clusters.map((cluster, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                             <div className="flex justify-between items-center">
                                <h3 className="font-semibold flex items-center text-lg">
                                    <span className="h-4 w-4 rounded-full mr-3" style={{ backgroundColor: clusterColors[index % clusterColors.length] }} />
                                    Cluster {index + 1}
                                </h3>
                                {assignedDrivers[index] ? (
                                     <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                                        <UserCheck className="h-4 w-4" />
                                        Assigned to {assignedDrivers[index]}
                                     </div>
                                ) : (
                                    <Select onValueChange={(driverName) => handleAssignDriver(index, driverName)}>
                                        <SelectTrigger className="w-[220px]">
                                            <SelectValue placeholder="Assign a driver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staff.map(driver => (
                                                <SelectItem key={driver.id} value={driver.name}>{driver.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <ul className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                {cluster.orders.map((o, orderIndex) => (
                                    <li key={o.orderNumber} className="flex items-center justify-between">
                                        <span>{o.orderNumber}: {o.address}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveOrder(index, orderIndex)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}