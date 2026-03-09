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
      <!-- 新增模式下显示添加方式选择（仅在有分组时显示，因批量添加需选择分组） -->
      <template v-if="!isViewMode && !isEditMode && groups?.length > 0">
        <el-form-item label="添加方式">
          <el-radio-group v-model="addMode">
            <el-radio value="single">添加股票</el-radio>
            <el-radio value="batch">批量添加</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>

      <!-- 批量添加模式：股票输入框 -->
      <template v-if="!isViewMode && addMode === 'batch'">
        <el-form-item label="股票输入" prop="batchStockInput">
          <div class="batch-input-wrapper">
            <el-input
              v-model="batchStockInput"
              type="textarea"
              :rows="4"
              placeholder="请输入股票名称或代码，支持逗号、空格分隔（如：茅台 招商银行 平安银行）"
              :disabled="isEditMode"
            />
            <el-button
              type="primary"
              :loading="batchMatchLoading"
              @click="handleBatchMatch"
              :disabled="!batchStockInput?.trim()"
              class="match-btn"
            >
              匹配
            </el-button>
          </div>
          <div v-if="batchMatchedStocks.length > 0" class="batch-matched-tip">
            已匹配 {{ batchMatchedStocks.length }} 只股票，分别是
            <span v-for="stock in batchMatchedStocks" :key="stock.key">
              {{ stock.stock_name }} ({{ stock.stock_code }})
            </span>
          </div>
        </el-form-item>
      </template>

      <!-- 单个添加模式：非查看模式下显示股票搜索 -->
      <template v-if="!isViewMode && addMode === 'single'">
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
              :disabled="isEditMode"
            >
              <el-option
                v-for="stock in stockSelectOptions"
                :key="stock.key"
                :label="stock.label"
                :value="stock"
              >
              </el-option>
            </el-select>
            <el-button @click="refreshStock" :disabled="isEditMode">刷新</el-button>
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

      <!-- 新增模式下显示分组选择 -->
      <el-form-item v-if="!isEditMode && !isViewMode" label="选择分组" prop="group_ids">
        <el-select
          v-model="formData.group_ids"
          multiple
          placeholder="请选择分组（可多选）"
          style="width: 100%"
          @change="handleGroupChange"
        >
          <el-option
            v-for="group in groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
          <!-- 新增分组选项 -->
          <el-option
            label="+ 新增分组"
            value="__create_new__"
            style="color: #409eff; font-weight: bold;"
          >
            <span style="color: #409eff; font-weight: bold;">
              <el-icon style="margin-right: 4px;"><Plus /></el-icon>
              新增分组
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 单个添加或编辑/查看模式时显示交易所和初始价格，批量添加时隐藏（由匹配结果带入） -->
      <el-row v-if="addMode !== 'batch'" :gutter="20">
        <el-col :span="12">
          <el-form-item label="交易所" prop="exchange_code">
            <el-select
              v-model="formData.exchange_code"
              :disabled="isViewMode || isEditMode"
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
        <!-- <el-col :span="12">
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
        </el-col> -->
        <!-- <el-col :span="12">
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
        </el-col> -->
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { UserStore } from '@/state/user'
import { formatDateTime } from '@/utils/time'
import { getStock } from '@/api/modules/stockPool'
import { createGroup } from '@/api/modules/stockGroup'

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
  },
  groups: {
    type: Array,
    default: () => []
  },
  activeGroupId: {
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'submit', 'group-created'])

const formRef = ref()
const loading = ref(false)

// 添加方式：single 单个添加，batch 批量添加
const addMode = ref('single')

// 股票搜索相关
const selectedStockOption = ref(null)
const stockSelectOptions = ref([])
const stockSearchLoading = ref(false)

// 批量添加相关
const batchStockInput = ref('')
const batchMatchedStocks = ref([])
const batchMatchLoading = ref(false)

// 对话框标题
const dialogTitle = computed(() => {
  if (props.isViewMode) return '查看股票'
  if (props.isEditMode) return '编辑股票'
  return '添加股票'
})

// 交易所代码映射（API 返回的 exchange 可能为 SSE/SZSE 等）
const EXCHANGE_MAP = {
  SH: 'SH',
  SZ: 'SZ',
  HK: 'HK',
  US: 'US',
  SSE: 'SH',
  SZSE: 'SZ',
  hk: 'HK',
  us: 'US'
}

