import { ElMessage } from 'element-plus';

/**
 * 股票池列表行内 active/inactive 切换，与 useStockInsights 的筛选列表联动重算洞察
 */
export function useStockRowStatusChange({
  updateStockStatus,
  calculateInsightsFromList,
  currentFilteredList,
}) {
  const handleStatusChange = async (row, newStatus) => {
    const oldStatus = newStatus === 'active' ? 'inactive' : 'active';

    try {
      row.statusLoading = true;

      const result = await updateStockStatus(row.id, newStatus);

      if (result && result.success !== false) {
        ElMessage.success(`状态已${newStatus === 'active' ? '激活' : '失效'}`);
        calculateInsightsFromList(
          currentFilteredList.value?.length > 0
            ? currentFilteredList.value
            : null
        );
      } else {
        row.status = oldStatus;
        ElMessage.error(result?.message || '状态变更失败');
      }
    } catch (error) {
      row.status = oldStatus;
      console.error('状态变更失败:', error);
      ElMessage.error('状态变更失败，请稍后重试');
    } finally {
      row.statusLoading = false;
    }
  };

  return { handleStatusChange };
}
