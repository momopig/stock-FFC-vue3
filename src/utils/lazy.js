export const lazy = (loader) => () =>
  loader().catch((err) => {
    const msg = String(err?.message || '');
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('mime type') // 兼容不同浏览器文案
    ) {
      // 可选：记录原因
      sessionStorage.setItem('__reload_cause__', 'stale-chunk');
      location.reload(); // 强制刷新获取新的 index.html + manifest
      return; // 防止再抛出
    }
    throw err;
  });
