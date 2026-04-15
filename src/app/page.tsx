import { ConsolidadoDashboardClient } from "@/components/consolidado/ConsolidadoDashboardClient";
import { getConsolidadoDashboard } from "@/lib/consolidado";
import { getSessionFromServerCookies } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSessionFromServerCookies();
  if (!session) {
    redirect("/login");
  }

  const dashboard = await getConsolidadoDashboard();

  return <ConsolidadoDashboardClient data={dashboard} currentUser={session.displayName} currentRole={session.role} />;
}
