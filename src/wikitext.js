export const GROUP_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function groupPageUrl(groupKey) {
  return `https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_Group_${groupKey}&action=raw`;
}

export function knockoutPageUrl() {
  return "https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_knockout_stage&action=raw";
}

export function finalPageUrl() {
  return "https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_final&action=raw";
}

export async function fetchWikitext(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": "fifa2026calendar-larkcli/0.1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function fetchTournamentPages() {
  const pages = await Promise.all(
    [
      ...GROUP_KEYS.map((groupKey) => ({ key: `group-${groupKey}`, url: groupPageUrl(groupKey) })),
      { key: "knockout", url: knockoutPageUrl() },
      { key: "final", url: finalPageUrl() }
    ].map(async ({ key, url }) => ({ key, url, text: await fetchWikitext(url) }))
  );

  return Object.fromEntries(pages.map((page) => [page.key, page]));
}
