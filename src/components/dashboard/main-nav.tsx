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
    <nav className="hidden md:flex h-full">
      {navItems.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "nav-link",
              isActive && "active"
            )}
          >
            {label}
          </Link>
        );
      })}
       <a className={cn("nav-link", "cursor-not-allowed opacity-50")}>Inventario</a>
    </nav>
  );
}
