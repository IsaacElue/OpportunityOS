import { redirect } from "next/navigation";
import type { Route } from "next";

export default function ScanPage() { redirect("/app/scout" as Route); }
