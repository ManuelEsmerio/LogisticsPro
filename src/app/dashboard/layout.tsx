'use client';
import { usePathname } from 'next/navigation';
import { MainNav } from "@/components/dashboard/main-nav";
import Logo from "@/components/logo";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from '@/lib/utils';

const UserNav = dynamic(() => import('@/components/dashboard/user-nav').then(mod => mod.UserNav), {
  ssr: false,
  loading: () => <Skeleton className="h-8 w-8 rounded-full" />,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRoutesPage = pathname === '/dashboard/routes';

  return (
      <div className="min-h-screen w-full flex flex-col bg-background dark:bg-navy-dark">
        <header className="h-14 bg-navy-dark flex items-center justify-between px-6 shrink-0 z-50 border-b border-transparent dark:border-slate-800">
            <div className="flex items-center gap-12 h-full">
                <Logo />
                <MainNav />
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden sm:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <Input 
                        className="bg-white/10 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 w-64 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        placeholder="Buscar..."
                    />
                </div>
                <ThemeToggle />
                <UserNav />
            </div>
        </header>
        <main className={cn("w-full", isRoutesPage ? "flex-1 flex flex-col overflow-hidden" : "max-w-[1400px] mx-auto p-6 space-y-6")}>
            {children}
        </main>
      </div>
  );
}
