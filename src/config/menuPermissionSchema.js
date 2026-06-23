import { menuList } from '@/components/leftHeader/config'

function normalizePermissionCodes(permissionCodes) {
  return Array.isArray(permissionCodes)
    ? permissionCodes.filter(code => typeof code === 'string' && code.trim())
    : []
}

function extractLeafNodes(items, parents = []) {
  if (!Array.isArray(items)) return []

  const leaves = []
  items.forEach(item => {
    const nextParents = [...parents, item]
    const children = Array.isArray(item.children) ? item.children : []

    if (children.length > 0) {
      leaves.push(...extractLeafNodes(children, nextParents))
      return
    }

    const permissionCodes = normalizePermissionCodes(item.permissionCodes)
    if (!item.path || permissionCodes.length === 0) {
      return
    }

    leaves.push({
      key: item.path,
      label: item.name,
      path: item.path,
      permissionCodes,
      parents: parents.map(parent => ({
        name: parent.name,
        path: parent.path,
      })),
    })
  })

  return leaves
}

export const menuPermissionLeafNodes = extractLeafNodes(menuList)

export const menuPermissionGroups = (() => {
  const groupMap = new Map()

  menuPermissionLeafNodes.forEach(node => {
    const firstParent = node.parents[0]
    const groupKey = firstParent?.path || 'group:others'
    const groupLabel = firstParent?.name || '其他'

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        key: `group:${groupKey}`,
        label: groupLabel,
        children: [],
      })
    }

    const group = groupMap.get(groupKey)
    node.permissionCodes.forEach(code => {
      if (!group.children.some(child => child.key === code)) {
        group.children.push({ key: code, label: code })
      }
    })
  })

  return Array.from(groupMap.values()).filter(group => group.children.length > 0)
})()
