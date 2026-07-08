import { createContext, type ReactNode, useContext } from "react";

type PageTitleExtraSetter = (extra: ReactNode | null) => void;

const PageTitleExtraContext = createContext<PageTitleExtraSetter | null>(null);

export const PageTitleExtraProvider = PageTitleExtraContext.Provider;

export function usePageTitleExtra() {
  return useContext(PageTitleExtraContext);
}
