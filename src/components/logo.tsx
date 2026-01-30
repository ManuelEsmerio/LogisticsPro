import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="bg-white/10 dark:bg-blue-600/20 p-1.5 rounded-lg">
        <span className="material-symbols-outlined text-white dark:text-blue-400 text-xl">
          local_shipping
        </span>
      </div>
      <span className="text-white font-bold tracking-tight">
        Logistics <span className="text-slate-400">Pro</span>
      </span>
    </Link>
  );
}
