'use client';

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const OrderFormDialog = dynamic(
  () => import("@/components/dashboard/order-form-dialog").then((mod) => mod.OrderFormDialog),
  {
    ssr: false,
    loading: () => (
      <Button variant="default" className="bg-primary text-primary-foreground shadow-md" disabled>
        <span className="material-symbols-outlined text-lg">add_box</span> Nuevo Pedido
      </Button>
    ),
  }
);

export function CreateOrderButton() {
  return (
    <OrderFormDialog>
      <Button variant="default" className="bg-primary text-primary-foreground shadow-md">
        <span className="material-symbols-outlined text-lg">add_box</span> Nuevo Pedido
      </Button>
    </OrderFormDialog>
  );
}
