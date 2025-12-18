<template>
  <div>
    <div>
      <h2>欢迎使用 FFC股票智能分析系统(Find, Follow, Catch)</h2>
    </div>
  </div>
</template>
<script setup>
import Home from './views/Home/index.vue';
import { ref, computed, watch, onMounted } from 'vue';
import './css/common.less';
import{ getLocal } from '@/utils/storage';

onMounted(async () => {

});
</script>
<style scoped lang="less">
.shop-list {
  position: fixed;
  top: 2px;
  right: 2px;
  z-index: 999;
}
</style>
