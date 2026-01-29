import { getOrders } from "@/lib/data";
import { DataTable } from "@/components/dashboard/data-table/data-table";
import { columns } from "@/components/dashboard/data-table/columns";

export default async function DashboardPage() {
  const orders = await getOrders();

  return (
    <>
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Orders
        </h1>
      </div>
      <div
        className="flex flex-1 rounded-lg border shadow-sm"
      >
        <DataTable columns={columns} data={orders} />
      </div>
    </>
  );
}
