export function groupAddresses(addresses) {
  function normalizeAddress(address) {
      return address.replace(/[\s（），]/g, '').toLowerCase();
  }

  function extractPhoneNumber(address) {
      const match = address.match(/(\d{11}|\d{3,4}-?\d{7,8})/); // 正则表达式匹配电话号码
      return match ? match[0] : null;
  }

  function levenshteinDistance(a, b) {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
              if (b.charAt(i - 1) === a.charAt(j - 1)) {
                  matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                  matrix[i][j] = Math.min(
                      matrix[i - 1][j - 1] + 1, // substitution
                      Math.min(
                          matrix[i][j - 1] + 1, // insertion
                          matrix[i - 1][j] + 1 // deletion
                      )
                  );
              }
          }
      }
      return matrix[b.length][a.length];
  }

  function areSimilar(addr1, addr2) {
      const distance = levenshteinDistance(normalizeAddress(addr1), normalizeAddress(addr2));
      return distance <= 5; // 设定一个阈值
  }

  const groups = [];

  addresses.forEach(address => {
      let foundGroup = false;
      const phoneNumber = extractPhoneNumber(address);

      for (const group of groups) {
          const groupPhoneNumber = extractPhoneNumber(group[0]);

          // 先检查电话号码
          if (phoneNumber && groupPhoneNumber && phoneNumber === groupPhoneNumber) {
              group.push(address);
              foundGroup = true;
              break;
          }

          // 如果电话号码不同，检查地址相似性
          if (group.some(item => areSimilar(item, address))) {
              group.push(address);
              foundGroup = true;
              break;
          }
      }

      if (!foundGroup) {
          groups.push([address]);
      }
  });

  return groups;
}

// 示例输入
const addresses = [
  "浙江省温州市平阳县陡北村海滨东路20号（仓库联系电话：13806801785）",
  "浙江省温州市瑞安市团前康盛大厦楼下",
  "广东省东莞市东城区温塘村温竹路2巷7号（仓库联系电话18128523539）",
  "广东省揭阳市榕城区渔洲路官洋村( 仓库电话-孙颖:15323201201)",
  "广东省深圳市宝安区翻身47区愉盛大厦4栋7楼728",
  "广东省深圳市宝安区翻身47区愉盛大厦 4栋7楼728",
  "浙江省温州市平阳县陡北村海滨东路20号(仓库取电话：13806801785)",
  "浙江省温州市平阳县轻工基地机械园纬一路璐瑶电子2幢3号4号电梯5楼(仓库电话：13958953382)",
  "广东省东莞市凤岗镇碧湖大道翼达龙科技园1栋4楼一二三宠物(仓库取件电话: 15986848825)",
  "广东省深圳市宝安区新安街道翻身理想居A栋18F",
  "浙江省温州市瑞安市林垟大桥村大桥路117号",
  "浙江省金华市义乌市开元北街102号(取件联系仓库：13429085414)",
  "浙江省金华市婺城区罗店镇北山路1236号金华市普阳工具有限公司(取件联系仓库：15905790003)",
  "浙江省温州市平阳县海西镇陡北村海滨东路20号(仓库取件电话：13806801785)",
  "浙江省温州市平阳县浙江璐瑶电子科技有限公司2幢3号4号电梯5楼(仓库电话：13958953382)",
  "浙江省温州市平阳县陡北村海滨东路20号（仓库联系电话13806801785）",
  "浙江省温州市平阳县岗下康庄路125号 后门",
  "广东省汕头市潮南区司马浦镇弘正辉东栋1楼13750482820",
  "广东省东莞市横沥镇新城路469号",
  "浙江省温州市平阳县郑楼建设路146号（仓库取件电话：18357790792）",
  "浙江省温州市平阳县陡北村海滨东路20号(仓库取件电话：13806801785)",
  "广东省深圳市宝安区愉盛综合大厦7楼728"
];

// 调用处理函数并输出结果
const groupedAddresses = groupAddresses(addresses);
groupedAddresses.forEach((group, index) => {
  console.log(`组 ${index + 1}:`, group);
});
