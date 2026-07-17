import Link from "next/link";
import { Bookmark } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SavedPage() { return <><div><p className="text-sm font-medium text-brand">Saved research</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Keep only the hypotheses worth pursuing.</h1></div><Card className="mt-8 grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"><Bookmark className="size-5" /></span><h2 className="mt-5 font-semibold">No saved reports yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">Verified Founder Opportunity Reports will appear here after the research pipeline is built.</p><Link href="/app/scan" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-5")}>Create a research brief</Link></div></Card></>; }
