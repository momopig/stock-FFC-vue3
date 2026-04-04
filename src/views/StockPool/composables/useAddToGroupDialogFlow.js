import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { addStockToGroups } from '@/api/modules/stockGroup';

/**
 * 添加到自选分组：打开弹窗 + 提交 addStockToGroups，成功后由调用方刷新列表
 */
export function useAddToGroupDialogFlow({ onSuccess }) {
  const addToGroupDialogVisible = ref(false);
  const selectedStockData = ref(null);
  const selectedStrategyInfo = ref(null);

  const handleAddToSelf = (row) => {
    selectedStockData.value = {
      stock_code: row.stock_code,
      stock_name: row.stock_name,
      exchange_code: row.exchange_code,
      last_price: row.last_price,
      initial_price: row.initial_price,
      add_time: row.add_time || null,
    };
    selectedStrategyInfo.value = {
      add_time: row.add_time || null,
      initial_price: row.initial_price || null,
      add_reason: row.add_reason || '',
      notes: row.notes || '',
    };
    addToGroupDialogVisible.value = true;
  };

  const handleAddToGroupSubmit = async (submitData) => {
    try {
      if (!selectedStockData.value) {
        ElMessage.error('股票数据不存在');
        return;
      }

      const addData = {
        group_ids: submitData.group_ids,
        exchange_code: selectedStockData.value.exchange_code,
        stock_code: selectedStockData.value.stock_code,
        stock_name: selectedStockData.value.stock_name,
        add_time: submitData.add_time || null,
        initial_price: submitData.initial_price || 0,
        add_reason: submitData.add_reason || '',
        remark: submitData.remark || '',
      };

      const result = await addStockToGroups(addData);

      if (result && result.success !== false) {
        ElMessage.success('已添加到自选分组');
        addToGroupDialogVisible.value = false;
        selectedStockData.value = null;
        selectedStrategyInfo.value = null;
        await Promise.resolve(onSuccess?.());
      } else {
        ElMessage.error(result?.message || '添加自选失败');
      }
    } catch (error) {
      console.error('添加自选失败:', error);
      ElMessage.error('添加自选失败，请稍后重试');
    }
  };

  return {
    addToGroupDialogVisible,
    selectedStockData,
    selectedStrategyInfo,
    handleAddToSelf,
    handleAddToGroupSubmit,
  };
}
