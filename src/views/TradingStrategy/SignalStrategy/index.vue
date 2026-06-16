<template>
  <div class="signal-strategy-page">
    <div class="page-header">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ pageDescription }}</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">{{
        createButtonText
      }}</el-button>
    </div>

    <el-tabs v-model="activeTab" class="content-tabs">
      <el-tab-pane label="模板管理" name="templates" lazy="true">
        <el-card shadow="never" class="filter-card">
          <div class="filter-row">
            <el-select
              v-model="templateFilters.usage_scope"
              clearable
              placeholder="用途范围"
              class="filter-item"
            >
              <el-option
                v-for="item in usageScopeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-select
              v-model="templateFilters.is_enabled"
              clearable
              placeholder="启用状态"
              class="filter-item"
            >
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button type="primary" @click="loadTemplates">查询</el-button>
            <el-button @click="resetTemplateFilters">重置</el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <el-table :data="templates" v-loading="templateLoading" border>
            <el-table-column
              prop="display_name"
              label="模板名称"
              min-width="160"
            />
            <el-table-column
              prop="template_code"
              label="模板编码"
              min-width="180"
            />
            <el-table-column label="用途" width="120">
              <template #default="scope">
                <el-tag
                  size="small"
                  :type="getUsageScopeTagType(scope.row.usage_scope)"
                >
                  {{ getUsageScopeLabel(scope.row.usage_scope) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag
                  size="small"
                  :type="scope.row.is_enabled ? 'success' : 'info'"
                >
                  {{ scope.row.is_enabled ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="description"
              label="规则说明"
              min-width="260"
              show-overflow-tooltip
            />
            <el-table-column label="参数摘要" min-width="320">
              <template #default="scope">
                <div class="field-summary">
                  <el-tag
                    v-for="field in scope.row.params_schema?.fields || []"
                    :key="field.path"
                    size="small"
                    effect="plain"
                  >
                    {{ field.label }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="实例管理" name="instances" lazy="true">
        <el-card shadow="never" class="filter-card">
          <div class="filter-row filter-row-wrap">
            <el-input
              v-model="instanceFilters.instance_name"
              clearable
              placeholder="实例名称"
              class="filter-item filter-keyword"
              @keyup.enter="loadInstances"
            />
            <el-select
              v-model="instanceFilters.template_code"
              clearable
              filterable
              placeholder="模板编码"
              class="filter-item"
            >
              <el-option
                v-for="item in templates"
                :key="item.template_code"
                :label="`${item.display_name} (${item.template_code})`"
                :value="item.template_code"
              />
            </el-select>
            <el-select
              v-model="instanceFilters.usage_scope"
              clearable
              placeholder="用途范围"
              class="filter-item"
            >
              <el-option
                v-for="item in usageScopeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-select
              v-model="instanceFilters.is_enabled"
              clearable
              placeholder="启用状态"
              class="filter-item"
            >
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button type="primary" @click="handleInstanceSearch"
              >查询</el-button
            >
            <el-button @click="resetInstanceFilters">重置</el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <el-table :data="instances.items" v-loading="instanceLoading" border>
            <el-table-column
              prop="instance_name"
              label="实例名称"
              min-width="180"
            />
            <el-table-column label="模板" min-width="220">
              <template #default="scope">
                <div>{{ scope.row.template_name }}</div>
                <div class="muted-text">{{ scope.row.template_code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="用途" width="120">
              <template #default="scope">
                <el-tag
                  size="small"
                  :type="getUsageScopeTagType(scope.row.usage_scope)"
                >
                  {{ getUsageScopeLabel(scope.row.usage_scope) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-switch
                  :model-value="scope.row.is_enabled"
                  inline-prompt
                  active-text="启用"
                  inactive-text="停用"
                  @change="handleToggleInstance(scope.row, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="参数预览" min-width="280">
              <template #default="scope">
                <div class="param-preview-group-list">
                  <div
                    v-for="section in buildParamPreviewSections(scope.row)"
                    :key="section.title"
                    class="param-preview-group"
                  >
                    <div class="param-preview-group__title">
                      {{ section.title }}
                    </div>
                    <div class="param-preview-list">
                      <div
                        v-for="item in section.items"
                        :key="`${section.title}-${item.label}`"
                      >
                        {{ item.label }}: {{ item.value }}
                      </div>
                    </div>
                    <div
                      v-if="section.factorGroups?.length"
                      class="param-preview-factor-list"
                    >
                      <div
                        v-for="factorGroup in section.factorGroups"
                        :key="`${section.title}-${factorGroup.code}`"
                        class="param-preview-factor"
                      >
                        <div class="param-preview-factor__title">
                          {{ factorGroup.title }}
                        </div>
                        <div class="param-preview-list">
                          <div
                            v-for="item in factorGroup.items"
                            :key="`${factorGroup.code}-${item.label}`"
                          >
                            {{ item.label }}: {{ item.value }}
                          </div>
                          <div v-if="!factorGroup.items.length">
                            当前因子无额外参数
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" min-width="180">
              <template #default="scope">{{
                formatDateTime(scope.row.updated_at)
              }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="220" show-overflow-tooltip>
              <template #default="scope">{{
                scope.row.remark || '-'
              }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="220" fixed="right">
              <template #default="scope">
                <el-space wrap>
                  <el-button
                    link
                    type="primary"
                    @click="openEditDialog(scope.row)"
                    >编辑</el-button
                  >
                  <el-button
                    v-if="scope.row.template_code === 'INTRADAY_LOW_SUCTION'"
                    link
                    type="success"
                    @click="openSupportSnapshotDialog(scope.row)"
                    >支撑位</el-button
                  >
                  <el-button
                    v-if="scope.row.template_code === 'INTRADAY_LOW_SUCTION'"
                    link
                    type="warning"
                    @click="openBacktestDialog(scope.row)"
                    >回测</el-button
                  >
                  <el-button
                    v-if="scope.row.template_code === 'INTRADAY_LOW_SUCTION'"
                    link
                    type="primary"
                    @click="applyPhase2Defaults(scope.row)"
                    >Phase-2默认</el-button
                  >
                  <el-button link @click="openDetailDialog(scope.row)"
                    >详情</el-button
                  >
                  <el-button
                    link
                    type="danger"
                    @click="handleDeleteInstance(scope.row)"
                    >删除</el-button
                  >
                </el-space>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="instancePagination.page"
              v-model:page-size="instancePagination.page_size"
              background
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50, 100]"
              :total="instances.total"
              @current-change="loadInstances"
              @size-change="handlePageSizeChange"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="instanceDialog.visible"
      :title="
        instanceDialog.mode === 'create'
          ? '新建信号策略实例'
          : '编辑信号策略实例'
      "
      width="760px"
    >
      <el-form
        ref="instanceFormRef"
        :model="instanceForm"
        :rules="instanceFormRules"
        label-width="120px"
      >
        <el-form-item label="实例名称" prop="instance_name">
          <el-input v-model="instanceForm.instance_name" maxlength="100" />
        </el-form-item>
        <el-form-item label="模板" prop="template_code">
          <el-select
            v-model="instanceForm.template_code"
            filterable
            class="full-width"
            :disabled="instanceDialog.mode === 'edit'"
            @change="handleTemplateChange"
          >
            <el-option
              v-for="item in enabledTemplates"
              :key="item.template_code"
              :label="`${item.display_name} (${item.template_code})`"
              :value="item.template_code"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="currentTemplate" label="用途">
          <el-tag :type="getUsageScopeTagType(currentTemplate.usage_scope)">{{
            getUsageScopeLabel(currentTemplate.usage_scope)
          }}</el-tag>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch
            v-model="instanceForm.is_enabled"
            inline-prompt
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="参数配置" required>
          <div v-if="currentTemplate" class="template-config-panel full-width">
            <div class="template-description">
              {{ currentTemplate.description }}
            </div>
            <template v-if="isIntradayLowSuctionTemplate(currentTemplate)">
              <el-collapse
                v-model="intradayLowSuctionFormCollapseNames"
                class="template-group-collapse"
              >
                <el-collapse-item
                  v-for="section in intradayLowSuctionFormSections"
                  :key="section.key"
                  :name="buildSectionCollapseName(section)"
                >
                  <template #title>
                    <div class="template-group-header">
                      <h4>{{ section.title }}</h4>
                      <p v-if="section.description">
                        {{ section.description }}
                      </p>
                    </div>
                  </template>
                  <div class="template-group-section">
                    <div
                      v-if="section.fields.length"
                      class="dynamic-field-grid"
                    >
                      <div
                        v-for="field in section.fields"
                        :key="field.path"
                        class="dynamic-field-item"
                      >
                        <label class="dynamic-field-label">{{
                          field.label
                        }}</label>
                        <el-input-number
                          v-if="
                            field.component === 'number' ||
                            field.component === 'integer'
                          "
                          :model-value="instanceForm.params_value[field.path]"
                          class="full-width"
                          controls-position="right"
                          :step="field.step || 1"
                          :min="field.min"
                          :max="field.max"
                          :precision="
                            field.component === 'number' ? field.precision : 0
                          "
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        />
                        <el-switch
                          v-else-if="field.component === 'boolean'"
                          :model-value="
                            Boolean(instanceForm.params_value[field.path])
                          "
                          inline-prompt
                          active-text="是"
                          inactive-text="否"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        />
                        <el-select
                          v-else-if="field.path === 'enabled_factor_codes'"
                          :model-value="
                            instanceForm.params_value[field.path] || []
                          "
                          multiple
                          collapse-tags
                          collapse-tags-tooltip
                          class="full-width"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        >
                          <el-option
                            v-for="option in intradayLowSuctionFactorOptions"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                        <el-select
                          v-else-if="field.path === 'support_time_levels'"
                          :model-value="
                            instanceForm.params_value[field.path] || []
                          "
                          multiple
                          collapse-tags
                          collapse-tags-tooltip
                          class="full-width"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        >
                          <el-option
                            v-for="option in supportLevelOptions"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                        <el-select
                          v-else-if="field.component === 'select'"
                          :model-value="instanceForm.params_value[field.path]"
                          class="full-width"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        >
                          <el-option
                            v-for="option in field.options || []"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                        <el-input
                          v-else
                          :model-value="
                            normalizeInputValue(
                              instanceForm.params_value[field.path],
                              field.component
                            )
                          "
                          class="full-width"
                          :type="
                            field.component === 'textarea' ||
                            field.component === 'string-array'
                              ? 'textarea'
                              : 'text'
                          "
                          :rows="
                            field.component === 'textarea' ||
                            field.component === 'string-array'
                              ? 3
                              : undefined
                          "
                          :placeholder="
                            field.placeholder || field.description || ''
                          "
                          @input="
                            setParamValue(field.path, $event, field.component)
                          "
                        />
                        <div v-if="field.description" class="field-help-text">
                          {{ field.description }}
                        </div>
                      </div>
                    </div>
                    <el-collapse
                      v-if="section.factorGroups.length"
                      v-model="intradayLowSuctionFactorCollapseNames"
                      class="factor-config-collapse"
                    >
                      <el-collapse-item
                        v-for="factorGroup in section.factorGroups"
                        :key="factorGroup.code"
                        :name="buildFactorCollapseName(factorGroup)"
                      >
                        <template #title>
                          <div class="factor-config-card__header">
                            <div class="factor-config-card__title">
                              {{ factorGroup.title }}
                            </div>
                            <div class="factor-config-card__desc">
                              {{ factorGroup.description }}
                            </div>
                          </div>
                        </template>
                        <div class="factor-config-card">
                          <div
                            v-if="factorGroup.fields.length"
                            class="dynamic-field-grid"
                          >
                            <div
                              v-for="field in factorGroup.fields"
                              :key="field.path"
                              class="dynamic-field-item"
                            >
                              <label class="dynamic-field-label">{{
                                field.label
                              }}</label>
                              <el-input-number
                                v-if="
                                  field.component === 'number' ||
                                  field.component === 'integer'
                                "
                                :model-value="
                                  instanceForm.params_value[field.path]
                                "
                                class="full-width"
                                controls-position="right"
                                :step="field.step || 1"
                                :min="field.min"
                                :max="field.max"
                                :precision="
                                  field.component === 'number'
                                    ? field.precision
                                    : 0
                                "
                                @update:model-value="
                                  setParamValue(field.path, $event)
                                "
                              />
                              <el-switch
                                v-else-if="field.component === 'boolean'"
                                :model-value="
                                  Boolean(instanceForm.params_value[field.path])
                                "
                                inline-prompt
                                active-text="是"
                                inactive-text="否"
                                @update:model-value="
                                  setParamValue(field.path, $event)
                                "
                              />
                              <el-select
                                v-else-if="field.component === 'select'"
                                :model-value="
                                  instanceForm.params_value[field.path]
                                "
                                class="full-width"
                                @update:model-value="
                                  setParamValue(field.path, $event)
                                "
                              >
                                <el-option
                                  v-for="option in field.options || []"
                                  :key="option.value"
                                  :label="option.label"
                                  :value="option.value"
                                />
                              </el-select>
                              <el-input
                                v-else
                                :model-value="
                                  normalizeInputValue(
                                    instanceForm.params_value[field.path],
                                    field.component
                                  )
                                "
                                class="full-width"
                                :type="
                                  field.component === 'textarea' ||
                                  field.component === 'string-array'
                                    ? 'textarea'
                                    : 'text'
                                "
                                :rows="
                                  field.component === 'textarea' ||
                                  field.component === 'string-array'
                                    ? 3
                                    : undefined
                                "
                                :placeholder="
                                  field.placeholder || field.description || ''
                                "
                                @input="
                                  setParamValue(
                                    field.path,
                                    $event,
                                    field.component
                                  )
                                "
                              />
                              <div
                                v-if="field.description"
                                class="field-help-text"
                              >
                                {{ field.description }}
                              </div>
                            </div>
                          </div>
                          <div v-else class="factor-config-card__empty">
                            当前因子无额外参数
                          </div>
                        </div>
                      </el-collapse-item>
                    </el-collapse>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </template>
            <template v-else-if="groupedTemplateFormSections.length">
              <el-collapse
                v-model="groupedTemplateFormCollapseNames"
                class="template-group-collapse"
              >
                <el-collapse-item
                  v-for="section in groupedTemplateFormSections"
                  :key="section.key"
                  :name="buildSectionCollapseName(section)"
                >
                  <template #title>
                    <div class="template-group-header">
                      <h4>{{ section.title }}</h4>
                      <p v-if="section.description">
                        {{ section.description }}
                      </p>
                    </div>
                  </template>
                  <div class="template-group-section">
                    <div class="dynamic-field-grid">
                      <div
                        v-for="field in section.fields"
                        :key="field.path"
                        class="dynamic-field-item"
                      >
                        <label class="dynamic-field-label">{{
                          field.label
                        }}</label>
                        <el-input-number
                          v-if="
                            field.component === 'number' ||
                            field.component === 'integer'
                          "
                          :model-value="instanceForm.params_value[field.path]"
                          class="full-width"
                          controls-position="right"
                          :step="field.step || 1"
                          :min="field.min"
                          :max="field.max"
                          :precision="
                            field.component === 'number' ? field.precision : 0
                          "
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        />
                        <el-switch
                          v-else-if="field.component === 'boolean'"
                          :model-value="
                            Boolean(instanceForm.params_value[field.path])
                          "
                          inline-prompt
                          active-text="是"
                          inactive-text="否"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        />
                        <el-select
                          v-else-if="field.component === 'multi-select'"
                          :model-value="
                            instanceForm.params_value[field.path] || []
                          "
                          multiple
                          collapse-tags
                          collapse-tags-tooltip
                          class="full-width"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        >
                          <el-option
                            v-for="option in field.options || []"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                        <el-select
                          v-else-if="field.component === 'select'"
                          :model-value="instanceForm.params_value[field.path]"
                          class="full-width"
                          @update:model-value="
                            setParamValue(field.path, $event)
                          "
                        >
                          <el-option
                            v-for="option in field.options || []"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                        <el-input
                          v-else
                          :model-value="
                            normalizeInputValue(
                              instanceForm.params_value[field.path],
                              field.component
                            )
                          "
                          class="full-width"
                          :type="
                            field.component === 'textarea' ||
                            field.component === 'string-array'
                              ? 'textarea'
                              : 'text'
                          "
                          :rows="
                            field.component === 'textarea' ||
                            field.component === 'string-array'
                              ? 3
                              : undefined
                          "
                          :placeholder="
                            field.placeholder || field.description || ''
                          "
                          @input="
                            setParamValue(field.path, $event, field.component)
                          "
                        />
                        <div v-if="field.description" class="field-help-text">
                          {{ field.description }}
                        </div>
                      </div>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </template>
            <div v-else class="dynamic-field-grid">
              <div
                v-for="field in currentTemplate.params_schema?.fields || []"
                :key="field.path"
                class="dynamic-field-item"
              >
                <label class="dynamic-field-label">{{ field.label }}</label>
                <el-input-number
                  v-if="
                    field.component === 'number' ||
                    field.component === 'integer'
                  "
                  :model-value="instanceForm.params_value[field.path]"
                  class="full-width"
                  controls-position="right"
                  :step="field.step || 1"
                  :min="field.min"
                  :max="field.max"
                  :precision="
                    field.component === 'number' ? field.precision : 0
                  "
                  @update:model-value="setParamValue(field.path, $event)"
                />
                <el-switch
                  v-else-if="field.component === 'boolean'"
                  :model-value="Boolean(instanceForm.params_value[field.path])"
                  inline-prompt
                  active-text="是"
                  inactive-text="否"
                  @update:model-value="setParamValue(field.path, $event)"
                />
                <el-select
                  v-else-if="field.component === 'multi-select'"
                  :model-value="instanceForm.params_value[field.path] || []"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  class="full-width"
                  @update:model-value="setParamValue(field.path, $event)"
                >
                  <el-option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-select
                  v-else-if="field.component === 'select'"
                  :model-value="instanceForm.params_value[field.path]"
                  class="full-width"
                  @update:model-value="setParamValue(field.path, $event)"
                >
                  <el-option
                    v-for="option in field.options || []"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-input
                  v-else
                  :model-value="
                    normalizeInputValue(
                      instanceForm.params_value[field.path],
                      field.component
                    )
                  "
                  class="full-width"
                  :type="
                    field.component === 'textarea' ||
                    field.component === 'string-array'
                      ? 'textarea'
                      : 'text'
                  "
                  :rows="
                    field.component === 'textarea' ||
                    field.component === 'string-array'
                      ? 3
                      : undefined
                  "
                  :placeholder="field.placeholder || field.description || ''"
                  @input="setParamValue(field.path, $event, field.component)"
                />
                <div v-if="field.description" class="field-help-text">
                  {{ field.description }}
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="请先选择模板" :image-size="72" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="instanceForm.remark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="instanceDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="instanceSubmitting"
          @click="submitInstance"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialog.visible" title="实例详情" width="680px">
      <template v-if="detailDialog.data">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="实例名称">{{
            detailDialog.data.instance_name
          }}</el-descriptions-item>
          <el-descriptions-item label="模板名称">{{
            detailDialog.data.template_name
          }}</el-descriptions-item>
          <el-descriptions-item label="模板编码">{{
            detailDialog.data.template_code
          }}</el-descriptions-item>
          <el-descriptions-item label="用途">{{
            getUsageScopeLabel(detailDialog.data.usage_scope)
          }}</el-descriptions-item>
          <el-descriptions-item label="启用状态">{{
            detailDialog.data.is_enabled ? '启用' : '停用'
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{
            formatDateTime(detailDialog.data.updated_at)
          }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{
            detailDialog.data.remark || '-'
          }}</el-descriptions-item>
        </el-descriptions>
        <el-card shadow="never" class="detail-card">
          <template #header>参数详情</template>
          <template v-if="isIntradayLowSuctionTemplate(detailDialog.data)">
            <el-collapse
              v-model="intradayLowSuctionDetailCollapseNames"
              class="detail-collapse"
            >
              <el-collapse-item
                v-for="section in detailPreviewSections"
                :key="section.key || section.title"
                :name="buildSectionCollapseName(section)"
              >
                <template #title>
                  <div class="template-group-header">
                    <h4>{{ section.title }}</h4>
                    <p v-if="section.description">{{ section.description }}</p>
                  </div>
                </template>
                <div class="detail-preview-section">
                  <div class="param-preview-list">
                    <div
                      v-for="item in section.items"
                      :key="`${section.title}-${item.label}`"
                    >
                      {{ item.label }}: {{ item.value }}
                    </div>
                  </div>
                  <el-collapse
                    v-if="section.factorGroups?.length"
                    v-model="intradayLowSuctionDetailFactorCollapseNames"
                    class="detail-factor-collapse"
                  >
                    <el-collapse-item
                      v-for="factorGroup in section.factorGroups"
                      :key="factorGroup.code"
                      :name="buildFactorCollapseName(factorGroup)"
                    >
                      <template #title>
                        <div class="factor-config-card__header">
                          <div class="factor-config-card__title">
                            {{ factorGroup.title }}
                          </div>
                          <div class="factor-config-card__desc">
                            {{ factorGroup.description }}
                          </div>
                        </div>
                      </template>
                      <div class="factor-config-card">
                        <div class="param-preview-list">
                          <div
                            v-for="item in factorGroup.items"
                            :key="`${factorGroup.code}-${item.label}`"
                          >
                            {{ item.label }}: {{ item.value }}
                          </div>
                          <div v-if="!factorGroup.items.length">
                            当前因子无额外参数
                          </div>
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </el-collapse-item>
            </el-collapse>
          </template>
          <div v-else class="param-preview-group-list">
            <div
              v-for="section in detailPreviewSections"
              :key="section.title"
              class="param-preview-group"
            >
              <div class="param-preview-group__title">{{ section.title }}</div>
              <div class="param-preview-list">
                <div
                  v-for="item in section.items"
                  :key="`${section.title}-${item.label}`"
                >
                  {{ item.label }}: {{ item.value }}
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </template>
    </el-dialog>

    <el-dialog
      v-model="supportSnapshotDialog.visible"
      title="昨日支撑位快照"
      width="860px"
    >
      <template v-if="supportSnapshotDialog.row">
        <el-form :model="supportSnapshotForm" inline>
          <el-form-item label="股票代码">
            <el-input
              v-model="supportSnapshotForm.stock_code"
              placeholder="如 600519.SH"
            />
          </el-form-item>
          <el-form-item label="查询日期">
            <el-date-picker
              v-model="supportSnapshotForm.query_date"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="选择交易日"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="supportSnapshotLoading"
              @click="loadSupportSnapshot"
              >查询支撑位</el-button
            >
          </el-form-item>
        </el-form>

        <template v-if="supportSnapshotDialog.result">
          <el-card shadow="never" class="detail-card">
            <template #header>四大支撑位</template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="源交易日">{{
                supportSnapshotDialog.result.source_trade_date
              }}</el-descriptions-item>
              <el-descriptions-item label="查询日期">{{
                supportSnapshotDialog.result.query_date
              }}</el-descriptions-item>
              <el-descriptions-item label="P1(30min)">{{
                supportSnapshotDialog.result.support_levels?.P1 ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="P2(5min)">{{
                supportSnapshotDialog.result.support_levels?.P2 ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="P3(昨低)">{{
                supportSnapshotDialog.result.support_levels?.P3 ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="P4(跌停)">{{
                supportSnapshotDialog.result.support_levels?.P4 ?? '-'
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card shadow="never" class="detail-card">
            <template #header>昨日四级别筹码集中价</template>
            <el-table :data="supportSnapshotDialog.result.chip_levels" border>
              <el-table-column
                prop="time_level"
                label="级别"
                min-width="100"
                sortable
              />
              <el-table-column
                prop="concentrated_price"
                label="集中价"
                min-width="120"
                sortable
              />
              <el-table-column
                prop="chip_ratio"
                label="筹码占比(%)"
                min-width="120"
                sortable
              />
              <el-table-column
                prop="data_source"
                label="数据来源"
                min-width="180"
              />
              <el-table-column
                prop="calc_time"
                label="计算时间"
                min-width="180"
              >
                <template #default="scope">{{
                  formatDateTime(scope.row.calc_time)
                }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </template>
      </template>
    </el-dialog>

    <el-dialog
      v-model="backtestDialog.visible"
      title="低吸策略回测"
      width="980px"
    >
      <template v-if="backtestDialog.row">
        <el-alert
          :title="getBacktestAlertTitle()"
          type="warning"
          :closable="false"
          class="backtest-alert"
        />
        <el-form
          :model="backtestForm"
          label-width="120px"
          class="backtest-form-grid"
        >
          <el-form-item label="策略实例">
            <el-input
              :model-value="backtestDialog.row.instance_name"
              disabled
            />
          </el-form-item>
          <el-form-item label="股票代码">
            <el-input
              v-model="backtestForm.stock_code"
              placeholder="如 600519.SH"
            />
          </el-form-item>
          <el-form-item label="交易日期">
            <el-date-picker
              v-model="backtestForm.trade_date"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="选择交易日期"
              class="full-width"
            />
          </el-form-item>
          <el-form-item label="K线周期">
            <el-select v-model="backtestForm.kline_type" class="full-width">
              <el-option label="1分钟" value="K_1M" />
              <el-option label="5分钟" value="K_5M" />
            </el-select>
          </el-form-item>
          <el-form-item label="开始时间">
            <el-time-select
              v-model="backtestForm.start_time"
              class="full-width"
              start="09:30"
              step="00:05"
              end="14:55"
              placeholder="开始时间"
            />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-time-select
              v-model="backtestForm.end_time"
              class="full-width"
              start="09:35"
              step="00:05"
              end="15:00"
              placeholder="结束时间"
            />
          </el-form-item>
        </el-form>

        <div class="backtest-actions">
          <el-button
            type="primary"
            :loading="backtestSubmitting"
            @click="submitBacktest"
            >开始回测</el-button
          >
        </div>

        <template v-if="backtestDialog.result">
          <el-card
            v-if="backtestDialog.result.support_snapshot"
            shadow="never"
            class="detail-card"
          >
            <template #header>支撑位快照</template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="源交易日">{{
                backtestDialog.result.support_snapshot.source_trade_date
              }}</el-descriptions-item>
              <el-descriptions-item label="P1(30min)">{{
                backtestDialog.result.support_snapshot.support_levels?.P1 ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="P2(5min)">{{
                backtestDialog.result.support_snapshot.support_levels?.P2 ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="P3(昨低)">{{
                backtestDialog.result.support_snapshot.support_levels?.P3 ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="P4(跌停)">{{
                backtestDialog.result.support_snapshot.support_levels?.P4 ?? '-'
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card shadow="never" class="detail-card">
            <template #header>回测摘要</template>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="扫描K线数">{{
                backtestDialog.result.summary.scanned_bars
              }}</el-descriptions-item>
              <el-descriptions-item label="实现阶段">{{
                backtestDialog.result.summary.implementation_stage || '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="回放模式">{{
                backtestDialog.result.summary.replay_mode || '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="触发次数">{{
                backtestDialog.result.summary.signal_count
              }}</el-descriptions-item>
              <el-descriptions-item label="是否贴近日低">{{
                backtestDialog.result.summary.hit_on_day_low ? '是' : '否'
              }}</el-descriptions-item>
              <el-descriptions-item label="首个信号时间">{{
                formatDateTime(backtestDialog.result.summary.first_signal_time)
              }}</el-descriptions-item>
              <el-descriptions-item label="首个信号价格">{{
                backtestDialog.result.summary.first_signal_price ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="区间最低价">{{
                backtestDialog.result.summary.session_low_price ?? '-'
              }}</el-descriptions-item>
              <el-descriptions-item label="未覆盖能力" :span="3">{{
                formatMissingCapabilities(
                  backtestDialog.result.summary.missing_capabilities
                )
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card shadow="never" class="detail-card">
            <template #header>信号明细</template>
            <el-table
              :data="backtestDialog.result.signals"
              border
              max-height="360"
            >
              <el-table-column prop="signal_time" label="时间" min-width="170">
                <template #default="scope">{{
                  formatDateTime(scope.row.signal_time)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="signal_price"
                label="价格"
                min-width="100"
                sortable
              />
              <el-table-column
                prop="support_level"
                label="支撑位"
                min-width="100"
                sortable
              />
              <el-table-column
                prop="factor_score"
                label="因子分"
                min-width="100"
                sortable
              />
              <el-table-column
                prop="vwap_bias_pct"
                label="VWAP偏离(%)"
                min-width="130"
                sortable
              >
                <template #default="scope">
                  <span :class="getSignedMetricClass(scope.row.vwap_bias_pct)">
                    {{ formatSignedPercent(scope.row.vwap_bias_pct) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column
                prop="p0_price"
                label="P0价格"
                min-width="110"
                sortable
              >
                <template #default="scope">{{
                  formatDecimal(scope.row.p0_price, 4)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="support_recovery_seconds"
                label="收回秒数"
                min-width="110"
                sortable
              >
                <template #default="scope">{{
                  scope.row.support_recovery_seconds ?? '-'
                }}</template>
              </el-table-column>
              <el-table-column
                prop="market_index_slope"
                label="指数斜率"
                min-width="110"
                sortable
              >
                <template #default="scope">
                  <span
                    :class="getSignedMetricClass(scope.row.market_index_slope)"
                    >{{ formatDecimal(scope.row.market_index_slope, 6) }}</span
                  >
                </template>
              </el-table-column>
              <el-table-column
                prop="intraday_position_pct"
                label="日内位置(%)"
                min-width="120"
                sortable
              />
              <el-table-column
                prop="retrace_from_high_pct"
                label="高位回撤(%)"
                min-width="120"
                sortable
              />
              <el-table-column
                prop="rebound_from_low_pct"
                label="低点回抽(%)"
                min-width="120"
                sortable
              />
              <el-table-column
                prop="open_change_pct"
                label="相对开盘(%)"
                min-width="120"
                sortable
              >
                <template #default="scope">
                  <span
                    :class="getSignedMetricClass(scope.row.open_change_pct)"
                    >{{ formatSignedPercent(scope.row.open_change_pct) }}</span
                  >
                </template>
              </el-table-column>
              <el-table-column
                prop="volume_ratio"
                label="量比"
                min-width="100"
                sortable
              />
              <el-table-column
                prop="day20_change_pct"
                label="20日涨幅(%)"
                min-width="120"
                sortable
              >
                <template #default="scope">
                  <span
                    :class="getSignedMetricClass(scope.row.day20_change_pct)"
                    >{{ formatSignedPercent(scope.row.day20_change_pct) }}</span
                  >
                </template>
              </el-table-column>
              <el-table-column
                prop="ma20_gap_pct"
                label="MA20偏离(%)"
                min-width="120"
                sortable
              >
                <template #default="scope">
                  <span :class="getSignedMetricClass(scope.row.ma20_gap_pct)">{{
                    formatSignedPercent(scope.row.ma20_gap_pct)
                  }}</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </template>
      </template>
    </el-dialog>

    <el-dialog
      v-model="chipPriceDialog.visible"
      title="筹码集中价管理"
      width="1120px"
    >
      <div class="chip-price-toolbar">
        <el-form
          :model="chipPriceForm"
          inline
          class="filter-row filter-row-wrap"
        >
          <el-form-item label="股票代码">
            <el-input
              v-model="chipPriceForm.stock_code"
              placeholder="600519.SH"
              class="filter-item"
            />
          </el-form-item>
          <el-form-item label="交易日期">
            <el-date-picker
              v-model="chipPriceForm.trade_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
            />
          </el-form-item>
          <el-form-item label="时间级别">
            <el-select
              v-model="chipPriceForm.time_levels"
              multiple
              collapse-tags
              collapse-tags-tooltip
              class="chip-time-level-select"
            >
              <el-option
                v-for="item in chipTimeLevelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-switch
              v-model="chipPriceForm.include_invalid"
              inline-prompt
              active-text="含失效"
              inactive-text="仅有效"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="chipPriceLoading"
              @click="loadChipPrices"
              >查询</el-button
            >
            <el-button
              type="success"
              :loading="chipPriceRecomputeLoading"
              @click="recomputeChipPrices"
              >手动重算</el-button
            >
            <el-button @click="openCreateChipPriceDialog">新增记录</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        :data="chipPriceDialog.items"
        v-loading="chipPriceLoading"
        border
      >
        <el-table-column prop="stock_code" label="股票代码" min-width="130" />
        <el-table-column
          prop="trade_date"
          label="交易日期"
          min-width="120"
          sortable
        />
        <el-table-column
          prop="time_level"
          label="时间级别"
          min-width="100"
          sortable
        />
        <el-table-column
          prop="concentrated_price"
          label="集中价"
          min-width="110"
          sortable
        />
        <el-table-column
          prop="chip_ratio"
          label="筹码占比(%)"
          min-width="120"
          sortable
        />
        <el-table-column
          prop="data_source"
          label="来源"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="calc_time" label="计算时间" min-width="180">
          <template #default="scope">{{
            formatDateTime(scope.row.calc_time)
          }}</template>
        </el-table-column>
        <el-table-column prop="is_valid" label="状态" min-width="90" sortable>
          <template #default="scope">
            <el-tag
              :type="scope.row.is_valid ? 'success' : 'info'"
              size="small"
            >
              {{ scope.row.is_valid ? '有效' : '失效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="140" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openEditChipPriceDialog(scope.row)"
                >编辑</el-button
              >
              <el-button
                link
                type="danger"
                @click="handleDeleteChipPrice(scope.row)"
                >失效</el-button
              >
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog
      v-model="chipPriceEditorDialog.visible"
      :title="
        chipPriceEditorDialog.mode === 'create'
          ? '新增筹码集中价'
          : '编辑筹码集中价'
      "
      width="620px"
    >
      <el-form :model="chipPriceEditorForm" label-width="110px">
        <el-form-item label="股票代码">
          <el-input
            v-model="chipPriceEditorForm.stock_code"
            placeholder="600519.SH"
          />
        </el-form-item>
        <el-form-item label="交易日期">
          <el-date-picker
            v-model="chipPriceEditorForm.trade_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="full-width"
          />
        </el-form-item>
        <el-form-item label="时间级别">
          <el-select
            v-model="chipPriceEditorForm.time_level"
            class="full-width"
          >
            <el-option
              v-for="item in chipTimeLevelOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="集中价">
          <el-input-number
            v-model="chipPriceEditorForm.concentrated_price"
            class="full-width"
            :min="0"
            :precision="6"
            :step="0.01"
          />
        </el-form-item>
        <el-form-item label="筹码占比(%)">
          <el-input-number
            v-model="chipPriceEditorForm.chip_ratio"
            class="full-width"
            :min="0"
            :max="100"
            :precision="4"
            :step="0.01"
          />
        </el-form-item>
        <el-form-item label="数据来源">
          <el-input v-model="chipPriceEditorForm.data_source" />
        </el-form-item>
        <el-form-item label="有效">
          <el-switch
            v-model="chipPriceEditorForm.is_valid"
            inline-prompt
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="chipPriceEditorDialog.visible = false"
          >取消</el-button
        >
        <el-button
          type="primary"
          :loading="chipPriceSaving"
          @click="submitChipPrice"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';

import {
  applySignalStrategyPhase2Defaults,
  backtestSignalStrategyInstance,
  createSignalStrategyInstance,
  createSignalStrategyChipPrice,
  deleteSignalStrategyChipPrice,
  deleteSignalStrategyInstance,
  getSignalStrategyChipPrices,
  getSignalStrategyInstances,
  getSignalStrategySupportSnapshot,
  getSignalStrategyTemplates,
  recomputeSignalStrategyChipPrices,
  toggleSignalStrategyInstance,
  updateSignalStrategyChipPrice,
  updateSignalStrategyInstance,
} from '@/api/modules/signalStrategy';

const route = useRoute();
const activeTab = ref('templates');
const templateLoading = ref(false);
const instanceLoading = ref(false);
const instanceSubmitting = ref(false);
const backtestSubmitting = ref(false);
const supportSnapshotLoading = ref(false);
const chipPriceLoading = ref(false);
const chipPriceRecomputeLoading = ref(false);
const chipPriceSaving = ref(false);
const instanceFormRef = ref(null);
const groupedTemplateFormCollapseNames = ref([]);
const intradayLowSuctionFormCollapseNames = ref([]);
const intradayLowSuctionFactorCollapseNames = ref([]);
const intradayLowSuctionDetailCollapseNames = ref([]);
const intradayLowSuctionDetailFactorCollapseNames = ref([]);

const templates = ref([]);
const instances = reactive({ total: 0, items: [] });

const templateFilters = reactive({
  usage_scope: '',
  business_category: '',
  is_enabled: undefined,
});
const instanceFilters = reactive({
  instance_name: '',
  template_code: '',
  usage_scope: '',
  business_category: '',
  is_enabled: undefined,
});
const instancePagination = reactive({ page: 1, page_size: 10 });

const instanceDialog = reactive({
  visible: false,
  mode: 'create',
  instanceId: null,
});
const detailDialog = reactive({ visible: false, data: null });
const backtestDialog = reactive({ visible: false, row: null, result: null });
const supportSnapshotDialog = reactive({
  visible: false,
  row: null,
  result: null,
});
const chipPriceDialog = reactive({ visible: false, row: null, items: [] });
const chipPriceEditorDialog = reactive({
  visible: false,
  mode: 'create',
  recordId: null,
});
const instanceForm = reactive(createInitialInstanceForm());
const backtestForm = reactive(createInitialBacktestForm());
const supportSnapshotForm = reactive(createInitialSupportSnapshotForm());
const chipPriceForm = reactive(createInitialChipPriceQueryForm());
const chipPriceEditorForm = reactive(createInitialChipPriceEditorForm());

const usageScopeOptions = [
  { value: 'buy', label: '买入' },
  { value: 'sell', label: '卖出' },
  { value: 'both', label: '买卖通用' },
];
const chipTimeLevelOptions = [
  { value: '1min', label: '1min' },
  { value: '5min', label: '5min' },
  { value: '30min', label: '30min' },
  { value: '1h', label: '1h' },
];
const supportLevelOptions = [
  { value: '30min', label: 'P1. 30min 筹码集中价' },
  { value: '5min', label: 'P2. 5min 筹码集中价' },
  { value: 'prev_low', label: 'P3. 昨日最低价' },
  { value: 'limit_down', label: 'P4. 当日跌停价' },
];
const intradayLowSuctionFactorOptions = [
  { label: '支撑触碰因子', value: 'SUPPORT_TOUCH_V1' },
  { label: '回撤回抽结构因子', value: 'RETRACE_REBOUND_V1' },
  { label: '相对开盘因子', value: 'OPEN_CHANGE_V1' },
  { label: '量比因子', value: 'VOLUME_RATIO_V1' },
  { label: '20日趋势因子', value: 'DAY20_TREND_V1' },
  { label: 'MA20因子', value: 'MA20_TREND_V1' },
  { label: 'VWAP负乖离因子', value: 'VWAP_BIAS_V1' },
  { label: 'P0动态支撑因子', value: 'P0_SUPPORT_V1' },
  { label: '破位收回因子', value: 'BREAK_RECOVERY_V1' },
  { label: 'Level-2主买流因子', value: 'L2_FLOW_V1' },
  { label: '板块/指数共振因子', value: 'MARKET_RESONANCE_V1' },
];
const intradayLowSuctionFactorFieldMap = {
  SUPPORT_TOUCH_V1: [],
  RETRACE_REBOUND_V1: [
    'max_intraday_position_pct',
    'min_retrace_from_high_pct',
    'min_rebound_from_low_pct',
    'max_rebound_from_low_pct',
  ],
  OPEN_CHANGE_V1: ['max_open_change_pct'],
  VOLUME_RATIO_V1: ['min_volume_ratio', 'max_volume_ratio'],
  DAY20_TREND_V1: ['min_day20_change_pct'],
  MA20_TREND_V1: ['require_above_ma20'],
  VWAP_BIAS_V1: ['enable_phase2_context', 'vwap_bias_threshold_pct'],
  P0_SUPPORT_V1: [
    'enable_phase2_context',
    'p0_activation_time',
    'p0_turnover_ratio_threshold_pct',
  ],
  BREAK_RECOVERY_V1: ['enable_phase2_context', 'break_recovery_seconds_max'],
  L2_FLOW_V1: [
    'enable_phase2_context',
    'l2_buy_flow_ratio_threshold',
    'l2_large_buy_ratio_threshold',
    'stable_bid_ratio_threshold',
  ],
  MARKET_RESONANCE_V1: [
    'enable_phase2_context',
    'market_index_code',
    'sector_index_code',
    'market_slope_window_bars',
  ],
};
const intradayLowSuctionFactorDescriptionMap = {
  SUPPORT_TOUCH_V1:
    '要求价格真实命中昨日支撑位，是所有后续低吸判断的触发基础。',
  RETRACE_REBOUND_V1: '约束必须先有回撤、再有低点回抽，避免在持续下跌中接刀。',
  OPEN_CHANGE_V1: '要求当前价相对开盘位置仍偏弱，避免追到开盘上方的反抽。',
  VOLUME_RATIO_V1: '要求成交活跃但不过热，过滤无量阴跌和恐慌放量。',
  DAY20_TREND_V1: '用近20日涨幅继续确认标的中期趋势不弱。',
  MA20_TREND_V1: '要求价格站在 MA20 上方，保证低吸发生在上升趋势中。',
  VWAP_BIAS_V1: 'Phase-2 因子，要求价格对 VWAP 出现可接受的负乖离。',
  P0_SUPPORT_V1: 'Phase-2 因子，要求午后动态筹码峰 P0 已形成有效承接。',
  BREAK_RECOVERY_V1: 'Phase-2 因子，要求支撑被击穿后在限定秒数内快速收回。',
  L2_FLOW_V1: 'Phase-2 因子，要求 Level-2 主买流与托盘结构同步改善。',
  MARKET_RESONANCE_V1: 'Phase-2 因子，要求个股低吸与板块/指数分时共振同步。',
};
const intradayLowSuctionBaseSections = [
  {
    key: 't0',
    title: '1. 持仓股为T + 0',
    description: '先约束做T场景的时间闸门，避免超过日内买回时间后继续新开仓。',
    fields: ['allow_t0_only', 't0_cutoff_time'],
  },
  {
    key: 'trend',
    title: '2. 日线趋势向上',
    description: '趋势组件定义准入门槛，只有中期趋势不弱时才允许进入支撑验证。',
    fields: ['trend_component_code'],
  },
  {
    key: 'support',
    title: '3. 昨日多个被验证的支撑位级别P1、P2、P3、P4',
    description:
      '支撑位范围分别对应 P1=30min、P2=5min、P3=昨日最低价、P4=当日跌停价。',
    fields: [
      'support_component_code',
      'support_time_levels',
      'support_tolerance_pct',
    ],
  },
  {
    key: 'factors',
    title: '4. 支撑位有效的多因子组合列表',
    description: '启用因子采用动态组合，且对应配置参数始终展示在因子名称下面。',
    fields: ['enabled_factor_codes', 'min_factor_score'],
  },
];

const routeUsageScopePreset = computed(() =>
  String(route.meta?.signalUsageScopePreset || '')
);
const routeBusinessCategoryPreset = computed(() =>
  String(route.meta?.signalBusinessCategoryPreset || '')
);
const pageTitle = computed(() =>
  String(route.meta?.signalMenuTitle || '信号策略管理')
);
const pageDescription = computed(() => {
  if (routeBusinessCategoryPreset.value === 'BUY_RISK_BLOCK') {
    return '统一查看做T买入风控约束模板，并维护“返回 true 即禁止低吸买回”的约束策略实例。';
  }
  if (routeBusinessCategoryPreset.value === 'SELL_TREND_GUARD') {
    return '统一查看做T卖出趋势保护模板，并维护“返回 true 即禁止高抛卖出”的保护策略实例。';
  }
  if (routeUsageScopePreset.value === 'buy') {
    return '统一查看买点相关信号模板，并维护可供建仓策略直接引用的买点策略实例。';
  }
  if (routeUsageScopePreset.value === 'sell') {
    return '统一查看卖点相关信号模板，并维护可供清仓策略直接引用的卖点策略实例。';
  }
  if (routeUsageScopePreset.value === 'both') {
    return '统一查看买卖通用的信号模板，并维护同时适用于买入和卖出的策略实例。';
  }
  return '统一查看内置信号模板，并维护可供业务直接引用的信号策略实例。';
});
const createButtonText = computed(() => {
  if (routeBusinessCategoryPreset.value === 'BUY_RISK_BLOCK') {
    return '新建买入风控约束策略实例';
  }
  if (routeBusinessCategoryPreset.value === 'SELL_TREND_GUARD') {
    return '新建卖出趋势保护策略实例';
  }
  if (routeUsageScopePreset.value === 'buy') {
    return '新建买点策略实例';
  }
  if (routeUsageScopePreset.value === 'sell') {
    return '新建卖点策略实例';
  }
  if (routeUsageScopePreset.value === 'both') {
    return '新建通用策略实例';
  }
  return '新建实例';
});

const enabledTemplates = computed(() =>
  templates.value.filter((item) => item.is_enabled)
);
const currentTemplate = computed(
  () =>
    templates.value.find(
      (item) => item.template_code === instanceForm.template_code
    ) || null
);
const groupedTemplateFormSections = computed(() =>
  buildGroupedTemplateSections(currentTemplate.value)
);
const intradayLowSuctionFormSections = computed(() =>
  buildIntradayLowSuctionSections(
    currentTemplate.value,
    instanceForm.params_value
  )
);
const detailPreviewSections = computed(() =>
  buildParamPreviewSections(detailDialog.data || {})
);

const instanceFormRules = {
  instance_name: [
    { required: true, message: '请输入实例名称', trigger: 'blur' },
  ],
  template_code: [{ required: true, message: '请选择模板', trigger: 'change' }],
};

onMounted(async () => {
  await applyRoutePreset();
});

watch(
  () => route.fullPath,
  () => {
    applyRoutePreset();
  }
);

watch(
  groupedTemplateFormSections,
  (sections) => {
    groupedTemplateFormCollapseNames.value = syncCollapseNames(
      groupedTemplateFormCollapseNames.value,
      sections.map((section) => buildSectionCollapseName(section))
    );
  },
  { immediate: true }
);

watch(
  intradayLowSuctionFormSections,
  (sections) => {
    intradayLowSuctionFormCollapseNames.value = syncCollapseNames(
      intradayLowSuctionFormCollapseNames.value,
      sections.map((section) => buildSectionCollapseName(section))
    );
    intradayLowSuctionFactorCollapseNames.value = syncCollapseNames(
      intradayLowSuctionFactorCollapseNames.value,
      sections.flatMap((section) =>
        (section.factorGroups || []).map((factorGroup) =>
          buildFactorCollapseName(factorGroup)
        )
      )
    );
  },
  { immediate: true }
);

watch(
  detailPreviewSections,
  (sections) => {
    intradayLowSuctionDetailCollapseNames.value = syncCollapseNames(
      intradayLowSuctionDetailCollapseNames.value,
      sections.map((section) => buildSectionCollapseName(section))
    );
    intradayLowSuctionDetailFactorCollapseNames.value = syncCollapseNames(
      intradayLowSuctionDetailFactorCollapseNames.value,
      sections.flatMap((section) =>
        (section.factorGroups || []).map((factorGroup) =>
          buildFactorCollapseName(factorGroup)
        )
      )
    );
  },
  { immediate: true }
);

async function applyRoutePreset() {
  templateFilters.usage_scope = routeUsageScopePreset.value || '';
  templateFilters.business_category = routeBusinessCategoryPreset.value || '';
  templateFilters.is_enabled = undefined;
  instanceFilters.instance_name = '';
  instanceFilters.template_code = '';
  instanceFilters.usage_scope = routeUsageScopePreset.value || '';
  instanceFilters.business_category = routeBusinessCategoryPreset.value || '';
  instanceFilters.is_enabled = undefined;
  instancePagination.page = 1;
  await loadTemplates();
  await loadInstances();
}

async function loadTemplates() {
  templateLoading.value = true;
  try {
    const res = await getSignalStrategyTemplates(
      compactParams(templateFilters)
    );
    templates.value = res?.payload?.items || [];
  } catch (error) {
    ElMessage.error(error.message || '加载模板失败');
  } finally {
    templateLoading.value = false;
  }
}

async function loadInstances() {
  instanceLoading.value = true;
  try {
    const res = await getSignalStrategyInstances(
      compactParams({
        ...instanceFilters,
        page: instancePagination.page,
        page_size: instancePagination.page_size,
      })
    );
    const payload = res?.payload || {};
    instances.total = payload.total || 0;
    instances.items = payload.items || [];
  } catch (error) {
    ElMessage.error(error.message || '加载实例失败');
  } finally {
    instanceLoading.value = false;
  }
}

function resetTemplateFilters() {
  templateFilters.usage_scope = routeUsageScopePreset.value || '';
  templateFilters.business_category = routeBusinessCategoryPreset.value || '';
  templateFilters.is_enabled = undefined;
  loadTemplates();
}

function resetInstanceFilters() {
  instanceFilters.instance_name = '';
  instanceFilters.template_code = '';
  instanceFilters.usage_scope = routeUsageScopePreset.value || '';
  instanceFilters.business_category = routeBusinessCategoryPreset.value || '';
  instanceFilters.is_enabled = undefined;
  instancePagination.page = 1;
  loadInstances();
}

function handleInstanceSearch() {
  instancePagination.page = 1;
  loadInstances();
}

function handlePageSizeChange() {
  instancePagination.page = 1;
  loadInstances();
}

function openCreateDialog() {
  instanceDialog.visible = true;
  instanceDialog.mode = 'create';
  instanceDialog.instanceId = null;
  Object.assign(instanceForm, createInitialInstanceForm());
  if (enabledTemplates.value.length) {
    instanceForm.template_code = enabledTemplates.value[0].template_code;
    applyTemplateDefaults();
  }
}

function openEditDialog(row) {
  instanceDialog.visible = true;
  instanceDialog.mode = 'edit';
  instanceDialog.instanceId = row.id;
  Object.assign(instanceForm, createInitialInstanceForm(), {
    instance_name: row.instance_name,
    template_code: row.template_code,
    is_enabled: row.is_enabled,
    remark: row.remark || '',
    params_value: { ...(row.params_value || {}) },
  });
  applyTemplateDefaults(false);
}

function openDetailDialog(row) {
  detailDialog.visible = true;
  detailDialog.data = row;
}

function openBacktestDialog(row) {
  backtestDialog.visible = true;
  backtestDialog.row = row;
  backtestDialog.result = null;
  Object.assign(backtestForm, createInitialBacktestForm());
}

function openSupportSnapshotDialog(row) {
  supportSnapshotDialog.visible = true;
  supportSnapshotDialog.row = row;
  supportSnapshotDialog.result = null;
  Object.assign(supportSnapshotForm, createInitialSupportSnapshotForm());
}

function openChipPriceDialog(row) {
  chipPriceDialog.visible = true;
  chipPriceDialog.row = row;
  chipPriceDialog.items = [];
  Object.assign(chipPriceForm, createInitialChipPriceQueryForm());
}

function getBacktestAlertTitle() {
  const summary = backtestDialog.result?.summary;
  if (!summary) {
    return '当前回测使用分钟K线近似重放，不包含逐笔/L2 因子。';
  }
  return `当前结果为 ${summary.implementation_stage} / ${summary.replay_mode}，未覆盖：${formatMissingCapabilities(summary.missing_capabilities)}`;
}

function handleTemplateChange() {
  applyTemplateDefaults();
}

function applyTemplateDefaults(overwriteExisting = true) {
  const template = currentTemplate.value;
  if (!template) {
    instanceForm.params_value = {};
    return;
  }
  const nextValue = overwriteExisting
    ? {}
    : { ...(instanceForm.params_value || {}) };
  (template.params_schema?.fields || []).forEach((field) => {
    if (overwriteExisting || nextValue[field.path] === undefined) {
      nextValue[field.path] = cloneFieldDefault(field.default, field.component);
    }
  });
  instanceForm.params_value = nextValue;
}

function isIntradayLowSuctionTemplate(templateOrRow) {
  return String(templateOrRow?.template_code || '') === 'INTRADAY_LOW_SUCTION';
}

function getTemplateFieldMap(template) {
  return Object.fromEntries(
    (template?.params_schema?.fields || []).map((field) => [field.path, field])
  );
}

function getIntradayFactorLabel(code) {
  return (
    intradayLowSuctionFactorOptions.find((item) => item.value === code)
      ?.label || code
  );
}

function getSupportLevelLabel(value) {
  return (
    supportLevelOptions.find((item) => item.value === value)?.label || value
  );
}

function buildIntradayLowSuctionSections(template, paramsValue = {}) {
  if (!isIntradayLowSuctionTemplate(template)) {
    return [];
  }
  const fieldMap = getTemplateFieldMap(template);
  const enabledFactorCodes = Array.isArray(paramsValue?.enabled_factor_codes)
    ? paramsValue.enabled_factor_codes
    : [];
  return intradayLowSuctionBaseSections.map((section) => ({
    ...section,
    fields: section.fields.map((path) => fieldMap[path]).filter(Boolean),
    factorGroups:
      section.key === 'factors'
        ? enabledFactorCodes.map((factorCode) => ({
            code: factorCode,
            title: `${enabledFactorCodes.indexOf(factorCode) + 1}. ${getIntradayFactorLabel(factorCode)}`,
            label: getIntradayFactorLabel(factorCode),
            description:
              intradayLowSuctionFactorDescriptionMap[factorCode] ||
              '当前因子暂无补充说明。',
            fields: Array.from(
              new Set(intradayLowSuctionFactorFieldMap[factorCode] || [])
            )
              .map((path) => fieldMap[path])
              .filter(Boolean),
          }))
        : [],
  }));
}

function hasTemplateFieldGroups(template) {
  return (template?.params_schema?.fields || []).some(
    (field) => field.group_key
  );
}

function buildGroupedTemplateSections(template) {
  if (!hasTemplateFieldGroups(template)) {
    return [];
  }
  const sections = new Map();
  (template?.params_schema?.fields || []).forEach((field, index) => {
    const sectionKey = String(field.group_key || `section-${index}`);
    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, {
        key: sectionKey,
        title: field.group_label || '参数配置',
        description: field.group_description || '',
        order:
          typeof field.group_order === 'number'
            ? field.group_order
            : Number.MAX_SAFE_INTEGER,
        fields: [],
      });
    }
    sections.get(sectionKey).fields.push(field);
  });
  return Array.from(sections.values()).sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return left.key.localeCompare(right.key);
  });
}

function resolveTemplateByCode(templateCode) {
  return (
    templates.value.find((item) => item.template_code === templateCode) || null
  );
}

function resolveFieldLabel(template, path) {
  return getTemplateFieldMap(template)[path]?.label || path;
}

function buildSectionCollapseName(section) {
  return `section:${section?.key || section?.title || 'default'}`;
}

function buildFactorCollapseName(factorGroup) {
  return `factor:${factorGroup?.code || factorGroup?.title || 'default'}`;
}

function syncCollapseNames(currentNames, nextNames) {
  if (!nextNames.length) {
    return [];
  }
  const currentNameSet = new Set(currentNames || []);
  return nextNames.filter((name) => currentNameSet.has(name) || true);
}

function resolveFieldOptionLabel(field, value) {
  return (
    (field?.options || []).find((option) => option.value === value)?.label ||
    value
  );
}

function formatParamPreviewValue(template, path, value) {
  const field = getTemplateFieldMap(template)[path];
  if (path === 'support_time_levels' && Array.isArray(value)) {
    return value.map((item) => getSupportLevelLabel(item)).join('、') || '-';
  }
  if (path === 'enabled_factor_codes' && Array.isArray(value)) {
    return value.map((item) => getIntradayFactorLabel(item)).join('、') || '-';
  }
  if (field?.component === 'select') {
    return resolveFieldOptionLabel(field, value);
  }
  if (field?.component === 'multi-select' && Array.isArray(value)) {
    return (
      value.map((item) => resolveFieldOptionLabel(field, item)).join('、') ||
      '-'
    );
  }
  return formatParamValue(value);
}

function buildParamPreviewSections(row) {
  const paramsValue = row?.params_value || {};
  const template = resolveTemplateByCode(row?.template_code);
  if (
    !isIntradayLowSuctionTemplate(row || template) &&
    hasTemplateFieldGroups(template)
  ) {
    return buildGroupedTemplateSections(template)
      .map((section) => ({
        key: section.key,
        title: section.title,
        description: section.description,
        items: section.fields.map((field) => ({
          label: field.label,
          value: formatParamPreviewValue(
            template,
            field.path,
            paramsValue[field.path]
          ),
        })),
        factorGroups: [],
      }))
      .filter((section) => section.items.length > 0);
  }
  if (!isIntradayLowSuctionTemplate(row || template)) {
    return [
      {
        key: 'overview',
        title: '参数概览',
        description: '',
        items: Object.entries(paramsValue).map(([key, value]) => ({
          label: resolveFieldLabel(template, key),
          value: formatParamPreviewValue(template, key, value),
        })),
        factorGroups: [],
      },
    ].filter((section) => section.items.length > 0);
  }

  const sections = [];
  const groupedSections = buildIntradayLowSuctionSections(
    template,
    paramsValue
  );
  groupedSections.forEach((section) => {
    const items = section.fields.map((field) => ({
      label: field.label,
      value: formatParamPreviewValue(
        template,
        field.path,
        paramsValue[field.path]
      ),
    }));
    const factorGroups = (section.factorGroups || []).map((factorGroup) => ({
      code: factorGroup.code,
      title: factorGroup.title,
      description: factorGroup.description,
      items: factorGroup.fields.map((field) => ({
        label: field.label,
        value: formatParamPreviewValue(
          template,
          field.path,
          paramsValue[field.path]
        ),
      })),
    }));
    if (items.length || factorGroups.length) {
      sections.push({
        key: section.key,
        title: section.title,
        description: section.description,
        items,
        factorGroups,
      });
    }
  });
  return sections;
}

function setParamValue(path, value, component = 'string') {
  if (component === 'string-array') {
    instanceForm.params_value = {
      ...instanceForm.params_value,
      [path]: String(value || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };
    return;
  }
  instanceForm.params_value = {
    ...instanceForm.params_value,
    [path]: value,
  };
}

async function submitInstance() {
  if (!instanceFormRef.value) {
    return;
  }
  try {
    await instanceFormRef.value.validate();
  } catch {
    return;
  }

  if (!currentTemplate.value) {
    ElMessage.warning('请选择模板');
    return;
  }

  instanceSubmitting.value = true;
  try {
    const payload = {
      instance_name: instanceForm.instance_name.trim(),
      template_code: instanceForm.template_code,
      params_value: normalizeParamsForSubmit(
        currentTemplate.value,
        instanceForm.params_value
      ),
      remark: instanceForm.remark || null,
      is_enabled: instanceForm.is_enabled,
    };
    if (instanceDialog.mode === 'create') {
      await createSignalStrategyInstance(payload);
      ElMessage.success('实例创建成功');
    } else {
      await updateSignalStrategyInstance(instanceDialog.instanceId, payload);
      ElMessage.success('实例更新成功');
    }
    instanceDialog.visible = false;
    await loadInstances();
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    instanceSubmitting.value = false;
  }
}

async function handleToggleInstance(row, value) {
  try {
    await toggleSignalStrategyInstance(row.id, value);
    row.is_enabled = value;
    ElMessage.success(value ? '已启用' : '已停用');
  } catch (error) {
    row.is_enabled = !value;
    ElMessage.error(error.message || '状态切换失败');
    await loadInstances();
  }
}

async function handleDeleteInstance(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除实例“${row.instance_name}”吗？`,
      '删除确认',
      {
        type: 'warning',
      }
    );
  } catch {
    return;
  }
  try {
    await deleteSignalStrategyInstance(row.id);
    ElMessage.success('实例已删除');
    await loadInstances();
  } catch (error) {
    ElMessage.error(error.message || '删除失败');
  }
}

async function applyPhase2Defaults(row) {
  try {
    await ElMessageBox.confirm(
      `确认将实例“${row.instance_name}”切换为 Phase-2 推荐参数吗？`,
      '应用确认',
      { type: 'warning' }
    );
  } catch {
    return;
  }
  try {
    await applySignalStrategyPhase2Defaults(row.id);
    ElMessage.success('已应用 Phase-2 推荐参数');
    await loadInstances();
  } catch (error) {
    ElMessage.error(error.message || '应用 Phase-2 默认参数失败');
  }
}

async function submitBacktest() {
  if (!backtestDialog.row) {
    return;
  }
  if (!backtestForm.stock_code || !backtestForm.trade_date) {
    ElMessage.warning('请先填写股票代码和交易日期');
    return;
  }

  backtestSubmitting.value = true;
  try {
    const res = await backtestSignalStrategyInstance(backtestDialog.row.id, {
      stock_code: backtestForm.stock_code.trim(),
      trade_date: backtestForm.trade_date,
      kline_type: backtestForm.kline_type,
      start_time: normalizeClock(backtestForm.start_time),
      end_time: normalizeClock(backtestForm.end_time),
      max_signals: 20,
    });
    backtestDialog.result = res?.payload || null;
    ElMessage.success('回测完成');
  } catch (error) {
    ElMessage.error(error.message || '回测失败');
  } finally {
    backtestSubmitting.value = false;
  }
}

async function loadSupportSnapshot() {
  if (!supportSnapshotForm.stock_code || !supportSnapshotForm.query_date) {
    ElMessage.warning('请先填写股票代码和查询日期');
    return;
  }
  supportSnapshotLoading.value = true;
  try {
    const res = await getSignalStrategySupportSnapshot({
      stock_code: supportSnapshotForm.stock_code.trim(),
      query_date: supportSnapshotForm.query_date,
    });
    supportSnapshotDialog.result = res?.payload || null;
    ElMessage.success('支撑位查询完成');
  } catch (error) {
    ElMessage.error(error.message || '支撑位查询失败');
  } finally {
    supportSnapshotLoading.value = false;
  }
}

async function loadChipPrices() {
  if (!chipPriceForm.stock_code || !chipPriceForm.trade_date) {
    ElMessage.warning('请先填写股票代码和交易日期');
    return;
  }
  chipPriceLoading.value = true;
  try {
    const res = await getSignalStrategyChipPrices({
      stock_code: chipPriceForm.stock_code.trim(),
      trade_date: chipPriceForm.trade_date,
      time_levels: chipPriceForm.time_levels,
      include_invalid: chipPriceForm.include_invalid,
    });
    chipPriceDialog.items = res?.payload?.items || [];
  } catch (error) {
    ElMessage.error(error.message || '加载筹码集中价失败');
  } finally {
    chipPriceLoading.value = false;
  }
}

async function recomputeChipPrices() {
  if (!chipPriceForm.stock_code || !chipPriceForm.trade_date) {
    ElMessage.warning('请先填写股票代码和交易日期');
    return;
  }
  chipPriceRecomputeLoading.value = true;
  try {
    const res = await recomputeSignalStrategyChipPrices({
      stock_code: chipPriceForm.stock_code.trim(),
      trade_date: chipPriceForm.trade_date,
      time_levels: chipPriceForm.time_levels,
      force_refresh: true,
    });
    chipPriceDialog.items = res?.payload?.items || [];
    ElMessage.success('筹码集中价重算完成');
  } catch (error) {
    ElMessage.error(error.message || '筹码集中价重算失败');
  } finally {
    chipPriceRecomputeLoading.value = false;
  }
}

function openCreateChipPriceDialog() {
  chipPriceEditorDialog.visible = true;
  chipPriceEditorDialog.mode = 'create';
  chipPriceEditorDialog.recordId = null;
  Object.assign(chipPriceEditorForm, createInitialChipPriceEditorForm(), {
    stock_code: chipPriceForm.stock_code || '',
    trade_date: chipPriceForm.trade_date || formatDateInput(new Date()),
  });
}

function openEditChipPriceDialog(row) {
  chipPriceEditorDialog.visible = true;
  chipPriceEditorDialog.mode = 'edit';
  chipPriceEditorDialog.recordId = row.id;
  Object.assign(chipPriceEditorForm, createInitialChipPriceEditorForm(), {
    stock_code: row.stock_code,
    trade_date: row.trade_date,
    time_level: row.time_level,
    concentrated_price: row.concentrated_price,
    chip_ratio: row.chip_ratio,
    data_source: row.data_source,
    is_valid: row.is_valid,
  });
}

async function submitChipPrice() {
  if (!chipPriceEditorForm.stock_code || !chipPriceEditorForm.trade_date) {
    ElMessage.warning('请先填写完整的筹码记录');
    return;
  }
  chipPriceSaving.value = true;
  const payload = {
    stock_code: chipPriceEditorForm.stock_code.trim(),
    trade_date: chipPriceEditorForm.trade_date,
    time_level: chipPriceEditorForm.time_level,
    concentrated_price: Number(chipPriceEditorForm.concentrated_price),
    chip_ratio:
      chipPriceEditorForm.chip_ratio === null ||
      chipPriceEditorForm.chip_ratio === undefined
        ? null
        : Number(chipPriceEditorForm.chip_ratio),
    data_source: chipPriceEditorForm.data_source || 'manual',
    is_valid: Boolean(chipPriceEditorForm.is_valid),
  };
  try {
    if (chipPriceEditorDialog.mode === 'create') {
      await createSignalStrategyChipPrice(payload);
      ElMessage.success('筹码记录已新增');
    } else {
      await updateSignalStrategyChipPrice(
        chipPriceEditorDialog.recordId,
        payload
      );
      ElMessage.success('筹码记录已更新');
    }
    chipPriceEditorDialog.visible = false;
    await loadChipPrices();
  } catch (error) {
    ElMessage.error(error.message || '保存筹码记录失败');
  } finally {
    chipPriceSaving.value = false;
  }
}

async function handleDeleteChipPrice(row) {
  try {
    await ElMessageBox.confirm(
      `确认将 ${row.stock_code} ${row.trade_date} ${row.time_level} 标记为失效吗？`,
      '失效确认',
      { type: 'warning' }
    );
  } catch {
    return;
  }
  try {
    await deleteSignalStrategyChipPrice(row.id);
    ElMessage.success('筹码记录已失效');
    await loadChipPrices();
  } catch (error) {
    ElMessage.error(error.message || '失效筹码记录失败');
  }
}

function getUsageScopeLabel(value) {
  return (
    usageScopeOptions.find((item) => item.value === value)?.label ||
    value ||
    '-'
  );
}

function getUsageScopeTagType(value) {
  if (value === 'buy') {
    return 'success';
  }
  if (value === 'sell') {
    return 'danger';
  }
  return 'warning';
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatParamValue(value) {
  if (Array.isArray(value)) {
    return value.join('、');
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return value ?? '-';
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return value;
  }
  return `${numericValue > 0 ? '+' : ''}${numericValue.toFixed(2)}%`;
}

function formatDecimal(value, digits = 4) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return value;
  }
  return numericValue.toFixed(digits);
}

function getSignedMetricClass(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue) || numericValue === 0) {
    return '';
  }
  return numericValue > 0 ? 'metric-positive' : 'metric-negative';
}

function normalizeClock(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return text.length === 5 ? `${text}:00` : text;
}

function normalizeInputValue(value, component) {
  if (component === 'string-array') {
    return Array.isArray(value) ? value.join('\n') : '';
  }
  return value ?? '';
}

function normalizeParamsForSubmit(template, paramsValue) {
  const nextValue = {};
  (template.params_schema?.fields || []).forEach((field) => {
    const rawValue = paramsValue[field.path];
    if (field.component === 'integer') {
      nextValue[field.path] = Number.parseInt(rawValue, 10);
      return;
    }
    if (field.component === 'number') {
      nextValue[field.path] = Number(rawValue);
      return;
    }
    nextValue[field.path] = rawValue;
  });
  return nextValue;
}

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

function cloneFieldDefault(value, component) {
  if (component === 'string-array') {
    return Array.isArray(value) ? [...value] : [];
  }
  if (Array.isArray(value)) {
    return [...value];
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value;
}

function formatMissingCapabilities(value) {
  if (!Array.isArray(value) || !value.length) {
    return '-';
  }
  return value.join('、');
}

function createInitialInstanceForm() {
  return {
    instance_name: '',
    template_code: '',
    params_value: {},
    remark: '',
    is_enabled: true,
  };
}

function createInitialBacktestForm() {
  return {
    stock_code: '',
    trade_date: formatDateInput(new Date()),
    kline_type: 'K_1M',
    start_time: '09:35',
    end_time: '14:30',
  };
}

function createInitialSupportSnapshotForm() {
  return {
    stock_code: '',
    query_date: formatDateInput(new Date()),
  };
}

function createInitialChipPriceQueryForm() {
  return {
    stock_code: '',
    trade_date: formatDateInput(new Date()),
    time_levels: ['1min', '5min', '30min', '1h'],
    include_invalid: true,
  };
}

function createInitialChipPriceEditorForm() {
  return {
    stock_code: '',
    trade_date: formatDateInput(new Date()),
    time_level: '30min',
    concentrated_price: null,
    chip_ratio: null,
    data_source: 'manual',
    is_valid: true,
  };
}

function formatDateInput(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
</script>

<style scoped>
.signal-strategy-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.content-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-row-wrap {
  flex-wrap: wrap;
}

.chip-price-toolbar {
  margin-bottom: 16px;
}

.chip-time-level-select {
  min-width: 240px;
}

.filter-item {
  width: 180px;
}

.filter-keyword {
  width: 240px;
}

.muted-text {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.field-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.param-preview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #4b5563;
}

.param-preview-group-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-preview-group {
  border-left: 3px solid #dcdfe6;
  padding-left: 10px;
}

.param-preview-factor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.param-preview-factor {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
}

.param-preview-factor__title {
  margin-bottom: 4px;
  font-weight: 600;
  color: #303133;
}

.param-preview-group__title {
  margin-bottom: 4px;
  font-weight: 600;
  color: #303133;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.template-config-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #fafafa;
}

.template-description {
  margin-bottom: 16px;
  color: #6b7280;
}

.template-group-collapse,
.factor-config-collapse,
.detail-collapse,
.detail-factor-collapse {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-group-collapse :deep(.el-collapse),
.factor-config-collapse :deep(.el-collapse),
.detail-collapse :deep(.el-collapse),
.detail-factor-collapse :deep(.el-collapse) {
  border-top: none;
  border-bottom: none;
}

.template-group-collapse :deep(.el-collapse-item),
.factor-config-collapse :deep(.el-collapse-item),
.detail-collapse :deep(.el-collapse-item),
.detail-factor-collapse :deep(.el-collapse-item) {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fff;
}

.template-group-collapse :deep(.el-collapse-item__header),
.factor-config-collapse :deep(.el-collapse-item__header),
.detail-collapse :deep(.el-collapse-item__header),
.detail-factor-collapse :deep(.el-collapse-item__header) {
  align-items: flex-start;
  height: auto;
  min-height: 56px;
  padding: 14px 16px;
  border-bottom: none;
  line-height: 1.4;
  border-radius: 10px;
}

.template-group-collapse :deep(.el-collapse-item__wrap),
.factor-config-collapse :deep(.el-collapse-item__wrap),
.detail-collapse :deep(.el-collapse-item__wrap),
.detail-factor-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.template-group-collapse :deep(.el-collapse-item__content),
.factor-config-collapse :deep(.el-collapse-item__content),
.detail-collapse :deep(.el-collapse-item__content),
.detail-factor-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.template-group-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 14px 14px;
}

.template-group-header h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.template-group-header p {
  margin: 6px 0 0;
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}

.dynamic-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.factor-config-group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.factor-config-card {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.factor-config-card__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 12px;
}

.factor-config-card__title {
  font-weight: 600;
  color: #303133;
}

.factor-config-card__desc {
  margin: 6px 0 12px;
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}

.factor-config-card__empty {
  color: #909399;
  font-size: 12px;
}

.detail-preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 14px 14px;
}

.dynamic-field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dynamic-field-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.field-help-text {
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.full-width {
  width: 100%;
}

.detail-card {
  margin-top: 16px;
}

.backtest-alert {
  margin-bottom: 16px;
}

.backtest-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  column-gap: 16px;
}

.backtest-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.metric-positive {
  color: #d03050;
}

.metric-negative {
  color: #00a870;
}

@media (max-width: 768px) {
  .signal-strategy-page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item,
  .filter-keyword {
    width: 100%;
  }

  .filter-row {
    flex-wrap: wrap;
  }
}
</style>
