'use client';
import { MainNav } from "@/components/dashboard/main-nav";
import Logo from "@/components/logo";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const UserNav = dynamic(() => import('@/components/dashboard/user-nav').then(mod => mod.UserNav), {
  ssr: false,
  loading: () => <Skeleton className="h-10 w-10 rounded-full" />,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="min-h-screen w-full flex flex-col">
        <header className="sticky top-0 z-50 bg-primary border-b border-white/10 px-6 py-3 text-primary-foreground">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Logo />
                    <MainNav />
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative hidden sm:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                        <Input 
                            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-md text-sm focus:ring-2 focus:ring-slate-400 w-64 text-foreground"
                            placeholder="Buscar pedido..."
                        />
                    </div>
                    <ThemeToggle />
                    <UserNav />
                </div>
            </div>
        </header>
        <main className="max-w-[1400px] mx-auto w-full p-6 space-y-6">
            {children}
        </main>
        <Link href="/dashboard/routes">
          <Button
            variant="default"
            className="fixed bottom-8 right-8 w-14 h-14 rounded-md shadow-xl flex items-center justify-center hover:-translate-y-1 transition-all z-50 bg-primary text-primary-foreground"
            aria-label="Ver rutas"
          >
            <span className="material-symbols-outlined text-2xl">map</span>
          </Button>
        </Link>
      </div>
  );
}
