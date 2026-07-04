import type { AppItem } from "../types";
import { APP_PLATFORM_OPTIONS } from "./constants";

export const appPlatformOptions = [...APP_PLATFORM_OPTIONS];

type Translate = (key: string) => string;

const platformTranslationKeys: Record<string, string> = {
  mobile: "platform.mobile",
  desktop: "platform.desktop",
  web: "platform.web",
  wechat_mini_program: "platform.wechatMiniProgram",
  plugin: "platform.plugin",
  browser_extension: "platform.browserExtension",
  server: "platform.server",
  cli: "platform.cli"
};

export function getAppPlatformOptions(t: Translate) {
  return appPlatformOptions.map((option) => ({
    ...option,
    label: platformTranslationKeys[option.value] ? t(platformTranslationKeys[option.value]) : option.label
  }));
}

export function formatAppPlatform(platform: string, t?: Translate) {
  if (!t) {
    return appPlatformOptions.find((option) => option.value === platform)?.label ?? platform;
  }
  const key = platformTranslationKeys[platform];
  return key ? t(key) : appPlatformOptions.find((option) => option.value === platform)?.label ?? platform;
}

export function formatAppOptionLabel(app: Pick<AppItem, "name" | "platform">, t?: Translate) {
  return `${app.name} / ${formatAppPlatform(app.platform, t)}`;
}
