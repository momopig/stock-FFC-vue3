<template>
  <div class="key-price-manager-page">
    <div class="page-header">
      <div>
        <h2>关键价格管理</h2>
        <p>
          关键价格用于卖点策略研究，按时间区间和时间级别沉淀，不与单日筹码集中价缓存混用。
        </p>
      </div>
      <el-button type="primary" @click="openCreateDialog"
        >新增关键价格</el-button
      >
    </div>

    <el-alert
      title="当前关键价格以研究表形式保存，记录的是某一时间区间内识别出的关键位；今日价格类型会根据当前价与关键价的相对位置动态计算。"
      type="info"
      :closable="false"
      show-icon
      class="page-alert"
    />

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select
          v-model="selectedQueryStockOption"
          value-key="key"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="股票搜索（名称/代码/拼音）"
          class="filter-item filter-keyword"
          :remote-method="searchStocks"
          :loading="stockSearchLoading"
          @change="handleQueryStockChange"
          @clear="clearQueryStock"
        >
          <el-option
            v-for="stock in stockSearchOptions"
            :key="stock.key"
            :label="stock.label"
            :value="stock"
          />
        </el-select>
        <el-select
          v-model="queryForm.time_level"
          clearable
          placeholder="时间级别"
          class="filter-item filter-time-level"
        >
          <el-option
            v-for="item in timeLevelOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="queryForm.recorded_type"
          clearable
          placeholder="记录类型"
          class="filter-item filter-recorded-type"
        >
          <el-option
            v-for="item in recordedTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="queryForm.source_type"
          clearable
          placeholder="来源类型"
          class="filter-item filter-source-type"
        >
          <el-option
            v-for="item in sourceTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-switch
          v-model="queryForm.include_inactive"
          inline-prompt
          active-text="含失效"
          inactive-text="仅有效"
          class="filter-item filter-active-switch"
        />
        <el-button type="primary" :loading="loading" @click="handleSearch"
          >查询</el-button
        >
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <div class="table-toolbar">
        <div class="toolbar-summary">
          <span>当前记录数</span>
          <strong>{{ pagination.total }}</strong>
        </div>
        <div class="toolbar-summary">
          <span>当前股票</span>
          <strong>{{ queryForm.stock_code || '-' }}</strong>
        </div>
      </div>

      <el-table :data="rows" border stripe v-loading="loading">
        <el-table-column prop="stock_code" label="股票代码" min-width="130" />
        <el-table-column label="股票名称" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            {{ getStockDisplayName(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="筹码统计区间" min-width="220" sortable>
          <template #default="scope">
            {{
              formatRange(
                scope.row.interval_start_date,
                scope.row.interval_end_date
              )
            }}
          </template>
        </el-table-column>
        <el-table-column
          prop="time_level"
          label="时间级别"
          min-width="96"
          sortable
        />
        <el-table-column prop="key_price" label="关键价" width="110" sortable>
          <template #default="scope">
            <span class="price-highlight">{{
              formatPrice(scope.row.key_price)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="记录类型" width="110">
          <template #default="scope">
            <el-tag
              size="small"
              :type="recordedTypeTagType(scope.row.recorded_type)"
            >
              {{ recordedTypeLabel(scope.row.recorded_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="今日类型" width="110">
          <template #default="scope">
            <el-tag size="small" :type="todayTypeTagType(scope.row.today_type)">
              {{ todayTypeLabel(scope.row.today_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="current_price"
          label="当前价"
          width="110"
          sortable
        >
          <template #default="scope">
            {{ formatPrice(scope.row.current_price) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="distance_to_last_price_pct"
          label="偏离(%)"
          width="110"
          sortable
        >
          <template #default="scope">
            <span :class="profitClass(scope.row.distance_to_last_price_pct)">
              {{ formatPercent(scope.row.distance_to_last_price_pct) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="source_type"
          label="来源类型"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column label="附图" min-width="180">
          <template #default="scope">
            <div v-if="scope.row.images_json?.length" class="image-preview-row">
              <el-image
                v-for="(image, index) in scope.row.images_json.slice(0, 3)"
                :key="`${scope.row.id}_${index}`"
                :src="image"
                :preview-src-list="scope.row.images_json"
                fit="cover"
                class="image-preview-item"
                preview-teleported
              />
              <span
                v-if="scope.row.images_json.length > 3"
                class="image-preview-more"
              >
                +{{ scope.row.images_json.length - 3 }}
              </span>
            </div>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="scope">
            <el-tag
              size="small"
              :type="scope.row.is_active ? 'success' : 'info'"
            >
              {{ scope.row.is_active ? '有效' : '失效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_time" label="更新时间" min-width="170">
          <template #default="scope">
            {{ formatDateTime(scope.row.updated_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="scope">
            <el-space wrap>
              <el-button link type="primary" @click="openViewDialog(scope.row)"
                >查看</el-button
              >
              <el-button link type="primary" @click="openEditDialog(scope.row)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                :disabled="!scope.row.is_active"
                @click="handleDelete(scope.row)"
              >
                失效
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="pagination.total"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialogTitle"
      width="920px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :disabled="dialog.mode === 'view'"
        label-width="110px"
      >
        <div class="form-grid">
          <el-form-item
            label="股票搜索"
            prop="stock_code"
            class="form-grid-span-2"
          >
            <el-select
              v-model="selectedEditorStockOption"
              value-key="key"
              filterable
              remote
              reserve-keyword
              clearable
              placeholder="查询（名称/代码/拼音）"
              style="width: 100%"
              :remote-method="searchStocks"
              :loading="stockSearchLoading"
              @change="handleEditorStockChange"
              @clear="clearEditorStock"
            >
              <el-option
                v-for="stock in stockSearchOptions"
                :key="stock.key"
                :label="stock.label"
                :value="stock"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            label="筹码统计起始日期"
            prop="interval_start_date"
            label-width="150px"
          >
            <el-date-picker
              v-model="form.interval_start_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="开始日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item
            label="筹码统计终止日期"
            prop="interval_end_date"
            label-width="150px"
          >
            <el-date-picker
              v-model="form.interval_end_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="结束日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="时间级别" prop="time_level">
            <el-select v-model="form.time_level" style="width: 100%">
              <el-option
                v-for="item in timeLevelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键价" prop="key_price">
            <el-input-number
              v-model="form.key_price"
              :min="0"
              :precision="3"
              :step="0.01"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="记录类型" prop="recorded_type">
            <el-select v-model="form.recorded_type" style="width: 100%">
              <el-option
                v-for="item in recordedTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="来源类型" prop="source_type">
            <el-select v-model="form.source_type" style="width: 100%">
              <el-option
                v-for="item in sourceTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="来源引用">
          <el-input
            v-model="form.source_ref"
            placeholder="例如：14个月筹码区间 / 手工圈定高点带"
          />
        </el-form-item>
        <el-form-item label="分析说明">
          <el-input
            v-model="form.analysis_desc"
            type="textarea"
            :rows="3"
            placeholder="记录该关键价格为什么成立"
          />
        </el-form-item>
        <el-form-item label="操作建议">
          <el-input
            v-model="form.action_suggestion"
            type="textarea"
            :rows="3"
            placeholder="例如：接近减仓、放量突破再观察、回踩确认再处理"
          />
        </el-form-item>

        <el-form-item label="附图上传">
          <div class="image-input-block">
            <div
              class="image-drop-zone"
              :class="{
                'is-dragging': imageDragState.isDragging,
                'is-disabled': dialog.mode === 'view',
              }"
              tabindex="0"
              @dragenter.prevent="handleImageDragEnter"
              @dragover.prevent="handleImageDragOver"
              @dragleave.prevent="handleImageDragLeave"
              @drop.prevent="handleImageDrop"
              @paste="handleImagePaste"
            >
              <el-upload
                v-if="dialog.mode !== 'view'"
                drag
                multiple
                :auto-upload="false"
                accept="image/*"
                :show-file-list="false"
                :on-change="handleImageUploadChange"
                class="image-upload-inner"
              >
                <div class="image-drop-zone__content">
                  <strong>拖拽图片到这里，或点击导入</strong>
                  <span>也支持在这里直接 Ctrl+V 粘贴截图</span>
                </div>
              </el-upload>
              <div v-else class="image-drop-zone__content is-view-only">
                <strong>查看模式</strong>
                <span>当前仅支持预览已保存图片</span>
              </div>
            </div>

            <div class="image-upload-toolbar" v-if="form.images_json.length">
              <div class="image-upload-toolbar__summary">
                <span
                  >已选 {{ selectedImageIndexes.length }} /
                  {{ form.images_json.length }} 张</span
                >
              </div>
              <el-space wrap>
                <el-button
                  v-if="dialog.mode !== 'view'"
                  size="small"
                  @click="toggleSelectAllImages"
                >
                  {{ isAllImagesSelected ? '取消全选' : '全选图片' }}
                </el-button>
                <el-button
                  v-if="dialog.mode !== 'view'"
                  size="small"
                  type="danger"
                  plain
                  :disabled="!selectedImageIndexes.length"
                  @click="removeSelectedImages"
                >
                  批量删除
                </el-button>
                <el-button
                  v-if="dialog.mode !== 'view'"
                  size="small"
                  type="danger"
                  link
                  :disabled="!form.images_json.length"
                  @click="clearAllImages"
                >
                  清空全部
                </el-button>
              </el-space>
            </div>

            <div v-if="form.images_json.length" class="image-editor-grid">
              <button
                v-for="(image, index) in form.images_json"
                :key="`${index}_${image.slice(0, 24)}`"
                type="button"
                class="image-editor-card"
                :class="{ 'is-selected': selectedImageIndexes.includes(index) }"
                @click="toggleImageSelection(index)"
              >
                <span class="image-editor-check" v-if="dialog.mode !== 'view'">
                  {{ selectedImageIndexes.includes(index) ? '已选' : '选择' }}
                </span>
                <el-image
                  :src="image"
                  :preview-src-list="form.images_json"
                  fit="cover"
                  class="image-editor-preview"
                  preview-teleported
                  @click.stop
                />
                <span class="image-editor-index">第 {{ index + 1 }} 张</span>
                <el-button
                  v-if="dialog.mode !== 'view'"
                  link
                  type="danger"
                  @click.stop="removeImage(index)"
                >
                  删除
                </el-button>
              </button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="补充说明"
          />
        </el-form-item>
        <el-form-item label="有效状态">
          <el-switch
            v-model="form.is_active"
            inline-prompt
            active-text="有效"
            inactive-text="失效"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-space>
          <el-button @click="dialog.visible = false">关闭</el-button>
          <el-button
            v-if="dialog.mode !== 'view'"
            type="primary"
            :loading="saving"
            @click="submitForm"
          >
            保存
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createSignalStrategyKeyPrice,
  deleteSignalStrategyKeyPrice,
  getSignalStrategyKeyPrice,
  getSignalStrategyKeyPrices,
  updateSignalStrategyKeyPrice,
} from '@/api/modules/signalStrategy';
import { getStock } from '@/api/modules/stockPool';

const recordedTypeOptions = [
  { label: '压力位', value: 'RESISTANCE' },
  { label: '支撑位', value: 'SUPPORT' },
  { label: '枢轴位', value: 'PIVOT' },
];

const timeLevelOptions = [
  { label: '1min', value: '1min' },
  { label: '5min', value: '5min' },
  { label: '30min', value: '30min' },
  { label: '1h', value: '1h' },
];

const sourceTypeOptions = [
  { label: '手工研究', value: 'MANUAL_RESEARCH' },
  { label: '手工工具导入', value: 'MANUAL_TOOL_IMPORT' },
  { label: '自动筹码', value: 'AUTO_CHIP' },
  { label: '自动日高', value: 'AUTO_DAILY_HIGH' },
  { label: '接口导入', value: 'API_IMPORT' },
];

const TODAY_TYPE_LABEL_MAP = {
  RESISTANCE: '压力位',
  SUPPORT: '支撑位',
  PIVOT: '平价位',
};

const EXCHANGE_MAP = {
  SH: 'SH',
  SZ: 'SZ',
  HK: 'HK',
  US: 'US',
  SSE: 'SH',
  SZSE: 'SZ',
  hk: 'HK',
  us: 'US',
};

const loading = ref(false);
const saving = ref(false);
const stockSearchLoading = ref(false);
const rows = ref([]);
const stockNameMap = ref({});
const formRef = ref(null);
const stockSearchOptions = ref([]);
const selectedQueryStockOption = ref(null);
const selectedEditorStockOption = ref(null);
const selectedImageIndexes = ref([]);

const imageDragState = reactive({
  isDragging: false,
  dragDepth: 0,
});

const queryForm = reactive({
  stock_code: '',
  time_level: '',
  recorded_type: '',
  source_type: '',
  include_inactive: false,
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const dialog = reactive({
  visible: false,
  mode: 'create',
  recordId: null,
});

const form = reactive(createInitialForm());

const formRules = {
  stock_code: [
    {
      validator: (_, value, callback) => {
        if (!value) {
          callback(new Error('请选择股票'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  interval_start_date: [
    { required: true, message: '请选择开始日期', trigger: 'change' },
  ],
  interval_end_date: [
    {
      validator: (_, value, callback) => {
        if (!value) {
          callback(new Error('请选择结束日期'));
          return;
        }
        if (form.interval_start_date && value < form.interval_start_date) {
          callback(new Error('结束日期不能早于开始日期'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  time_level: [
    { required: true, message: '请选择时间级别', trigger: 'change' },
  ],
  key_price: [{ required: true, message: '请输入关键价', trigger: 'change' }],
  recorded_type: [
    { required: true, message: '请选择记录类型', trigger: 'change' },
  ],
  source_type: [
    { required: true, message: '请选择来源类型', trigger: 'change' },
  ],
};

const dialogTitle = computed(() => {
  if (dialog.mode === 'create') {
    return '新增关键价格';
  }
  if (dialog.mode === 'edit') {
    return '编辑关键价格';
  }
  return '查看关键价格';
});

const isAllImagesSelected = computed(() => {
  return (
    form.images_json.length > 0 &&
    selectedImageIndexes.value.length === form.images_json.length
  );
});

onMounted(() => {
  loadKeyPrices();
});

function createInitialForm() {
  return {
    stock_code: '',
    exchange_code: '',
    interval_start_date: '',
    interval_end_date: '',
    time_level: '30min',
    key_price: null,
    recorded_type: 'RESISTANCE',
    source_type: 'MANUAL_RESEARCH',
    source_ref: '',
    analysis_desc: '',
    action_suggestion: '',
    images_json: [],
    remark: '',
    is_active: true,
  };
}

function resetForm(payload = {}) {
  Object.assign(form, createInitialForm(), payload);
  selectedImageIndexes.value = [];
}

function normalizeStockFromApi(stock) {
  const exchangeCode =
    EXCHANGE_MAP[stock?.exchange_code] ||
    EXCHANGE_MAP[stock?.exchange] ||
    stock?.exchange_code ||
    stock?.exchange ||
    '';
  return {
    ...stock,
    exchange_code: exchangeCode,
    code: stock?.code || stock?.stock_code || '',
    name: stock?.name || stock?.stock_name || '',
  };
}

function buildStockOption(stock) {
  const normalized = normalizeStockFromApi(stock);
  return {
    ...normalized,
    label: `${normalized.name || '--'}：${normalized.exchange_code}${normalized.code}`,
    key: `${normalized.exchange_code}_${normalized.code}`,
  };
}

function buildStockOptionFromCode(stockCode, stockName = '') {
  const [codePart = '', exchangePart = ''] = String(stockCode || '').split('.');
  const exchangeCode = EXCHANGE_MAP[exchangePart] || exchangePart;
  if (!codePart || !exchangeCode) {
    return null;
  }
  return {
    code: codePart,
    name: stockName || codePart,
    exchange_code: exchangeCode,
    label: `${stockName || codePart}：${exchangeCode}${codePart}`,
    key: `${exchangeCode}_${codePart}`,
  };
}

function recordedTypeLabel(value) {
  return (
    recordedTypeOptions.find((item) => item.value === value)?.label ||
    value ||
    '--'
  );
}

function todayTypeLabel(value) {
  return TODAY_TYPE_LABEL_MAP[value] || '--';
}

function recordedTypeTagType(value) {
  if (value === 'RESISTANCE') return 'danger';
  if (value === 'SUPPORT') return 'success';
  return 'warning';
}

function todayTypeTagType(value) {
  if (value === 'RESISTANCE') return 'danger';
  if (value === 'SUPPORT') return 'success';
  return 'info';
}

async function searchStocks(query) {
  if (!query) {
    stockSearchOptions.value = [];
    return;
  }
  stockSearchLoading.value = true;
  try {
    const result = await getStock(query, false);
    if (result?.success === false) {
      stockSearchOptions.value = [];
      ElMessage.error(result?.message || '股票搜索失败，请稍后重试');
      return;
    }
    stockSearchOptions.value = (result?.payload?.items || []).map((stock) =>
      buildStockOption(stock)
    );
  } catch (error) {
    stockSearchOptions.value = [];
    ElMessage.error(error?.message || '股票搜索失败，请稍后重试');
  } finally {
    stockSearchLoading.value = false;
  }
}

function handleQueryStockChange(stock) {
  queryForm.stock_code = stock ? `${stock.code}.${stock.exchange_code}` : '';
}

function clearQueryStock() {
  selectedQueryStockOption.value = null;
  queryForm.stock_code = '';
}

function handleEditorStockChange(stock) {
  form.stock_code = stock ? `${stock.code}.${stock.exchange_code}` : '';
  form.exchange_code = stock?.exchange_code || '';
}

function clearEditorStock() {
  selectedEditorStockOption.value = null;
  form.stock_code = '';
  form.exchange_code = '';
}

function getStockCodeParts(stockCode) {
  const [codePart = '', exchangePart = ''] = String(stockCode || '').split('.');
  return {
    codePart,
    exchangePart: EXCHANGE_MAP[exchangePart] || exchangePart,
  };
}

function getStockDisplayName(row) {
  return row?.stock_name || stockNameMap.value[row?.stock_code] || '--';
}

async function hydrateStockNames(targetRows) {
  const missingCodes = Array.from(
    new Set(
      (targetRows || [])
        .map((row) => String(row?.stock_code || '').trim())
        .filter(
          (stockCode) =>
            stockCode &&
            !stockNameMap.value[stockCode] &&
            !(targetRows || []).find(
              (row) => row?.stock_code === stockCode && row?.stock_name
            )
        )
    )
  );
  if (!missingCodes.length) {
    return;
  }
  await Promise.all(
    missingCodes.map(async (stockCode) => {
      const { codePart, exchangePart } = getStockCodeParts(stockCode);
      if (!codePart || !exchangePart) {
        return;
      }
      try {
        const result = await getStock(codePart, false);
        const matched = (result?.payload?.items || [])
          .map((stock) => normalizeStockFromApi(stock))
          .find(
            (stock) =>
              String(stock.code || '').trim() === codePart &&
              String(stock.exchange_code || '').trim() === exchangePart
          );
        if (matched?.name) {
          stockNameMap.value = {
            ...stockNameMap.value,
            [stockCode]: matched.name,
          };
        }
      } catch {
        // 忽略股票名称补全失败，不影响主列表展示。
      }
    })
  );
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '--';
  }
  return number.toFixed(3);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '--';
  }
  return `${number.toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) {
    return '--';
  }
  return String(value);
}

function formatRange(start, end) {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function profitClass(value) {
  const number = Number(value || 0);
  if (number > 0) {
    return 'profit-up';
  }
  if (number < 0) {
    return 'profit-down';
  }
  return '';
}

async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

async function appendImagesFromFiles(files) {
  const validFiles = Array.from(files || []).filter((file) =>
    String(file?.type || '').startsWith('image/')
  );
  if (!validFiles.length) {
    ElMessage.warning('只支持图片文件');
    return;
  }
  const imageDataList = await Promise.all(
    validFiles.map((file) => fileToDataUrl(file))
  );
  form.images_json = [...form.images_json, ...imageDataList];
}

function resetImageDragState() {
  imageDragState.isDragging = false;
  imageDragState.dragDepth = 0;
}

function handleImageDragEnter() {
  if (dialog.mode === 'view') {
    return;
  }
  imageDragState.dragDepth += 1;
  imageDragState.isDragging = true;
}

function handleImageDragOver() {
  if (dialog.mode === 'view') {
    return;
  }
  imageDragState.isDragging = true;
}

function handleImageDragLeave() {
  if (dialog.mode === 'view') {
    return;
  }
  imageDragState.dragDepth = Math.max(0, imageDragState.dragDepth - 1);
  if (imageDragState.dragDepth === 0) {
    imageDragState.isDragging = false;
  }
}

async function handleImageDrop(event) {
  if (dialog.mode === 'view') {
    return;
  }
  resetImageDragState();
  const files = Array.from(event?.dataTransfer?.files || []);
  if (!files.length) {
    return;
  }
  try {
    await appendImagesFromFiles(files);
    ElMessage.success(`已追加 ${files.length} 张图片`);
  } catch (error) {
    ElMessage.error(error?.message || '拖拽图片失败');
  }
}

async function handleImageUploadChange(uploadFile) {
  if (dialog.mode === 'view') {
    return;
  }
  const rawFile = uploadFile?.raw;
  if (!rawFile) {
    return;
  }
  try {
    await appendImagesFromFiles([rawFile]);
  } catch (error) {
    ElMessage.error(error?.message || '读取图片失败');
  }
}

async function handleImagePaste(event) {
  if (dialog.mode === 'view') {
    return;
  }
  const items = Array.from(event?.clipboardData?.items || []);
  const files = items
    .filter(
      (item) =>
        item.kind === 'file' && String(item.type || '').startsWith('image/')
    )
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) {
    return;
  }
  event.preventDefault();
  try {
    await appendImagesFromFiles(files);
    ElMessage.success('截图已追加');
  } catch (error) {
    ElMessage.error(error?.message || '粘贴截图失败');
  }
}

function toggleImageSelection(index) {
  if (dialog.mode === 'view') {
    return;
  }
  if (selectedImageIndexes.value.includes(index)) {
    selectedImageIndexes.value = selectedImageIndexes.value.filter(
      (item) => item !== index
    );
    return;
  }
  selectedImageIndexes.value = [...selectedImageIndexes.value, index].sort(
    (a, b) => a - b
  );
}

function toggleSelectAllImages() {
  if (isAllImagesSelected.value) {
    selectedImageIndexes.value = [];
    return;
  }
  selectedImageIndexes.value = form.images_json.map((_, index) => index);
}

function removeImage(index) {
  form.images_json.splice(index, 1);
  selectedImageIndexes.value = selectedImageIndexes.value
    .filter((item) => item !== index)
    .map((item) => (item > index ? item - 1 : item));
}

function removeSelectedImages() {
  if (!selectedImageIndexes.value.length) {
    return;
  }
  form.images_json = form.images_json.filter(
    (_, index) => !selectedImageIndexes.value.includes(index)
  );
  selectedImageIndexes.value = [];
}

function clearAllImages() {
  form.images_json = [];
  selectedImageIndexes.value = [];
}

async function loadKeyPrices() {
  loading.value = true;
  try {
    const res = await getSignalStrategyKeyPrices({
      page: pagination.page,
      page_size: pagination.pageSize,
      stock_code: queryForm.stock_code || undefined,
      time_level: queryForm.time_level || undefined,
      recorded_type: queryForm.recorded_type || undefined,
      source_type: queryForm.source_type || undefined,
      include_inactive: queryForm.include_inactive,
    });
    rows.value = res?.payload?.items || [];
    pagination.total = res?.payload?.total || 0;
    await hydrateStockNames(rows.value);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '加载关键价格失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadKeyPrices();
}

function resetFilters() {
  queryForm.stock_code = '';
  queryForm.time_level = '';
  queryForm.recorded_type = '';
  queryForm.source_type = '';
  queryForm.include_inactive = false;
  selectedQueryStockOption.value = null;
  stockSearchOptions.value = [];
  pagination.page = 1;
  loadKeyPrices();
}

function handleCurrentChange(page) {
  pagination.page = page;
  loadKeyPrices();
}

function handleSizeChange(size) {
  pagination.pageSize = size;
  pagination.page = 1;
  loadKeyPrices();
}

function openCreateDialog() {
  dialog.mode = 'create';
  dialog.recordId = null;
  resetForm({
    stock_code: queryForm.stock_code || '',
  });
  selectedEditorStockOption.value = selectedQueryStockOption.value
    ? { ...selectedQueryStockOption.value }
    : buildStockOptionFromCode(form.stock_code);
  resetImageDragState();
  dialog.visible = true;
}

function fillFormFromRow(row) {
  resetForm({
    stock_code: row.stock_code || '',
    exchange_code: row.exchange_code || '',
    interval_start_date: row.interval_start_date || '',
    interval_end_date: row.interval_end_date || '',
    time_level: row.time_level || '30min',
    key_price: row.key_price == null ? null : Number(row.key_price),
    recorded_type: row.recorded_type || 'RESISTANCE',
    source_type: row.source_type || 'MANUAL_RESEARCH',
    source_ref: row.source_ref || '',
    analysis_desc: row.analysis_desc || '',
    action_suggestion: row.action_suggestion || '',
    images_json: Array.isArray(row.images_json) ? [...row.images_json] : [],
    remark: row.remark || '',
    is_active: row.is_active !== false,
  });
}

function openViewDialog(row) {
  dialog.mode = 'view';
  dialog.recordId = row.id;
  fillFormFromRow(row);
  selectedEditorStockOption.value = buildStockOptionFromCode(row.stock_code);
  resetImageDragState();
  dialog.visible = true;
}

async function openEditDialog(row) {
  dialog.mode = 'edit';
  dialog.recordId = row.id;
  try {
    const res = await getSignalStrategyKeyPrice(row.id);
    const payload = res?.payload || row;
    fillFormFromRow(payload);
    selectedEditorStockOption.value = buildStockOptionFromCode(
      payload.stock_code
    );
    resetImageDragState();
    dialog.visible = true;
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '加载关键价格详情失败');
  }
}

function buildPayload() {
  return {
    stock_code: form.stock_code,
    exchange_code: form.exchange_code || null,
    interval_start_date: form.interval_start_date,
    interval_end_date: form.interval_end_date,
    time_level: form.time_level,
    key_price: Number(form.key_price),
    recorded_type: form.recorded_type,
    source_type: form.source_type,
    source_ref: form.source_ref || null,
    analysis_desc: form.analysis_desc || null,
    action_suggestion: form.action_suggestion || null,
    images_json: form.images_json || [],
    remark: form.remark || null,
    is_active: form.is_active,
  };
}

async function submitForm() {
  await formRef.value.validate();
  saving.value = true;
  try {
    if (dialog.mode === 'create') {
      await createSignalStrategyKeyPrice(buildPayload());
      ElMessage.success('关键价格已创建');
    } else {
      await updateSignalStrategyKeyPrice(dialog.recordId, buildPayload());
      ElMessage.success('关键价格已更新');
    }
    dialog.visible = false;
    await loadKeyPrices();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '保存关键价格失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认将 ${row.stock_code} ${formatPrice(row.key_price)} 置为失效吗？`,
      '失效关键价格',
      { type: 'warning' }
    );
    await deleteSignalStrategyKeyPrice(row.id);
    ElMessage.success('关键价格已失效');
    await loadKeyPrices();
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    console.error(error);
    ElMessage.error(error?.message || '失效关键价格失败');
  }
}
</script>

<style scoped>
.key-price-manager-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.page-header h2 {
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.page-alert {
  margin-bottom: 0;
}

.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
}

.filter-item {
  min-width: 0;
  flex: 0 0 auto;
}

.filter-keyword {
  width: 220px;
  flex: 0 0 220px;
}

.filter-time-level {
  width: 92px;
}

.filter-recorded-type {
  width: 96px;
}

.filter-source-type {
  width: 106px;
}

.filter-active-switch {
  width: 84px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.toolbar-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #6b7280;
}

.toolbar-summary strong {
  color: #1f2937;
  font-size: 18px;
}

.price-highlight {
  color: #d4380d;
  font-weight: 600;
}

.image-preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-preview-item {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.image-preview-more {
  color: #6b7280;
  font-size: 12px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.form-grid-span-2 {
  grid-column: 1 / -1;
}

.image-input-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.image-drop-zone {
  border: 1px dashed #d1a36c;
  border-radius: 14px;
  background: #fff8ef;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.image-drop-zone.is-dragging {
  border-color: #d4380d;
  background: #fff1e8;
  transform: scale(1.01);
}

.image-drop-zone.is-disabled {
  background: #f9fafb;
  border-color: #d1d5db;
}

.image-upload-inner {
  width: 100%;
}

.image-upload-inner :deep(.el-upload),
.image-upload-inner :deep(.el-upload-dragger) {
  width: 100%;
  border: none;
  background: transparent;
}

.image-drop-zone__content {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8a5a2b;
  padding: 16px;
  text-align: center;
}

.image-drop-zone__content strong {
  color: #2d241d;
}

.image-drop-zone__content.is-view-only {
  color: #6b7280;
}

.image-upload-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.image-upload-toolbar__summary {
  color: #6b7280;
  font-size: 13px;
}

.image-editor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.image-editor-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.image-editor-card.is-selected {
  border-color: #d4380d;
  box-shadow: 0 0 0 2px rgba(212, 56, 13, 0.12);
}

.image-editor-check {
  font-size: 12px;
  color: #8a5a2b;
}

.image-editor-preview {
  width: 100%;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
}

.image-editor-index {
  font-size: 12px;
  color: #6b7280;
}

.profit-up {
  color: #d4380d;
}

.profit-down {
  color: #389e0d;
}

@media (max-width: 768px) {
  .filter-row {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid-span-2 {
    grid-column: auto;
  }

  .table-pagination {
    justify-content: flex-start;
  }
}
</style>
