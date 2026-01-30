"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Pedidos" },
  { href: "/dashboard/routes", label: "Rutas" },
  { href: "/dashboard/staff", label: "Personal" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "transition-colors text-sm font-medium pb-1",
              isActive
                ? "font-semibold border-b-2 border-white text-white"
                : "text-white opacity-70 hover:opacity-100"
            )}
          >
            {label}
          </Link>
        );
      })}
       <a className="text-sm font-medium cursor-not-allowed text-white opacity-50">Inventario</a>
    </nav>
  );
}
