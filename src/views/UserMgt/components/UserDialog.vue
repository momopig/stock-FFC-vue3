<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="dialogTitle"
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
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="formData.username"
          :disabled="isViewMode"
          placeholder="请输入用户名"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="formData.email"
          :disabled="isViewMode"
          placeholder="请输入邮箱"
          type="email"
          maxlength="100"
        />
      </el-form-item>

      <el-form-item label="全名" prop="full_name">
        <el-input
          v-model="formData.full_name"
          :disabled="isViewMode"
          placeholder="请输入全名"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <!-- 密码字段（新建时必填，编辑时选填） -->
      <el-form-item
        v-if="!isViewMode"
        label="密码"
        prop="password"
      >
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="isEditMode ? '留空则不修改密码' : '请输入密码'"
          show-password
          maxlength="20"
        />
      </el-form-item>

      <el-form-item
        v-if="!isViewMode && formData.password"
        label="确认密码"
        prop="passwordConfirmation"
      >
        <el-input
          v-model="formData.passwordConfirmation"
          type="password"
          placeholder="请再次输入密码"
          show-password
          maxlength="20"
        />
      </el-form-item>

      <!-- 账号状态（编辑时显示） -->
      <el-form-item v-if="isEditMode && !isViewMode" label="账号状态">
        <el-switch
          v-model="formData.is_active"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <!-- 超级管理员（编辑时显示） -->
      <el-form-item v-if="isEditMode && !isViewMode" label="超级管理员">
        <el-switch
          v-model="formData.is_superuser"
          active-text="是"
          inactive-text="否"
        />
      </el-form-item>
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
  if (props.isViewMode) return '查看用户'
  if (props.isEditMode) return '编辑用户'
  return '新建用户'
})

// 表单验证规则
const formRules = computed(() => {
  const rules = {
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 50, message: '用户名长度在2-50个字符', trigger: 'blur' }
    ],
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
    ],
    full_name: [
      { max: 100, message: '全名长度不能超过100个字符', trigger: 'blur' }
    ]
  }

  // 新建用户时，密码为必填
  if (!props.isEditMode && !props.isViewMode) {
    rules.password = [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' }
    ]
    rules.passwordConfirmation = [
      {
        validator: (rule, value, callback) => {
          if (props.formData.password && value !== props.formData.password) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }

  // 编辑时，如果输入了密码，则需要确认密码
  if (props.isEditMode && !props.isViewMode) {
    if (props.formData.password) {
      rules.password = [
        { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' }
      ]
      rules.passwordConfirmation = [
        { required: true, message: '请确认密码', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value !== props.formData.password) {
              callback(new Error('两次输入的密码不一致'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ]
    }
  }

  return rules
})

// 监听对话框显示状态
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    nextTick(() => {
      formRef.value?.clearValidate()
    })
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

    // 如果没有输入密码（编辑模式），则删除密码字段
    if (props.isEditMode && !submitData.password) {
      delete submitData.password
      delete submitData.passwordConfirmation
    }

    // 删除确认密码字段
    delete submitData.passwordConfirmation

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
