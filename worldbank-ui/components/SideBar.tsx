"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, GitBranch, LayoutGrid } from "lucide-react";
import ConnectionStatus from "./ConnectionStatus";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", hint: "Số liệu nhanh", icon: LayoutGrid, exact: true },
  { href: "/documents", label: "Tài liệu", hint: "Tra cứu & lọc", icon: FileStack },
  { href: "/sync-jobs", label: "Đồng bộ", hint: "Lượt & nhật ký", icon: GitBranch },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between bg-sidebar-gradient text-white">
      <div>
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient font-display text-[13px] font-bold shadow-glow">
              WB
            </span>
            <div>
              <p className="font-display text-[15px] font-bold leading-tight">Doc Pipe</p>
              <p className="text-[11px] text-white/40">Registry Console</p>
            </div>
          </div>
        </div>

        <nav className="px-3">
          <p className="eyebrow px-3 pb-2 text-white/35">Điều hướng</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                      active
                        ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-white/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        active ? "bg-brand-gradient text-white" : "bg-white/5 text-white/50 group-hover:text-white"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-[11px] text-white/35">{item.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
        <ConnectionStatus />
        <p className="px-2 text-[11px] text-white/30">WB-DOC-PIPE-01 · v1.0</p>
      </div>
    </aside>
  );
}
