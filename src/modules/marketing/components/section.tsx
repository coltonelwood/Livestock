import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  tone = "bone",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "bone" | "muted" | "ink";
}) {
  const tones = {
    bone: "bg-background",
    muted: "bg-secondary/40",
    ink: "bg-ink text-ink-foreground",
  } as const;
  return (
    <section className={cn("border-b border-border", tones[tone], className)}>
      <div className="container py-16 md:py-24">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
