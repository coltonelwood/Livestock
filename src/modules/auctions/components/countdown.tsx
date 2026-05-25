"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function format(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

/** Live ticking countdown to a target ISO timestamp. */
export function Countdown({
  to,
  className,
  prefix = "Closes in",
}: {
  to: string;
  className?: string;
  prefix?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = new Date(to).getTime() - now;
  if (Number.isNaN(ms)) return null;

  return (
    <span className={cn("tabular-nums", className)}>
      {ms <= 0 ? "Closed" : `${prefix} ${format(ms)}`}
    </span>
  );
}
