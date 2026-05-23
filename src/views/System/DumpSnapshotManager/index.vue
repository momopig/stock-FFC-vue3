<template>
  <div class="dump-manager-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">Snapshot Governance</span>
        <h2>Dump 版本管理台</h2>
        <p>
          支持在当前环境一键发起 dump 导出离线任务、上传外部
          dump、下载任意版本文件，并将任意版本恢复到当前环境的指定目标库，形成生产与开发可互通的版本流转链路。
        </p>
        <div class="hero-meta">
          <span>扫描目录：{{ overview.root_path || '--' }}</span>
          <span>最新快照：{{ overview.latest_snapshot_name || '--' }}</span>
          <span
            >最近时间：{{ formatDateTime(overview.latest_snapshot_time) }}</span
          >
          <span>导出任务：{{ taskPayload.total || 0 }}</span>
        </div>
      </div>
      <div class="hero-actions hero-actions-wide">
        <el-input
          v-model="filters.keyword"
          class="toolbar-input"
          clearable
          placeholder="搜索文件名、备注、标签、来源库、环境"
          @keyup.enter="loadPage"
        />
        <el-button
          type="primary"
          :disabled="!overview.export_ready"
          :loading="actionLoading"
          @click="openExportDialog"
          >导出最新版本</el-button
        >
        <el-button
          type="success"
          :loading="actionLoading"
          @click="uploadDialog.visible = true"
          >上传本地 dump</el-button
        >
        <el-button :loading="pageLoading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <section class="health-panel">
      <el-alert
        :type="
          overview.export_ready && overview.restore_ready
            ? 'success'
            : 'warning'
        "
        :closable="false"
        show-icon
      >
        <template #title>
          环境自检：{{
            overview.export_ready && overview.restore_ready
              ? '当前环境可直接执行导出与导入'
              : '当前环境缺少部分导出/导入条件'
          }}
        </template>
        <div class="health-summary">
          <span
            >服务端主版本：{{ overview.postgres_server_major || '--' }}</span
          >
          <span>工具镜像：{{ overview.postgres_tool_image || '--' }}</span>
          <span
            >镜像已预载：{{
              overview.postgres_tool_image_present ? '是' : '否'
            }}</span
          >
          <span
            >本机 pg_dump：{{
              overview.local_pg_dump_available ? '可用' : '缺失'
            }}</span
          >
          <span
            >本机 psql：{{
              overview.local_psql_available ? '可用' : '缺失'
            }}</span
          >
          <span>Docker：{{ overview.docker_available ? '可用' : '缺失' }}</span>
        </div>
        <div class="health-message">
          {{ overview.environment_check_message || '正在检测当前环境能力' }}
        </div>
      </el-alert>
    </section>

    <section class="metric-grid">
      <article class="metric-card accent-blue">
        <span>快照数量</span>
        <strong>{{ overview.snapshot_count || 0 }}</strong>
        <small>当前纳入管理的 dump 文件</small>
      </article>
      <article class="metric-card accent-amber">
        <span>总容量</span>
        <strong>{{ overview.total_size_label || '0 B' }}</strong>
        <small>便于预估磁盘占用</small>
      </article>
      <article class="metric-card accent-green">
        <span>元数据覆盖</span>
        <strong>{{ overview.metadata_coverage_count || 0 }}</strong>
        <small>缺失 {{ overview.missing_metadata_count || 0 }} 个</small>
      </article>
      <article class="metric-card accent-slate">
        <span>导出进行中</span>
        <strong>{{ activeTaskCount }}</strong>
        <small>{{ selectedItem?.file_name || '当前可选择任意版本' }}</small>
      </article>
    </section>

    <section class="workspace-grid">
      <main class="table-panel">
        <div class="panel-heading wide">
          <div>
            <h3>版本列表</h3>
            <p>
              导出完成后会自动出现在这里，支持下载、备注、删除，以及恢复到当前环境指定目标库。
            </p>
          </div>
          <div class="panel-hint">
            <span>共 {{ listPayload.total || 0 }} 条</span>
            <span>{{ listPayload.total_size_label || '0 B' }}</span>
          </div>
        </div>

        <el-table
          v-loading="pageLoading"
          :data="items"
          border
          highlight-current-row
          class="snapshot-table"
          @current-change="handleCurrentChange"
        >
          <el-table-column label="版本" min-width="230">
            <template #default="scope">
              <div class="file-cell">
                <strong>{{
                  scope.row.display_name || scope.row.file_name
                }}</strong>
                <span>{{ scope.row.file_name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="来源环境" min-width="120">
            <template #default="scope">{{
              scope.row.source_env || '--'
            }}</template>
          </el-table-column>
          <el-table-column label="来源库" min-width="120">
            <template #default="scope">{{
              scope.row.source_db_name || '--'
            }}</template>
          </el-table-column>
          <el-table-column label="目标库建议" min-width="130">
            <template #default="scope">{{
              scope.row.target_db_name || '--'
            }}</template>
          </el-table-column>
          <el-table-column
            prop="size_label"
            label="大小"
            min-width="110"
            sortable
          />
          <el-table-column label="生成时间" min-width="180">
            <template #default="scope">{{
              formatDateTime(scope.row.generated_at || scope.row.updated_at)
            }}</template>
          </el-table-column>
          <el-table-column label="备注" min-width="220" show-overflow-tooltip>
            <template #default="scope">{{ scope.row.note || '--' }}</template>
          </el-table-column>
          <el-table-column label="操作" min-width="280" fixed="right">
            <template #default="scope">
              <div class="action-group">
                <el-button
                  link
                  type="primary"
                  @click.stop="openEditDialog(scope.row)"
                  >编辑</el-button
                >
                <el-button
                  link
                  type="info"
                  @click.stop="downloadSnapshot(scope.row)"
                  >下载</el-button
                >
                <el-button
                  link
                  type="success"
                  @click.stop="openRestoreDialog(scope.row)"
                  >导入</el-button
                >
                <el-button
                  link
                  type="danger"
                  @click.stop="confirmDelete(scope.row)"
                  >删除</el-button
                >
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="panel-heading wide second-heading">
          <div>
            <h3>最近导出任务</h3>
            <p>
              导出按钮会创建离线任务；任务完成后版本文件会自动进入上方列表。
            </p>
          </div>
          <div class="panel-hint">
            <span>运行中 {{ activeTaskCount }} 个</span>
          </div>
        </div>

        <el-table
          v-loading="taskLoading"
          :data="taskItems"
          border
          class="task-table"
        >
          <el-table-column prop="file_name" label="目标文件" min-width="200" />
          <el-table-column label="状态" min-width="120">
            <template #default="scope">
              <el-tag size="small" :type="taskStatusType(scope.row.status)">{{
                taskStatusLabel(scope.row.status)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="180">
            <template #default="scope">{{
              formatDateTime(scope.row.created_at)
            }}</template>
          </el-table-column>
          <el-table-column label="完成时间" min-width="180">
            <template #default="scope">{{
              formatDateTime(scope.row.finished_at)
            }}</template>
          </el-table-column>
          <el-table-column
            prop="message"
            label="结果"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column label="操作" min-width="180">
            <template #default="scope">
              <div class="action-group">
                <el-button
                  v-if="scope.row.relative_path"
                  link
                  type="info"
                  @click.stop="downloadTaskFile(scope.row)"
                  >下载</el-button
                >
                <el-button
                  v-if="scope.row.output_excerpt"
                  link
                  type="primary"
                  @click.stop="showTaskOutput(scope.row)"
                  >输出</el-button
                >
              </div>
            </template>
          </el-table-column>
        </el-table>
      </main>

      <aside class="detail-panel">
        <div class="panel-heading compact">
          <div>
            <h3>版本详情</h3>
            <p>查看来源、标签、下载路径和最近导入记录。</p>
          </div>
        </div>

        <div v-if="selectedItem" class="detail-stack">
          <div class="detail-card accent-blue-soft">
            <span class="detail-label">展示名称</span>
            <strong>{{
              selectedItem.display_name || selectedItem.file_name
            }}</strong>
            <small>{{ selectedItem.relative_path }}</small>
          </div>
          <div class="detail-card accent-amber-soft">
            <span class="detail-label">标签</span>
            <div class="tag-wrap" v-if="selectedItem.tags?.length">
              <el-tag
                v-for="tag in selectedItem.tags"
                :key="tag"
                size="small"
                effect="plain"
                >{{ tag }}</el-tag
              >
            </div>
            <small v-else>暂未设置标签</small>
          </div>
          <div class="detail-card accent-green-soft">
            <span class="detail-label">最近导入</span>
            <strong>{{ formatDateTime(selectedItem.last_restore_at) }}</strong>
            <small
              >目标库：{{ selectedItem.last_restore_target || '--' }}</small
            >
          </div>
          <div class="detail-card accent-slate-soft">
            <span class="detail-label">来源</span>
            <strong>{{ selectedItem.source_env || '--' }}</strong>
            <small
              >DB：{{ selectedItem.source_db_host || '--' }} /
              {{ selectedItem.source_db_name || '--' }}</small
            >
          </div>
          <div class="command-card">
            <span class="detail-label">命令提示</span>
            <code
              >在任意环境上传这个 dump 后，可直接导入到目标库
              {{ selectedItem.target_db_name || '自定义数据库' }}</code
            >
          </div>
        </div>
        <el-empty v-else description="请选择一个 dump 版本" />
      </aside>
    </section>

    <el-dialog
      v-model="editDialog.visible"
      title="编辑版本元数据"
      width="620px"
    >
      <el-form label-position="top">
        <el-form-item label="展示名称">
          <el-input
            v-model="editDialog.form.display_name"
            placeholder="例如：生产异常快照-2026-05-23"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editDialog.form.note"
            type="textarea"
            :rows="4"
            placeholder="记录该快照适合排查的问题、来源环境、关联需求等"
          />
        </el-form-item>
        <el-form-item label="标签（逗号分隔）">
          <el-input
            v-model="editDialog.tagInput"
            placeholder="例如：生产, 买点策略, 20260523"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="saveMetadata"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="restoreDialog.visible"
      title="导入到当前环境目标数据库"
      width="520px"
    >
      <el-form label-position="top">
        <el-form-item label="目标数据库名">
          <el-input
            v-model="restoreDialog.form.target_db_name"
            placeholder="例如 stockdb_prod_sync / stockdb_stage_restore"
          />
        </el-form-item>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="安全限制：当前页面不允许直接覆盖应用正在连接的数据库，请指定一个新的目标库名。"
        />
        <el-form-item>
          <el-checkbox v-model="restoreDialog.form.skip_migrations"
            >跳过 Alembic 迁移</el-checkbox
          >
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="restoreDialog.form.skip_post_sync_sql"
            >跳过 Post Sync SQL</el-checkbox
          >
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restoreDialog.visible = false">取消</el-button>
        <el-button
          type="success"
          :loading="actionLoading"
          @click="executeRestore"
          >开始导入</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="exportDialog.visible"
      title="导出当前环境最新 dump"
      width="620px"
    >
      <el-form label-position="top">
        <el-form-item label="展示名称（可选）">
          <el-input
            v-model="exportDialog.form.display_name"
            @input="syncExportNames('display')"
            placeholder="留空则自动生成，并与导出文件名保持一致，例如：stockdb-prod-20260523_14_30_15.sql"
          />
        </el-form-item>
        <el-form-item label="导出文件名（可选）">
          <el-input
            v-model="exportDialog.form.file_name"
            @input="syncExportNames('file')"
            placeholder="留空则自动生成，例如：stockdb-dev-20260523_14_30_15.sql 或 stockdb-prod-20260523_14_30_15.sql"
          />
        </el-form-item>
        <el-form-item label="建议目标库名（可选）">
          <el-input
            v-model="exportDialog.form.target_db_name"
            placeholder="例如：stockdb_prod_sync"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="exportDialog.form.note"
            type="textarea"
            :rows="4"
            placeholder="记录本次导出的目的，例如修复线上异常、回归验证等"
          />
        </el-form-item>
        <el-form-item label="标签（逗号分隔）">
          <el-input
            v-model="exportDialog.tagInput"
            placeholder="例如：production, regression, 20260523"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="actionLoading"
          @click="createExportTask"
          >创建导出任务</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="uploadDialog.visible"
      title="上传外部 dump 文件"
      width="620px"
    >
      <el-form label-position="top">
        <el-form-item label="选择文件">
          <el-upload
            :auto-upload="false"
            :limit="1"
            :show-file-list="true"
            :on-change="handleUploadFileChange"
            :on-remove="clearUploadFile"
          >
            <el-button type="primary">选择 dump 文件</el-button>
            <template #tip>
              <div class="upload-tip">
                支持
                `.sql`、`.dump`、`.backup`、`.bak`。上传后即可在任何环境导入。
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="展示名称">
          <el-input
            v-model="uploadDialog.form.display_name"
            placeholder="例如：开发环境回传快照"
          />
        </el-form-item>
        <el-form-item label="建议目标库名（可选）">
          <el-input
            v-model="uploadDialog.form.target_db_name"
            placeholder="例如：stockdb_prod_sync"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="uploadDialog.form.note"
            type="textarea"
            :rows="4"
            placeholder="说明这个外部 dump 的来源、用途和约束"
          />
        </el-form-item>
        <el-form-item label="标签（逗号分隔）">
          <el-input
            v-model="uploadDialog.tagInput"
            placeholder="例如：dev, uploaded, issue-123"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialog.visible = false">取消</el-button>
        <el-button type="success" :loading="actionLoading" @click="submitUpload"
          >上传并入库</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createDumpSnapshotExportTask,
  deleteDumpSnapshot,
  downloadDumpSnapshotBlob,
  getDumpSnapshotExportTasks,
  getDumpSnapshotList,
  getDumpSnapshotOverview,
  restoreDumpSnapshot,
  updateDumpSnapshotMetadata,
  uploadDumpSnapshotFile,
} from '@/api/modules/dumpSnapshot';

