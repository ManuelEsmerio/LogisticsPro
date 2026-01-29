import { getStaff } from "@/lib/data";
import { StaffDataTable } from "@/components/dashboard/staff/data-table";
import { columns } from "@/components/dashboard/staff/columns";

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <>
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Staff
        </h1>
      </div>
      <div
        className="flex flex-1 rounded-lg border shadow-sm"
      >
        <StaffDataTable columns={columns} data={staff} />
      </div>
    </>
  );
}
