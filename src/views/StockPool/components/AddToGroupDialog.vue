<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="添加到自选分组"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="loading"
    >
      <!-- 股票基本信息（只读） -->
      <el-form-item label="股票代码">
        <el-input
          :model-value="stockData?.stock_code || '--'"
          disabled
          placeholder="--"
        />
      </el-form-item>

      <el-form-item label="股票名称">
        <el-input
          :model-value="stockData?.stock_name || '--'"
          disabled
          placeholder="--"
        />
      </el-form-item>

      <el-form-item label="交易所">
        <el-input
          :model-value="getExchangeName(stockData?.exchange_code)"
          disabled
          placeholder="--"
        />
      </el-form-item>

      <!-- 多选分组下拉框 -->
      <el-form-item label="选择分组" prop="group_ids">
        <el-select
          v-model="formData.group_ids"
          multiple
          placeholder="请选择分组（可多选）"
          style="width: 100%"
          :loading="groupsLoading"
        >
          <el-option
            v-for="group in groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>

      <!-- 是否保持策略信息 -->
      <el-form-item label="" v-if="strategyInfo && (strategyInfo.add_time || strategyInfo.initial_price || strategyInfo.add_reason || strategyInfo.notes)">
        <el-radio-group v-model="formData.keepStrategyInfo">
          <el-radio :label="true">加入信息（加入日期、初始价、加入原因、备注）保持与策略相同</el-radio>
          <el-radio :label="false">否</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 初始价格 -->
      <el-form-item label="初始价格" prop="initial_price">
        <el-input-number
          v-model="formData.initial_price"
          :precision="2"
          :min="0"
          placeholder="请输入初始价格"
          style="width: 100%"
          :disabled="formData.keepStrategyInfo && strategyInfo?.initial_price != null"
        />
      </el-form-item>

      <!-- 加入原因 -->
      <el-form-item label="加入原因" prop="add_reason">
        <el-input
          v-model="formData.add_reason"
          type="textarea"
          :rows="3"
          placeholder="请输入加入原因"
          maxlength="500"
          show-word-limit
          :disabled="formData.keepStrategyInfo && strategyInfo?.add_reason"
        />
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息（可选）"
          maxlength="500"
          show-word-limit
          :disabled="formData.keepStrategyInfo && strategyInfo?.notes"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
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
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserGroups } from '@/api/modules/stockGroup'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  stockData: {
    type: Object,
    default: () => ({})
  },
  strategyInfo: {
    type: Object,
    default: () => ({
      add_time: null,
      initial_price: null,
      add_reason: '',
      notes: ''
    })
  }
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref()
const loading = ref(false)
const groupsLoading = ref(false)
const groups = ref([])

// 表单数据
const formData = ref({
  group_ids: [],
  initial_price: null,
  add_reason: '',
  remark: '',
  keepStrategyInfo: true // 默认保持策略信息
})

// 表单验证规则（动态验证，当保持策略信息时跳过某些字段的必填验证）
const formRules = computed(() => {
  const rules = {
    group_ids: [
      { required: true, message: '请至少选择一个分组', trigger: 'change' },
      { type: 'array', min: 1, message: '请至少选择一个分组', trigger: 'change' }
    ]
  }

  // 如果选择保持策略信息，且策略信息中有初始价格，则不需要必填验证
  if (!formData.value.keepStrategyInfo || props.strategyInfo?.initial_price == null) {
    rules.initial_price = [
      { required: true, message: '请输入初始价格', trigger: 'blur' },
      { type: 'number', min: 0, message: '初始价格必须大于等于0', trigger: 'blur' }
    ]
  } else {
    rules.initial_price = [
      { type: 'number', min: 0, message: '初始价格必须大于等于0', trigger: 'blur' }
    ]
  }

  // 如果选择保持策略信息，且策略信息中有加入原因，则不需要必填验证
  if (!formData.value.keepStrategyInfo || !props.strategyInfo?.add_reason) {
    rules.add_reason = [
      { required: true, message: '请输入加入原因', trigger: 'blur' },
      { min: 1, max: 500, message: '加入原因长度在1-500个字符', trigger: 'blur' }
    ]
  } else {
    rules.add_reason = [
      { max: 500, message: '加入原因长度不能超过500个字符', trigger: 'blur' }
    ]
  }

  return rules
})

