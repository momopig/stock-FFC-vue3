<template>
  <el-input
    v-model="mixIdsString"
    @change="searchProduct"
    placeholder="请输入SKC、SPU或`${SKC或SPU}+${店铺id}`(形如：5237992403+634418212200117)，多个可用空格隔开"
  />
  <el-button @click="searchProduct" :loading="isFetching">搜索</el-button>
  <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <el-tab-pane label="基础信息" name="basicInfo">
      <SalesTable :products="products" />
    </el-tab-pane>
    <el-tab-pane label="销量统计" name="second"
      >1. 任意时间段内的销售量；2. 最近7、10、30日的销量；</el-tab-pane
    >
    <el-tab-pane label="评分" name="third"
      ><ReviewList :mixProductIds="mixIdList"
    /></el-tab-pane>
    <el-tab-pane label="Task" name="fourth">Task</el-tab-pane>
  </el-tabs>
</template>
<script setup>
import { ref } from 'vue';
import { getProductByMixId } from '@/api/modules/product';
import { UserStore } from '@/state/user';
import SalesTable from '@/components/SalesTable.vue';
import ReviewList from '@/views/ReviewList/index.vue';
import { ElMessage } from 'element-plus';
const userStore = UserStore();
const mixIdsString = ref('');
const isFetching = ref(false);
const activeName = ref('basicInfo');
const products = ref([]);
const mixIdList = ref([]);

const searchProduct = async () => {
  isFetching.value = true;
  try {
    const newList = [];
    mixIdsString.value = mixIdsString.value.toLocaleLowerCase();

    // 正则表达式匹配中文字符和中文标点符号
    mixIdsString.value = mixIdsString.value.replace(
      /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g,
      ''
    );

    // 匹配所有连续的空格（包括中文空格和英文空格），并替换为一个英文空格
    mixIdsString.value = mixIdsString.value.replace(/\u3000/g, ' ');
    mixIdsString.value = mixIdsString.value.replace(/\s+/g, ' ');

    // 格式化
    mixIdsString.value = mixIdsString.value
      .replace(/\s+|:|：|skc/g, ' ')
      .trim();

    mixIdList.value = [];
    if (mixIdsString.value) {
      mixIdsString.value?.split(' ')?.map((skc) => {
        let parts;
        if (skc.includes('+')) {
          parts = skc.split('+');
          if (userStore.mallIds.includes(+parts[1])) {
            console.log(`匹配店铺：${parts[1]}`);
            mixIdList.value.push(+parts[0]);
          }
        } else {
          mixIdList.value.push(+skc);
        }
      });
    }
    let listWareHousehasError = false
    for (let mixId of mixIdList.value) {
      const product = await getProductByMixId(userStore.mallList, mixId);
      if (product) {
        newList.push(product);
      }
      if (product.listWareHouse?.success === false) {
        listWareHousehasError = true;
      }
    }
    if (listWareHousehasError) {
      ElMessage({
        type: 'error',
        message: '部分商品销售信息获取失败，请稍后重试。',
      });
    }
    products.value = newList;
  } catch (error) {
  } finally {
    isFetching.value = false;
  }
};
</script>
<style scoped>
.product-img {
  width: 100px;
}
</style>
