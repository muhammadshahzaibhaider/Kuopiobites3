import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ArrowUpRight } from "./icons";

type PillButtonProps = {
  href: string;
  children: ReactNode;
  tone?: "light" | "outline";
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
};

const sizes = {
  sm: "h-10 pl-5 pr-2 text-ui",
  md: "h-12 pl-6 pr-2.5 text-sm",
} as const;

export function PillButton({
  href,
  children,
  tone = "light",
  size = "md",
  className,
  onClick,
}: PillButtonProps) {
  const classes = cn(
    "group/pill inline-flex items-center gap-3 rounded-full font-medium tracking-tight",
    "transition-[background-color,box-shadow,border-color,transform] duration-300 ease-expo",
    "hover:-translate-y-0.5 active:translate-y-0",
    tone === "light"
      ? "bg-white text-ink hover:bg-white hover:shadow-pill"
      : "border border-hairline-strong bg-white/[0.03] text-fg hover:border-white/40 hover:bg-white/[0.07]",
    sizes[size],
    className,
  );

  const inner = (
    <>
      <span className="whitespace-nowrap">{children}</span>
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full transition-transform duration-300 ease-expo group-hover/pill:translate-x-0.5 group-hover/pill:-translate-y-0.5",
          tone === "light" ? "bg-ink text-white" : "bg-white text-ink",
        )}
        aria-hidden
      >
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
    </>
  );

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {inner}
    </Link>
  );
}
