
import * as XLSX from 'xlsx';
export const jsonToExcel = (list, enMapCn, groupConfig) => {
  try {
    let newList = JSON.parse(JSON.stringify(list || {}))
    const rowHeights = [    { hpx: 20 }, // 表头行高
    ]
    if (enMapCn) {
      newList = newList?.map(item => {
        const newItem ={}
        for (let en in enMapCn) {
          const cn = enMapCn[en]
          newItem[cn] = item[en]
        }
        rowHeights?.push({
          hpx: 30
        })
        return newItem
      })
    }

    // 创建一个新的工作簿
    const workbook = XLSX.utils.book_new();

    // 将 JSON 数据转换为工作表
    const worksheet = XLSX.utils.json_to_sheet(newList);

    XLSX.utils.book_append_sheet(workbook, worksheet, "all");
    worksheet['!rows'] = rowHeights

    if (groupConfig) {
      const newGroupConfig = JSON.parse(JSON.stringify(groupConfig))
      const { matchKey, config } = groupConfig
      const address_map_groupName = {}
      config.forEach(groupItem => {
        const { name, addressList } = groupItem
        for (let address of addressList) {
          address_map_groupName[address] = groupItem
        }
        groupItem.returnGoodsList = []
      })
      const computedList = [...newList]
      for (let i = 0; i < computedList.length; i++) {
        const returnGoodsItem = computedList[i]
        let  matchValue = returnGoodsItem[enMapCn[matchKey]]
        let matchGroup = address_map_groupName[matchValue]
        if (matchGroup) {
          matchGroup?.returnGoodsList?.push(returnGoodsItem)
          computedList.splice(i, 1)
          i--
        }
      }
      if (computedList.length !== 0) {
        config?.push({
          name: '未匹配分组',
          returnGoodsList: computedList
        })
      }
      config.forEach(groupItem => {
        const { name,  returnGoodsList } = groupItem

        // sheet过多，会导致sheet丢失，这里仅显示有记录的sheet
        if (returnGoodsList.length) {
          const worksheet = XLSX.utils.json_to_sheet(returnGoodsList);
          XLSX.utils.book_append_sheet(workbook, worksheet, name);
          worksheet['!rows'] = rowHeights
        }
      })
    }

    // 导出 Excel 文件
    XLSX.writeFile(workbook, "data.xlsx");
  } catch(error) {
  }
}
