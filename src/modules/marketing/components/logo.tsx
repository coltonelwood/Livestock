import { cn } from "@/lib/utils";

/** Simple, rural-friendly mark: an open range horizon with a rising sun. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="10" r="3.5" />
      <path d="M2 20h20" />
      <path d="M2 16c3-2 6-2 10 0s7 2 10 0" />
    </svg>
  );
}
