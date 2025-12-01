<template>
  <div class="user-mgt-container">
    <div class="search-title">
      <el-input
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索用户名、手机号或公司"
        clearable
        @keyup.enter="searchHandler"
      />
      <el-button class="search-btn" type="primary" @click="searchHandler">搜索</el-button>
      <el-button class="search-btn" type="primary" @click="reset">重置</el-button>
      <el-button
        class="new-user"
        type="primary"
        @click="addUserFn"
        v-permission="permissions.USER_CREATE"
      >
        新建员工账号
      </el-button>
      <el-button
        class="invite-user"
        type="success"
        @click="showInviteDialog"
        v-permission="permissions.USER_CREATE"
      >
        邀请员工注册
      </el-button>
      <!-- <el-button class="export-btn" type="success" @click="exportUsers" :icon="Download">导出</el-button> -->
    </div>

    <el-table
      class="user-table"
      max-height="calc(100% - 100px)"
      :data="userList"
      v-loading="tableLoading"
      element-loading-text="加载用户数据中..."
      @filter-change="handleFilterChange"
      @sort-change="handleSortChange"
    >
      <el-table-column v-for="item in columns"
        :column-key="item.key"
        :prop="item.prop"
        :label="item.label"
        :filters="item.filters"
        :filterable="!!item.filters"
        :sortable="!!item.sortable"
        :width="item.width"
      >
        <template #default="{ row, $index }">
          <span v-if="item.key === 'index'" :key="$index">
            {{ $index + 1 }}
          </span>
          <span v-else-if="item.key === 'createdAt'">
            {{ row[item.prop] ? formatDateTime(row[item.prop]) : '--' }}
          </span>
          <span v-else-if="item.key === 'roleName'">
            <el-tag :type="getRoleTagType(row.roleName)">
              {{ row.isMainAccount ? '主账号（超级管理员）' : row.roleDisplayName || '--' }}
            </el-tag>
          </span>
          <span v-else-if="item.key === 'isActive'">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </span>
          <span v-else class="ellipsis" :title="row[item.prop] || '--'">
            {{ row[item.prop] || '--' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column fixed="right" label="操作" width="250">
        <template v-slot="scope">
          <el-button
            link
            type="primary"
            @click="operateHandler('view', scope.row.id)"
            v-permission="permissions.USER_VIEW"
          >
            查看
          </el-button>
          <el-button
            link
            type="primary"
            @click="operateHandler('edit', scope.row.id)"
            v-if="!scope.row.isMainAccount || isMainAccount"
            v-permission="permissions.USER_EDIT"
          >
            编辑
          </el-button>
          <el-popconfirm
            v-permission="permissions.USER_DELETE"
            v-if="!scope.row.isMainAccount"
            title="确定要删除该用户吗？"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="operateHandler('delete', scope.row.id)"
          >
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
          <el-popconfirm
            v-permission="permissions.USER_DELETE"
            v-if="scope.row.isMainAccount && showSwitchErpBtn"
            title="确定要切换回ERP模式吗？"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="operateHandler('switchErp', scope.row.parentId || scope.row.id)"
          >
            <template #reference>
              <el-button link type="danger">切换ERP</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pagination"
      v-model:current-page="page.pageNo"
      :page-size="page.pageSize"
      :total="page.total"
      layout="total, prev, pager, next"
      @current-change="handlePageChange"
    />

    <!-- 用户管理弹窗 -->
    <UserDialog
      v-model:visible="dialogVisible"
      :form-data="userForm"
      :is-view-mode="isViewMode"
      :is-edit-mode="isEditMode"
      :available-roles="availableRoles"
      @submit="submitUser"
    />

    <!-- 邀请注册弹窗 -->
    <InviteDialog
      v-model:visible="inviteDialogVisible"
      :available-roles="availableRoles"
      @generate-link="generateInviteLink"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import {
  getUsersByMaster,
  createSubUser,
  updateUser,
  getUserDetail,
  deleteUser,
  getRolesByMaster,
  getMasterId
} from '@/api/modules/customerUser'
import UserDialog from './components/UserDialog.vue'
import InviteDialog from './components/InviteDialog.vue'
import { formatDateTime } from '@/utils/time'
import { jsonToExcel } from '@/utils/excel'
import { usePermissions } from '@/composables/usePermissions'
import { copyToClipboard } from '@/utils/copy'
import { deleteCookieConfig, getCookieConfig } from '@/api/modules/cookieConfig'
import { getCurrentUserInfo } from '@/api/modules/customerUser';
import { removeLocal } from '@/utils/storage'

// 权限相关
const { permissions, isMainAccount } = usePermissions()

// 响应式数据
const searchQuery = ref('')
const userList = ref([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isViewMode = ref(false)
const isEditMode = ref(false)
const availableRoles = ref([])
const inviteDialogVisible = ref(false)
const showSwitchErpBtn = ref(false)

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 过滤参数
const filterParams = reactive({})

// 表格列配置
const columns = reactive([
  {
    key: 'index',
    label: '序号',
    width: 80,
  },
  {
    key: 'username',
    label: '用户名',
    prop: 'username',
    width: 150
  },
  {
    key: 'phone',
    label: '手机号',
    prop: 'phone',
    width: 150
  },
  {
    key: 'company',
    label: '公司',
    prop: 'company',
    width: 200
  },
  {
    key: 'roleName',
    label: '角色',
    prop: 'roleDisplayName',
    width: 150
  },
  {
    key: 'isActive',
    label: '状态',
    prop: 'isActive',
    width: 80
  },
  {
    key: 'remark',
    label: '备注',
    prop: 'remark',
  },
  {
    key: 'createdAt',
    label: '创建时间',
    prop: 'createdAt',
    sortable: true,
    width: 160
  }
])

// 初始化用户表单
const initUserForm = () => {
  return {
    id: null,
    username: '',
    phone: '',
    company: '',
    remark: '',
    password: '',
    passwordConfirmation: ''
  }
}

const userForm = ref(initUserForm())

// 页面加载时获取用户列表
onMounted(() => {
  loadAvailableRoles()
  searchHandler()
  initSwitchErpVisibility()
})

// 获取可用角色列表
const loadAvailableRoles = async () => {
  try {
    const response = await getRolesByMaster()
    if (response.success) {
      availableRoles.value = response.result
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
  }
}

// 获取角色标签类型
const getRoleTagType = (roleName) => {
  const roleTypes = {
    master: 'danger',
    warehouseManager: 'warning',
    shopOperator: 'success'
  }
  return roleTypes[roleName] || 'info'
}

// 获取用户列表
const getUserList = async () => {
  try {
    tableLoading.value = true
    const response = await getUsersByMaster({
      pageNo: page.pageNo,
      pageSize: page.pageSize,
      search: searchQuery.value,
      ...filterParams
    })

    if (response.success) {
      userList.value = response.result.data || []
      page.total = response.result.count || 0

      // 标记主账号
      userList.value = userList.value.map(user => ({
        ...user,
        isMainAccount: !user.parentId // parentId为空说明是主账号
      }))
    } else {
      ElMessage.error('获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败，请稍后重试')
  } finally {
    tableLoading.value = false
  }
}

// 过滤处理
const handleFilterChange = (filters) => {
  // 可以在这里添加过滤逻辑
  searchHandler()
}

// 排序处理
const handleSortChange = (sort) => {
  if (sort.prop) {
    page.sortOrders = {
      [sort.prop]: sort.order === 'ascending' ? 'ASC' : 'DESC'
    }
    searchHandler()
  }
}

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage
  getUserList()
}

// 搜索处理
const searchHandler = () => {
  page.pageNo = 1
  getUserList()
}

// 重置搜索
const reset = () => {
  searchQuery.value = ''
  searchHandler()
}

// 操作处理
const operateHandler = (type, id) => {
  switch(type) {
    case 'edit':
    case 'view':
      getUserDetail(id).then(res => {
        if (!res.success) return
        const data = {...res.result}
        userForm.value = data
        isViewMode.value = type === 'view'
        isEditMode.value = type === 'edit'
        dialogVisible.value = true
      })
      break
    case 'delete':
      deleteUser(id).then((res) => {
        if (!res) return
        ElMessage.success('删除用户成功')
        searchHandler()
      })
      break
    case 'switchErp':
      switchErp(id).then((res) => {
        if (!res) return
        ElMessage.success('切换ERP模式成功')
        searchHandler()
      })
      break
    default:
      break
  }
}

// 新增用户
const addUserFn = () => {
  dialogVisible.value = true
  isViewMode.value = false
  isEditMode.value = false
  userForm.value = initUserForm()
}

// 显示邀请注册弹窗
const showInviteDialog = () => {
  inviteDialogVisible.value = true
}

// 生成邀请链接
const generateInviteLink = async (roleId) => {
  try {
    // 获取当前用户的主账号ID
    const response = await getMasterId()
    if (!response.success) {
      ElMessage.error('获取主账号ID失败')
      return
    }

    const masterId = response.result.masterId

    // 获取当前域名和注册页面路径
    const baseUrl = window.location.origin
    const registerPath = '/register'

    // 生成邀请链接，包含主账号ID、角色ID和公司名（只用于前端预填显示）
    const userStore = (await import('@/state/user')).UserStore()
    const company = encodeURIComponent(userStore?.userInfo?.company || '')
    const inviteLink = `${baseUrl}${registerPath}?masterId=${masterId}&roleId=${roleId}&company=${company}`

    // 复制到剪贴板
    copyToClipboard(inviteLink)
    inviteDialogVisible.value = false
  } catch (error) {
    console.error('生成邀请链接失败:', error)
    ElMessage.error('生成邀请链接失败')
  }
}

// 提交用户表单
const submitUser = async (formData) => {
  try {
    let result
    if (formData.id) {
      // 更新用户
      result = await updateUser(formData)
    } else {
      // 创建新用户：主账号使用register，子账号使用createSubUser
      if (isMainAccount.value) {
        // 主账号创建子账号
        result = await createSubUser(formData)
      } else {
        // 这种情况理论上不应该出现，因为只有主账号能创建用户
        throw new Error('无权限创建用户')
      }
    }

    if (result && result.success !== false) {
      ElMessage.success(formData.id ? '更新用户成功' : '新增用户成功')
      dialogVisible.value = false
      searchHandler()
      userForm.value = initUserForm()
      // 重新加载角色列表
      await loadAvailableRoles()
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败：' + (error.response?.data?.message || error.message))
  }
}

// 切换ERP：删除整条 Cookie 配置记录
const switchErp = async (ownerId) => {
  try {
    const res = await deleteCookieConfig(ownerId)
    if (res && res.success !== false) {
      removeLocal('cookie')
      removeLocal('agentCookie')
      showSwitchErpBtn.value = false
      getCurrentUserInfo()
      return true
    }
    return false
  } catch (error) {
    console.error('切换ERP失败:', error)
    ElMessage.error('切换ERP失败：' + (error.response?.data?.message || error.message))
    return false
  }
}

// 初始化“切换ERP”按钮显示：仅主账号存在任一Cookie时展示
const initSwitchErpVisibility = async () => {
  try {
    const masterResp = await getMasterId()
    if (!masterResp?.success) {
      showSwitchErpBtn.value = false
      return
    }
    const ownerId = masterResp.result?.masterId
    const cfgResp = await getCookieConfig(ownerId)
    if (cfgResp?.success) {
      const cfg = cfgResp.result || {}
      showSwitchErpBtn.value = !!(cfg.hasCookie || cfg.hasAgentCookie)
    } else {
      showSwitchErpBtn.value = false
    }
  } catch (e) {
    console.error('初始化切换ERP按钮状态失败:', e)
    showSwitchErpBtn.value = false
  }
}

// 导出用户数据
const exportUsers = () => {
  try {
    const exportData = userList.value.map(user => ({
      'ID': user.id,
      '用户名': user.username,
      '手机号': user.phone,
      '公司': user.company,
      '备注': user.remark,
      '创建时间': formatDateTime(user.createdAt)
    }))

    // 使用已有的 jsonToExcel 导出工具
    jsonToExcel(exportData)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请稍后重试')
  }
}

// 权限常量供模板使用
// 由于在script setup中定义，可以直接在模板中使用
</script>

<style scoped lang="less">
.user-mgt-container {
  height: 100vh;
  background-color: #fff;
  padding: 20px;

  .search-title {
    overflow: hidden;

    .search-input {
      float: left;
      width: 300px;
      margin-right: 20px;
    }

    .search-btn {
      float: left;
      margin-right: 10px;
    }

    .new-user {
      float: right;
      margin-left: 10px;
    }

    .invite-user {
      float: right;
      margin-left: 10px;
    }

    .export-btn {
      float: right;
    }
  }

  .user-table {
    margin-top: 20px;
    width: 100%;
  }

  .pagination {
    float: right;
    margin-top: 20px;
  }
}

.ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
