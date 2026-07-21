import { redirect } from "next/navigation";
import type { Route } from "next";

export default function AppPage() { redirect("/app/scout" as Route); }
