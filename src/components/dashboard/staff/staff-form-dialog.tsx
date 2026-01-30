"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { staffMemberSchema, type StaffMember, type StaffMemberFormValues } from "@/lib/definitions";
import { saveStaff } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffFormDialogProps {
    staffMember?: StaffMember;
    isEditMode?: boolean;
    children: React.ReactNode;
}

export function StaffFormDialog({ staffMember, isEditMode = false, children }: StaffFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<StaffMemberFormValues>({
        resolver: zodResolver(staffMemberSchema),
        defaultValues: {
          id: staffMember?.id,
          firstName: staffMember?.name.split(' ')[0] || "",
          lastName: staffMember?.name.split(' ').slice(1).join(' ') || "",
          email: staffMember?.email || "",
          phone: staffMember?.phone || "",
          role: staffMember?.role,
          shift: staffMember?.shift,
          vehicleType: staffMember?.vehicleType || 'ninguno',
          licenseNumber: staffMember?.licenseNumber || "",
          avatarUrl: staffMember?.avatarUrl || "",
        },
    });

    const onSubmit = (data: StaffMemberFormValues) => {
        startTransition(async () => {
            const result = await saveStaff(data);
            if (result.errors) {
                // Handle validation errors if necessary
            } else {
                toast({
                    title: "Éxito",
                    description: result.message,
                });
                setOpen(false);
                form.reset();
            }
        });
    };

    const trigger = isEditMode ? (
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
            {children}
        </DropdownMenuItem>
    ) : (
        <DialogTrigger asChild>
            {children}
        </DialogTrigger>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        {trigger}
      <DialogContent className="sm:max-w-[960px] p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">person_add</span>
            <DialogTitle className="text-primary dark:text-white text-2xl font-bold tracking-tight">{isEditMode ? "Editar Personal" : "Registro de Nuevo Personal"}</DialogTitle>
          </div>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
              <ScrollArea className="max-h-[70vh]">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Left Column */}
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <h2 className="text-primary dark:text-gray-200 text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">contact_page</span> Datos Personales
                      </h2>
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:bg-silk-gray dark:hover:bg-gray-800 transition-all cursor-pointer group">
                        <div className="bg-gray-100 dark:bg-gray-700 aspect-square rounded-full w-24 h-24 mb-3 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                          <span className="material-symbols-outlined text-gray-400 group-hover:scale-110 transition-transform text-4xl">photo_camera</span>
                        </div>
                        <p className="text-sm font-semibold text-primary dark:text-gray-300">Foto de Perfil</p>
                        <p className="text-xs text-gray-500">JPG o PNG, máx 2MB</p>
                      </div>
                    </div>
                     <div className="flex flex-col gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Nombre</FormLabel>
                                <FormControl><Input className="h-12 px-4 text-base" placeholder="Ej: Juan" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Apellidos</FormLabel>
                                <FormControl><Input className="h-12 px-4 text-base" placeholder="Ej: Pérez García" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Teléfono</FormLabel>
                                    <FormControl><Input className="h-12 px-4 text-base" placeholder="+34 600 000 000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Correo Electrónico</FormLabel>
                                    <FormControl><Input className="h-12 px-4 text-base" placeholder="juan@florista.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                        <h2 className="text-primary dark:text-gray-200 text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">badge</span> Datos Operativos
                        </h2>
                        <FormField control={form.control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Rol en el Sistema</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 px-4 text-base">
                                            <SelectValue placeholder="Seleccione un cargo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Repartidor">Repartidor</SelectItem>
                                        <SelectItem value="Florista Senior">Florista</SelectItem>
                                        <SelectItem value="Administrador">Administrador de Tienda</SelectItem>
                                        <SelectItem value="Gerente">Gerente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <div className="p-5 bg-silk-gray dark:bg-gray-800/50 rounded-lg flex flex-col gap-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Detalles de Logística</p>
                             <FormField control={form.control} name="vehicleType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Tipo de Vehículo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="h-12 px-4 text-base bg-white dark:bg-gray-800"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="ninguno">N/A</SelectItem>
                                            <SelectItem value="furgoneta">Furgoneta Refrigerada</SelectItem>
                                            <SelectItem value="moto">Motocicleta</SelectItem>
                                            <SelectItem value="bici">Bicicleta Eléctrica</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Número de Licencia</FormLabel>
                                    <FormControl><Input className="h-12 px-4 text-base bg-white dark:bg-gray-800" placeholder="ID de conductor o licencia" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="shift" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Horario Laboral</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 px-4 text-base">
                                            <SelectValue placeholder="Seleccione un turno"/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Mañana (08:00 - 16:00)">Turno Mañana (08:00 - 16:00)</SelectItem>
                                        <SelectItem value="Tarde (14:00 - 22:00)">Turno Tarde (14:00 - 22:00)</SelectItem>
                                        <SelectItem value="Intermedio (10:00 - 18:00)">Turno Intermedio (10:00 - 18:00)</SelectItem>
                                        <SelectItem value="Intermedio (09:00 - 17:00)">Jornada Completa</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="px-8 py-6 bg-silk-gray dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="px-8 py-3 rounded-full text-charcoal-gray dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors tracking-wide">
                      CANCELAR
                  </Button>
                  <Button type="submit" disabled={isPending} className="px-10 py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-primary/20 tracking-wide flex items-center gap-2">
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="material-symbols-outlined text-[18px]">save</span>}
                      GUARDAR PERSONAL
                  </Button>
              </div>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
