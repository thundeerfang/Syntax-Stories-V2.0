import type { ReactNode } from "react";
import {
  LEGAL_MAIN_BODY_PAD,
  LEGAL_MIN_BELOW_HEADER,
  LEGAL_RETRO_CARD,
} from "./legalUi";
import { LegalPolicyHeaderProvider } from "./LegalPolicyHeaderContext";
import { LegalPolicyPageHeader } from "./LegalPolicyPageHeader";
import {
  LegalTableOfContentsMobile,
  LegalTableOfContentsSidebar,
} from "./LegalTableOfContents";
type LegalPagesLayoutProps = {
  children: ReactNode;
};
export function LegalPagesLayout({ children }: LegalPagesLayoutProps) {
  return (
    <LegalPolicyHeaderProvider>
      <div className={`flex w-full flex-col ${LEGAL_MIN_BELOW_HEADER}`}>
        <div
          className={`mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 py-4 sm:py-6 lg:gap-5 ${LEGAL_MIN_BELOW_HEADER}`}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-5">
            <aside
              className={`hidden min-h-0 min-w-0 overflow-hidden lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col ${LEGAL_RETRO_CARD}`}
            >
              <LegalTableOfContentsSidebar />
            </aside>

            <div className="min-h-0 min-w-0 shrink-0 lg:col-start-2 lg:row-start-1">
              <LegalPolicyPageHeader />
            </div>

            <div
              className={`min-h-0 min-w-0 max-h-[min(40vh,22rem)] overflow-hidden lg:hidden ${LEGAL_RETRO_CARD}`}
            >
              <LegalTableOfContentsMobile />
            </div>

            <main
              className={`min-h-0 min-w-0 overflow-hidden lg:col-start-2 lg:row-start-2 ${LEGAL_RETRO_CARD}`}
            >
              <div
                className={`max-h-full overflow-y-auto ${LEGAL_MAIN_BODY_PAD}`}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </LegalPolicyHeaderProvider>
  );
}
