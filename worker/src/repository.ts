import { CODE_DERIVED_STATUS, CODE_STATUS } from "./constants";
import {
  AppRow,
  AppStatus,
  CodeDetailRow,
  CodeListStatus,
  CodeStatus,
  DashboardStats,
  LogAction,
  LogResult,
  PlanRow
} from "./types";

type SqlValue = string | number | null;

export type CodeListFilters = {
  query?: string;
  appId?: string;
  planCode?: string;
  status?: CodeListStatus;
  page: number;
  pageSize: number;
};

export type LogListFilters = {
  query?: string;
  appId?: string;
  action?: string;
  page: number;
  pageSize: number;
};

export type ActivationCodeInsertInput = {
  batchId: number;
  appDbId: number;
  planId: number;
  codeHash: string;
  codeSuffix: string;
  createdBy: number;
};

export class Repository {
  constructor(private readonly db: D1Database) {}

  async getPlans(): Promise<PlanRow[]> {
    const result = await this.db
      .prepare("SELECT id, code, name, duration_days, sort_order, created_at FROM plans ORDER BY sort_order ASC")
      .all<PlanRow>();
    return result.results ?? [];
  }

  async getPlanByCode(code: string): Promise<PlanRow | null> {
    return await this.db
      .prepare("SELECT id, code, name, duration_days, sort_order, created_at FROM plans WHERE code = ?")
      .bind(code)
      .first<PlanRow>();
  }

  async listApps(): Promise<Array<Omit<AppRow, "app_secret_hash">>> {
    const result = await this.db
      .prepare(
        "SELECT id, app_id, name, description, platform, status, created_at, updated_at FROM apps ORDER BY created_at DESC"
      )
      .all<Omit<AppRow, "app_secret_hash">>();
    return result.results ?? [];
  }

  async createApp(input: {
    appId: string;
    name: string;
    description?: string;
    platform: string;
    status: AppStatus;
    appSecretHash: string;
  }): Promise<AppRow> {
    await this.db
      .prepare(
        `INSERT INTO apps (app_id, name, description, platform, status, app_secret_hash, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.appId,
        input.name,
        input.description ?? null,
        input.platform,
        input.status,
        input.appSecretHash,
        new Date().toISOString()
      )
      .run();
    const app = await this.getAppByPublicId(input.appId);
    if (!app) {
      throw new Error("Failed to create app");
    }
    return app;
  }

  async updateAppStatus(appId: string, status: AppStatus): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE apps SET status = ?, updated_at = ? WHERE app_id = ?")
      .bind(status, new Date().toISOString(), appId)
      .run();
    return result.meta.changes === 1;
  }

  async updateApp(input: { appId: string; name: string; description?: string; platform: string }): Promise<AppRow | null> {
    const result = await this.db
      .prepare("UPDATE apps SET name = ?, description = ?, platform = ?, updated_at = ? WHERE app_id = ?")
      .bind(input.name, input.description ?? null, input.platform, new Date().toISOString(), input.appId)
      .run();
    if (result.meta.changes !== 1) {
      return null;
    }
    return await this.getAppByPublicId(input.appId);
  }

  async updateAppSecretHash(appId: string, appSecretHash: string): Promise<AppRow | null> {
    const result = await this.db
      .prepare("UPDATE apps SET app_secret_hash = ?, updated_at = ? WHERE app_id = ?")
      .bind(appSecretHash, new Date().toISOString(), appId)
      .run();
    if (result.meta.changes !== 1) {
      return null;
    }
    return await this.getAppByPublicId(appId);
  }

  async deleteAppIfUnreferenced(appDbId: number): Promise<boolean> {
    const result = await this.db
      .prepare(
        `DELETE FROM apps
         WHERE id = ?
           AND NOT EXISTS (SELECT 1 FROM activation_batches WHERE app_id = ?)
           AND NOT EXISTS (SELECT 1 FROM activation_codes WHERE app_id = ?)
           AND NOT EXISTS (SELECT 1 FROM activation_logs WHERE app_id = ?)`
      )
      .bind(appDbId, appDbId, appDbId, appDbId)
      .run();
    return result.meta.changes === 1;
  }

  async getAppByPublicId(appId: string): Promise<AppRow | null> {
    return await this.db
      .prepare("SELECT id, app_id, name, description, platform, status, app_secret_hash, created_at, updated_at FROM apps WHERE app_id = ?")
      .bind(appId)
      .first<AppRow>();
  }

  async createBatch(input: {
    appDbId: number;
    planId: number;
    quantity: number;
    note?: string;
    createdBy: number;
  }): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO activation_batches (app_id, plan_id, quantity, note, created_by)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(input.appDbId, input.planId, input.quantity, input.note ?? null, input.createdBy)
      .run();
    return Number(result.meta.last_row_id);
  }

  async createActivationCode(input: {
    batchId: number;
    appDbId: number;
    planId: number;
    codeHash: string;
    codeSuffix: string;
    createdBy: number;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO activation_codes
           (batch_id, app_id, plan_id, code_hash, code_suffix, status, activated_at, expires_at, device_hash, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, 'unused', NULL, NULL, NULL, ?, ?)`
      )
      .bind(
        input.batchId,
        input.appDbId,
        input.planId,
        input.codeHash,
        input.codeSuffix,
        input.createdBy,
        new Date().toISOString()
      )
      .run();
  }

