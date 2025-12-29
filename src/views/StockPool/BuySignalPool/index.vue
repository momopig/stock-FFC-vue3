<template>
  <div class="buy-signal-pool-container">
    <el-empty description="买入信号功能开发中，敬请期待">
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
.buy-signal-pool-container {
  height: calc(100vh - 130px);
  background-color: #fff;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
