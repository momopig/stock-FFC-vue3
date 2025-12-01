import { defineStore } from 'pinia';
import { getLocal, setLocal, getLocalString } from '@/utils/storage';

/**
 * 引导状态管理
 * 管理用户引导的完成状态，使用 localStorage 持久化
 */
export const GuideStore = defineStore('guide', {
  state: () => ({
    // 当前引导状态（运行时状态，不持久化）
    isActive: false,
    currentStep: 0,
  }),

  getters: {
    /**
     * 检查指定角色是否已完成引导
     * @param {string} role - 角色标识：'master' | 'warehouseManager'
     */
    isGuideCompleted: (state) => (role) => {
      const key = `guide_completed_${role}`;
      // 使用 getLocalString 直接获取字符串值，避免 JSON.parse 导致的问题
      const value = getLocalString(key);
      // 兼容处理：如果 getLocalString 返回 null，尝试使用 getLocal
      if (value === null) {
        const localValue = getLocal(key);
        // 兼容布尔值和字符串值
        return localValue === true || localValue === 'true';
      }
      return value === 'true';
    },
  },

  actions: {
    /**
     * 标记指定角色的引导为已完成
     * @param {string} role - 角色标识
     */
    markGuideCompleted(role) {
      const key = `guide_completed_${role}`;
      setLocal(key, 'true');
    },

    /**
     * 重置指定角色的引导状态（用于重新开始引导）
     * @param {string} role - 角色标识
     */
    resetGuide(role) {
      const key = `guide_completed_${role}`;
      setLocal(key, 'false');
    },

    /**
     * 设置引导激活状态
     */
    setActive(isActive) {
      this.isActive = isActive;
    },

    /**
     * 设置当前步骤
     */
    setCurrentStep(step) {
      this.currentStep = step;
    },
  },
});

