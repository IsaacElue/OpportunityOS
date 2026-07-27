import { Card } from "@/components/ui/card";

export default function AppLoading() {
  return <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
    <div className="h-7 w-48 animate-pulse rounded-lg bg-white/10" />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="min-h-72 animate-pulse bg-white/[0.03]" />
      <Card className="min-h-72 animate-pulse bg-white/[0.03]" />
    </div>
  </div>;
}
