import { getOrders } from "@/lib/data";
import { OrdersTableClient } from "@/components/dashboard/orders-table-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrderButton } from "@/components/dashboard/create-order-button";


async function StatCard({ title, value, change, icon, changeColor, iconBg, iconColor, subtext }: {
    title: string;
    value: string;
    change?: string;
    icon: string;
    changeColor?: string;
    iconBg?: string;
    iconColor?: string;
    subtext?: string;
}) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-5">
                <div className="flex justify-between items-start">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">{title}</p>
                    <span className={`p-1.5 rounded-md material-symbols-outlined text-sm font-bold ${iconBg} ${iconColor}`}>
                        {icon}
                    </span>
                </div>
                <p className="text-3xl font-bold mt-2 text-primary dark:text-white">{value}</p>
                {change && (
                     <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${changeColor}`}>
                        <span className="material-symbols-outlined text-xs">trending_up</span> {change}
                    </p>
                )}
                {subtext && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">{subtext}</p>
                )}
            </CardContent>
        </Card>
    );
}

async function Stats() {
    const orders = await getOrders();
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.paymentStatus === 'due').length;
    const inRouteOrders = orders.filter(o => o.paymentStatus === 'assigned').length;
    const deliveredOrders = orders.filter(o => o.paymentStatus === 'paid').length;
    const returnedOrders = orders.filter(o => o.deliveryStatus === 'rechazado').length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard 
                title="Total Pedidos" 
                value={totalOrders.toString()} 
                change="+12% vs ayer"
                icon="receipt_long"
                changeColor="text-forest"
                iconBg="bg-slate-100 dark:bg-slate-700"
                iconColor="text-primary dark:text-slate-300"
            />
            <StatCard 
                title="Pendientes" 
                value={pendingOrders.toString()} 
                subtext={`${orders.filter(o => o.priority === 'Alta' && o.paymentStatus === 'due').length} críticos`}
                icon="pending_actions"
                iconBg="bg-amber-50 dark:bg-amber-900/20"
                iconColor="text-amber-700 dark:text-amber-500"
            />
            <StatCard 
                title="En Ruta" 
                value={inRouteOrders.toString()} 
                subtext="6 conductores activos"
                icon="local_shipping"
                iconBg="bg-blue-50 dark:bg-blue-900/20"
                iconColor="text-blue-700 dark:text-blue-500"
            />
            <StatCard 
                title="Entregados hoy" 
                value={deliveredOrders.toString()}
                subtext="98.4% de éxito"
                icon="check_circle"
                iconBg="bg-emerald-50 dark:bg-emerald-900/20"
                iconColor="text-emerald-700 dark:text-emerald-500"
            />
            <StatCard 
                title="Rechazados" 
                value={returnedOrders.toString()}
                subtext="Reintentos pendientes"
                icon="assignment_return"
                iconBg="bg-orange-50 dark:bg-orange-900/20"
                iconColor="text-orange-700 dark:text-orange-500"
            />
        </div>
    )
}

function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
        </div>
    )
}


export default async function DashboardPage() {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Operaciones de Logística</p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary dark:text-white">Monitor de Pedidos Pendientes</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">update</span>
                Sincronizado: hace 2 minutos
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm">
                <span className="material-symbols-outlined text-lg">download</span> Exportar
            </Button>
            <CreateOrderButton />
        </div>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

            <OrdersTableClient />
       <div className="bg-card border-l-4 border-primary p-4 rounded shadow-sm flex items-start gap-4">
            <span className="material-symbols-outlined text-primary dark:text-slate-300">gavel</span>
            <div className="text-sm">
                <p className="font-bold text-primary dark:text-white uppercase tracking-tight text-xs">Protocolo de Alta Demanda:</p>
                <p className="text-muted-foreground mt-1">Todas las órdenes con prioridad <span className="font-bold text-red-600">Alta</span> deben ser validadas en el sistema de asignación de rutas antes del corte de las 11:00 AM.</p>
            </div>
        </div>
    </>
  );
}
