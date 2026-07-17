import Link from "next/link";
import type { Route } from "next";
import { Orbit } from "lucide-react";

export function Brand({ href = "/" }: { href?: Route }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
      <span className="grid size-7 place-items-center rounded-lg bg-brand text-brand-ink"><Orbit className="size-4" /></span>
      OpportunityOS
    </Link>
  );
}
