import { getStaff } from "@/lib/data";
import { StaffDataTable } from "@/components/dashboard/staff/data-table";
import { columns } from "@/components/dashboard/staff/columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaffFormDialog } from "@/components/dashboard/staff/staff-form-dialog";

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

export default async function StaffPage() {
  const staff = await getStaff();
  const activeDeliveries = staff.filter(s => s.role === 'Repartidor' && s.status === 'Activo').length;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Recursos Humanos</p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary dark:text-white">Gestión de Personal</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">update</span>
                Sincronizado: hace 5 minutos
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm font-bold">
                <span className="material-symbols-outlined text-lg">download</span> Exportar
            </Button>
            <StaffFormDialog>
                <Button variant="default" className="bg-primary text-primary-foreground shadow-md font-bold">
                    <span className="material-symbols-outlined text-lg">person_add</span> Nuevo Personal
                </Button>
            </StaffFormDialog>
        </div>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                title="Total Personal" 
                value={staff.length.toString()} 
                change="+2 este mes"
                icon="groups"
                changeColor="text-forest"
                iconBg="bg-slate-100 dark:bg-slate-700"
                iconColor="text-primary dark:text-slate-300"
            />
            <StatCard 
                title="Repartidores Activos" 
                value={activeDeliveries.toString()}
                subtext="12 en ruta"
                icon="directions_bike"
                iconBg="bg-blue-50 dark:bg-blue-900/20"
                iconColor="text-blue-700 dark:text-blue-500"
            />
            <StatCard 
                title="Personal en Tienda" 
                value={staff.filter(s => s.role !== 'Repartidor').length.toString()} 
                subtext="2 turnos rotativos"
                icon="storefront"
                iconBg="bg-purple-50 dark:bg-purple-900/20"
                iconColor="text-purple-700 dark:text-purple-500"
            />
            <StatCard 
                title="Ausencias Hoy" 
                value="3"
                subtext="Justificadas"
                icon="event_busy"
                iconBg="bg-red-50 dark:bg-red-900/20"
                iconColor="text-red-700 dark:text-red-500"
            />
        </div>

      <div
        className="bg-card rounded-lg border shadow-sm overflow-hidden"
      >
        <StaffDataTable columns={columns} data={staff} />
      </div>

      <div className="bg-card border-l-4 border-primary p-4 rounded shadow-sm flex items-start gap-4">
            <span className="material-symbols-outlined text-primary dark:text-slate-300">info</span>
            <div className="text-sm">
                <p className="font-bold text-primary dark:text-white uppercase tracking-tight text-xs">Aviso de Seguridad:</p>
                <p className="text-muted-foreground mt-1">Recuerde que todo el personal de reparto debe tener su certificado de salud vigente y portar el equipo de protección personal durante todo su turno. Las ausencias no notificadas antes de las 07:00 AM se marcarán como incidencia.</p>
            </div>
        </div>
    </>
  );
}
