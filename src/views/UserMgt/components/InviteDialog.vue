<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="邀请员工"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="选择角色" prop="roleId">
        <el-select
          v-model="formData.roleId"
          placeholder="请选择要邀请的角色"
          style="width: 100%"
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
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleGenerateLink">
          生成邀请链接
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  availableRoles: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'generate-link'])

const formRef = ref()

// 表单数据
const formData = reactive({
  roleId: '',
  description: ''
})

// 表单验证规则
const formRules = {
  roleId: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 监听对话框显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      formRef.value?.clearValidate()
      // 重置表单数据
      formData.roleId = ''
      formData.description = ''
    })
  }
})

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}

// 生成邀请链接
const handleGenerateLink = async () => {
  try {
    await formRef.value.validate()

    if (!formData.roleId) {
      ElMessage.error('请选择角色')
      return
    }

    emit('generate-link', formData.roleId)
  } catch (error) {
    console.log('表单验证失败:', error)
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
