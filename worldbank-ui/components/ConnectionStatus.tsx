"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ConnState = "checking" | "online" | "offline";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const CHECK_INTERVAL_MS = 20000;

export default function ConnectionStatus() {
  const [state, setState] = useState<ConnState>("checking");

  useEffect(() => {
    let cancelled = false;

    function check() {
      api
        .listSyncJobs(1, 1)
        .then(() => {
          if (!cancelled) setState("online");
        })
        .catch(() => {
          if (!cancelled) setState("offline");
        });
    }

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dotClass =
    state === "online"
      ? "bg-emerald-400"
      : state === "offline"
        ? "bg-rose-400"
        : "bg-white/30 animate-pulse";

  const label =
    state === "online"
      ? "Đã kết nối backend"
      : state === "offline"
        ? "Mất kết nối backend"
        : "Đang kiểm tra…";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className="text-[12px] font-medium text-white/70">{label}</span>
      </div>
      <p className="mt-1 truncate font-mono text-[10.5px] text-white/30">
        {API_BASE_URL}
      </p>
    </div>
  );
}
