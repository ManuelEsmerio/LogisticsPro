import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
            <Link
                href="/dashboard"
                className="flex items-center gap-3"
            >
                <div className="size-10 bg-primary/10 text-primary dark:bg-slate-700 dark:text-white rounded flex items-center justify-center">
                    <span className="material-symbols-outlined">local_shipping</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-primary dark:text-white">
                    Logistics <span className="text-muted-foreground font-light">Pro</span>
                </h1>
            </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