// 获取交易所名称
const getExchangeName = (code) => {
  const exchangeMap = {
    'SH': '上交所',
    'SZ': '深交所',
    'HK': '港交所',
    'US': '美股'
  }
  return exchangeMap[code] || code || '--'
}

// 获取分组列表
const fetchGroups = async () => {
  groupsLoading.value = true
  try {
    const response = await getUserGroups()
    if (response?.success) {
      const items = response.payload?.items || []
      groups.value = items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    } else {
      ElMessage.error(response?.message || '获取分组列表失败')
    }
  } catch (error) {
    console.error('获取分组列表失败:', error)
    ElMessage.error('获取分组列表失败，请稍后重试')
  } finally {
    groupsLoading.value = false
  }
}

// 监听弹窗显示状态
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 重置表单
    formRef.value?.clearValidate()

    // 获取分组列表
    await fetchGroups()

    // 初始化表单数据
    const keepStrategyInfo = true // 默认保持策略信息
    formData.value = {
      group_ids: [],
      initial_price: keepStrategyInfo && props.strategyInfo?.initial_price != null
        ? props.strategyInfo.initial_price
        : (props.stockData?.last_price || props.stockData?.initial_price || null),
      add_reason: keepStrategyInfo && props.strategyInfo?.add_reason
        ? props.strategyInfo.add_reason
        : '',
      remark: keepStrategyInfo && props.strategyInfo?.notes
        ? props.strategyInfo.notes
        : '',
      keepStrategyInfo
    }
  }
})

// 监听是否保持策略信息的变化，自动填充或清空策略信息
watch(() => formData.value.keepStrategyInfo, (newVal) => {
  if (newVal && props.strategyInfo) {
    // 选择"是"时，自动填充策略信息
    if (props.strategyInfo.initial_price != null) {
      formData.value.initial_price = props.strategyInfo.initial_price
    }
    if (props.strategyInfo.add_reason) {
      formData.value.add_reason = props.strategyInfo.add_reason
    }
    if (props.strategyInfo.notes) {
      formData.value.remark = props.strategyInfo.notes
    }
  } else if (!newVal) {
    // 选择"否"时，如果之前是策略信息，则清空让用户重新输入
    // 但保留用户已经输入的内容（如果有的话）
    // 这里不清空，让用户自己决定
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

    // 如果选择保持策略信息，优先使用策略信息
    let finalInitialPrice = formData.value.initial_price
    let finalAddReason = formData.value.add_reason
    let finalRemark = formData.value.remark
    let finalAddTime = null

    if (formData.value.keepStrategyInfo && props.strategyInfo) {
      // 优先使用策略信息，如果策略信息中没有，则使用用户输入的值
      // 如果选择保持策略信息，使用股票的加入日期
      if (props.strategyInfo?.add_time) {
        finalAddTime = props.strategyInfo.add_time
      }
      if (props.strategyInfo.initial_price != null) {
        finalInitialPrice = props.strategyInfo.initial_price
      }
      if (props.strategyInfo.add_reason) {
        finalAddReason = props.strategyInfo.add_reason
      }
      if (props.strategyInfo.notes) {
        finalRemark = props.strategyInfo.notes
      }
    }
    // 如果选择"否"，则不传加入日期（finalAddTime 保持为 null）

    // 准备提交数据
    const submitData = {
      group_ids: formData.value.group_ids,
      initial_price: finalInitialPrice || 0,
      add_reason: finalAddReason || '',
      remark: finalRemark || ''
    }

    // 只有当选择保持策略信息且有股票的加入日期时，才传递 add_time
    if (finalAddTime) {
      submitData.add_time = finalAddTime
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
