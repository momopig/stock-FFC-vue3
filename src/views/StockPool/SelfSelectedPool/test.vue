<template>
  <el-tabs v-model="activeName" ref="tabRef" class="demo-tabs">
    <el-tab-pane label="User" name="first">User</el-tab-pane>
    <el-tab-pane label="Config" name="second">Config</el-tab-pane>
    <el-tab-pane label="Role" name="third">Role</el-tab-pane>
    <el-tab-pane label="Task" name="fourth">Task</el-tab-pane>
    <el-tab-pane label="Group" name="sixth" disabled>Group</el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { ref, onBeforeUnmount, onMounted } from 'vue'
import Sortable from 'sortablejs'
import { useGetDerivedNamespace } from 'element-plus'
import type { TabsInstance } from 'element-plus'

const activeName = ref('first')
const ns = useGetDerivedNamespace().value
let sortable: Sortable | null = null
const tabRef = ref<TabsInstance>()
onMounted(() => {
  const { tabListRef, tabBarRef } = tabRef.value!.tabNavRef!
  sortable = new Sortable(tabListRef!, {
    animation: 150,
    draggable: `.${ns}-tabs__item`,
    filter: '.is-disabled',
    onChange: (event) => {
      // If Eltabs has a bar, the tab bar needs to be cleared from Sortable animations
      (sortable as any).removeAnimationState(tabBarRef?.$el)
      tabBarRef?.update()

      const { oldDraggableIndex, newDraggableIndex } = event
      console.log('oldDraggableIndex:', oldDraggableIndex)
      console.log('newDraggableIndex:', newDraggableIndex)
    }
  })
})

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})
</script>

<style>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}
</style>
