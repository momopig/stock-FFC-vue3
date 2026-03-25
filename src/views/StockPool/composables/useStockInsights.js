import { ref } from 'vue';

function emptyInsights() {
  return {
    totalCount: 0,
    avgDays: 0,
    selfAvgChange: null,
    selfMaxChange: null,
    selfMinChange: null,
    todayAvgChange: null,
    todayMaxChange: null,
    todayMinChange: null,
    selfMaxStockName: null,
    selfMinStockName: null,
    todayMaxStockName: null,
    todayMinStockName: null,
  };
}

/**
 * @param {import('vue').ComputedRef|import('vue').Ref} displayStockList 用于默认洞察数据源
 */
export function useStockInsights(displayStockList) {
  const insightsData = ref(emptyInsights());
  const currentFilteredList = ref([]);

  const calculateInsightsFromList = (filteredList) => {
    const listToUse = filteredList ?? displayStockList.value;

    // 子组件传入筛选结果时记下，供状态变更后仍按当前筛选重算洞察
    if (filteredList) {
      currentFilteredList.value = filteredList;
    }

    if (!listToUse?.length) {
      insightsData.value = emptyInsights();
      return;
    }

    let totalDays = 0;
    let validDaysCount = 0;
    const selfChanges = [];
    const todayChanges = [];

    listToUse.forEach((stock) => {
      if (stock.days_added != null) {
        totalDays += stock.days_added;
        validDaysCount++;
      }
      if (stock.selfChangeRate != null) {
        selfChanges.push(stock.selfChangeRate);
      }
      if (stock.change_rate != null) {
        todayChanges.push(stock.change_rate);
      }
    });

    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: null, max: null, min: null };
      const sum = arr.reduce((a, b) => a + b, 0);
      return {
        avg: sum / arr.length,
        max: Math.max(...arr),
        min: Math.min(...arr),
      };
    };

    const selfStats = calcStats(selfChanges);
    const todayStats = calcStats(todayChanges);

    let selfMaxStockName = null;
    let selfMinStockName = null;
    let todayMaxStockName = null;
    let todayMinStockName = null;

    if (
      selfStats.max != null ||
      selfStats.min != null ||
      todayStats.max != null ||
      todayStats.min != null
    ) {
      listToUse.forEach((stock) => {
        if (
          selfMaxStockName == null &&
          selfStats.max != null &&
          stock.selfChangeRate === selfStats.max
        ) {
          selfMaxStockName = stock.stock_name || stock.stock_code || '';
        }
        if (
          selfMinStockName == null &&
          selfStats.min != null &&
          stock.selfChangeRate === selfStats.min
        ) {
          selfMinStockName = stock.stock_name || stock.stock_code || '';
        }
        if (
          todayMaxStockName == null &&
          todayStats.max != null &&
          stock.change_rate === todayStats.max
        ) {
          todayMaxStockName = stock.stock_name || stock.stock_code || '';
        }
        if (
          todayMinStockName == null &&
          todayStats.min != null &&
          stock.change_rate === todayStats.min
        ) {
          todayMinStockName = stock.stock_name || stock.stock_code || '';
        }
      });
    }

    insightsData.value = {
      totalCount: listToUse.length,
      avgDays:
        validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0,
      selfAvgChange: selfStats.avg,
      selfMaxChange: selfStats.max,
      selfMinChange: selfStats.min,
      todayAvgChange: todayStats.avg,
      todayMaxChange: todayStats.max,
      todayMinChange: todayStats.min,
      selfMaxStockName,
      selfMinStockName,
      todayMaxStockName,
      todayMinStockName,
    };
  };

  const handleFilterChange = (filteredList) => {
    calculateInsightsFromList(filteredList);
  };

  return {
    insightsData,
    currentFilteredList,
    calculateInsightsFromList,
    handleFilterChange,
  };
}
