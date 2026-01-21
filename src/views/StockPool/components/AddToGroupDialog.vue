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

      <!-- 初始价格 -->
      <el-form-item label="初始价格" prop="initial_price">
        <el-input-number
          v-model="formData.initial_price"
          :precision="2"
          :min="0"
          placeholder="请输入初始价格"
          style="width: 100%"
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
  remark: ''
})

// 表单验证规则
const formRules = {
  group_ids: [
    { required: true, message: '请至少选择一个分组', trigger: 'change' },
    { type: 'array', min: 1, message: '请至少选择一个分组', trigger: 'change' }
  ],
  initial_price: [
    { required: true, message: '请输入初始价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '初始价格必须大于等于0', trigger: 'blur' }
  ],
  add_reason: [
    { required: true, message: '请输入加入原因', trigger: 'blur' },
    { min: 1, max: 500, message: '加入原因长度在1-500个字符', trigger: 'blur' }
  ]
}

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
    formData.value = {
      group_ids: [],
      initial_price: props.stockData?.last_price || props.stockData?.initial_price || null,
      add_reason: '',
      remark: ''
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
    const submitData = {
      group_ids: formData.value.group_ids,
      initial_price: formData.value.initial_price || 0,
      add_reason: formData.value.add_reason || '',
      remark: formData.value.remark || ''
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
