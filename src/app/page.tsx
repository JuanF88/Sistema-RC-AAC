import { ConsolidadoDashboardClient } from "@/components/consolidado-dashboard";
import { getConsolidadoDashboard } from "@/lib/consolidado";

export default async function Home() {
  const dashboard = await getConsolidadoDashboard();

  return <ConsolidadoDashboardClient data={dashboard} />;
}
