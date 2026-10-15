"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tickets", label: "Tickets", icon: "✉" },
  { href: "/dashboard", label: "Dashboard", icon: "◔" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/tickets" className="brand">
        <span className="brand-logo">M</span>
        <span>
          Mini Inbox
          <small>Stalse</small>
        </span>
      </Link>

      <nav className="nav">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            id={`nav-${link.label.toLowerCase()}`}
            href={link.href}
            className={`nav-link ${pathname.startsWith(link.href) ? "active" : ""}`}
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
