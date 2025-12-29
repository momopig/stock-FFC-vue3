<template>
  <div class="sell-signal-pool-container">
    <el-empty description="卖出信号功能开发中，敬请期待">
      <el-button type="primary" @click="handleGoBack">返回</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const handleGoBack = () => {
  router.push('/stock-pool/strategy')
}
</script>

<style scoped lang="less">
.sell-signal-pool-container {
  height: calc(100vh - 130px);
  background-color: #fff;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
