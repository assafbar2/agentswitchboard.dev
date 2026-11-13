// The whole catalog for specs that pick listings from it. /agents.json is an
// index; the listings are in the pages it links. A deployment from before the
// split still has them in /agents.json itself, so both shapes load.
export async function loadCatalog(base, headers) {
  const get = async (url) => {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  };
  const index = await get(`${base}/agents.json`);
  if (Array.isArray(index.agents)) return { index, total: index.total, agents: index.agents };
  const agents = [];
  for (const url of index.pages) {
    const { pathname } = new URL(url);
    agents.push(...(await get(`${base}${pathname}`)).agents);
  }
  return { index, total: index.total, agents };
}
