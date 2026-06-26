import type { AppItem } from "../types";
import { APP_PLATFORM_OPTIONS } from "./constants";

export const appPlatformOptions = [...APP_PLATFORM_OPTIONS];

export function formatAppPlatform(platform: string) {
  return appPlatformOptions.find((option) => option.value === platform)?.label ?? platform;
}

export function formatAppOptionLabel(app: Pick<AppItem, "name" | "platform">) {
  return `${app.name} / ${formatAppPlatform(app.platform)}`;
}
