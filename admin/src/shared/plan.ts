import type { CodeItem, PlanItem } from "../types";

type PlanLike = Pick<PlanItem, "code" | "name" | "duration_days"> | Pick<CodeItem, "plan_code" | "plan_name" | "duration_days">;
type Translate = (key: string, values?: Record<string, string | number>) => string;

export function formatPlanDuration(plan: PlanLike, t?: Translate): string {
  const code = "code" in plan ? plan.code : plan.plan_code;

  switch (code) {
    case "monthly":
      return t ? t("planDuration.monthly") : "激活后 1 个自然月";
    case "quarterly":
      return t ? t("planDuration.quarterly") : "激活后 3 个自然月";
    case "yearly":
      return t ? t("planDuration.yearly") : "激活后 1 个自然年";
    default:
      return t ? t("planDuration.days", { days: plan.duration_days }) : `激活后 ${plan.duration_days} 天`;
  }
}

export function formatPlanLabel(plan: PlanLike, t?: Translate): string {
  const name = "name" in plan ? plan.name : plan.plan_name;
  return `${name} (${formatPlanDuration(plan, t)})`;
}
