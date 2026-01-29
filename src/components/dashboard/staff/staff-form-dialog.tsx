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
import { staffMemberSchema, type StaffMember, type StaffMemberFormValues } from "@/lib/definitions";
import { saveStaff } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

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
          name: staffMember?.name || "",
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Editar Miembro del Personal" : "Crear Nuevo Miembro del Personal"}</DialogTitle>
          <DialogDescription>
            Completa los detalles a continuación. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="max-h-96 pr-6">
                <div className="grid gap-4 py-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar cambios
                  </Button>
              </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
