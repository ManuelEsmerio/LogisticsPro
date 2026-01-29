import Link from "next/link";
import { BotMessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 font-semibold"
    >
      <BotMessageSquare className="h-6 w-6 text-primary" />
      <span className={cn("font-headline text-xl group-data-[collapsible=icon]:hidden group-data-[collapsible=offcanvas]:hidden")}>OrderWise</span>
    </Link>
  );
}
