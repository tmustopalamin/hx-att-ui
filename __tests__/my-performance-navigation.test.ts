import { getSafeInternalPath } from "@/app/utils/safe-navigation";
import { routeTranslationKeys } from "@/app/i18n/routes";
import en from "@/app/i18n/messages/en";
import id from "@/app/i18n/messages/id";
import zhCN from "@/app/i18n/messages/zh-CN";

describe("My Performance navigation and localization", () => {
  it("allows safe internal path navigation to /my-performance", () => {
    expect(getSafeInternalPath("/my-performance")).toBe("/my-performance");
  });

  it("registers my-performance in route dictionary", () => {
    expect(routeTranslationKeys["my-performance"]).toBe("nav.myPerformance");
  });

  it("provides translations across all supported languages", () => {
    expect((en as Record<string, string>)["nav.myPerformance"]).toBe(
      "My Performance",
    );
    expect((id as Record<string, string>)["nav.myPerformance"]).toBe(
      "Kinerja Saya",
    );
    expect((zhCN as Record<string, string>)["nav.myPerformance"]).toBe(
      "我的绩效",
    );
  });
});
