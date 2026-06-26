import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api";
import type { AppItem, PlanItem } from "../types";

export function useCatalogs() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);

  const load = useCallback(async () => {
    const [appData, planData] = await Promise.all([
      apiRequest<{ items: AppItem[] }>("/api/admin/apps"),
      apiRequest<{ items: PlanItem[] }>("/api/admin/plans")
    ]);
    setApps(appData.items);
    setPlans(planData.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { apps, plans };
}
