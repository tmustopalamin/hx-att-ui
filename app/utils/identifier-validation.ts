/**
 * Identifier/code values are allowed to contain underscores and other
 * characters permitted by the owning domain, but never whitespace.
 * Keep this check separate from trim/normalization so leading and trailing
 * whitespace are rejected instead of silently accepted.
 */
// JavaScript `\s` omits U+0085 (NEXT LINE), which Rust's
// `char::is_whitespace()` includes in its Unicode whitespace set.
const IDENTIFIER_WHITESPACE = /[\s\u0085]/u;

export const containsIdentifierWhitespace = (
  value: string | null | undefined,
) => typeof value === "string" && IDENTIFIER_WHITESPACE.test(value);

export const isWhitespaceFreeIdentifier = (value: string | null | undefined) =>
  !containsIdentifierWhitespace(value);
