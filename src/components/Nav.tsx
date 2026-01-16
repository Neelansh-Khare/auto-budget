import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/review", label: "Needs Review" },
  { href: "/rules", label: "Rules" },
  { href: "/settings", label: "Settings" },
  { href: "/audit", label: "Audit" },
];

export function Nav() {
  return (
    <nav className="flex gap-4 text-sm font-medium border-b border-gray-200 bg-white px-4 py-3 sticky top-0 z-10">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-blue-600">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

