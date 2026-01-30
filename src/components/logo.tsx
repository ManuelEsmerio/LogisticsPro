import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3"
    >
      <div className="size-10 bg-slate-700 rounded flex items-center justify-center text-white">
        <span className="material-symbols-outlined">local_shipping</span>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-white">
        Logistics <span className="text-slate-400 font-light">Pro</span>
      </h1>
    </Link>
  );
}