const POLL_INTERVAL_MS = 5000;

const pageLoading = ref(false);
const taskLoading = ref(false);
const actionLoading = ref(false);
const selectedRelativePath = ref('');
const items = ref([]);
const taskItems = ref([]);
const filters = reactive({ keyword: '' });
const overview = reactive({
  root_path: '',
  default_export_name: '',
  snapshot_count: 0,
  total_size_label: '0 B',
  metadata_coverage_count: 0,
  missing_metadata_count: 0,
  latest_snapshot_name: '',
  latest_snapshot_time: null,
  local_pg_dump_available: false,
  local_psql_available: false,
  docker_available: false,
  postgres_server_major: null,
  postgres_tool_image: '',
  postgres_tool_image_present: false,
  export_ready: false,
  restore_ready: false,
  environment_check_message: '',
});
const listPayload = reactive({ total: 0, total_size_label: '0 B' });
const taskPayload = reactive({ total: 0 });
const editDialog = reactive({
  visible: false,
  form: { relative_path: '', display_name: '', note: '' },
  tagInput: '',
});
const restoreDialog = reactive({
  visible: false,
  form: {
    relative_path: '',
    target_db_name: 'stockdb_prod_sync',
    skip_migrations: false,
    skip_post_sync_sql: false,
  },
});
const exportDialog = reactive({
  visible: false,
  form: {
    display_name: '',
    note: '',
    file_name: '',
    target_db_name: 'stockdb_prod_sync',
  },
  tagInput: '',
});
const uploadDialog = reactive({
  visible: false,
  form: {
    display_name: '',
    note: '',
    target_db_name: 'stockdb_prod_sync',
  },
  tagInput: '',
  rawFile: null,
});

