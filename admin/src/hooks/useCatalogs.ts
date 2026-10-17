import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api";
import type { AppItem, PlanItem } from "../types";

export function useCatalogs() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [appData, planData] = await Promise.all([
        apiRequest<{ items: AppItem[] }>("/api/admin/apps"),
        apiRequest<{ items: PlanItem[] }>("/api/admin/plans")
      ]);
      setApps(appData.items);
      setPlans(planData.items);
    } catch {
      // 目录加载失败时保持空目录继续渲染，避免产生未处理的 Promise 拒绝
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { apps, plans };
}
