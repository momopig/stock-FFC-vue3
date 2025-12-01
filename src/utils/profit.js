import { getLocal } from '@/utils/storage';
/**
 * 利润计算工具函数
 * 用于计算利润、成本利润率、售价利润率
 */

/**
 * 将可能的字符串/空值价格规范为数字
 * @param {*} value
 * @returns
 */
export const normalizePrice = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

/**
 * 计算利润（元）
 * @param {number} salesPrice 销售价格
 * @param {number} supplyPrice 成本价格（成本价）
 * @param {number} adFee 广告费，可选，默认为0
 * @returns {number} 利润金额
 */
export const calculateProfit = (salesPrice, supplyPrice, adFee = 0) => {
  if ((!salesPrice && salesPrice !== 0) || (!supplyPrice && supplyPrice !== 0)) {
    return undefined;
  }
  salesPrice = normalizePrice(salesPrice);
  supplyPrice = normalizePrice(supplyPrice);
  adFee = normalizePrice(adFee) || 0;
  if (!salesPrice || !supplyPrice || salesPrice <= 0 || supplyPrice <= 0) {
    return 0;
  }
  return salesPrice - supplyPrice - adFee;
};

/**
 * 计算成本利润率（以成本价为分母）
 * @param {number} salesPrice 销售价格
 * @param {number} supplyPrice 成本价格（成本价）
 * @param {number} adFee 广告费，可选，默认为0
 * @returns {number} 成本利润率（百分比，不带%符号）
 */
export const calculateCostProfitRate = (salesPrice, supplyPrice, adFee = 0) => {
  if ((!salesPrice && salesPrice !== 0) || (!supplyPrice && supplyPrice !== 0)) {
    return undefined;
  }
  salesPrice = normalizePrice(salesPrice);
  supplyPrice = normalizePrice(supplyPrice);
  adFee = normalizePrice(adFee) || 0;
  if (!salesPrice || !supplyPrice || salesPrice <= 0 || supplyPrice <= 0) {
    return 0;
  }
  const profit = calculateProfit(salesPrice, supplyPrice, adFee);
  return (profit / supplyPrice) * 100;
};

/**
 * 计算售价利润率（以销售价为分母）
 * @param {number} salesPrice 销售价格
 * @param {number} supplyPrice 成本价格（成本价）
 * @param {number} adFee 广告费，可选，默认为0
 * @returns {number} 售价利润率（百分比，不带%符号）
 */
export const calculateSalesProfitRate = (salesPrice, supplyPrice, adFee = 0) => {
  if ((!salesPrice && salesPrice !== 0) || (!supplyPrice && supplyPrice !== 0)) {
    return undefined;
  }
  salesPrice = normalizePrice(salesPrice);
  supplyPrice = normalizePrice(supplyPrice);
  adFee = normalizePrice(adFee) || 0;
  if (!salesPrice || !supplyPrice || salesPrice <= 0 || supplyPrice <= 0) {
    return 0;
  }
  const profit = calculateProfit(salesPrice, supplyPrice, adFee);
  return (profit / salesPrice) * 100;
};

/**
 * 格式化利润显示（保留2位小数）
 * @param {number} value 数值
 * @returns {string} 格式化后的字符串
 */
export const formatProfit = (value) => {
  if (value !== 0 && !value) return '--';
  return parseFloat(value).toFixed(2);
};

/**
 * 格式化利润率显示（保留2位小数 + %符号）
 * @param {number} rate 利润率
 * @returns {string} 格式化后的字符串
 */
export const formatProfitRate = (rate) => {
  if (rate !== 0 && !rate) return '--';
  return `${parseFloat(rate).toFixed(2)}%`;
};

/**
 * 验证价格输入是否有效
 * @param {number} price 价格
 * @returns {boolean} 是否有效
 */
export const isValidPrice = (price) => {
  price = normalizePrice(price);
  return price !== null && price !== undefined && !isNaN(price) && Number(price) > 0;
};

/**
 * 批量计算利润信息
 * @param {number} salesPrice 销售价格
 * @param {number} supplyPrice 成本价格（成本价）
 * @param {number} adFee 广告费，可选，默认为0
 * @returns {object} 包含所有利润信息的对象
 */
export const calculateAllProfitInfo = (salesPrice, supplyPrice, adFee = 0) => {
  salesPrice = normalizePrice(salesPrice);
  supplyPrice = normalizePrice(supplyPrice);
  adFee = normalizePrice(adFee) || 0;
  return {
    profit: calculateProfit(salesPrice, supplyPrice, adFee),
    costProfitRate: calculateCostProfitRate(salesPrice, supplyPrice, adFee),
    salesProfitRate: calculateSalesProfitRate(salesPrice, supplyPrice, adFee),
    adFee: adFee, // 广告费
    formattedProfit: formatProfit(calculateProfit(salesPrice, supplyPrice, adFee)),
    formattedCostProfitRate: formatProfitRate(calculateCostProfitRate(salesPrice, supplyPrice, adFee)),
    formattedSalesProfitRate: formatProfitRate(calculateSalesProfitRate(salesPrice, supplyPrice, adFee))
  };
};

/**
 * 货币符号
 * @param {string} currency 货币代码
 * @returns {string} 货币符号
 */
export const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'CNY': return '¥';
    default: return currency || '';
  }
};

/**
 * 将美元欧元转换为人民币，带货币符号
 * @param {number} amount 金额
 * @param {string} currency 货币代码
 * @returns {string} 转换后的金额带货币符号
 * 示例：$100（¥700）
 * 示例：€100（¥700）
 * 示例：¥100
 */
export const convertToCny = (amount, currency) => {
  const usdToCnyRate = getLocal('usdToCnyRate');
  const eurToCnyRate = getLocal('eurToCnyRate');
  switch (currency) {
    case 'USD':
      return `$${amount}（¥${parseFloat(amount * usdToCnyRate).toFixed(2)}）`;
    case 'EUR':
      return `€${amount}（¥${parseFloat(amount * eurToCnyRate).toFixed(2)}）`;
    default:
      return `¥${parseFloat(amount).toFixed(2)}`;
  }
};

/**
 * 将美元欧元转换为人民币，不带货币符号
 * @param {number} amount 金额
 * @param {string} currency 货币代码
 * @returns {number} 转换后的金额不带货币符号
 */
export const convertToCnyWithoutSymbol = (amount, currency) => {
  const usdToCnyRate = getLocal('usdToCnyRate');
  const eurToCnyRate = getLocal('eurToCnyRate');
  switch (currency) {
    case 'USD':
      return parseFloat(amount * usdToCnyRate).toFixed(2);
    case 'EUR':
      return parseFloat(amount * eurToCnyRate).toFixed(2);
    default:
      return parseFloat(amount).toFixed(2);
  }
};