// 将 API 返回的股票转换为统一格式
const normalizeStockFromApi = (stock) => {
  const exchangeCode = EXCHANGE_MAP[stock?.exchange] || stock?.exchange || ''
  return {
    ...stock,
    exchange_code: exchangeCode,
    initialPrice: Number(stock?.price) || 0
  }
}

// 解析批量输入：支持逗号、空格分隔
const parseBatchStockInput = (input) => {
  if (!input?.trim()) return []
  return input
    .split(/[,，\s]+/)
    .map((s) => s?.trim())
    .filter(Boolean)
}

// 批量匹配：对每个输入项模糊搜索，取第一个匹配结果
const handleBatchMatch = async () => {
  const tokens = parseBatchStockInput(batchStockInput.value)
  if (tokens.length === 0) {
    ElMessage.warning('请输入至少一个股票名称或代码')
    return
  }

  batchMatchLoading.value = true
  batchMatchedStocks.value = []

  try {
    const matched = []
    const failed = []

    for (const token of tokens) {
      const result = await getStock(token, false)
      const stockList = result?.Result?.stock || []
      const stockOptions = stockList
        .filter((s) => s?.type === 'stock')
        .map(normalizeStockFromApi)

      if (stockOptions?.length > 0) {
        const first = stockOptions[0]
        matched.push({
          stock_code: `${first?.code || ''}.${first?.exchange_code || ''}`,
          stock_name: first?.name || '',
          exchange_code: first?.exchange_code || '',
          initial_price: first?.initialPrice ?? 0
        })
      } else {
        failed.push(token)
      }
    }

    batchMatchedStocks.value = matched

    if (failed.length > 0) {
      ElMessage.warning(`以下项未匹配到股票：${failed.join('、')}`)
    }
    if (matched.length > 0) {
      ElMessage.success(`成功匹配 ${matched.length} 只股票`)
    }
  } catch (error) {
    console.error('批量匹配失败:', error)
    ElMessage.error('批量匹配失败，请稍后重试')
  } finally {
    batchMatchLoading.value = false
  }
}

// 表单验证规则
const formRules = computed(() => {
  const rules = {
    stock_code: [
      { required: true, message: '请输入股票代码', trigger: 'blur' }
    ],
    stock_name: [
      { required: true, message: '请输入股票名称', trigger: 'blur' },
      { min: 1, max: 50, message: '股票名称长度在1-50个字符', trigger: 'blur' }
    ],
    add_reason: [
      { required: true, message: '请输入加入原因', trigger: 'blur' },
      { min: 1, max: 500, message: '加入原因长度在1-500个字符', trigger: 'blur' }
    ]
  }

  // 新增模式下需要验证股票搜索和交易所
  if (!props.isEditMode && !props.isViewMode) {
    rules.stockSearch = [
      { required: true, message: '请搜索并选择股票', trigger: 'change' }
    ]
    rules.exchange_code = [
      { required: true, message: '请选择交易所', trigger: 'change' }
    ]
    rules.initial_price = [
      { required: true, message: '请输入初始价格', trigger: 'blur' },
      { type: 'number', min: 0, message: '初始价格必须大于0', trigger: 'blur' }
    ]
    rules.group_ids = [
      { required: true, message: '请至少选择一个分组', trigger: 'change' },
      { type: 'array', min: 1, message: '请至少选择一个分组', trigger: 'change' }
    ]
  } else if (!props.isViewMode) {
    // 编辑模式下需要验证初始价格
    rules.initial_price = [
      { required: true, message: '请输入初始价格', trigger: 'blur' },
      { type: 'number', min: 0, message: '初始价格必须大于0', trigger: 'blur' }
    ]
  }

  return rules
})

