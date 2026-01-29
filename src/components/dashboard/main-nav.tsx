"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Truck, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "#", icon: Package, label: "Orders", badge: "6" },
  { href: "#", icon: Truck, label: "Routes" },
  { href: "#", icon: Users, label: "Customers" },
];

export function MainNav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();

  const navLinkClasses = (href: string) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
      {
        "bg-muted text-primary": pathname === href,
        "justify-start": !isMobile,
        "text-lg": isMobile,
      }
    );

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map(({ href, icon: Icon, label, badge }) => (
        <Link key={label} href={href} className={navLinkClasses(href)}>
          <Icon className="h-4 w-4" />
          {label}
          {badge && (
            <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              {badge}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );
}