let pollTimer = null;

const selectedItem = computed(
  () =>
    items.value.find(
      (item) => item.relative_path === selectedRelativePath.value
    ) || null
);
const activeTaskCount = computed(
  () =>
    taskItems.value.filter((item) =>
      ['pending', 'running'].includes(item.status)
    ).length
);

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(
    typeof value === 'string' && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)
      ? `${value}Z`
      : value
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = normalizeDate(value);
  if (!date) return '--';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pickDefaultSelection() {
  if (!items.value.length) {
    selectedRelativePath.value = '';
    return;
  }
  if (
    !selectedRelativePath.value ||
    !items.value.some(
      (item) => item.relative_path === selectedRelativePath.value
    )
  ) {
    selectedRelativePath.value = items.value[0].relative_path;
  }
}

function taskStatusLabel(status) {
  if (status === 'pending') return '排队中';
  if (status === 'running') return '执行中';
  if (status === 'completed') return '已完成';
  if (status === 'failed') return '失败';
  return status || '--';
}

function taskStatusType(status) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'warning';
  return 'info';
}

async function loadOverviewAndList() {
  const [overviewRes, listRes] = await Promise.all([
    getDumpSnapshotOverview(),
    getDumpSnapshotList({ keyword: filters.keyword || undefined }),
  ]);
  Object.assign(overview, overviewRes?.payload || {});
  Object.assign(listPayload, {
    total: listRes?.payload?.total || 0,
    total_size_label: listRes?.payload?.total_size_label || '0 B',
  });
  items.value = listRes?.payload?.items || [];
  pickDefaultSelection();
}

