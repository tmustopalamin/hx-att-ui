import {
  containsIdentifierWhitespace,
  isWhitespaceFreeIdentifier,
} from "./identifier-validation";

describe("identifier validation", () => {
  it.each([
    "HEXING KRW",
    "XXX XXX",
    "SS SS SSSSSS",
    " ABC",
    "ABC ",
    "A\tB",
    "A\nB",
    "A\u00a0B",
    "A\u0085B",
  ])("rejects whitespace in %j", (value) => {
    expect(containsIdentifierWhitespace(value)).toBe(true);
    expect(isWhitespaceFreeIdentifier(value)).toBe(false);
  });

  it.each(["HEXING_KRW", "XXX_XXX", "SS_SS_SSSSSS", "A-B", "A.B", ""])(
    "accepts non-whitespace identifier %j",
    (value) => {
      expect(containsIdentifierWhitespace(value)).toBe(false);
      expect(isWhitespaceFreeIdentifier(value)).toBe(true);
    },
  );
});
