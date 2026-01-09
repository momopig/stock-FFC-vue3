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
                    <span class="value" :style="{ color: getQuoteColor(insightsData.selfMaxChange) }">
                      {{ formatChangePercent(insightsData.selfMaxChange) }}
                    </span>
                  </span>
                </div>
                <div class="triangle-right">
                  <span class="value-container">
                    Low
                    <span class="value" :style="{ color: getQuoteColor(insightsData.selfMinChange) }">
                      {{ formatChangePercent(insightsData.selfMinChange) }}
                    </span>
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
                    <span class="value" :style="{ color: getQuoteColor(insightsData.todayMaxChange) }">
                      {{ formatChangePercent(insightsData.todayMaxChange) }}
                    </span>
                  </span>
                </div>
                <div class="triangle-right">
                  <span class="value-container">
                    Low
                    <span class="value" :style="{ color: getQuoteColor(insightsData.todayMinChange) }">
                      {{ formatChangePercent(insightsData.todayMinChange) }}
                    </span>
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
      todayMinChange: null
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
</style>
