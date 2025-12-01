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

      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="formData.phone"
          :disabled="isViewMode"
          placeholder="请输入手机号"
          maxlength="11"
        />
      </el-form-item>

      <el-form-item label="公司" prop="company">
        <el-input
          v-model="formData.company"
          :disabled="true"
          placeholder="公司由主账号确定"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          :disabled="isViewMode"
          type="textarea"
          :rows="3"
          placeholder="请输入备注"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 角色选择（主账号不显示） -->
      <el-form-item
        v-if="!isMainAccountEdit"
        label="角色"
        prop="roleId"
      >
        <el-select
          v-model="formData.roleId"
          placeholder="请选择角色"
          style="width: 100%"
          :disabled="isViewMode"
        >
          <el-option
            v-for="role in availableRoles"
            :key="role.id"
            :label="role.displayName"
            :value="role.id"
          >
            <span>{{ role.displayName }}</span>
            <span style="float: right; color: #8492a6; font-size: 13px">
              {{ role.name }}
            </span>
          </el-option>
        </el-select>
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
      <el-form-item v-if="isEditMode && !isMainAccountEdit" label="账号状态">
        <el-switch
          v-model="formData.isActive"
          active-text="启用"
          inactive-text="禁用"
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
import { UserStore } from '@/state/user'

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
  availableRoles: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref()
const loading = ref(false)

// 是否为主账号编辑
const isMainAccountEdit = computed(() => {
  return props.isEditMode && !props.formData.parentId
})

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
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
    ]
  }

  // 新建用户时，角色为必填，密码为必填
  if (!props.isEditMode && !props.isViewMode) {
    if (!isMainAccountEdit.value) {
      rules.roleId = [
        { required: true, message: '请选择角色', trigger: 'change' }
      ]
    }
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

// 获取角色标签类型
const getRoleTagType = (roleName) => {
  const roleTypes = {
    master: 'danger',
    warehouseManager: 'warning',
    shopOperator: 'success'
  }
  return roleTypes[roleName] || 'info'
}

// 监听对话框显示状态
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    nextTick(() => {
      formRef.value?.clearValidate()
    })
    // 新建用户时，自动预填当前主账号公司，并保持只读
    if (!props.isEditMode && !props.isViewMode) {
      const userStore = UserStore()
      const masterCompany = userStore?.userInfo?.company || ''
      if (masterCompany) {
        props.formData.company = masterCompany
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
