import type { CodeItem, PlanItem } from "../types";

type PlanLike = Pick<PlanItem, "code" | "name" | "duration_days"> | Pick<CodeItem, "plan_code" | "plan_name" | "duration_days">;

export function formatPlanDuration(plan: PlanLike): string {
  const code = "code" in plan ? plan.code : plan.plan_code;

  switch (code) {
    case "monthly":
      return "激活后 1 个自然月";
    case "quarterly":
      return "激活后 3 个自然月";
    case "yearly":
      return "激活后 1 个自然年";
    default:
      return `激活后 ${plan.duration_days} 天`;
  }
}

export function formatPlanLabel(plan: PlanLike): string {
  const name = "name" in plan ? plan.name : plan.plan_name;
  return `${name} (${formatPlanDuration(plan)})`;
}