async function loadTasks() {
  taskLoading.value = true;
  try {
    const res = await getDumpSnapshotExportTasks({ limit: 20 });
    taskItems.value = res?.payload?.items || [];
    taskPayload.total = Number(res?.payload?.total || 0);
  } catch (error) {
    ElMessage.error(error?.message || '加载导出任务失败');
  } finally {
    taskLoading.value = false;
  }
}

async function loadPage() {
  pageLoading.value = true;
  try {
    await Promise.all([loadOverviewAndList(), loadTasks()]);
  } catch (error) {
    ElMessage.error(error?.message || '加载 dump 版本管理失败');
  } finally {
    pageLoading.value = false;
  }
}

function ensurePolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  pollTimer = window.setInterval(() => {
    if (activeTaskCount.value > 0) {
      loadPage();
    }
  }, POLL_INTERVAL_MS);
}

function handleCurrentChange(row) {
  selectedRelativePath.value = row?.relative_path || '';
}

function openEditDialog(row) {
  selectedRelativePath.value = row.relative_path;
  editDialog.form.relative_path = row.relative_path;
  editDialog.form.display_name = row.display_name || '';
  editDialog.form.note = row.note || '';
  editDialog.tagInput = (row.tags || []).join(', ');
  editDialog.visible = true;
}

