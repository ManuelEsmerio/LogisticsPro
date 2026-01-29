'use client';
import { MainNav } from "@/components/dashboard/main-nav";
import { UserNav } from "@/components/dashboard/user-nav";
import Logo from "@/components/logo";
import { Input } from "@/components/ui/input";
import { ChevronsLeft, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toggleSidebar } = useSidebar();
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b justify-center">
            <Logo />
        </SidebarHeader>
        <SidebarContent>
            <MainNav />
        </SidebarContent>
        <SidebarFooter className="mt-auto flex p-2 border-t">
          <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={toggleSidebar}
          >
              <ChevronsLeft className="shrink-0 size-4 transition-transform duration-200 group-data-[state=collapsed]:rotate-180" />
              <span className="group-data-[state=collapsed]:hidden">Ocultar</span>
              <span className="sr-only group-data-[state=expanded]:hidden">Mostrar barra lateral</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-full">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="shrink-0 lg:hidden" />
            <div className="w-full flex-1">
              <form>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar pedidos..."
                    className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                  />
                </div>
              </form>
            </div>
            <ThemeToggle />
            <UserNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
