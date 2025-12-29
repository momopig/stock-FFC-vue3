<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="80px"
      v-loading="loading"
    >
      <!-- 非查看模式下显示股票搜索 -->
      <template v-if="!isViewMode">
        <el-form-item label="股票搜索" prop="stockSearch">
          <div style="display: flex; gap: 10px; width: 100%">
            <el-select
              v-model="selectedStockOption"
              value-key="key"
              filterable
              remote
              reserve-keyword
              placeholder="查询（名称/代码/拼音）"
              :remote-method="suggestStocks"
              @change="onChangeStock"
              style="flex: 1"
              :loading="stockSearchLoading"
            >
              <el-option
                v-for="stock in stockSelectOptions"
                :key="stock.key"
                :label="stock.label"
                :value="stock"
              >
              </el-option>
            </el-select>
            <el-button @click="refreshStock">刷新</el-button>
          </div>
        </el-form-item>

        <!-- 显示已选择的股票信息 -->
        <el-row :gutter="20" v-if="selectedStockOption">
          <el-col :span="12">
            <el-form-item label="股票代码" prop="stock_code">
              <el-input
                v-model="formData.stock_code"
                :disabled="true"
                placeholder="自动填充"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="股票名称" prop="stock_name">
              <el-input
                v-model="formData.stock_name"
                :disabled="true"
                placeholder="自动填充"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <!-- 查看模式下显示股票代码和名称 -->
      <template v-if="isViewMode">
        <el-form-item label="股票代码" prop="stock_code">
          <el-input
            v-model="formData.stock_code"
            :disabled="true"
            placeholder="--"
          />
        </el-form-item>
        <el-form-item label="股票名称" prop="stock_name">
          <el-input
            v-model="formData.stock_name"
            :disabled="true"
            placeholder="--"
          />
        </el-form-item>
      </template>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="交易所" prop="exchange_code">
            <el-select
              v-model="formData.exchange_code"
              :disabled="isViewMode"
              placeholder="请选择交易所"
              style="width: 100%"
            >
              <el-option label="上交所" value="SH" />
              <el-option label="深交所" value="SZ" />
              <el-option label="港交所" value="HK" />
              <el-option label="美股" value="US" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="初始价格" prop="initial_price">
            <el-input-number
              v-model="formData.initial_price"
              :disabled="isViewMode"
              :precision="2"
              :min="0"
              placeholder="请输入初始价格"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select
              v-model="formData.status"
              :disabled="isViewMode"
              placeholder="请选择状态"
              style="width: 100%"
            >
              <el-option label="活跃" value="active" />
              <el-option label="失效" value="inactive" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级" prop="priority_level">
            <el-select
              v-model="formData.priority_level"
              :disabled="isViewMode"
              placeholder="请选择优先级"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="level in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
                :key="level"
                :label="`优先级 ${level}`"
                :value="level"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- <el-form-item label="加入方式" prop="add_method">
        <el-radio-group v-model="formData.add_method" :disabled="isViewMode">
          <el-radio label="manual">手动加入</el-radio>
          <el-radio label="strategy">策略加入</el-radio>
          <el-radio label="import">导入</el-radio>
          <el-radio label="other">其他</el-radio>
        </el-radio-group>
      </el-form-item> -->

      <el-form-item label="加入原因" prop="add_reason">
        <el-input
          v-model="formData.add_reason"
          :disabled="isViewMode"
          type="textarea"
          :rows="3"
          placeholder="请输入加入原因"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="备注" prop="notes">
        <el-input
          v-model="formData.notes"
          :disabled="isViewMode"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="创建人" prop="created_by">
        <el-input
          v-model="formData.created_by"
          :disabled="true"
          placeholder="自动填充当前用户"
        />
      </el-form-item>

      <!-- 查看模式或编辑模式时显示额外信息 -->
      <template v-if="(isViewMode || isEditMode) && formData.id">
        <el-form-item label="加入时间">
          <span>{{ formData.add_time ? formatDateTime(formData.add_time) : '--' }}</span>
        </el-form-item>
        <el-form-item label="加入天数">
          <span>{{ formData.days_added !== null && formData.days_added !== undefined ? `${formData.days_added} 天` : '--' }}</span>
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          v-if="!isViewMode"
          type="primary"
          @click="handleSubmit"
          :loading="loading"
        >
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { UserStore } from '@/state/user'
import { formatDateTime } from '@/utils/time'
import { getStock } from '@/api/modules/stockPool'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  formData: {
    type: Object,
    default: () => ({})
  },
  isViewMode: {
    type: Boolean,
    default: false
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref()
const loading = ref(false)

// 股票搜索相关
const selectedStockOption = ref(null)
const stockSelectOptions = ref([])
const stockSearchLoading = ref(false)

// 对话框标题
const dialogTitle = computed(() => {
  if (props.isViewMode) return '查看股票'
  if (props.isEditMode) return '编辑股票'
  return '添加股票'
})

// 表单验证规则
const formRules = computed(() => {
  return {
    stockSearch: [
      { required: !props.isViewMode, message: '请搜索并选择股票', trigger: 'change' }
    ],
    stock_code: [
      { required: true, message: '请输入股票代码', trigger: 'blur' }
    ],
    stock_name: [
      { required: true, message: '请输入股票名称', trigger: 'blur' },
      { min: 1, max: 50, message: '股票名称长度在1-50个字符', trigger: 'blur' }
    ],
    exchange_code: [
      { required: true, message: '请选择交易所', trigger: 'change' }
    ],
    initial_price: [
      { required: true, message: '请输入初始价格', trigger: 'blur' },
      { type: 'number', min: 0, message: '初始价格必须大于0', trigger: 'blur' }
    ],
    // add_method: [
    //   { required: true, message: '请选择加入方式', trigger: 'change' }
    // ],
    status: [
      { required: true, message: '请选择状态', trigger: 'change' }
    ]
  }
})

// 股票搜索方法
const suggestStocks = async (query) => {
  if (query !== '') {
    stockSearchLoading.value = true
    try {
      const result = await getStock(query, false)
      const stockList = result?.Result?.stock || []
      stockSelectOptions.value = stockList
        .filter((stock) => stock.type === 'stock')
        .map((stock) => {
          // 将交易所代码映射到标准格式
          const exchangeMap = {
            'SH': 'SH',
            'SZ': 'SZ',
            'HK': 'HK',
            'US': 'US',
            'SSE': 'SH', // 上交所
            'SZSE': 'SZ', // 深交所
            'hk': 'HK',
            'us': 'US'
          }
          const exchangeCode = exchangeMap[stock.exchange] || stock.exchange || ''
          return {
            ...stock,
            label: `${stock.name}: ${exchangeCode}${stock.code}`,
            key: `${exchangeCode}_${stock.code}`,
            exchange_code: exchangeCode,
            initialPrice: Number(stock.price) || 0
          }
        })
    } catch (error) {
      console.error('搜索股票失败:', error)
      ElMessage.error('搜索股票失败，请稍后重试')
      stockSelectOptions.value = []
    } finally {
      stockSearchLoading.value = false
    }
  } else {
    stockSelectOptions.value = []
  }
}

// 选择股票后填充表单
const onChangeStock = (stock) => {
  if (stock) {
    // 填充股票代码和名称
    props.formData.stock_name = stock.name || ''
    props.formData.initial_price = stock.initialPrice || 0
    // 填充交易所代码（如果接口返回了 exchange_code，优先使用）
    if (stock.exchange_code) {
      props.formData.exchange_code = stock.exchange_code
    } else if (stock.exchange) {
      // 映射交易所代码
      const exchangeMap = {
        'SH': 'SH',
        'SZ': 'SZ',
        'HK': 'HK',
        'US': 'US',
        'SSE': 'SH',
        'SZSE': 'SZ',
        'hk': 'HK',
        'us': 'US'
      }
      props.formData.exchange_code = exchangeMap[stock.exchange] || stock.exchange
    }
    props.formData.stock_code = stock.code + '.' + stock.exchange_code || ''
    // 设置 stockSearch 字段，用于表单验证
    props.formData.stockSearch = stock.key || `${stock.exchange_code}_${stock.code}` || ''

    // 清除验证错误
    nextTick(() => {
      formRef.value?.clearValidate(['stock_code', 'stock_name', 'exchange_code', 'stockSearch'])
    })
  } else {
    // 清空选择时，也清空 stockSearch 字段
    props.formData.stockSearch = ''
  }
}

// 刷新股票搜索
const refreshStock = () => {
  if (selectedStockOption.value) {
    const currentQuery = selectedStockOption.value.name || selectedStockOption.value.code || ''
    if (currentQuery) {
      suggestStocks(currentQuery)
    }
  } else {
    ElMessage.info('请先选择股票')
  }
}

// 监听对话框显示状态
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    nextTick(() => {
      formRef.value?.clearValidate()
    })

    // 重置股票搜索选项列表
    stockSelectOptions.value = []

    // 新建股票时，重置选中项并自动填充创建人和默认值
    if (!props.isEditMode && !props.isViewMode) {
      selectedStockOption.value = null
      props.formData.stockSearch = ''
      const userStore = UserStore()
      const username = userStore?.userInfo?.username || userStore?.userInfo?.name || '当前用户'
      if (!props.formData.created_by) {
        props.formData.created_by = username
      }
    } else if (props.formData.stock_code && props.formData.stock_name) {
      // 编辑模式时，如果有股票信息，设置选中项以便显示
      const stockKey = `${props.formData.exchange_code || ''}_${props.formData.stock_code}`
      selectedStockOption.value = {
        code: props.formData.stock_code,
        name: props.formData.stock_name,
        exchange_code: props.formData.exchange_code,
        label: `${props.formData.stock_name}: ${props.formData.exchange_code || ''}${props.formData.stock_code}`,
        key: stockKey
      }
      // 设置 stockSearch 字段，用于表单验证
      props.formData.stockSearch = stockKey
    } else {
      // 没有股票信息时，重置选中项
      selectedStockOption.value = null
      props.formData.stockSearch = ''
    }
  }
})

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    // 准备提交数据
    const submitData = { ...props.formData, add_method: 'manual' }

    // 确保数值类型正确
    if (submitData.initial_price !== null && submitData.initial_price !== undefined) {
      submitData.initial_price = Number(submitData.initial_price)
    }
    if (submitData.priority_level !== null && submitData.priority_level !== undefined) {
      submitData.priority_level = Number(submitData.priority_level)
    }

    emit('submit', submitData)
  } catch (error) {
    console.log('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 0 24px 14px 0;
}
.el-form {
  padding: 24px 24px 0 24px;
}
</style>