async function saveMetadata() {
  actionLoading.value = true;
  try {
    await updateDumpSnapshotMetadata({
      relative_path: editDialog.form.relative_path,
      display_name: editDialog.form.display_name || null,
      note: editDialog.form.note || null,
      tags: editDialog.tagInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    ElMessage.success('版本元数据已保存');
    editDialog.visible = false;
    await loadPage();
  } catch (error) {
    ElMessage.error(error?.message || '保存元数据失败');
  } finally {
    actionLoading.value = false;
  }
}

async function downloadSnapshot(row) {
  try {
    const { blob, fileName } = await downloadDumpSnapshotBlob(
      row.relative_path
    );
    triggerBlobDownload(blob, fileName || row.file_name);
  } catch (error) {
    ElMessage.error(error?.message || '下载 dump 文件失败');
  }
}

function downloadTaskFile(row) {
  const match = items.value.find(
    (item) => item.relative_path === row.relative_path
  );
  if (match) {
    downloadSnapshot(match);
  }
}

function triggerBlobDownload(blob, fileName) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('下载文件内容为空，未能生成有效的 dump 文件');
  }
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName || 'dump-snapshot.sql';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
}

function openRestoreDialog(row) {
  selectedRelativePath.value = row.relative_path;
  restoreDialog.form.relative_path = row.relative_path;
  restoreDialog.form.target_db_name = row.target_db_name || 'stockdb_prod_sync';
  restoreDialog.form.skip_migrations = false;
  restoreDialog.form.skip_post_sync_sql = false;
  restoreDialog.visible = true;
}

function openExportDialog() {
  resetExportDialog();
  const defaultName = overview.default_export_name || '';
  exportDialog.form.display_name = defaultName;
  exportDialog.form.file_name = defaultName;
  exportDialog.visible = true;
}

function syncExportNames(source) {
  if (source === 'display') {
    exportDialog.form.file_name = exportDialog.form.display_name || '';
    return;
  }
  exportDialog.form.display_name = exportDialog.form.file_name || '';
}

