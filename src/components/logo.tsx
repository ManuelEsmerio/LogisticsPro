import Link from "next/link";
import { BotMessageSquare } from "lucide-react";

export default function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 text-lg font-semibold"
    >
      <BotMessageSquare className="h-6 w-6 text-primary" />
      <span className="font-headline text-xl">OrderWise</span>
    </Link>
  );
}
