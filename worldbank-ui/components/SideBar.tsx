"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/documents", label: "Tài liệu", hint: "Tra cứu & lọc" },
  { href: "/sync-jobs", label: "Đồng bộ", hint: "Lượt & nhật ký" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between bg-ink text-white">
      <div>
        <div className="border-b border-ink-line px-6 py-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-stamp/60 font-mono text-[11px] font-semibold text-stamp-soft">
              WB
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Doc Pipe</p>
              <p className="text-[11px] text-white/40">Registry Console</p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4">
          <p className="eyebrow px-3 pb-2 text-white/40">Điều hướng</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex flex-col rounded-sm px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[11px] text-white/35">{item.hint}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t border-ink-line px-6 py-4">
        <p className="text-[11px] text-white/35">WB-DOC-PIPE-01 · v1.0</p>
        <p className="text-[11px] text-white/25">Nội bộ — Nhóm phát triển</p>
      </div>
    </aside>
  );
}