async function executeRestore() {
  actionLoading.value = true;
  try {
    const res = await restoreDumpSnapshot({ ...restoreDialog.form });
    ElMessage.success(res?.payload?.message || '导入完成');
    restoreDialog.visible = false;
    if (res?.payload?.output_excerpt) {
      showOutputDialog('导入输出摘录', res.payload.output_excerpt);
    }
    await loadPage();
  } catch (error) {
    ElMessage.error(error?.message || '导入 dump 失败');
  } finally {
    actionLoading.value = false;
  }
}

async function createExportTask() {
  if (!overview.export_ready) {
    ElMessage.warning(
      overview.environment_check_message ||
        '当前环境不具备导出条件，请先补齐 pg_dump 或可用的 Docker 工具环境'
    );
    return;
  }
  actionLoading.value = true;
  try {
    await createDumpSnapshotExportTask({
      display_name: exportDialog.form.display_name || null,
      note: exportDialog.form.note || null,
      file_name: exportDialog.form.file_name || null,
      target_db_name: exportDialog.form.target_db_name || null,
      tags: exportDialog.tagInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    ElMessage.success('导出任务已创建，正在后台执行');
    exportDialog.visible = false;
    resetExportDialog();
    await loadPage();
  } catch (error) {
    ElMessage.error(error?.message || '创建导出任务失败');
  } finally {
    actionLoading.value = false;
  }
}

function handleUploadFileChange(file) {
  uploadDialog.rawFile = file?.raw || null;
}

function clearUploadFile() {
  uploadDialog.rawFile = null;
}

async function submitUpload() {
  if (!uploadDialog.rawFile) {
    ElMessage.warning('请先选择一个 dump 文件');
    return;
  }
  actionLoading.value = true;
  try {
    await uploadDumpSnapshotFile({
      file: uploadDialog.rawFile,
      displayName: uploadDialog.form.display_name || null,
      note: uploadDialog.form.note || null,
      tags: uploadDialog.tagInput || '',
      targetDbName: uploadDialog.form.target_db_name || null,
    });
    ElMessage.success('dump 文件已上传并纳入版本管理');
    uploadDialog.visible = false;
    resetUploadDialog();
    await loadPage();
  } catch (error) {
    ElMessage.error(error?.message || '上传 dump 文件失败');
  } finally {
    actionLoading.value = false;
  }
}

function resetExportDialog() {
  exportDialog.form.display_name = '';
  exportDialog.form.note = '';
  exportDialog.form.file_name = '';
  exportDialog.form.target_db_name = 'stockdb_prod_sync';
  exportDialog.tagInput = '';
}

function resetUploadDialog() {
  uploadDialog.form.display_name = '';
  uploadDialog.form.note = '';
  uploadDialog.form.target_db_name = 'stockdb_prod_sync';
  uploadDialog.tagInput = '';
  uploadDialog.rawFile = null;
}

async function confirmDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除快照 ${row.file_name} 吗？对应的 .meta.json 也会一起删除。`,
      '删除 dump 快照',
      { type: 'warning' }
    );
    actionLoading.value = true;
    await deleteDumpSnapshot(row.relative_path);
    ElMessage.success('快照已删除');
    await loadPage();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除快照失败');
    }
  } finally {
    actionLoading.value = false;
  }
}

function showTaskOutput(row) {
  showOutputDialog(
    `任务输出：${row.file_name || row.task_id}`,
    row.output_excerpt || '无输出'
  );
}

function showOutputDialog(title, output) {
  ElMessageBox.alert(
    `<pre class="restore-output">${escapeHtml(output)}</pre>`,
    title,
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '知道了',
    }
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

onMounted(async () => {
  await loadPage();
  ensurePolling();
});

onBeforeUnmount(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<style scoped>
.dump-manager-page {
  --paper: #f6f1e8;
  --panel: rgba(255, 255, 255, 0.88);
  --line: rgba(33, 43, 43, 0.12);
  --text-main: #1a2628;
  --text-subtle: #5e7275;
  --accent-blue: #155d7a;
  --accent-amber: #be7129;
  --accent-green: #177565;
  --accent-slate: #304550;
  min-height: 100%;
  padding: 18px;
  color: var(--text-main);
  background:
    radial-gradient(
      circle at top left,
      rgba(21, 93, 122, 0.14),
      transparent 28%
    ),
    radial-gradient(
      circle at 85% 15%,
      rgba(190, 113, 41, 0.18),
      transparent 24%
    ),
    linear-gradient(180deg, #f8f5ee 0%, #f1ecdf 100%);
}

.hero-panel,
.metric-card,
.table-panel,
.detail-panel,
.detail-card,
.command-card {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 34px rgba(29, 37, 37, 0.08);
}

.hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px;
}

.hero-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-blue);
}

.hero-copy h2,
.panel-heading h3 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
}

.hero-copy p,
.hero-meta,
.panel-heading p,
.detail-card small,
.command-card code,
.file-cell span,
.panel-hint,
.upload-tip {
  color: var(--text-subtle);
}

.hero-copy p {
  max-width: 760px;
  margin: 10px 0 0;
  line-height: 1.75;
}

.hero-meta,
.panel-hint,
.tag-wrap,
.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-meta {
  margin-top: 14px;
  font-size: 13px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.hero-actions-wide {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar-input {
  width: 320px;
}

.metric-grid,
.workspace-grid {
  display: grid;
  gap: 16px;
}

.health-panel {
  margin-top: 16px;
}

.health-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-main);
}

.health-message {
  margin-top: 10px;
  line-height: 1.7;
  color: var(--text-subtle);
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 16px;
}

.metric-card {
  min-height: 140px;
  padding: 18px 20px;
}

.metric-card span,
.detail-label {
  display: block;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.metric-card strong,
.detail-card strong {
  display: block;
  margin-top: 18px;
  font-size: 30px;
}

.metric-card small {
  display: block;
  margin-top: 8px;
}

.workspace-grid {
  grid-template-columns: minmax(0, 2fr) minmax(340px, 0.9fr);
  margin-top: 16px;
}

.table-panel,
.detail-panel {
  padding: 20px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-heading.compact {
  margin-bottom: 12px;
}

.panel-heading p {
  margin: 8px 0 0;
}

.second-heading {
  margin-top: 22px;
}

.snapshot-table :deep(.el-table__row) {
  cursor: pointer;
}

.file-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-stack {
  display: grid;
  gap: 12px;
}

.detail-card,
.command-card {
  padding: 16px 18px;
}

.detail-card strong {
  margin-top: 10px;
  font-size: 18px;
}

.detail-card small,
.command-card code {
  display: block;
  margin-top: 8px;
  line-height: 1.6;
}

.tag-wrap {
  margin-top: 10px;
}

.command-card code {
  white-space: normal;
  word-break: break-all;
}

.accent-blue {
  background: linear-gradient(
    135deg,
    rgba(21, 93, 122, 0.16),
    rgba(255, 255, 255, 0.94)
  );
}

.accent-amber {
  background: linear-gradient(
    135deg,
    rgba(190, 113, 41, 0.16),
    rgba(255, 255, 255, 0.94)
  );
}

.accent-green {
  background: linear-gradient(
    135deg,
    rgba(23, 117, 101, 0.16),
    rgba(255, 255, 255, 0.94)
  );
}

.accent-slate {
  background: linear-gradient(
    135deg,
    rgba(48, 69, 80, 0.16),
    rgba(255, 255, 255, 0.94)
  );
}

.accent-blue-soft {
  background: linear-gradient(
    135deg,
    rgba(21, 93, 122, 0.08),
    rgba(255, 255, 255, 0.92)
  );
}

.accent-amber-soft {
  background: linear-gradient(
    135deg,
    rgba(190, 113, 41, 0.08),
    rgba(255, 255, 255, 0.92)
  );
}

.accent-green-soft {
  background: linear-gradient(
    135deg,
    rgba(23, 117, 101, 0.08),
    rgba(255, 255, 255, 0.92)
  );
}

.accent-slate-soft {
  background: linear-gradient(
    135deg,
    rgba(48, 69, 80, 0.08),
    rgba(255, 255, 255, 0.92)
  );
}

:global(.restore-output) {
  max-height: 420px;
  overflow: auto;
  padding: 12px;
  margin: 0;
  border-radius: 16px;
  background: #101a1d;
  color: #eff6f7;
}

@media (max-width: 1280px) {
  .metric-grid,
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .hero-panel {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-input {
    width: 100%;
  }
}
</style>
