"use client";

import { useEffect, useMemo, useState } from "react";
import type { StaffMember } from "@/lib/definitions";
import { StaffDataTable } from "@/components/dashboard/staff/data-table";
import { columns } from "@/components/dashboard/staff/columns";
import { Button } from "@/components/ui/button";
import { StaffFormDialog } from "@/components/dashboard/staff/staff-form-dialog";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteStaff } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export function StaffTableClient() {
  const [data, setData] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isActive = true;

    async function loadStaff() {
      try {
        const res = await fetch(`${API_URL}/deliveryStaff?_sort=createdAt&_order=desc`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch staff");
        }
        const staff = await res.json();
        const normalized = staff.map((s: any) => ({
          ...s,
          id: s.id ?? s._id,
          createdAt: new Date(s.createdAt),
        }));
        if (isActive) {
          setData(normalized);
        }
      } catch (error) {
        if (isActive) {
          setData([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadStaff();

    const handleRefresh = () => {
      loadStaff();
    };

    window.addEventListener("staff:updated", handleRefresh);

    return () => {
      window.removeEventListener("staff:updated", handleRefresh);
      isActive = false;
    };
  }, []);

  const tableData = useMemo(() => data, [data]);
  const selectedStaff = useMemo(
    () => (selectedId ? tableData.find((staff) => staff.id === selectedId) ?? null : null),
    [selectedId, tableData]
  );

  const handleDelete = async () => {
    if (!selectedId) return;
    setIsDeleteOpen(false);
    setIsDeleting(true);
    try {
      const ok = await deleteStaff(selectedId);
      if (!ok) {
        throw new Error("Failed to delete staff");
      }
      toast({ title: "Éxito", description: "Miembro del personal eliminado." });
      window.dispatchEvent(new Event("staff:updated"));
      setSelectedId(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error de base de datos: No se pudo eliminar al miembro del personal." });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="p-8 text-sm text-muted-foreground">Cargando personal...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {selectedStaff ? `Seleccionado: ${selectedStaff.name}` : "Selecciona un repartidor"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedStaff}
            onClick={() => setIsEditOpen(true)}
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!selectedStaff}
            onClick={() => setIsDeleteOpen(true)}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Eliminar
          </Button>
        </div>
      </div>
      <StaffDataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        loadingText="Cargando personal..."
        selectedId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
      />

      {selectedStaff ? (
        <StaffFormDialog
          staffMember={selectedStaff}
          isEditMode
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          showTrigger={false}
          preventOutsideClose
        >
          <span className="sr-only">Editar</span>
        </StaffFormDialog>
      ) : null}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="flex flex-col items-center text-center" showOverlay={false}>
          <div className="mb-6 flex items-center justify-center size-20 rounded-full bg-coral-soft/20 text-destructive">
            <span className="material-symbols-outlined !text-5xl">warning</span>
          </div>
          <DialogHeader className="text-center flex flex-col items-center">
            <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight">
              ¿Estás seguro de eliminar este registro?
            </DialogTitle>
          </DialogHeader>
          <div className="bg-silk-gray dark:bg-background-dark/50 px-6 py-4 rounded-xl mt-5 mb-6 w-full flex flex-col gap-1">
            <p className="text-slate-custom dark:text-gray-300 text-lg font-medium leading-normal">
              {selectedStaff?.name}
            </p>
            <p className="text-slate-custom/60 dark:text-gray-500 text-sm uppercase tracking-wider font-bold">
              {selectedStaff?.role}
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-6 w-full justify-center pt-2">
            <DialogClose asChild>
              <Button
                variant="secondary"
                disabled={isDeleting}
                className="flex-1 min-w-[160px] cursor-pointer rounded-full h-14 px-6 bg-slate-custom hover:bg-slate-700 text-white text-base font-bold"
              >
                No, mantener
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 min-w-[160px] cursor-pointer rounded-full h-14 px-6 text-base font-bold"
            >
              Sí, eliminar
            </Button>
          </DialogFooter>
          <p className="mt-8 text-slate-custom/50 dark:text-gray-500 text-xs font-medium uppercase tracking-[0.1em]">
            Esta acción no se puede deshacer
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
