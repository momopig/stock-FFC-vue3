<template>
  <div ref="containerRef" :class="['fullscreen-container', { 'is-fullscreen': isFullscreen }]">
    <slot :isFullscreen="isFullscreen" :toggleFullscreen="toggleFullscreen" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 容器引用
const containerRef = ref(null)

// 全屏状态
const isFullscreen = ref(false)

// 获取当前全屏元素（处理浏览器前缀兼容性）
const getFullscreenElement = () => {
  return document.fullscreenElement ||
         document.webkitFullscreenElement ||
         document.mozFullScreenElement ||
         document.msFullscreenElement || null
}

// 进入全屏（处理浏览器前缀兼容性）
const enterFullscreen = async () => {
  const element = containerRef.value
  if (!element) return

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen()
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen()
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen()
    } else {
      console.warn('浏览器不支持全屏 API')
    }
  } catch (error) {
    console.error('进入全屏失败:', error)
  }
}

// 退出全屏（处理浏览器前缀兼容性）
const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen()
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen()
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen()
    }
  } catch (error) {
    console.error('退出全屏失败:', error)
  }
}

// 切换全屏
const toggleFullscreen = async () => {
  if (isFullscreen.value) {
    await exitFullscreen()
  } else {
    await enterFullscreen()
  }
}

// 更新全屏状态
const updateFullscreenState = () => {
  const fullscreenElement = getFullscreenElement()
  isFullscreen.value = fullscreenElement === containerRef.value
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  updateFullscreenState()
}

// 处理键盘快捷键 F9
const handleKeyDown = (event) => {
  // 按下 F9 键时切换全屏
  if (event.key === 'F9') {
    event.preventDefault() // 阻止默认行为
    toggleFullscreen()
  }
}

onMounted(() => {
  // 监听全屏状态变化事件（处理浏览器前缀兼容性）
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)

  // 监听键盘事件，支持 F9 快捷键
  document.addEventListener('keydown', handleKeyDown)

  // 初始化状态
  updateFullscreenState()
})

onUnmounted(() => {
  // 移除事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped lang="less">
.fullscreen-container {
  width: 100%;
  height: 100%;

  &.is-fullscreen {
    // 全屏状态下的样式调整
    padding: 20px;
    background: #fff;
  }
}
</style>
