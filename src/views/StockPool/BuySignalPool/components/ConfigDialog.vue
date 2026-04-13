<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="dialogTitle"
    width="760px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="localForm"
      :rules="rules"
      label-width="140px"
      label-position="right"
    >
      <el-form-item label="配置名称" prop="name">
        <el-input
          v-model="localForm.name"
          maxlength="100"
          show-word-limit
          placeholder="例如：右侧低吸监控"
        />
      </el-form-item>

      <el-form-item label="监控分组" prop="group_ids">
        <el-select
          v-model="localForm.group_ids"
          multiple
          filterable
          placeholder="请选择至少一个分组"
          style="width: 100%"
        >
          <el-option
            v-for="group in groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="扫描间隔(秒)" prop="monitor_interval_seconds">
            <el-input-number
              v-model="localForm.monitor_interval_seconds"
              :min="5"
              :step="5"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            label="单股日上报上限"
            prop="max_alerts_per_stock_per_day"
          >
            <el-input-number
              v-model="localForm.max_alerts_per_stock_per_day"
              :min="1"
              :max="100"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="最小涨幅(%)" prop="min_change_pct">
            <el-input-number
              v-model="localForm.min_change_pct"
              :precision="2"
              :step="0.1"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="最大涨幅(%)" prop="max_change_pct">
            <el-input-number
              v-model="localForm.max_change_pct"
              :precision="2"
              :step="0.1"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="最小量比" prop="min_volume_ratio">
            <el-input-number
              v-model="localForm.min_volume_ratio"
              :precision="2"
              :step="0.1"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="监控时段" prop="monitor_time_ranges">
        <el-select
          v-model="localForm.monitor_time_ranges"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="格式：09:30-11:30，可多选或自定义输入"
          style="width: 100%"
        >
          <el-option
            v-for="item in defaultTimeRanges"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="开始日期" prop="start_date">
            <el-date-picker
              v-model="localForm.start_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择开始日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束日期" prop="end_date">
            <el-date-picker
              v-model="localForm.end_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择结束日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Webhook 地址" prop="webhook_url">
        <el-input
          v-model="localForm.webhook_url"
          placeholder="为空则只记录信号，不推送通知"
        />
      </el-form-item>

      <el-form-item label="监控原因" prop="reason">
        <el-input
          v-model="localForm.reason"
          maxlength="200"
          show-word-limit
          placeholder="例如：监控右侧买点"
        />
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="localForm.remark"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="补充说明"
        />
      </el-form-item>

      <el-form-item label="启用状态" prop="is_enabled">
        <el-switch
          v-model="localForm.is_enabled"
          active-text="启用"
          inactive-text="停用"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"
          >保存</el-button
        >
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  formData: {
    type: Object,
    default: () => ({}),
  },
  groups: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: 'create',
  },
  submitting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:visible', 'submit']);

const formRef = ref(null);
const defaultTimeRanges = ['09:30-11:30', '13:00-15:00'];

const createDefaultForm = () => ({
  id: null,
  name: '',
  group_ids: [],
  monitor_interval_seconds: 10,
  min_change_pct: null,
  max_change_pct: null,
  min_volume_ratio: null,
  max_alerts_per_stock_per_day: 10,
  monitor_time_ranges: ['09:30-11:30', '13:00-15:00'],
  start_date: '',
  end_date: '',
  webhook_url: '',
  reason: '',
  remark: '',
  is_enabled: true,
});

const localForm = reactive(createDefaultForm());

const dialogTitle = computed(() =>
  props.mode === 'edit' ? '编辑买入信号监控配置' : '新建买入信号监控配置'
);

const syncForm = (value = {}) => {
  const nextValue = {
    ...createDefaultForm(),
    ...value,
    group_ids: Array.isArray(value.group_ids) ? [...value.group_ids] : [],
    monitor_time_ranges: Array.isArray(value.monitor_time_ranges)
      ? [...value.monitor_time_ranges]
      : ['09:30-11:30', '13:00-15:00'],
    start_date: value.start_date || '',
    end_date: value.end_date || '',
    webhook_url: value.webhook_url || '',
    reason: value.reason || '',
    remark: value.remark || '',
  };

  Object.keys(createDefaultForm()).forEach((key) => {
    localForm[key] = nextValue[key];
  });
};

watch(
  () => props.formData,
  (value) => {
    syncForm(value);
  },
  { immediate: true, deep: true }
);

watch(
  () => props.visible,
  async (value) => {
    if (value) {
      syncForm(props.formData);
      await nextTick();
      formRef.value?.clearValidate();
    }
  }
);

const validateTimeRange = (rule, value, callback) => {
  if (!value || value.length === 0) {
    callback();
    return;
  }
  const invalidItem = value.find(
    (item) => !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(item)
  );
  if (invalidItem) {
    callback(new Error('监控时段格式必须为 HH:mm-HH:mm'));
    return;
  }
  callback();
};

const validateChangeRange = (rule, value, callback) => {
  if (
    localForm.min_change_pct !== null &&
    localForm.min_change_pct !== undefined &&
    localForm.max_change_pct !== null &&
    localForm.max_change_pct !== undefined &&
    Number(localForm.min_change_pct) > Number(localForm.max_change_pct)
  ) {
    callback(new Error('最小涨幅不能大于最大涨幅'));
    return;
  }
  callback();
};

const validateDateRange = (rule, value, callback) => {
  if (
    localForm.start_date &&
    localForm.end_date &&
    localForm.start_date > localForm.end_date
  ) {
    callback(new Error('开始日期不能晚于结束日期'));
    return;
  }
  callback();
};

const rules = {
  name: [
    { required: true, message: '请输入配置名称', trigger: 'blur' },
    {
      min: 2,
      max: 100,
      message: '配置名称长度为 2-100 个字符',
      trigger: 'blur',
    },
  ],
  group_ids: [
    {
      required: true,
      type: 'array',
      min: 1,
      message: '请至少选择一个分组',
      trigger: 'change',
    },
  ],
  monitor_interval_seconds: [
    { required: true, message: '请输入扫描间隔', trigger: 'change' },
  ],
  max_alerts_per_stock_per_day: [
    { required: true, message: '请输入单股日上报上限', trigger: 'change' },
  ],
  max_change_pct: [{ validator: validateChangeRange, trigger: 'change' }],
  end_date: [{ validator: validateDateRange, trigger: 'change' }],
  monitor_time_ranges: [{ validator: validateTimeRange, trigger: 'change' }],
};

const normalizePayload = () => ({
  name: localForm.name.trim(),
  group_ids: localForm.group_ids,
  monitor_interval_seconds: localForm.monitor_interval_seconds,
  min_change_pct: localForm.min_change_pct,
  max_change_pct: localForm.max_change_pct,
  min_volume_ratio: localForm.min_volume_ratio,
  max_alerts_per_stock_per_day: localForm.max_alerts_per_stock_per_day,
  monitor_time_ranges: localForm.monitor_time_ranges?.length
    ? localForm.monitor_time_ranges
    : null,
  start_date: localForm.start_date || null,
  end_date: localForm.end_date || null,
  webhook_url: localForm.webhook_url?.trim() || null,
  reason: localForm.reason?.trim() || null,
  remark: localForm.remark?.trim() || null,
  is_enabled: localForm.is_enabled,
});

const handleClose = () => emit('update:visible', false);

const handleSubmit = async () => {
  await formRef.value.validate();
  emit('submit', normalizePayload());
};
</script>

<style scoped lang="less">
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
