"use client"

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClusteredRoutesAction } from "@/lib/actions";
import type { ClusteredRoute } from "@/lib/definitions";
import { Loader2, Route } from "lucide-react";

const clusterColors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f97316', // orange-500
    '#8b5cf6', // violet-500
];

export function ClusterViewDialog() {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
    const [clusters, setClusters] = useState<ClusteredRoute[]>([]);

    const handleTimeSlotChange = (value: 'morning' | 'afternoon' | 'evening') => {
        setTimeSlot(value);
        setClusters([]);
        startTransition(async () => {
            const result = await getClusteredRoutesAction(value);
            if (result && !result.error) {
                setClusters(result.clusteredRoutes);
            }
        });
    }

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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Route className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Cluster Routes</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">AI-Powered Route Clustering</DialogTitle>
                    <DialogDescription>
                        Select a time slot to group delivery orders by geographic proximity.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto max-h-[calc(80vh-150px)] pr-4">
                    <Select onValueChange={handleTimeSlotChange}>
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
                             <div className="absolute inset-0 flex items-center justify-center bg-background/50">
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
                    <div className="space-y-2">
                        {clusters.map((cluster, index) => (
                            <div key={index} className="p-2 border rounded-lg">
                                <h3 className="font-semibold flex items-center">
                                    <span className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: clusterColors[index % clusterColors.length] }} />
                                    Cluster {index + 1}
                                </h3>
                                <ul className="text-sm text-muted-foreground list-disc pl-5">
                                    {cluster.orders.map(o => <li key={o.orderNumber}>{o.orderNumber}: {o.address}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
