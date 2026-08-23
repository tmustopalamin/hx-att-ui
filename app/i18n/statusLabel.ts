/** Format API status values for the UI without changing the value sent back. */
export const formatStatusLabel = (status?: string | null) => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (!normalized) return "Unknown";

  return normalized
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};