  async createActivationCodes(inputs: ActivationCodeInsertInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    const updatedAt = new Date().toISOString();
    const statement = buildActivationCodeInsertStatement(inputs);
    await this.db.prepare(statement.sql).bind(...statement.bindings).run();
  }

  async findCodeByHash(codeHash: string): Promise<CodeDetailRow | null> {
    return await this.db
      .prepare(
        `SELECT
           c.*,
           a.app_id AS app_public_id,
           a.name AS app_name,
           a.platform AS app_platform,
           a.status AS app_status,
           p.code AS plan_code,
           p.name AS plan_name,
           p.duration_days AS duration_days
         FROM activation_codes c
         JOIN apps a ON a.id = c.app_id
         JOIN plans p ON p.id = c.plan_id
         WHERE c.code_hash = ?`
      )
      .bind(codeHash)
      .first<CodeDetailRow>();
  }

  async activateCode(input: {
    codeId: number;
    deviceHash: string;
    activatedAt: string;
    expiresAt: string;
  }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE activation_codes
         SET status = 'active',
             activated_at = ?,
             expires_at = ?,
             device_hash = ?,
             updated_at = ?
         WHERE id = ?
           AND status = 'unused'
           AND disabled_at IS NULL
           AND activated_at IS NULL
           AND expires_at IS NULL
           AND device_hash IS NULL`
      )
      .bind(input.activatedAt, input.expiresAt, input.deviceHash, input.activatedAt, input.codeId)
      .run();
    return result.meta.changes === 1;
  }

  async bindUnboundDevice(input: {
    codeId: number;
    deviceHash: string;
    boundAt: string;
  }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE activation_codes
         SET device_hash = ?,
             updated_at = ?
         WHERE id = ?
           AND status = 'active'
           AND disabled_at IS NULL
           AND device_hash IS NULL`
      )
      .bind(input.deviceHash, input.boundAt, input.codeId)
      .run();
    return result.meta.changes === 1;
  }

  async unbindDevice(input: {
    codeId: number;
    deviceHash: string;
    unboundAt: string;
    maxRebinds: number;
  }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE activation_codes
         SET device_hash = NULL,
             rebind_count = rebind_count + 1,
             last_rebind_at = ?,
             updated_at = ?
         WHERE id = ?
           AND status = 'active'
           AND disabled_at IS NULL
           AND device_hash = ?
           AND rebind_count < ?`
      )
      .bind(input.unboundAt, input.unboundAt, input.codeId, input.deviceHash, input.maxRebinds)
      .run();
    return result.meta.changes === 1;
  }

  async manuallyUnbindDevice(input: { codeId: number; changedAt: string }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE activation_codes
         SET device_hash = NULL,
             updated_at = ?
         WHERE id = ?
           AND status = 'active'
           AND disabled_at IS NULL
           AND device_hash IS NOT NULL
           AND (expires_at IS NULL OR expires_at > ?)`
      )
      .bind(input.changedAt, input.codeId, input.changedAt)
      .run();
    return result.meta.changes === 1;
  }

  async softDeleteCode(codeId: number): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE activation_codes SET status = 'deleted', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), codeId)
      .run();
    return result.meta.changes === 1;
  }

  async updateCodeDisabled(input: { codeId: number; disabled: boolean; changedAt: string }): Promise<boolean> {
    const disabledAt = input.disabled ? input.changedAt : null;
    const result = await this.db
      .prepare("UPDATE activation_codes SET disabled_at = ?, updated_at = ? WHERE id = ? AND status != 'deleted'")
      .bind(disabledAt, input.changedAt, input.codeId)
      .run();
    return result.meta.changes === 1;
  }

  async listCodes(filters: CodeListFilters): Promise<{ items: CodeListItem[]; total: number }> {
    const where: string[] = [];
    const bindings: SqlValue[] = [];

    if (filters.query) {
      where.push("(c.code_suffix LIKE ? OR a.app_id LIKE ? OR a.name LIKE ?)");
      const query = `%${filters.query}%`;
      bindings.push(query, query, query);
    }
    if (filters.appId) {
      where.push("a.app_id = ?");
      bindings.push(filters.appId);
    }
    if (filters.planCode) {
      where.push("p.code = ?");
      bindings.push(filters.planCode);
    }
    if (filters.status === CODE_DERIVED_STATUS.DISABLED) {
      where.push("c.disabled_at IS NOT NULL AND c.status != 'deleted'");
    } else if (filters.status === CODE_DERIVED_STATUS.EXPIRED) {
      where.push("c.status = 'active' AND c.disabled_at IS NULL AND c.expires_at IS NOT NULL AND c.expires_at <= ?");
      bindings.push(new Date().toISOString());
    } else if (filters.status === CODE_STATUS.UNUSED || filters.status === CODE_STATUS.ACTIVE) {
      where.push("c.status = ? AND c.disabled_at IS NULL");
      bindings.push(filters.status);
    } else if (filters.status) {
      where.push("c.status = ?");
      bindings.push(filters.status);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const baseFrom = `
      FROM activation_codes c
      JOIN apps a ON a.id = c.app_id
      JOIN plans p ON p.id = c.plan_id
      LEFT JOIN activation_batches b ON b.id = c.batch_id
      ${whereSql}
    `;
    const offset = (filters.page - 1) * filters.pageSize;
    const [count, result] = await Promise.all([
      this.db
        .prepare(`SELECT COUNT(*) AS total ${baseFrom}`)
        .bind(...bindings)
        .first<{ total: number }>(),
      this.db
        .prepare(
          `SELECT
             c.id,
             c.code_suffix,
             c.status,
             c.disabled_at,
             c.activated_at,
             c.expires_at,
             c.device_hash,
             c.rebind_count,
             c.last_rebind_at,
             c.created_at,
             a.app_id,
             a.name AS app_name,
             a.platform AS app_platform,
             p.code AS plan_code,
             p.name AS plan_name,
             p.duration_days,
             b.id AS batch_id,
             b.note AS batch_note
           ${baseFrom}
           ORDER BY c.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .bind(...bindings, filters.pageSize, offset)
        .all<CodeListItem>()
    ]);
    return {
      items: result.results ?? [],
      total: count?.total ?? 0
    };
  }

  async listLogs(filters: LogListFilters): Promise<{ items: LogListItem[]; total: number }> {
    const where: string[] = [];
    const bindings: SqlValue[] = [];

    if (filters.query) {
      where.push("(c.code_suffix LIKE ? OR l.error_code LIKE ? OR l.message LIKE ?)");
      const query = `%${filters.query}%`;
      bindings.push(query, query, query);
    }
    if (filters.appId) {
      where.push("a.app_id = ?");
      bindings.push(filters.appId);
    }
    if (filters.action) {
      where.push("l.action = ?");
      bindings.push(filters.action);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const baseFrom = `
      FROM activation_logs l
      LEFT JOIN activation_codes c ON c.id = l.code_id
      LEFT JOIN apps a ON a.id = COALESCE(l.app_id, c.app_id)
      ${whereSql}
    `;
    const offset = (filters.page - 1) * filters.pageSize;
    const [count, result] = await Promise.all([
      this.db
        .prepare(`SELECT COUNT(*) AS total ${baseFrom}`)
        .bind(...bindings)
        .first<{ total: number }>(),
      this.db
        .prepare(
          `SELECT
             l.id,
             l.action,
             l.result,
             l.device_hash,
             l.error_code,
             l.message,
             l.created_at,
             c.code_suffix,
             a.app_id,
             a.name AS app_name
           ${baseFrom}
           ORDER BY l.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .bind(...bindings, filters.pageSize, offset)
        .all<LogListItem>()
    ]);
    return {
      items: result.results ?? [],
      total: count?.total ?? 0
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const trendStart = startOfUtcDayOffset(-6);
    const trendDates = buildLastSevenDates();
    const activeTrendStatement = buildDashboardActiveTrendStatement(trendDates);

    const [
      appOverview,
      codeOverview,
      logOverview,
      appRankingResult,
      planDistributionResult,
      trendResult,
      activatedTrendResult,
      expiredTrendResult,
      activeTrendResult
    ] = await Promise.all([
      this.db
        .prepare(
          `SELECT
             COUNT(*) AS apps_total,
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS apps_active
           FROM apps`
        )
        .first<{ apps_total: number; apps_active: number | null }>(),
      this.db
        .prepare(
          `SELECT
             COUNT(*) AS codes_total,
             SUM(CASE WHEN status = 'unused' AND disabled_at IS NULL THEN 1 ELSE 0 END) AS codes_unused,
             SUM(CASE WHEN status = 'active' AND disabled_at IS NULL AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) AS codes_active,
             SUM(CASE WHEN status != 'deleted' AND disabled_at IS NOT NULL THEN 1 ELSE 0 END) AS codes_disabled,
             SUM(CASE WHEN status = 'active' AND disabled_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ? THEN 1 ELSE 0 END) AS codes_expired,
             SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) AS codes_deleted
           FROM activation_codes`
        )
        .bind(now, now)
        .first<{
          codes_total: number;
          codes_unused: number | null;
          codes_active: number | null;
          codes_disabled: number | null;
          codes_expired: number | null;
          codes_deleted: number | null;
        }>(),
      this.db
        .prepare(
          `SELECT
             COUNT(*) AS logs_today,
             SUM(CASE WHEN result = 'failure' AND action IN ('activate', 'verify', 'unbind_device') THEN 1 ELSE 0 END) AS client_failures_today
           FROM activation_logs
           WHERE substr(created_at, 1, 10) = ?`
        )
        .bind(today)
        .first<{ logs_today: number; client_failures_today: number | null }>(),
      this.db
        .prepare(
          `SELECT
             a.app_id,
             a.name AS app_name,
             a.platform,
             COUNT(c.id) AS total,
             SUM(CASE WHEN c.status = 'active' AND c.disabled_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > ?) THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN c.status = 'unused' AND c.disabled_at IS NULL THEN 1 ELSE 0 END) AS unused,
             SUM(CASE WHEN c.status != 'deleted' AND c.disabled_at IS NOT NULL THEN 1 ELSE 0 END) AS disabled,
             SUM(CASE WHEN c.status = 'active' AND c.disabled_at IS NULL AND c.expires_at IS NOT NULL AND c.expires_at <= ? THEN 1 ELSE 0 END) AS expired,
             SUM(CASE WHEN c.status = 'deleted' THEN 1 ELSE 0 END) AS deleted
           FROM apps a
           LEFT JOIN activation_codes c ON c.app_id = a.id
           GROUP BY a.id
           ORDER BY total DESC, a.created_at DESC
           LIMIT 8`
        )
        .bind(now, now)
        .all<DashboardStats["app_code_ranking"][number]>(),
      this.db
        .prepare(
          `SELECT
             p.code AS plan_code,
             p.name AS plan_name,
             COUNT(c.id) AS count
           FROM plans p
           LEFT JOIN activation_codes c ON c.plan_id = p.id
           GROUP BY p.id
           ORDER BY count DESC, p.sort_order ASC`
        )
        .all<DashboardStats["plan_distribution"][number]>(),
      this.db
        .prepare(
          `SELECT
             substr(created_at, 1, 10) AS date,
             SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) AS success,
             SUM(CASE WHEN result = 'failure' THEN 1 ELSE 0 END) AS failure
           FROM activation_logs
           WHERE created_at >= ?
           GROUP BY substr(created_at, 1, 10)
           ORDER BY date ASC`
        )
        .bind(trendStart)
        .all<{ date: string; success: number | null; failure: number | null }>(),
      this.db
        .prepare(
          `SELECT
             substr(activated_at, 1, 10) AS date,
             COUNT(*) AS activated
           FROM activation_codes
           WHERE status != 'deleted'
             AND activated_at IS NOT NULL
             AND activated_at >= ?
           GROUP BY substr(activated_at, 1, 10)
           ORDER BY date ASC`
        )
        .bind(trendStart)
        .all<{ date: string; activated: number }>(),
      this.db
        .prepare(
          `SELECT
             substr(expires_at, 1, 10) AS date,
             COUNT(*) AS expired
           FROM activation_codes
           WHERE status = 'active'
             AND disabled_at IS NULL
             AND expires_at IS NOT NULL
             AND expires_at >= ?
             AND expires_at < ?
           GROUP BY substr(expires_at, 1, 10)
           ORDER BY date ASC`
        )
        .bind(trendStart, nextUtcDate(trendDates[trendDates.length - 1]))
        .all<{ date: string; expired: number }>(),
      this.db
        .prepare(activeTrendStatement.sql)
        .bind(...activeTrendStatement.bindings)
        .all<{ date: string; active: number }>()
    ]);

    const overview = {
      apps_total: appOverview?.apps_total ?? 0,
      apps_active: appOverview?.apps_active ?? 0,
      codes_total: codeOverview?.codes_total ?? 0,
      codes_unused: codeOverview?.codes_unused ?? 0,
      codes_active: codeOverview?.codes_active ?? 0,
      codes_disabled: codeOverview?.codes_disabled ?? 0,
      codes_expired: codeOverview?.codes_expired ?? 0,
      codes_deleted: codeOverview?.codes_deleted ?? 0,
      logs_today: logOverview?.logs_today ?? 0,
      client_failures_today: logOverview?.client_failures_today ?? 0
    };
    const trendByDate = new Map((trendResult.results ?? []).map((item) => [item.date, item]));
    const activatedTrendByDate = new Map((activatedTrendResult.results ?? []).map((item) => [item.date, item.activated]));
    const expiredTrendByDate = new Map((expiredTrendResult.results ?? []).map((item) => [item.date, item.expired]));
    const activeTrendByDate = new Map((activeTrendResult.results ?? []).map((item) => [item.date, item.active]));

    return {
      overview,
      code_status: [
        { status: CODE_STATUS.UNUSED, count: overview.codes_unused },
        { status: CODE_STATUS.ACTIVE, count: overview.codes_active },
        { status: CODE_DERIVED_STATUS.DISABLED, count: overview.codes_disabled },
        { status: CODE_DERIVED_STATUS.EXPIRED, count: overview.codes_expired },
        { status: CODE_STATUS.DELETED, count: overview.codes_deleted }
      ],
      app_code_ranking: normalizeNullableNumbers(appRankingResult.results ?? []),
      plan_distribution: normalizeNullableNumbers(planDistributionResult.results ?? []),
      log_trend: trendDates.map((date) => ({
        date,
        success: trendByDate.get(date)?.success ?? 0,
        failure: trendByDate.get(date)?.failure ?? 0
      })),
      code_trend: trendDates.map((date) => ({
        date,
        activated: activatedTrendByDate.get(date) ?? 0,
        expired: expiredTrendByDate.get(date) ?? 0,
        active: activeTrendByDate.get(date) ?? 0
      }))
    };
  }

  async insertLog(input: {
    codeId?: number;
    appDbId?: number;
    action: LogAction;
    result: LogResult;
    deviceHash?: string;
    errorCode?: string;
    message?: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO activation_logs (code_id, app_id, action, result, device_hash, error_code, message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.codeId ?? null,
        input.appDbId ?? null,
        input.action,
        input.result,
        input.deviceHash ?? null,
        input.errorCode ?? null,
        input.message ?? null
      )
      .run();
  }

  async getAdminByUsername(username: string) {
    return await this.db
      .prepare(
        "SELECT id, username, password_hash, password_salt, created_at, updated_at FROM admin_users WHERE username = ?"
      )
      .bind(username)
      .first<{
        id: number;
        username: string;
        password_hash: string;
        password_salt: string;
        created_at: string;
        updated_at: string;
      }>();
  }

  async getAdminById(id: number) {
    return await this.db
      .prepare("SELECT id, username, created_at, updated_at FROM admin_users WHERE id = ?")
      .bind(id)
      .first<{ id: number; username: string; created_at: string; updated_at: string }>();
  }

  async getAdminCredentialsById(id: number) {
    return await this.db
      .prepare(
        "SELECT id, username, password_hash, password_salt, created_at, updated_at FROM admin_users WHERE id = ?"
      )
      .bind(id)
      .first<{
        id: number;
        username: string;
        password_hash: string;
        password_salt: string;
        created_at: string;
        updated_at: string;
      }>();
  }

  async createAdmin(input: { username: string; passwordHash: string; passwordSalt: string }) {
    await this.db
      .prepare(
        `INSERT INTO admin_users (username, password_hash, password_salt, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(input.username, input.passwordHash, input.passwordSalt, new Date().toISOString())
      .run();
  }

  async updateAdminPassword(input: { adminId: number; passwordHash: string; passwordSalt: string }): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE admin_users
         SET password_hash = ?,
             password_salt = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(input.passwordHash, input.passwordSalt, new Date().toISOString(), input.adminId)
      .run();
    return result.meta.changes === 1;
  }
}

export type CodeListItem = {
  id: number;
  code_suffix: string;
  status: CodeStatus;
  disabled_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  device_hash: string | null;
  rebind_count: number;
  last_rebind_at: string | null;
  created_at: string;
  app_id: string;
  app_name: string;
  app_platform: string;
  plan_code: string;
  plan_name: string;
  duration_days: number;
  batch_id: number | null;
  batch_note: string | null;
};

export type LogListItem = {
  id: number;
  action: LogAction;
  result: LogResult;
  device_hash: string | null;
  error_code: string | null;
  message: string | null;
  created_at: string;
  code_suffix: string | null;
  app_id: string | null;
  app_name: string | null;
};

function startOfUtcDayOffset(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function buildLastSevenDates(): string[] {
  return Array.from({ length: 7 }, (_, index) => startOfUtcDayOffset(index - 6).slice(0, 10));
}

function nextUtcDate(date: string): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString().slice(0, 10);
}

function normalizeNullableNumbers<T extends Record<string, unknown>>(items: T[]): T[] {
  return items.map((item) => {
    const normalized = { ...item };
    for (const [key, value] of Object.entries(normalized)) {
      if (value === null) {
        normalized[key as keyof T] = 0 as T[keyof T];
      }
    }
    return normalized;
  });
}

export function buildDashboardActiveTrendStatement(dates: string[]): {
  sql: string;
  bindings: SqlValue[];
} {
  const dateRows = dates.map(() => "(?, ?)").join(", ");
  return {
    sql: `WITH trend_dates(date, next_date) AS (VALUES ${dateRows})
      SELECT
        d.date,
        COUNT(c.id) AS active
      FROM trend_dates d
      LEFT JOIN activation_codes c
        ON c.status = 'active'
       AND c.disabled_at IS NULL
       AND c.activated_at IS NOT NULL
       AND c.activated_at < d.next_date
       AND (c.expires_at IS NULL OR c.expires_at >= d.next_date)
      GROUP BY d.date
      ORDER BY d.date ASC`,
    bindings: dates.flatMap((date) => [date, nextUtcDate(date)])
  };
}

export function buildActivationCodeInsertStatement(
  inputs: ActivationCodeInsertInput[],
  updatedAt = new Date().toISOString()
): {
  sql: string;
  bindings: SqlValue[];
} {
  const rows = inputs.map(() => "(?, ?, ?, ?, ?, 'unused', NULL, NULL, NULL, ?, ?)").join(", ");
  return {
    sql: `INSERT INTO activation_codes
       (batch_id, app_id, plan_id, code_hash, code_suffix, status, activated_at, expires_at, device_hash, created_by, updated_at)
     VALUES ${rows}`,
    bindings: inputs.flatMap((input) => [
      input.batchId,
      input.appDbId,
      input.planId,
      input.codeHash,
      input.codeSuffix,
      input.createdBy,
      updatedAt
    ])
  };
}
