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
      label-width="120px"
      v-loading="loading"
    >
      <el-form-item label="股票代码" prop="code">
        <el-input
          v-model="formData.code"
          :disabled="isViewMode"
          placeholder="请输入股票代码，如：000001"
          maxlength="10"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="股票名称" prop="name">
        <el-input
          v-model="formData.name"
          :disabled="isViewMode"
          placeholder="请输入股票名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

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
          <el-form-item label="初始价格" prop="initialPrice">
            <el-input-number
              v-model="formData.initialPrice"
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
          <el-form-item label="优先级" prop="priorityLevel">
            <el-select
              v-model="formData.priorityLevel"
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

      <el-form-item label="加入方式" prop="addMethod">
        <el-radio-group v-model="formData.addMethod" :disabled="isViewMode">
          <el-radio label="manual">手动加入</el-radio>
          <el-radio label="strategy">策略加入</el-radio>
          <el-radio label="import">导入</el-radio>
          <el-radio label="other">其他</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="加入原因" prop="reason">
        <el-input
          v-model="formData.reason"
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

      <el-form-item label="创建人" prop="creator">
        <el-input
          v-model="formData.creator"
          :disabled="true"
          placeholder="自动填充当前用户"
        />
      </el-form-item>

      <!-- 查看模式或编辑模式时显示额外信息 -->
      <template v-if="(isViewMode || isEditMode) && formData.id">
        <el-form-item label="加入时间">
          <span>{{ formData.addTime ? formatDateTime(formData.addTime) : '--' }}</span>
        </el-form-item>
        <el-form-item label="加入天数">
          <span>{{ formData.daysAdded !== null && formData.daysAdded !== undefined ? `${formData.daysAdded} 天` : '--' }}</span>
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

// 对话框标题
const dialogTitle = computed(() => {
  if (props.isViewMode) return '查看股票'
  if (props.isEditMode) return '编辑股票'
  return '添加股票'
})

// 表单验证规则
const formRules = computed(() => {
  return {
    code: [
      { required: true, message: '请输入股票代码', trigger: 'blur' },
      { pattern: /^\d{6}$/, message: '股票代码必须为6位数字', trigger: 'blur' }
    ],
    name: [
      { required: true, message: '请输入股票名称', trigger: 'blur' },
      { min: 1, max: 50, message: '股票名称长度在1-50个字符', trigger: 'blur' }
    ],
    exchange_code: [
      { required: true, message: '请选择交易所', trigger: 'change' }
    ],
    initialPrice: [
      { required: true, message: '请输入初始价格', trigger: 'blur' },
      { type: 'number', min: 0, message: '初始价格必须大于0', trigger: 'blur' }
    ],
    addMethod: [
      { required: true, message: '请选择加入方式', trigger: 'change' }
    ],
    status: [
      { required: true, message: '请选择状态', trigger: 'change' }
    ]
  }
})

// 监听对话框显示状态
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    nextTick(() => {
      formRef.value?.clearValidate()
    })
    // 新建股票时，自动填充创建人和默认值
    if (!props.isEditMode && !props.isViewMode) {
      const userStore = UserStore()
      const username = userStore?.userInfo?.username || userStore?.userInfo?.name || '当前用户'
      if (!props.formData.creator) {
        props.formData.creator = username
      }
      if (!props.formData.addMethod) {
        props.formData.addMethod = 'manual'
      }
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
    const submitData = { ...props.formData }

    // 确保数值类型正确
    if (submitData.initialPrice !== null && submitData.initialPrice !== undefined) {
      submitData.initialPrice = Number(submitData.initialPrice)
    }
    if (submitData.priorityLevel !== null && submitData.priorityLevel !== undefined) {
      submitData.priorityLevel = Number(submitData.priorityLevel)
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
}
</style>

