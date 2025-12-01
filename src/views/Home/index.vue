<template>
  <!--
    当用户尚未发起搜索时展示的首页交互。包含一张居中的插画以及搜索框。
    搜索框支持按回车键或点击按钮触发搜索。
  -->
  <div class="search-page" v-if="!hasSearched">
    <!-- 插画图片，使用项目内的静态资源，提升页面的视觉美感 -->
    <img :src="heroImage" alt="搜索插图" class="search-hero" />
    <div class="search-bar-container">
      <el-input
        v-model="mixIdsString"
        class="hero-input"
        @keyup.enter.native="searchProduct"
        :title="inputTitle"
        :placeholder="inputTitle"
      />
      <el-button class="search-button" type="primary" @click="searchProduct" :loading="isFetching">搜索</el-button>
    </div>
  </div>
  <!--
    用户发起搜索后展示的结果页面。顶部仍然保留搜索框，方便再次查询；
    下面通过 tab 分别展示基础信息、销量统计、评分等内容。
  -->
  <div class="results-page" v-else>
    <div class="search-bar-top">
      <el-input
        v-model="mixIdsString"
        class="hero-input"
        @keyup.enter.native="searchProduct"
        :title="inputTitle"
        :placeholder="inputTitle"
      />
      <el-button class="search-button" type="primary" @click="searchProduct" :loading="isFetching">搜索</el-button>
    </div>
    <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
      <el-tab-pane label="基础信息" name="basicInfo">
        <SalesTable :products="products" :showCert="true" :showActivityManagement="true" :showQualityScore="true"/>
      </el-tab-pane>
      <!-- <el-tab-pane label="销量统计" name="second" v-if="hasPermission(['adv:sensitive'])" >
        1. 任意时间段内的销售量；2. 最近7、10、30日的销量；
      </el-tab-pane> -->
      <el-tab-pane label="评论" name="third" v-if="hasPermission(['adv:basic'])" >
        <ReviewList ref="reviewListRef" :mixProductIds="mixIdList" />
      </el-tab-pane>
      <!-- <el-tab-pane label="Task" name="fourth" v-if="hasPermission(['adv:basic'])" >Task</el-tab-pane> -->
    </el-tabs>
  </div>
</template>
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { UserStore } from '@/state/user';
import { ElMessage } from 'element-plus';
import { usePermissions } from '@/composables/usePermissions'
const { hasPermission } = usePermissions()
// 导入首页展示插画，蓝白撞色主题
// import heroImage from './hero_search_small.jpg';
import heroImage from './product-search-bg-1.png';

const userStore = UserStore();
const mixIdsString = ref('');
const isFetching = ref(false);
const activeName = ref('basicInfo');
const products = ref([]);
const mixIdList = ref([]);
// 标记是否已经执行过搜索，用于切换首页和结果页
const hasSearched = ref(false);
// ReviewList 组件的引用，用于调用其搜索方法
const reviewListRef = ref(null);

const permissions = computed(() => userStore.permissions);

// 根据权限动态设置输入框标题（使用 computed 确保初始就有值且响应更新）
const inputTitle = computed(() =>
  hasPermission(['adv:basic'])
    ? '请输入SKC、SPU或`${SKC或SPU}+${店铺id}`(形如：5237992403+634418212200117)，多个可用空格隔开'
    : '请输入SKC，多个可用空格隔开'
);

watch(mixIdsString, (newVal) => {
  if (!newVal) {
    return;
  }
  let lowerCaseNewVal = newVal.toLocaleLowerCase();

  // 正则表达式匹配中文字符和中文标点符号
  lowerCaseNewVal = lowerCaseNewVal.replace(
    /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g,
    ''
  );

  // 匹配所有连续的空格（包括中文空格和英文空格），并替换为一个英文空格
  lowerCaseNewVal = lowerCaseNewVal.replace(/\u3000/g, ' ');
  lowerCaseNewVal = lowerCaseNewVal.replace(/\s+/g, ' ');

  // 格式化
  lowerCaseNewVal = lowerCaseNewVal
    .replace(/\s+|:|：|skc/g, ' ')
    .trim();

  mixIdList.value = [];
  if (lowerCaseNewVal) {
    lowerCaseNewVal?.split(' ')?.map((skc) => {
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
});

// 搜索商品基础信息的独立函数
const searchBasicInfo = async () => {
  isFetching.value = true;
  try {
    const newList = [];

    let listWareHousehasError = false
    // 使用promise优化，并且单条失败不影响其他请求
    const promises = mixIdList.value.map(async (mixId) => {
      const product = await getProductByMixId(userStore.mallList, mixId);
      if (product) {
        newList.push(product);
      }
      if (product?.listWareHouse?.success === false) {
        listWareHousehasError = true;
      }
    });
    await Promise.all(promises);

    if (newList.length !== mixIdList.value.length) {
      if (mixIdList.value.length > 1) {
        const errorList = mixIdList.value.filter(mixId => !newList.some(product => product.mixId === mixId));
        ElMessage({
          type: 'warning',
          message: `部分商品产品信息获取失败，请检查ID是否正确后重试。${errorList.join(',')}`
        });
      }
    }
    // if (listWareHousehasError) {
    //   ElMessage({
    //     type: 'warning',
    //     message: '部分商品销售信息获取失败，请稍后重试。',
    //   });
    // }
    products.value = newList;
  } catch (error) {
  } finally {
    isFetching.value = false;
  }
};

const searchProduct = async () => {
  // 确保已经切换到结果页面
  hasSearched.value = true;

  // 如果当前tab是评论，同时搜索商品基础信息和评论
  if (activeName.value === 'third') {
    // 先搜索商品基础信息
    await searchBasicInfo();
    // 然后搜索评论数据
    reviewListRef.value?.get?.();
    return;
  }

  // 在基础信息tab时，只搜索商品基础信息
  await searchBasicInfo();
};

// tab切换处理函数
const handleClick = (tab) => {
  // tab切换时不需要特殊处理，保持原有逻辑
};
</script>
<style scoped lang="less">
.product-img {
  width: 100px;
}

/*
  欢迎页容器：采用淡蓝色背景，与白色搜索框形成蓝白撞色的主题。
  使用 flex 布局让内容垂直居中。
*/
.search-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  min-height: 60vh;
  box-sizing: border-box;
  /* background-color: #FFFCFA; */
  // background-color: #FFF;
}

/* 搜索页插画样式：限制最大宽度并在小屏设备上自适应 */
.search-hero {
  max-width: 420px;
  width: 80%;
  height: auto;
  margin-bottom: 2rem;
}

/* 搜索页搜索框容器：白色背景和圆角，搭配轻微阴影，突出搜索区域 */
.search-bar-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: #ffffff;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 24px;
  width: 60%;
  max-width: 800px;
}

/* 搜索页输入框更宽一些，提升输入体验 */

:deep(.el-input__wrapper) {
  box-shadow: none;
  &:hover {
    box-shadow: none;
  }
}

/* 结果页顶部搜索栏同样采用蓝白撞色的设计，增加背景色和圆角 */
.search-bar-top {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: #fff;
  padding: 1rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 24px;
}

/* 结果页容器：给予一些内边距 */
.results-page {
  padding: 1rem;
}
.search-button {
  border-radius: 10px;
}
</style>
