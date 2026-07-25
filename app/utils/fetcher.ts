export async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    throw new Error(`failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
