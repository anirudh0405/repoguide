import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-12 max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand">{eyebrow}</p>
      )}
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
    </div>
  );
}