// 股票搜索方法
const suggestStocks = async (query) => {
  if (query !== '') {
    stockSearchLoading.value = true
    try {
      const result = await getStock(query, false)
      const stockList = result?.Result?.stock || []
      stockSelectOptions.value = stockList
        .filter((stock) => stock?.type === 'stock')
        .map((stock) => {
          const normalized = normalizeStockFromApi(stock)
          return {
            ...normalized,
            label: `${stock?.name}: ${normalized?.exchange_code || ''}${stock?.code || ''}`,
            key: `${normalized?.exchange_code || ''}_${stock?.code || ''}`
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

    // 编辑/查看模式时强制为单个添加
    if (props.isEditMode || props.isViewMode) {
      addMode.value = 'single'
    }

    // 新建股票时，重置选中项并自动填充创建人和默认值
    if (!props.isEditMode && !props.isViewMode) {
      // 重置批量添加相关状态
      batchStockInput.value = ''
      batchMatchedStocks.value = []
      selectedStockOption.value = null
      props.formData.stockSearch = ''
      const userStore = UserStore()
      const username = userStore?.userInfo?.username || userStore?.userInfo?.name || '当前用户'
      if (!props.formData.created_by) {
        props.formData.created_by = username
      }
      // 如果没有分组ID，默认使用当前激活的分组
      if (!props.formData.group_ids || props.formData.group_ids.length === 0) {
        if (props.activeGroupId && props.activeGroupId !== 'add') {
          props.formData.group_ids = [Number(props.activeGroupId)]
        }
      }
    } else if (props.formData.stock_code && props.formData.stock_name) {
      // 编辑模式时，如果有股票信息，设置选中项以便显示
      const stockKey = `${props.formData.exchange_code || ''}_${props.formData.stock_code}`
      selectedStockOption.value = {
        code: props.formData.stock_code,
        name: props.formData.stock_name,
        exchange_code: props.formData.exchange_code,
        label: `${props.formData.stock_name}: ${props.formData.exchange_code || ''}${props.formData.stock_code}`,
        key: stockKey,
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

// 处理分组选择变化
const handleGroupChange = (value) => {
  // 如果选择了"新增分组"选项，触发创建分组
  if (Array.isArray(value) && value.includes('__create_new__')) {
    // 移除特殊值
    props.formData.group_ids = value.filter(id => id !== '__create_new__')
    handleCreateGroup()
  }
}

// 创建新分组
const handleCreateGroup = async () => {
  try {
    const { value: groupName } = await ElMessageBox.prompt('请输入分组名称', '新建分组', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{1,20}$/,
      inputErrorMessage: '分组名称长度为1-20个字符'
    })

    if (!groupName) return

    try {
      const result = await createGroup({
        name: groupName,
        is_hidden: false,
        display_order: props.groups?.length || 0,
        remark: '',
        create_type: 'custom'
      })

      if (result?.success) {
        ElMessage.success('创建分组成功')
        // 通知父组件刷新分组列表
        emit('group-created', result.payload)
        // 自动选中新创建的分组
        if (result.payload?.id) {
          const currentGroupIds = Array.isArray(props.formData.group_ids)
            ? props.formData.group_ids
            : []
          props.formData.group_ids = [...currentGroupIds, result.payload.id]
        }
      } else {
        ElMessage.error(result?.message || '创建分组失败')
      }
    } catch (error) {
      console.error('创建分组失败:', error)
      ElMessage.error('创建分组失败，请稍后重试')
    }
  } catch (error) {
    // 用户取消输入
  }
}

// 关闭对话框
const handleClose = () => {
  batchStockInput.value = ''
  addMode.value = 'single'
  emit('update:visible', false)
}

// 提交表单
const handleSubmit = async () => {
  try {
    // 批量模式：校验匹配结果
    if (addMode.value === 'batch') {
      if (batchMatchedStocks.value?.length === 0) {
        ElMessage.warning('请先点击「匹配」按钮进行股票匹配')
        return
      }
      const groupIds = Array.isArray(props.formData.group_ids)
        ? props.formData.group_ids.filter((id) => id !== '__create_new__')
        : []
      if (groupIds.length === 0) {
        ElMessage.error('请至少选择一个分组')
        return
      }
      if (!props.formData.add_reason?.trim()) {
        ElMessage.warning('请输入加入原因')
        return
      }

      loading.value = true
      emit('submit', {
        batchMode: true,
        stocks: batchMatchedStocks.value,
        group_ids: groupIds,
        add_reason: props.formData.add_reason || '',
        notes: props.formData.notes || ''
      })
      return
    }

    await formRef.value.validate()

    loading.value = true

    // 准备提交数据（确保过滤掉特殊值）
    const groupIds = Array.isArray(props.formData.group_ids)
      ? props.formData.group_ids.filter((id) => id !== '__create_new__')
      : []

    const submitData = {
      ...props.formData,
      add_method: 'manual',
      group_ids: groupIds
    }

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

.batch-input-wrapper {
  display: flex;
  gap: 10px;
  width: 100%;
  align-items: flex-start;
}
.batch-input-wrapper :deep(.el-textarea) {
  flex: 1;
}
.batch-input-wrapper .match-btn {
  flex-shrink: 0;
  margin-top: 0;
}
.batch-matched-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-color-success);
}
</style>

