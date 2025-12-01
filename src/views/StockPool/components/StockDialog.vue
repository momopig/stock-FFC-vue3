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
          <el-form-item label="所属题材" prop="theme">
            <el-input
              v-model="formData.theme"
              :disabled="isViewMode"
              placeholder="请输入所属题材"
              maxlength="50"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属板块" prop="board">
            <el-input
              v-model="formData.board"
              :disabled="isViewMode"
              placeholder="请输入所属板块"
              maxlength="50"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="市值（万元）" prop="marketCap">
            <el-input-number
              v-model="formData.marketCap"
              :disabled="isViewMode"
              :precision="2"
              :min="0"
              placeholder="请输入市值"
              style="width: 100%"
            />
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

      <el-form-item label="加入方式" prop="addMethod">
        <el-radio-group v-model="formData.addMethod" :disabled="isViewMode">
          <el-radio label="manual">手动加入</el-radio>
          <el-radio label="program">程序加入</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="加入原因/策略" prop="reason">
        <el-input
          v-model="formData.reason"
          :disabled="isViewMode"
          type="textarea"
          :rows="4"
          placeholder="请输入加入原因或策略说明"
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
        <el-form-item label="当前股价">
          <span v-if="isViewMode">{{ formData.currentPrice !== null && formData.currentPrice !== undefined ? formData.currentPrice.toFixed(2) : '--' }}</span>
          <el-input-number
            v-else
            v-model="formData.currentPrice"
            :precision="2"
            :min="0"
            placeholder="当前股价（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="涨幅" v-if="isViewMode">
          <span :style="{ color: formData.changePercent >= 0 ? '#f56c6c' : '#67c23a' }">
            {{ formData.changePercent !== null && formData.changePercent !== undefined ? `${formData.changePercent >= 0 ? '+' : ''}${formData.changePercent.toFixed(2)}%` : '--' }}
          </span>
        </el-form-item>
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
    initialPrice: [
      { required: true, message: '请输入初始价格', trigger: 'blur' },
      { type: 'number', min: 0, message: '初始价格必须大于0', trigger: 'blur' }
    ],
    addMethod: [
      { required: true, message: '请选择加入方式', trigger: 'change' }
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
    if (submitData.marketCap !== null && submitData.marketCap !== undefined) {
      submitData.marketCap = Number(submitData.marketCap)
    }
    if (submitData.initialPrice !== null && submitData.initialPrice !== undefined) {
      submitData.initialPrice = Number(submitData.initialPrice)
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

