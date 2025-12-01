import { ref } from 'vue'
import { getCurrentUserInfo } from '@/api/modules/customerUser';

const isRefreshing = ref(false)

export const useUserInfo = () => {

  const refreshUserInfo = async () => {
    if (isRefreshing.value) return // 防止重复调用

    try {
      isRefreshing.value = true
      await getCurrentUserInfo()
    } catch (error) {
      console.error('刷新自动发货配置失败:', error)
    } finally {
      isRefreshing.value = false
    }
  }

  return {
    refreshUserInfo,
    isRefreshing
  }
}
