"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { 
  LayoutDashboard, 
  PieChart, 
  Receipt, 
  ClipboardList, 
  Zap, 
  Settings, 
  Activity,
  Upload
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: PieChart },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/review", label: "Needs Review", icon: ClipboardList },
  { href: "/rules", label: "Rules", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/audit", label: "Audit", icon: Activity },
  { href: "/upload", label: "Upload", icon: Upload },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 max-w-screen-2xl mx-auto">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">AutoBudgeter</span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            {links.map((l) => {
              const isActive = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-1.5 transition-colors hover:text-primary ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Mobile Nav */}
        <div className="flex md:hidden flex-1 items-center overflow-x-auto no-scrollbar py-2">
           <nav className="flex items-center space-x-4 text-xs font-medium pr-4">
            {links.map((l) => {
              const isActive = pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-1 transition-colors hover:text-primary whitespace-nowrap ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
