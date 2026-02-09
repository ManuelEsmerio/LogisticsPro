"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/lib/definitions";
import { DataTable } from "@/components/dashboard/data-table/data-table";
import { columns } from "@/components/dashboard/data-table/columns";
import { Button } from "@/components/ui/button";
import { OrderFormDialog } from "@/components/dashboard/order-form-dialog";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteOrder, parseDeliveryTime } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export function OrdersTableClient() {
  const [data, setData] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      try {
        const res = await fetch(`${API_URL}/orders?_sort=createdAt&_order=desc`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }
        const orders = await res.json();
        const normalized = orders.map((order: any) => ({
          ...order,
          id: order.id ?? order._id,
          createdAt: new Date(order.createdAt),
          deliveryTime: parseDeliveryTime(order.deliveryTime),
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

    loadOrders();

    const handleRefresh = () => loadOrders();
    window.addEventListener("orders:updated", handleRefresh);

    return () => {
      window.removeEventListener("orders:updated", handleRefresh);
      isActive = false;
    };
  }, []);

  const tableData = useMemo(() => data, [data]);
  const selectedOrder = useMemo(
    () => (selectedId ? tableData.find((order) => order.id === selectedId) ?? null : null),
    [selectedId, tableData]
  );

  const handleDelete = async () => {
    if (!selectedOrder?.id) return;
    setIsDeleteOpen(false);
    setIsDeleting(true);
    try {
      const ok = await deleteOrder(selectedOrder.id);
      if (!ok) {
        throw new Error("Failed to delete order");
      }
      toast({ title: "Éxito", description: "Pedido eliminado." });
      window.dispatchEvent(new Event("orders:updated"));
      setSelectedId(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el pedido." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {selectedOrder ? `Seleccionado: ${selectedOrder.orderNumber}` : "Selecciona un pedido"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedOrder}
            onClick={() => setIsEditOpen(true)}
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!selectedOrder}
            onClick={() => setIsDeleteOpen(true)}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Eliminar
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        loadingText="Cargando pedidos..."
        selectedId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
      />

      {selectedOrder ? (
        <OrderFormDialog order={selectedOrder} isEditMode open={isEditOpen} onOpenChange={setIsEditOpen} showTrigger={false}>
          <span className="sr-only">Editar</span>
        </OrderFormDialog>
      ) : null}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="flex flex-col items-center text-center" showOverlay={false}>
          <div className="mb-6 flex items-center justify-center size-20 rounded-full bg-coral-soft/20 text-destructive">
            <span className="material-symbols-outlined !text-5xl">warning</span>
          </div>
          <DialogHeader className="text-center flex flex-col items-center">
            <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight">
              ¿Estás seguro de eliminar este pedido?
            </DialogTitle>
          </DialogHeader>
          <div className="bg-silk-gray dark:bg-background-dark/50 px-6 py-4 rounded-xl mt-5 mb-6 w-full flex flex-col gap-1">
            <p className="text-slate-custom dark:text-gray-300 text-lg font-medium leading-normal">
              {selectedOrder?.orderNumber}
            </p>
            <p className="text-slate-custom/60 dark:text-gray-500 text-sm uppercase tracking-wider font-bold">
              {selectedOrder?.product}
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
