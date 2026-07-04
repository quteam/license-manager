import {
  AppstoreOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  KeyOutlined
} from "@ant-design/icons";
import { Line, Pie, type LineConfig, type PieConfig } from "@ant-design/charts";
import { App as AntApp, Card, Empty, Skeleton, Space, Statistic, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api";
import { formatAppPlatform } from "../shared/appPlatform";
import { CODE_DERIVED_STATUS, CODE_STATUS, getCodeListStatusValueEnum } from "../shared/constants";
import { useI18n } from "../i18n";
import type { DashboardStats } from "../types";

const STATUS_COLORS: Record<string, string> = {
  [CODE_STATUS.UNUSED]: "#1677ff",
  [CODE_STATUS.ACTIVE]: "#52c41a",
  [CODE_DERIVED_STATUS.DISABLED]: "#fa8c16",
  [CODE_DERIVED_STATUS.EXPIRED]: "#ff4d4f",
  [CODE_STATUS.DELETED]: "#8c8c8c"
};

const PLAN_COLORS = ["#13c2c2", "#1677ff", "#722ed1", "#faad14", "#eb2f96", "#52c41a", "#fa541c", "#2f54eb"];
const PIE_LABEL_TRANSFORM = [{ type: "overlapDodgeY" }, { type: "exceedAdjust" }];

type KpiCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  extra?: ReactNode;
};

export function DashboardPage() {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<DashboardStats>("/api/admin/dashboard");
      setStats(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("common.loadingFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const activationRate = useMemo(() => {
    if (!stats?.overview.codes_total) {
      return 0;
    }
    return Math.round((stats.overview.codes_active / stats.overview.codes_total) * 100);
  }, [stats]);

  return (
    <Space orientation="vertical" size={16} className="w-full">
      {loading && !stats ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title={t("dashboard.appsTotal")} value={stats.overview.apps_total} icon={<AppstoreOutlined />} extra={t("dashboard.appsActive", { count: stats.overview.apps_active })} />
            <KpiCard title={t("dashboard.codesTotal")} value={stats.overview.codes_total} icon={<KeyOutlined />} extra={t("dashboard.activationRate", { rate: activationRate })} />
            <KpiCard title={t("dashboard.logsToday")} value={stats.overview.logs_today} icon={<BarChartOutlined />} extra={t("dashboard.logsTodayExtra")} />
            <KpiCard title={t("dashboard.clientFailuresToday")} value={stats.overview.client_failures_today} icon={<CloseCircleOutlined />} extra={t("dashboard.clientFailuresTodayExtra")} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
            <Card title={t("dashboard.statusDistribution")} variant="borderless">
              <StatusDistribution items={stats.code_status} total={stats.overview.codes_total} />
            </Card>
            <Card title={t("dashboard.logTrend")} variant="borderless">
              <TrendChart items={stats.log_trend} />
            </Card>
          </div>

          <Card title={t("dashboard.codeTrend")} variant="borderless">
            <CodeTrendChart items={stats.code_trend} />
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
            <Card title={t("dashboard.appRanking")} variant="borderless">
              <AppRanking items={stats.app_code_ranking} />
            </Card>
            <Card title={t("dashboard.planDistribution")} variant="borderless">
              <PlanDistribution items={stats.plan_distribution} />
            </Card>
          </div>
        </>
      ) : (
        <Card variant="borderless">
          <Empty />
        </Card>
      )}
    </Space>
  );
}

function KpiCard({ title, value, icon, extra }: KpiCardProps) {
  return (
    <Card variant="borderless">
      <div className="flex items-start justify-between gap-3">
        <Statistic title={title} value={value} />
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#f5f5f5] text-lg text-[#1677ff]">{icon}</div>
      </div>
      {extra && <Typography.Text type="secondary">{extra}</Typography.Text>}
    </Card>
  );
}

