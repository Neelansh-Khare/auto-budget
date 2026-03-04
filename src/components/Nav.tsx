"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/budget", label: "Budget" },
  { href: "/transactions", label: "Transactions" },
  { href: "/review", label: "Needs Review" },
  { href: "/rules", label: "Rules" },
  { href: "/settings", label: "Settings" },
  { href: "/audit", label: "Audit" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm font-medium border-b border-foreground/10 bg-background px-4 py-3 sticky top-0 z-10 overflow-x-auto whitespace-nowrap">
      {links.map((l) => {
        const isActive = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`transition-colors hover:text-blue-600 px-1 py-1 rounded ${
              isActive ? "text-blue-600 font-semibold" : "text-foreground/70"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

