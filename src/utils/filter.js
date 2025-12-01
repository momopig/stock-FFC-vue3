export const filterHandler = (value, row, column) => {
  const property = column['property'];
  return row[property] === value;
};
export const filterMethod = (column, callback) => {
  // if (column !== 'expectPickUpGoodsDate') {
  //   debugger;
  // }
  return (value, row) => {
    if (callback) {
      callback(column, value);
    }
    return row[column] === value;
  };
};
export const commonFilterOptions = (list, key) => {
  if (list?.length) {
    console.log(list.length)
  }
  const valueCounts = {};
  const values = list?.map((item) => {
    let value = item?.[key]
    if (!valueCounts[value]) {
      valueCounts[value] = 0;
    }
    valueCounts[value]++;
    return value
  });
  const setItem = new Set(values);
  console.log(JSON.stringify(values));
  const uniqueValues = Array.from(setItem);
  uniqueValues?.sort((a, b) => a - b);
  return uniqueValues?.map((value) => ({ text: `${value}(${valueCounts[value]})`, value: value }));
};
export const getMatchRows = (list, selectedFilters) => {
  return list?.filter((row) => {
    // every表示所有筛选条件都需要满足
    return Object.keys(selectedFilters).every((column) => {
      if (selectedFilters?.[column].length === 0) return true; // 没有选择任何过滤条件
      return selectedFilters?.[column].includes(row[column]);
    });
  });
};
export const commonFilterChangeHandler = (filters, selectedFilters, callback) => {
  Object.keys(filters)?.forEach((columnName) => {
    selectedFilters[columnName] = filters[columnName];
  });
  callback && callback()
};
