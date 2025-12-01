import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { GuideStore } from '@/state/guide';
import { UserStore } from '@/state/user';
import guideConfig from '@/config/guide.json';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// 全局变量：存储 driver 实例和路由监听器
let driverInstance = null;
let routeWatcher = null;
let isGuideActive = ref(false);

/**
 * 清理所有引导相关资源
 * 使用 driver.js API 进行清理，减少 DOM 操作
 */
const cleanup = () => {
  // 清理路由监听器
  if (routeWatcher) {
    routeWatcher();
    routeWatcher = null;
  }

  // 使用 driver.js API 销毁实例（会自动清理所有 DOM 元素）
  if (driverInstance) {
    try {
      // 使用 API 检查是否激活，避免重复销毁
      if (driverInstance.isActive()) {
        driverInstance.destroy();
      }
    } catch (e) {
      console.error('[引导] 销毁 driver 实例失败:', e);
    }
    driverInstance = null;
  }

  isGuideActive.value = false;
};

/**
 * 引导功能组合式函数
 * 基于 driver.js 1.4.0 实现用户引导功能
 */
export const useGuide = () => {
  const router = useRouter();
  const guideStore = GuideStore();
  const userStore = UserStore();

  /**
   * 获取当前用户角色对应的引导配置
   */
  const getGuideConfig = () => {
    const currentRole = getCurrentRole();

    return guideConfig[currentRole];
  };

  /**
   * 获取当前用户角色标识
   */
  const getCurrentRole = () => {
    const userInfo = userStore.userInfo || {};
    return userInfo?.role?.name;
  };

  /**
   * 检查是否应该显示引导
   */
  const shouldShowGuide = () => {
    const role = getCurrentRole();
    if (!role) {
      return false;
    }

    // 如果已完成引导，则不显示
    if (guideStore.isGuideCompleted(role)) {
      return false;
    }

    // 如果引导正在进行中，则不重复启动
    if (isGuideActive.value) {
      return false;
    }

    return true;
  };

  /**
   * 启动引导
   */
  const startGuide = async () => {
    // 先检查是否应该显示引导
    if (!shouldShowGuide()) {
      console.log('[引导] 不需要显示引导（已完成、无角色或正在运行）');
      return;
    }

    const config = getGuideConfig();
    if (!config) {
      console.warn('[引导] 未找到对应的引导配置');
      return;
    }

    const role = getCurrentRole();
    if (!role) {
      console.warn('[引导] 无法确定用户角色');
      return;
    }

    console.log('[引导] 开始启动引导，角色:', role);

    // 标记引导为激活状态
    isGuideActive.value = true;
    guideStore.setActive(true);

    try {

      // 转换为 driver.js 需要的格式
      const steps = config.steps.map((step, index) => {
        // 验证元素是否存在（如果有指定元素）
        if (step.element) {
          const element = document.querySelector(step.element);
          if (!element) {
            console.warn(`[引导] 步骤 ${index + 1} 的目标元素未找到:`, step.element);
          } else {
            console.log(`[引导] 步骤 ${index + 1} 的目标元素已找到:`, step.element);
          }
        } else {
          console.log(`[引导] 步骤 ${index + 1} 是叙事步骤（无元素），将显示在中央`);
        }

        // 对于 narrative 步骤（element 为 null），不设置 element，让 driver.js 显示居中弹窗
        const driverStep = {
          // element 为 null 或 undefined 时，driver.js 会在屏幕中央显示弹窗
          ...(step.element ? { element: step.element } : {}),
          popover: {
            title: step.popover.title,
            description: step.popover.description.replace(/\n/g, '<br>'),
            // 如果有 element，设置 side 和 align；如果没有 element（narrative），不设置这些属性，让 driver.js 自动居中
            ...(step.element ? {
              side: step.popover.position === 'center' ? 'top' : (step.popover.position || 'right'),
              align: 'start',
            } : {}),
          },
          // 存储任务信息，用于后续检测
          _taskType: step.taskType,
          _route: step.route,
          _index: index,
        };

        return driverStep;
      });

      console.log('[引导] 步骤配置:', steps);

      // 创建 driver 实例 (1.4.0 版本使用 driver() 函数)
      driverInstance = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        allowClose: true,
        overlayOpacity: 0.5,
        smoothScroll: true,
        popoverClass: 'driver-popover',
        stagePadding: 4,
        stageRadius: 5,
        // 全局设置中文按钮文本（使用 API 配置，无需 DOM 操作）
        nextBtnText: '下一步',
        prevBtnText: '上一步',
        doneBtnText: '完成',
        steps: steps,
        onHighlightStarted: (data) => {
          console.log('[引导] 高亮开始:', data);
          // 使用 driver.js API 获取当前步骤索引
          const stepIndex = driverInstance?.getActiveIndex() ?? data?.step?.index ?? data?.stepIndex ?? 0;
          const currentStep = config.steps[stepIndex];

          // 如果是点击任务且有目标路由，监听路由变化
          if (currentStep?.taskType === 'click' && currentStep?.route && driverInstance) {
            // 清理之前的监听器
            if (routeWatcher) {
              routeWatcher();
              routeWatcher = null;
            }

            // 监听路由变化，到达目标路由后自动进入下一步
            routeWatcher = router.afterEach((to) => {
              if (to.path === currentStep.route && driverInstance?.isActive()) {
                if (routeWatcher) {
                  routeWatcher();
                  routeWatcher = null;
                }
                setTimeout(() => {
                  if (driverInstance?.isActive()) {
                    driverInstance.moveNext();
                  }
                }, 500);
              }
            });
          }
        },
        onHighlighted: (data) => {
          console.log('[引导] 高亮完成:', data);
        },
        onDeselected: (data) => {
          console.log('[引导] 取消高亮:', data);
        },
        // 使用 API 处理下一步/完成按钮点击
        onNextClick: () => {
          // 使用 driver.js API 检查是否是最后一步
          if (driverInstance?.isLastStep()) {
            console.log('[引导] 最后一步点击完成，立即销毁引导');
            // 标记为已完成
            if (role) {
              guideStore.markGuideCompleted(role);
              console.log('[引导] 引导完成，已标记为已完成');
            }
            guideStore.setActive(false);
            // 先清理路由监听器
            if (routeWatcher) {
              routeWatcher();
              routeWatcher = null;
            }
            // 使用 API 销毁引导（会自动清理所有 DOM 元素）
            if (driverInstance?.isActive()) {
              driverInstance.destroy();
            }
            driverInstance = null;
            isGuideActive.value = false;
          } else {
            driverInstance.moveNext()
          }
        },
        onDestroyed: () => {
          console.log('[引导] 销毁完成');
          cleanup();
        },
        onCloseClick: () => {
          console.log('[引导] 用户点击关闭');
          // 标记为已完成，避免下次登录时再次弹出
          if (role) {
            guideStore.markGuideCompleted(role);
            console.log('[引导] 用户关闭引导，已标记为已完成');
          }
          cleanup();
        },
        onOverlayClick: () => {
          console.log('[引导] 用户点击遮罩层，不执行任何操作');
        },
      });

      // 启动引导
      console.log('[引导] 开始执行引导步骤');
      driverInstance.drive();

      // 使用 driver.js API 检查引导是否正常启动
      await new Promise(resolve => setTimeout(resolve, 500));

      if (driverInstance?.isActive()) {
        console.log('[引导] 引导正常启动');
      } else {
        console.warn('[引导] 引导启动失败，可能配置有误或元素未找到');
        cleanup();
      }
    } catch (error) {
      console.error('[引导] 启动引导失败:', error);
      cleanup();
      // 不标记为完成，允许下次重试
      console.log('[引导] 引导启动失败，已清理所有资源，未标记为完成');
    }
  };

  return {
    getGuideConfig,
    getCurrentRole,
    shouldShowGuide,
    startGuide,
    isGuideActive: () => isGuideActive.value,
  };
};
