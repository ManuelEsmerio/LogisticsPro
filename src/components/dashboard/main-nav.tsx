"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, Users } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", icon: Package, label: "Pedidos" },
  { href: "/dashboard/routes", icon: Truck, label: "Rutas" },
  { href: "/dashboard/staff", icon: Users, label: "Personal" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map(({ href, icon: Icon, label }) => (
        <SidebarMenuItem key={label}>
          <Link href={href} legacyBehavior passHref>
            <SidebarMenuButton
              isActive={pathname === href}
              tooltip={label}
            >
              <Icon />
              <span>{label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
