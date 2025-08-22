import { cn } from "@/lib/utils";

export default function Header({ className }: { className?: string }) {
  return (
    <header className={cn("container mx-auto flex items-center justify-between py-6", className)}>
      <a href="/" className="text-xl font-semibold tracking-tight">Hatchmark</a>
      <nav className="flex items-center gap-4">
        <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="/register">Register</a>
        <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="/verify">Verify</a>
        <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="/dashboard">Dashboard</a>
      </nav>
    </header>
  );
}