function StatusDistribution({ items, total }: { items: DashboardStats["code_status"]; total: number }) {
  const { t } = useI18n();
  if (total === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  const statusValueEnum = getCodeListStatusValueEnum(t);
  const data = items
    .filter((item) => item.count > 0)
    .map((item) => ({
      key: item.status,
      label: statusValueEnum[item.status]?.text ?? item.status,
      count: item.count,
      color: STATUS_COLORS[item.status] ?? "#1677ff"
    }));

  const config: PieConfig = {
    data,
    angleField: "count",
    colorField: "label",
    innerRadius: 0.56,
    height: 260,
    scale: {
      color: {
        range: data.map((item) => item.color)
      }
    },
    label: {
      position: "outside",
      text: (item: (typeof data)[number]) => `${item.label} ${Math.round((item.count / total) * 100)}%`,
      connector: true,
      style: {
        fontWeight: 500
      }
    },
    labelTransform: PIE_LABEL_TRANSFORM,
    tooltip: {
      title: "label",
      items: [{ field: "count", name: t("common.dateCount") }]
    }
  } as PieConfig;

  return (
    <div className="h-72">
      <Pie {...config} />
    </div>
  );
}

function TrendChart({ items }: { items: DashboardStats["log_trend"] }) {
  const { t } = useI18n();
  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const data = items.flatMap((item) => [
    { date: dayjs(item.date).format("MM-DD"), type: t("common.success"), count: item.success },
    { date: dayjs(item.date).format("MM-DD"), type: t("common.failure"), count: item.failure }
  ]);

  const config: LineConfig = {
    data,
    xField: "date",
    yField: "count",
    colorField: "type",
    height: 260,
    scale: {
      color: {
        domain: [t("common.success"), t("common.failure")],
        range: ["#52c41a", "#ff4d4f"]
      }
    },
    point: {
      sizeField: 3,
      shapeField: "circle"
    },
    axis: {
      y: {
        labelFormatter: (value: number) => `${value}`
      }
    },
    tooltip: {
      title: "date",
      items: [{ field: "count", name: t("common.times") }]
    },
    legend: {
      color: {
        position: "top"
      }
    }
  } as LineConfig;

  return (
    <div className="h-72">
      <Line {...config} />
    </div>
  );
}

function CodeTrendChart({ items }: { items: DashboardStats["code_trend"] }) {
  const { t } = useI18n();
  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const data = items.flatMap((item) => [
    { date: dayjs(item.date).format("MM-DD"), type: t("dashboard.activated"), count: item.activated },
    { date: dayjs(item.date).format("MM-DD"), type: t("dashboard.expired"), count: item.expired },
    { date: dayjs(item.date).format("MM-DD"), type: t("dashboard.inUse"), count: item.active }
  ]);

  const config: LineConfig = {
    data,
    xField: "date",
    yField: "count",
    colorField: "type",
    height: 260,
    scale: {
      color: {
        domain: [t("dashboard.activated"), t("dashboard.expired"), t("dashboard.inUse")],
        range: ["#1677ff", "#ff4d4f", "#52c41a"]
      }
    },
    point: {
      sizeField: 3,
      shapeField: "circle"
    },
    axis: {
      y: {
        labelFormatter: (value: number) => `${value}`
      }
    },
    tooltip: {
      title: "date",
      items: [{ field: "count", name: t("common.dateCount") }]
    },
    legend: {
      color: {
        position: "top"
      }
    }
  } as LineConfig;

  return (
    <div className="h-72">
      <Line {...config} />
    </div>
  );
}

function AppRanking({ items }: { items: DashboardStats["app_code_ranking"] }) {
  const { t } = useI18n();
  const visibleItems = items.filter((item) => item.total > 0);
  const maxTotal = Math.max(1, ...visibleItems.map((item) => item.total));
  if (visibleItems.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return (
    <Space orientation="vertical" size={14} className="w-full">
      {visibleItems.map((item) => (
        <div key={item.app_id} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Typography.Text strong className="block truncate">
                {item.app_name}
              </Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                {formatAppPlatform(item.platform, t)}
              </Typography.Text>
            </div>
            <Typography.Text className="tabular-nums">{item.total}</Typography.Text>
          </div>
          <StackedBar item={item} maxTotal={maxTotal} />
        </div>
      ))}
    </Space>
  );
}

function StackedBar({ item, maxTotal }: { item: DashboardStats["app_code_ranking"][number]; maxTotal: number }) {
  const width = Math.max((item.total / maxTotal) * 100, 4);
  const segments = [
    { key: "active", value: item.active, color: STATUS_COLORS[CODE_STATUS.ACTIVE] },
    { key: "unused", value: item.unused, color: STATUS_COLORS[CODE_STATUS.UNUSED] },
    { key: "disabled", value: item.disabled, color: STATUS_COLORS[CODE_DERIVED_STATUS.DISABLED] },
    { key: "expired", value: item.expired, color: STATUS_COLORS[CODE_DERIVED_STATUS.EXPIRED] },
    { key: "deleted", value: item.deleted, color: STATUS_COLORS[CODE_STATUS.DELETED] }
  ];
  return (
    <div className="h-2.5 rounded bg-[#f0f0f0]">
      <div className="flex h-2.5 overflow-hidden rounded" style={{ width: `${width}%` }}>
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.key}
              style={{ width: `${(segment.value / item.total) * 100}%`, backgroundColor: segment.color }}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

function PlanDistribution({ items }: { items: DashboardStats["plan_distribution"] }) {
  const { t } = useI18n();
  const visibleItems = items.filter((item) => item.count > 0);
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  const data = visibleItems.map((item, index) => ({
    key: item.plan_code,
    label: item.plan_name,
    count: item.count,
    color: PLAN_COLORS[index % PLAN_COLORS.length]
  }));

  const config: PieConfig = {
    data,
    angleField: "count",
    colorField: "label",
    innerRadius: 0.56,
    height: 260,
    scale: {
      color: {
        range: data.map((item) => item.color)
      }
    },
    label: {
      position: "outside",
      text: (item: (typeof data)[number]) => `${item.label} ${Math.round((item.count / total) * 100)}%`,
      connector: true,
      style: {
        fontWeight: 500
      }
    },
    labelTransform: PIE_LABEL_TRANSFORM,
    tooltip: {
      title: "label",
      items: [{ field: "count", name: t("common.dateCount") }]
    }
  } as PieConfig;

  return (
    <div className="h-72">
      <Pie {...config} />
    </div>
  );
}
