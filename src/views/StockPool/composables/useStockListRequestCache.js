/**
 * 列表请求参数：与接口入参一致（去掉空值），便于缓存键比较
 */
export function buildStockListRequestParams(
  page,
  searchParams,
  additionalSearchParams = {},
  fixedFields = {}
) {
  const params = {
    page: page.pageNo,
    page_size: page.pageSize,
    ...searchParams,
    ...additionalSearchParams,
    ...fixedFields,
  };
  Object.keys(params).forEach((key) => {
    if (
      params[key] === '' ||
      params[key] === null ||
      params[key] === undefined
    ) {
      delete params[key];
    }
  });
  return params;
}

export function listRequestParamsEqual(a, b) {
  if (!a || !b) return false;
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

/**
 * 按业务主键（分组 id / 策略名等）缓存列表；切回相同主键且请求参数一致时跳过请求
 */
export function useStockListRequestCache() {
  const cache = new Map();

  const invalidate = (keys) => {
    if (keys == null) {
      cache.clear();
      return;
    }
    const ids = Array.isArray(keys) ? keys : [keys];
    ids?.forEach?.((id) => {
      if (id != null && id !== '') cache.delete(String(id));
    });
  };

  const readHit = (cacheKey, params) => {
    const cached = cache.get(String(cacheKey));
    if (cached && listRequestParamsEqual(cached.params, params)) {
      return {
        items: cached.items?.map((row) => ({ ...row })) || [],
        total: cached.total ?? 0,
      };
    }
    return null;
  };

  const write = (cacheKey, params, rows, total) => {
    cache.set(String(cacheKey), {
      params: { ...params },
      items: rows.map((row) => ({ ...row })),
      total,
    });
  };

  return { invalidate, readHit, write };
}
