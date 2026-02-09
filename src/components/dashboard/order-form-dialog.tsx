"use client";

import { useEffect, useState, useTransition } from "react";
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
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { orderSchema, type Order, type OrderFormValues } from "@/lib/definitions";
import { addOrder, getLatestOrderNumber, updateOrder } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";

interface OrderFormDialogProps {
    order?: Order;
    isEditMode?: boolean;
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
}

export function OrderFormDialog({ order, isEditMode = false, children, open: controlledOpen, onOpenChange, showTrigger = true }: OrderFormDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const isControlled = controlledOpen !== undefined;
    const dialogOpen = isControlled ? controlledOpen : open;
    const setDialogOpen = onOpenChange ?? setOpen;
    const [calendarOpen, setCalendarOpen] = useState(false);
    const calendarFormatters = {
        formatWeekdayName: (weekday: Date) => ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"][weekday.getDay()],
        formatCaption: (month: Date) => {
            const label = format(month, "LLLL yyyy", { locale: es });
            return label.charAt(0).toUpperCase() + label.slice(1);
        },
    };
    const [exactTime, setExactTime] = useState("09:00");
    const isEditLocked = isEditMode && (order?.deliveryStatus === 'en_reparto' || order?.deliveryStatus === 'entregado');

    const formatExactTime = (value: Date | null | undefined) => {
        if (!value) return "09:00";
        const hours = String(value.getHours()).padStart(2, "0");
        const minutes = String(value.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    const deriveTimeSlotFromTime = (value: string) => {
        const [hoursValue] = value.split(":").map(Number);
        const hours = Number.isFinite(hoursValue) ? hoursValue : 0;
        if (hours >= 9 && hours < 12) return "morning";
        if (hours >= 12 && hours < 18) return "afternoon";
        if (hours >= 18 && hours <= 20) return "evening";
        return "morning";
    };

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
                    deliveryTimeType: order?.deliveryTimeSlot ? "timeslot" : "exact_time",
          deliveryTime: order?.deliveryTime ? new Date(order.deliveryTime) : new Date(),
          deliveryTimeSlot: order?.deliveryTimeSlot || "morning",
        },
    });

        const deliveryTimeType = form.watch("deliveryTimeType");

    const onSubmit = (data: OrderFormValues, event?: React.BaseSyntheticEvent) => {
        if (
            event?.nativeEvent?.submitter &&
            event.nativeEvent.submitter.getAttribute("data-submit") !== "true"
        ) {
            return;
        }
        if (isEditLocked) {
            toast({
                variant: "destructive",
                title: "Edicion bloqueada",
                description: "No se puede modificar un pedido en reparto o entregado.",
            });
            return;
        }
        if (data.deliveryTimeType === "exact_time" && !exactTime) {
            toast({
                variant: "destructive",
                title: "Hora exacta requerida",
                description: "Selecciona una hora exacta para la entrega.",
            });
            return;
        }
        startTransition(async () => {
            try {
                const rawId = data.id;
                const id = rawId && rawId !== "undefined" ? rawId : undefined;
                const { id: _ignored, deliveryTimeType: _ignoredType, ...orderPayload } = data;
                const deliveryDate = data.deliveryTime ? new Date(data.deliveryTime) : null;
                if (deliveryDate) {
                    if (data.deliveryTimeType === "exact_time") {
                        const [hours, minutes] = exactTime.split(":").map(Number);
                        deliveryDate.setHours(hours || 0, minutes || 0, 0, 0);
                        orderPayload.deliveryTimeSlot = deriveTimeSlotFromTime(exactTime);
                    } else {
                        deliveryDate.setHours(0, 0, 0, 0);
                        orderPayload.deliveryTimeSlot = orderPayload.deliveryTimeSlot ?? "morning";
                    }
                }
                orderPayload.deliveryTime = deliveryDate;
                const shouldGeocode = !id || !order || order.address !== data.address;
                if (shouldGeocode) {
                    const res = await fetch("/api/geocode", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ address: data.address }),
                    });
                    if (!res.ok) throw new Error("Geocode failed");
                    const coords = await res.json();
                    orderPayload.latitude = coords.latitude;
                    orderPayload.longitude = coords.longitude;
                }
                if (id) {
                    const updated = await updateOrder(id, orderPayload);
                    if (!updated) throw new Error("Failed to update order");
                } else {
                    await addOrder({
                        ...orderPayload,
                        latitude: orderPayload.latitude ?? 0,
                        longitude: orderPayload.longitude ?? 0,
                    });
                }

                toast({
                    title: "Éxito",
                    description: `Pedido ${data.id ? "actualizado" : "creado"} con éxito.`,
                });
                setDialogOpen(false);
                form.reset();
                window.dispatchEvent(new Event("orders:updated"));
            } catch (error) {
                const message = error instanceof Error ? error.message : "";
                if (message === "ORDER_NUMBER_EXISTS") {
                    toast({
                        variant: "destructive",
                        title: "Numero de pedido duplicado",
                        description: "Ya existe un pedido con ese numero. Usa uno diferente.",
                    });
                    return;
                }
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "No se pudo guardar el pedido.",
                });
            }
        });
    };

    const trigger = !showTrigger ? null : (isEditMode ? (
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
            {children}
        </DropdownMenuItem>
    ) : (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
    ));

    useEffect(() => {
        if (deliveryTimeType === "exact_time") {
            form.setValue("deliveryTimeSlot", deriveTimeSlotFromTime(exactTime), { shouldDirty: true });
        }
        if (deliveryTimeType === "timeslot" && !form.getValues("deliveryTimeSlot")) {
            form.setValue("deliveryTimeSlot", "morning", { shouldDirty: true });
        }
    }, [deliveryTimeType, exactTime, form]);

    useEffect(() => {
        if (!order) {
            form.reset({
                id: undefined,
                orderNumber: "#FL-001",
                address: "",
                recipientName: "",
                product: "",
                contactNumber: "",
                deliveryType: "delivery",
                paymentStatus: "due",
                priority: "Media",
                deliveryTimeType: "timeslot",
                deliveryTime: new Date(),
                deliveryTimeSlot: "morning",
            });
            setExactTime("09:00");

            if (dialogOpen) {
                (async () => {
                    const latest = await getLatestOrderNumber();
                    const latestText = latest == null ? "" : String(latest).trim();
                    const match = latestText.match(/#?FL-(\d+)/i) ?? latestText.match(/(\d+)/);
                    const nextNumber = match ? Number(match[1]) + 1 : 1;
                    const formatted = `#FL-${String(nextNumber).padStart(3, "0")}`;
                    form.setValue("orderNumber", formatted, { shouldDirty: true });
                })();
            }
            return;
        }

        form.reset({
            id: order.id,
            orderNumber: order.orderNumber,
            address: order.address,
            recipientName: order.recipientName,
            product: order.product,
            contactNumber: order.contactNumber,
            deliveryType: order.deliveryType,
            priority: order.priority,
            paymentStatus: order.paymentStatus,
            deliveryTimeType: order.deliveryTimeSlot ? "timeslot" : "exact_time",
            deliveryTime: order.deliveryTime ? new Date(order.deliveryTime) : new Date(),
            deliveryTimeSlot: order.deliveryTimeSlot || "morning",
        });
        setExactTime(formatExactTime(order.deliveryTime));
    }, [order, form, dialogOpen]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {trigger}
    <DialogContent
        className="sm:max-w-[960px] p-0"
        showClose={false}
        onOpenAutoFocus={(event) => {
            event.preventDefault();
            form.setFocus("orderNumber");
        }}
    >
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[80vh]">
                            <ScrollArea className="flex-1">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                    {isEditLocked && (
                        <div className="md:col-span-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-800 px-4 py-3 text-sm">
                            Este pedido esta en reparto o ya fue entregado y no se puede modificar.
                        </div>
                    )}
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <h2 className="text-primary dark:text-gray-200 text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">person</span> Datos del Cliente
                      </h2>
                                             <FormField control={form.control} name="orderNumber" render={({ field }) => (
                                                        <FormItem>
                                                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Número de Pedido</FormLabel>
                                                                <FormControl><Input className="h-12 px-4 text-base" placeholder="#FL-1234" {...field} disabled={isEditLocked} /></FormControl>
                                                                <FormMessage />
                                                        </FormItem>
                                                )} />
                       <FormField control={form.control} name="recipientName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Nombre del Cliente</FormLabel>
                                <FormControl><Input className="h-12 px-4 text-base" placeholder="Ej: Maria García" {...field} disabled={isEditLocked} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="contactNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Teléfono de Contacto</FormLabel>
                                <FormControl><Input className="h-12 px-4 text-base" placeholder="+34 000 000 000" {...field} disabled={isEditLocked} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Dirección de Entrega</FormLabel>
                                <FormControl><Textarea className="min-h-[145px] text-base" placeholder="Calle, número, piso y código postal..." {...field} disabled={isEditLocked} /></FormControl>
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
                                 <Select value={field.value} onValueChange={field.onChange} disabled={isEditLocked}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 px-4 text-base">
                                            <SelectValue placeholder="Seleccione tipo de arreglo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Arreglo de flores">Arreglo de flores</SelectItem>
                                        <SelectItem value="Ramo de flores">Ramo de flores</SelectItem>
                                        <SelectItem value="Regalo">Regalo</SelectItem>
                                        <SelectItem value="Paquete">Paquete</SelectItem>
                                        <SelectItem value="otros">otros</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="deliveryTimeType" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Tipo de Entrega</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={isEditLocked}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 px-4 text-base">
                                            <SelectValue placeholder="Selecciona el tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="timeslot">Franja horaria</SelectItem>
                                        <SelectItem value="exact_time">Hora exacta</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Fecha de Entrega</FormLabel>
                                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} disabled={isEditLocked} className={cn("h-12 px-4 text-base justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Elige una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start" portalled={false}>
                                            <Calendar
                                                mode="single"
                                                selected={field.value ?? undefined}
                                                onSelect={(date) => {
                                                    field.onChange(date);
                                                    setCalendarOpen(false);
                                                }}
                                                initialFocus
                                                locale={es}
                                                formatters={calendarFormatters}
                                                disabled={isEditLocked}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            {deliveryTimeType === "timeslot" ? (
                                <FormField control={form.control} name="deliveryTimeSlot" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Franja Horaria</FormLabel>
                                        <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isEditLocked}>
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
                            ) : (
                                <FormItem>
                                    <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Hora Exacta</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="time"
                                            value={exactTime}
                                            onChange={(event) => setExactTime(event.target.value)}
                                            disabled={isEditLocked}
                                            className="h-12 px-4 text-base"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        </div>
                        <FormField control={form.control} name="priority" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-charcoal-gray dark:text-gray-400 text-sm font-medium">Prioridad</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={isEditLocked}>
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
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="px-8 py-3 rounded-full text-charcoal-gray dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors tracking-wide">
                      CANCELAR
                  </Button>
                  <Button type="submit" data-submit="true" disabled={isPending || isEditLocked} className="px-10 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 tracking-wide flex items-center gap-2">
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
