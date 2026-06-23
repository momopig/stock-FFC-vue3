<template>
  <div class="role-mgt-page">
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新建角色</el-button>
      <el-button @click="loadRoles">刷新</el-button>
    </div>

    <el-table :data="roles" border stripe v-loading="loading">
      <el-table-column prop="role_key" label="角色标识" min-width="220">
        <template #default="scope">
          <div class="role-key-cell">
            <span>{{ getRoleKeyLabel(scope.row.role_key) }}</span>
            <span class="role-key-raw">{{ scope.row.role_key }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="role_name" label="角色名称" min-width="140" />
      <el-table-column prop="is_builtin" label="类型" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.is_builtin ? 'info' : 'success'">
            {{ scope.row.is_builtin ? '内置' : '自定义' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="权限码" min-width="420">
        <template #default="scope">
          <el-space wrap>
            <el-tag v-for="code in scope.row.permission_codes || []" :key="`${scope.row.id}-${code}`" size="small">{{ getPermissionLabel(code) }}</el-tag>
          </el-space>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="scope">
          <el-button link type="primary" :disabled="scope.row.is_builtin" @click="openEdit(scope.row)">编辑</el-button>
          <el-popconfirm
            title="确认删除该角色吗？"
            @confirm="removeRole(scope.row)"
            :disabled="scope.row.is_builtin"
          >
            <template #reference>
              <el-button link type="danger" :disabled="scope.row.is_builtin">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px" :close-on-click-modal="false">
      <el-form label-width="110px" :model="form">
        <el-form-item label="角色标识">
          <el-input v-model="form.role_key" :disabled="isEdit" placeholder="如 custom_risk_viewer" />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="form.role_name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="权限选择">
          <el-tree
            ref="permissionTreeRef"
            class="permission-tree"
            :data="permissionTree"
            node-key="key"
            show-checkbox
            default-expand-all
            :props="treeProps"
            @check="handleTreeCheck"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRole">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createRole, deleteRole, getRoleDefinitions, getRoleList, updateRole } from '@/api/modules/role'
import { menuPermissionGroups } from '@/config/menuPermissionSchema'

const loading = ref(false)
const roles = ref([])
const permissionDefs = ref([])
const permissionDefMap = ref({})
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingRoleId = ref(null)
const permissionTreeRef = ref(null)
const treeProps = { label: 'label', children: 'children' }

const ROLE_KEY_LABEL_MAP = {
  builtin_user: '普通用户',
  builtin_trading_user: '交易策略用户',
  builtin_super_admin: '超级管理员',
}

const permissionTree = computed(() => {
  const availableCodes = new Set(permissionDefs.value.map(item => item.code))
  const groupedCodes = new Set()

  const groups = menuPermissionGroups.map(group => ({
    ...group,
    children: group.children
      .filter(node => availableCodes.has(node.key))
      .map(node => ({
        ...node,
        label: getPermissionLabel(node.key) || node.label,
      })),
  })).filter(group => group.children.length > 0)

  groups.forEach(group => {
    group.children.forEach(node => groupedCodes.add(node.key))
  })

  const uncategorizedChildren = permissionDefs.value
    .filter(item => !groupedCodes.has(item.code))
    .map(item => ({ key: item.code, label: getPermissionLabel(item.code) }))

  if (uncategorizedChildren.length > 0) {
    groups.push({
      key: 'group:uncategorized',
      label: '未挂载菜单权限',
      children: uncategorizedChildren,
    })
  }

  return groups
})

const form = reactive({
  role_key: '',
  role_name: '',
  description: '',
  permission_codes: []
})

const dialogTitle = computed(() => (isEdit.value ? '编辑角色' : '新建角色'))

function resetForm() {
  form.role_key = ''
  form.role_name = ''
  form.description = ''
  form.permission_codes = []
  editingRoleId.value = null
}

function getRoleKeyLabel(roleKey) {
  return ROLE_KEY_LABEL_MAP[roleKey] || roleKey
}

function getPermissionLabel(code) {
  return permissionDefMap.value[code]?.name || code
}

function syncTreeChecked() {
  nextTick(() => {
    const tree = permissionTreeRef.value
    if (!tree) return
    tree.setCheckedKeys(form.permission_codes || [])
  })
}

function handleTreeCheck() {
  const tree = permissionTreeRef.value
  if (!tree) return
  form.permission_codes = tree.getCheckedKeys(true)
}

async function loadRoles() {
  loading.value = true
  try {
    const result = await getRoleList()
    roles.value = result?.payload?.items || []
  } catch (error) {
    ElMessage.error(error?.message || '加载角色失败')
    roles.value = []
  } finally {
    loading.value = false
  }
}

async function loadPermissionDefs() {
  try {
    const result = await getRoleDefinitions()
    const items = result?.payload?.items || []
    permissionDefs.value = items
    permissionDefMap.value = items.reduce((acc, item) => {
      acc[item.code] = item
      return acc
    }, {})
  } catch (error) {
    ElMessage.error(error?.message || '加载权限定义失败')
    permissionDefs.value = []
    permissionDefMap.value = {}
  }
}

function openCreate() {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
  syncTreeChecked()
}

function openEdit(row) {
  resetForm()
  isEdit.value = true
  editingRoleId.value = row.id
  form.role_key = row.role_key
  form.role_name = row.role_name || getRoleKeyLabel(row.role_key)
  form.description = row.description || ''
  form.permission_codes = [...(row.permission_codes || [])]
  dialogVisible.value = true
  syncTreeChecked()
}

async function submitRole() {
  try {
    if (!form.role_key.trim() || !form.role_name.trim()) {
      ElMessage.warning('角色标识和角色名称不能为空')
      return
    }

    if (isEdit.value) {
      await updateRole(editingRoleId.value, {
        role_name: form.role_name,
        description: form.description,
        permission_codes: form.permission_codes,
      })
      ElMessage.success('更新成功')
    } else {
      await createRole({
        role_key: form.role_key,
        role_name: form.role_name,
        description: form.description,
        permission_codes: form.permission_codes,
      })
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    await loadRoles()
  } catch (error) {
    ElMessage.error(error?.message || '保存失败')
  }
}

async function removeRole(row) {
  try {
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    await loadRoles()
  } catch (error) {
    ElMessage.error(error?.message || '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([loadRoles(), loadPermissionDefs()])
})
</script>

<style scoped>
.role-mgt-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  gap: 10px;
}

.role-key-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.role-key-raw {
  color: #909399;
  font-size: 12px;
}

.permission-tree {
  width: 100%;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px 10px;
  max-height: 320px;
  overflow: auto;
}
</style>
