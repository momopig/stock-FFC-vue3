<template>
  <div class="insights-section">
    <el-row :gutter="16">
      <!-- 自选以来 - 三角形布局 -->
      <el-col :span="9">
        <el-card class="insight-card triangle-card">
          <div class="triangle-content">
            <div class="triangle-title">📈 自选以来</div>
            <div class="triangle-layout">
              <div class="triangle-top">
                <span class="value-container">
                  AVG
                  <span class="value" :style="{ color: getQuoteColor(insightsData.selfAvgChange) }">
                    {{ formatChangePercent(insightsData.selfAvgChange) }}
                  </span>
                </span>
              </div>
              <div class="triangle-bottom">
                <div class="triangle-left">
                  <span class="value-container">
                    High
                    <el-tooltip
                      placement="top"
                      :content="insightsData.selfMaxStockName || '暂无对应股票名称'"
                    >
                      <span
                        class="value copyable"
                        :style="{ color: getQuoteColor(insightsData.selfMaxChange) }"
                        @click="handleCopyStockName(insightsData.selfMaxStockName)"
                      >
                        {{ formatChangePercent(insightsData.selfMaxChange) }}
                      </span>
                    </el-tooltip>
                  </span>
                </div>
                <div class="triangle-right">
                  <span class="value-container">
                    Low
                    <el-tooltip
                      placement="top"
                      :content="insightsData.selfMinStockName || '暂无对应股票名称'"
                    >
                      <span
                        class="value copyable"
                        :style="{ color: getQuoteColor(insightsData.selfMinChange) }"
                        @click="handleCopyStockName(insightsData.selfMinStockName)"
                      >
                        {{ formatChangePercent(insightsData.selfMinChange) }}
                      </span>
                    </el-tooltip>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <!-- 当日 - 三角形布局 -->
      <el-col :span="9">
        <el-card class="insight-card triangle-card">
          <div class="triangle-content">
            <div class="triangle-title">📊 当日行情</div>
            <div class="triangle-layout">
              <div class="triangle-top">
                <span class="value-container">
                  AVG
                  <span class="value" :style="{ color: getQuoteColor(insightsData.todayAvgChange) }">
                    {{ formatChangePercent(insightsData.todayAvgChange) }}
                  </span>
                </span>
              </div>
              <div class="triangle-bottom">
                <div class="triangle-left">
                  <span class="value-container">
                    High
                    <el-tooltip
                      placement="top"
                      :content="insightsData.todayMaxStockName || '暂无对应股票名称'"
                    >
                      <span
                        class="value copyable"
                        :style="{ color: getQuoteColor(insightsData.todayMaxChange) }"
                        @click="handleCopyStockName(insightsData.todayMaxStockName)"
                      >
                        {{ formatChangePercent(insightsData.todayMaxChange) }}
                      </span>
                    </el-tooltip>
                  </span>
                </div>
                <div class="triangle-right">
                  <span class="value-container">
                    Low
                    <el-tooltip
                      placement="top"
                      :content="insightsData.todayMinStockName || '暂无对应股票名称'"
                    >
                      <span
                        class="value copyable"
                        :style="{ color: getQuoteColor(insightsData.todayMinChange) }"
                        @click="handleCopyStockName(insightsData.todayMinStockName)"
                      >
                        {{ formatChangePercent(insightsData.todayMinChange) }}
                      </span>
                    </el-tooltip>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <!-- 基础统计 -->
      <el-col :span="3">
        <el-card class="insight-card basic-card">
          <div class="insight-content">
            <div class="insight-label">股票池总数</div>
            <div class="insight-value">{{ insightsData.totalCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="3">
        <el-card class="insight-card basic-card">
          <div class="insight-content">
            <div class="insight-label">平均加入天数</div>
            <div class="insight-value">{{ insightsData.avgDays || 0 }} 天</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

// 接收洞察数据作为 props
defineProps({
  insightsData: {
    type: Object,
    default: () => ({
      totalCount: 0,
      avgDays: 0,
      selfAvgChange: null,
      selfMaxChange: null,
      selfMinChange: null,
      todayAvgChange: null,
      todayMaxChange: null,
      todayMinChange: null,
      // 这些名称字段用于在洞察卡片中反查“极值对应的是哪只股票”
      selfMaxStockName: null,
      selfMinStockName: null,
      todayMaxStockName: null,
      todayMinStockName: null
    })
  }
})

// 格式化涨幅
const formatChangePercent = (value, showSign = true) => {
  if (value === null || value === undefined) return '--'
  const sign = showSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// 获取行情涨跌幅颜色（涨红跌绿）
const getQuoteColor = (changeRate) => {
  if (changeRate == null) return '#606266'
  return changeRate >= 0 ? '#f56c6c' : '#67c23a'
}

// 点击复制股票名称
// 这里实现复制功能，是为了方便从洞察视图快速把“极值对应的股票”粘贴到别处做进一步分析
const handleCopyStockName = async (name) => {
  if (!name) {
    ElMessage.warning('暂无对应股票名称可复制')
    return
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(name)
    } else {
      // 兼容不支持 Clipboard API 的旧环境
      const textarea = document.createElement('textarea')
      textarea.value = name
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('股票名称已复制到剪贴板')
  } catch (error) {
    console.error('复制股票名称失败', error)
    ElMessage.error('复制失败，请手动选择股票名称')
  }
}
</script>

<style scoped lang="less">
.insights-section {
  margin-bottom: 20px;

  .insight-card {
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    // 基础卡片样式
    &.basic-card {
      .insight-content {
        text-align: center;
        padding: 10px 0;

        .insight-label {
          font-size: 14px;
          color: #909399;
          margin-bottom: 12px;
        }

        .insight-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          line-height: 1.2;
        }
      }
    }

    // 三角形布局卡片
    &.triangle-card {
      .triangle-content {
        .triangle-title {
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: #606266;
          // margin-bottom: 12px;
        }

        .triangle-layout {
          .triangle-top {
            display: flex;
            flex-direction: column;
            align-items: center;
            // margin-bottom: 8px;

            .label {
              font-size: 14px;
              font-weight: 500;
              color: #909399;
              margin-bottom: 2px;
            }

            .value {
              font-size: 30px;
              font-weight: bold;
            }
          }

          .triangle-bottom {
            display: flex;
            justify-content: space-between;
            padding: 0 20px;

            .triangle-left,
            .triangle-right {
              display: flex;
              flex-direction: column;
              align-items: center;

              .label {
                font-size: 14px;
                color: #909399;
                margin-bottom: 2px;
                font-weight: 500;
              }

              .value {
                font-size: 25px;
                font-weight: 600;
              }
            }
          }
        }
      }
    }
  }
}

.copyable {
  cursor: pointer;
  text-decoration: underline dashed transparent;
  text-underline-offset: 4px;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;

  &:hover {
    text-decoration-color: #409eff;
  }
}
</style>
