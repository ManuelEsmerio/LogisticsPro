"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { orderSchema, type Order, type OrderFormValues } from "@/lib/definitions";
import { saveOrder } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";

interface OrderFormDialogProps {
    order?: Order;
    isEditMode?: boolean;
    children: React.ReactNode;
}

export function OrderFormDialog({ order, isEditMode = false, children }: OrderFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(orderSchema),
        defaultValues: {
          id: order?.id,
          orderNumber: order?.orderNumber || `#FL-${Math.floor(Math.random() * 9000) + 1000}`,
          address: order?.address || "",
          recipientName: order?.recipientName || "",
          product: order?.product || "",
          contactNumber: order?.contactNumber || "",
          deliveryType: order?.deliveryType || "delivery",
          paymentStatus: order?.paymentStatus || "due",
          priority: order?.priority || "Media",
          deliveryTime: order?.deliveryTime ? new Date(order.deliveryTime) : new Date(),
          deliveryTimeSlot: order?.deliveryTimeSlot || "morning",
        },
    });

    const onSubmit = (data: OrderFormValues) => {
        startTransition(async () => {
             // We manually add deliveryTimeType here before saving
            const result = await saveOrder({
                ...data,
                deliveryTimeType: 'timeslot' 
            });

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
                <span className="material-symbols-outlined text-primary dark:text-gray-200 text-3xl">local_florist</span>
                <DialogTitle className="text-primary dark:text-white text-2xl font-bold tracking-tight">{isEditMode ? "Editar Pedido" : "Registrar Nuevo Pedido"}</DialogTitle>
            </div>
            <DialogClose asChild>
                 <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </DialogClose>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="max-h-[70vh]">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <h2 className="text-primary dark:text-gray-200 text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">person</span> Datos del Cliente
                      </h2>
                       <FormField control={form.control} name="recipientName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Nombre del Cliente</FormLabel>
                                <FormControl><Input className="h-12 px-4 text-base" placeholder="Ej: Maria García" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="contactNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Teléfono de Contacto</FormLabel>
                                <FormControl><Input className="h-12 px-4 text-base" placeholder="+34 000 000 000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Dirección de Entrega</FormLabel>
                                <FormControl><Textarea className="min-h-[145px] text-base" placeholder="Calle, número, piso y código postal..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-6">
                     <div className="flex flex-col gap-4">
                        <h2 className="text-primary dark:text-gray-200 text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">shopping_basket</span> Detalles del Pedido
                        </h2>
                        <FormField control={form.control} name="product" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Tipo de Arreglo</FormLabel>
                                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 px-4 text-base">
                                            <SelectValue placeholder="Seleccione tipo de arreglo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Ramo de Flores">Ramo de Flores</SelectItem>
                                        <SelectItem value="Centro de Mesa">Centro de Mesa</SelectItem>
                                        <SelectItem value="Caja Premium">Caja Premium</SelectItem>
                                        <SelectItem value="Evento Especial">Evento Especial</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Fecha de Entrega</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("h-12 px-4 text-base justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Elige una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="deliveryTimeSlot" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Franja Horaria</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 px-4 text-base">
                                                <SelectValue placeholder="Selecciona una franja"/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="morning">Mañana</SelectItem>
                                            <SelectItem value="afternoon">Tarde</SelectItem>
                                            <SelectItem value="evening">Noche</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="priority" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Prioridad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 px-4 text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Baja">Normal</SelectItem>
                                        <SelectItem value="Media">Alta</SelectItem>
                                        <SelectItem value="Alta">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="mt-2 p-5 bg-silk-gray dark:bg-gray-800/50 rounded-lg flex flex-col gap-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Resumen Logístico</p>
                            <div className="flex items-center gap-2 text-sm text-charcoal-gray dark:text-gray-300">
                                <span className="material-symbols-outlined text-sm">info</span>
                                <span>El pedido será asignado a la ruta más próxima.</span>
                            </div>
                        </div>
                     </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="px-8 py-6 bg-silk-gray dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="px-8 py-3 rounded-full text-charcoal-gray dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors tracking-wide">
                      CANCELAR
                  </Button>
                  <Button type="submit" disabled={isPending} className="px-10 py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-primary/20 tracking-wide flex items-center gap-2">
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>}
                      {isEditMode ? "GUARDAR CAMBIOS" : "CREAR PEDIDO"}
                  </Button>
              </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
