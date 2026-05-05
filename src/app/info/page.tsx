import { getConsolidadoDashboard } from "@/lib/consolidado";

import { InfoPublicClient } from "./InfoPublicClient";

export default async function InfoPage() {
  const dashboard = await getConsolidadoDashboard();

  return (
    <InfoPublicClient
      programs={dashboard.programs}
      source={dashboard.source}
      generatedAt={dashboard.generatedAt}
    />
  );
}
