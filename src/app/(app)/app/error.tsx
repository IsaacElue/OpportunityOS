"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Card className="mx-auto mt-12 max-w-lg p-8 text-center" role="alert">
    <span className="mx-auto grid size-11 place-items-center rounded-xl bg-red-400/10 text-red-200"><AlertTriangle className="size-5" /></span>
    <h1 className="mt-5 text-xl font-semibold">Scout hit a temporary problem</h1>
    <p className="mt-2 text-sm leading-6 text-muted">Your data is safe. Try loading this workspace again, or return to Scout and continue where you left off.</p>
    <Button type="button" className="mt-6" onClick={reset}>Try again</Button>
  </Card>;
}
