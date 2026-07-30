import { getSafeInternalPath } from "@/app/utils/safe-navigation";

describe("getSafeInternalPath", () => {
  it("accepts internal application paths", () => {
    expect(getSafeInternalPath("/approval?id=10#detail")).toBe(
      "/approval?id=10#detail",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "javascript:alert(1)",
    "",
  ])("rejects unsafe navigation value %s", (value) => {
    expect(getSafeInternalPath(value)).toBeNull();
  });
});
