import type { Page } from "@playwright/test";
/** Capture the actual live browser frame; foreground mode is required on this Mac. */
export async function capturePage(
  page: Page,
  options: Parameters<Page["screenshot"]>[0],
) {
  return page.screenshot({ ...options, animations: "allow", timeout: 15000 });
}
