"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
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
          orderNumber: order?.orderNumber || "",
          address: order?.address || "",
          recipientName: order?.recipientName || "",
          contactNumber: order?.contactNumber || "",
          deliveryType: order?.deliveryType || "delivery",
          paymentStatus: order?.paymentStatus || "due",
          deliveryTimeType: order?.deliveryTime ? "exact_time" : "timeslot",
          deliveryTimeSlot: order?.deliveryTimeSlot || "morning",
          deliveryTime: order?.deliveryTime ? new Date(order.deliveryTime) : null,
        },
    });
    
    const deliveryTimeType = form.watch("deliveryTimeType");

    const onSubmit = (data: OrderFormValues) => {
        startTransition(async () => {
            const result = await saveOrder(data);
            if (result.errors) {
                // Handle validation errors if necessary
            } else {
                toast({
                    title: "Success",
                    description: result.message,
                });
                setOpen(false);
                form.reset();
            }
        });
    };

    const trigger = isEditMode ? (
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            {children}
        </DropdownMenuItem>
    ) : (
        <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            {children}
        </Button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Edit Order" : "Create New Order"}</DialogTitle>
          <DialogDescription>
            Fill in the details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4 overflow-y-auto pr-4 max-h-[calc(80vh-200px)]">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="orderNumber" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Order Number</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="recipientName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Recipient Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="contactNumber" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="deliveryType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Delivery Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                    <SelectItem value="pickup">Pickup</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payment Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="due">Due</SelectItem>
                                </SelectContent>
                            </Select>
                             <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="deliveryTimeType" render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Delivery Time</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="timeslot" /></FormControl><FormLabel className="font-normal">Time Slot</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="exact_time" /></FormControl><FormLabel className="font-normal">Exact Time</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                )} />

                {deliveryTimeType === 'timeslot' && (
                    <FormField control={form.control} name="deliveryTimeSlot" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Time Slot</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a time slot" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                                    <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                                    <SelectItem value="evening">Evening (5pm - 9pm)</SelectItem>
                                </SelectContent>
                            </Select>
                             <FormMessage />
                        </FormItem>
                    )} />
                )}

                {deliveryTimeType === 'exact_time' && (
                    <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                         <FormItem className="flex flex-col">
                            <FormLabel>Exact Date & Time</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                </PopoverContent>
                            </Popover>
                             <FormMessage />
                        </FormItem>
                    )} />
                )}
                </div>

                <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save changes
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
