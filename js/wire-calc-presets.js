// ========== 电线选型计算器 - 预置空间与家电模板 ==========
const PRESET_CATEGORIES = [
  {
    "spaceId": "kitchen", "spaceName": "厨房", "icon": "🍳",
    "appliances": [
      { "id": "k_fridge", "name": "冰箱", "defaultPower": 150, "isDedicated": false, "requiresRCD": false },
      { "id": "k_oil", "name": "油烟机", "defaultPower": 200, "isDedicated": false, "requiresRCD": false },
      { "id": "k_micro", "name": "微波炉", "defaultPower": 1000, "isDedicated": false, "requiresRCD": false },
      { "id": "k_oven", "name": "嵌入式蒸烤箱", "defaultPower": 3500, "isDedicated": true, "requiresRCD": true },
      { "id": "k_dishwasher", "name": "洗碗机", "defaultPower": 1800, "isDedicated": false, "requiresRCD": false },
      { "id": "k_induction", "name": "电磁炉", "defaultPower": 2100, "isDedicated": false, "requiresRCD": false },
      { "id": "k_instant", "name": "即热式小厨宝", "defaultPower": 3000, "isDedicated": true, "requiresRCD": true }
    ]
  },
  {
    "spaceId": "bathroom", "spaceName": "卫生间", "icon": "🚿",
    "appliances": [
      { "id": "b_waterheater", "name": "储水式电热水器", "defaultPower": 3000, "isDedicated": true, "requiresRCD": true },
      { "id": "b_toilet", "name": "智能马桶", "defaultPower": 1500, "isDedicated": false, "requiresRCD": false },
      { "id": "b_washer", "name": "洗衣机", "defaultPower": 500, "isDedicated": false, "requiresRCD": false },
      { "id": "b_blowdryer", "name": "吹风机", "defaultPower": 2000, "isDedicated": false, "requiresRCD": false },
      { "id": "b_heater", "name": "浴霸/暖风机", "defaultPower": 2500, "isDedicated": false, "requiresRCD": false }
    ]
  },
  {
    "spaceId": "living", "spaceName": "客厅", "icon": "🛋️",
    "appliances": [
      { "id": "l_tv", "name": "电视", "defaultPower": 200, "isDedicated": false, "requiresRCD": false },
      { "id": "l_ac", "name": "3匹柜机空调", "defaultPower": 3200, "isDedicated": true, "requiresRCD": false },
      { "id": "l_sofa", "name": "电动沙发", "defaultPower": 300, "isDedicated": false, "requiresRCD": false },
      { "id": "l_robot", "name": "扫地机器人", "defaultPower": 60, "isDedicated": false, "requiresRCD": false }
    ]
  },
  {
    "spaceId": "bedroom", "spaceName": "卧室", "icon": "🛏️",
    "appliances": [
      { "id": "br_ac", "name": "1.5匹挂机空调", "defaultPower": 1200, "isDedicated": false, "requiresRCD": false },
      { "id": "br_light", "name": "主灯+床头灯", "defaultPower": 100, "isDedicated": false, "requiresRCD": false },
      { "id": "br_charger", "name": "手机充电", "defaultPower": 30, "isDedicated": false, "requiresRCD": false },
      { "id": "br_computer", "name": "电脑", "defaultPower": 500, "isDedicated": false, "requiresRCD": false }
    ]
  },
  {
    "spaceId": "study", "spaceName": "书房", "icon": "📚",
    "appliances": [
      { "id": "s_computer", "name": "台式电脑", "defaultPower": 400, "isDedicated": false, "requiresRCD": false },
      { "id": "s_monitor", "name": "显示器", "defaultPower": 50, "isDedicated": false, "requiresRCD": false },
      { "id": "s_printer", "name": "打印机", "defaultPower": 300, "isDedicated": false, "requiresRCD": false },
      { "id": "s_ac", "name": "挂机空调", "defaultPower": 1200, "isDedicated": false, "requiresRCD": false }
    ]
  },
  {
    "spaceId": "balcony", "spaceName": "阳台", "icon": "☀️",
    "appliances": [
      { "id": "bl_washer", "name": "洗烘一体机", "defaultPower": 2000, "isDedicated": false, "requiresRCD": false },
      { "id": "bl_dryer", "name": "独立烘干机", "defaultPower": 1800, "isDedicated": false, "requiresRCD": false }
    ]
  }
];

const DEDICATED_PRESETS = [
  { "id": "dp_ac3", "name": "3匹柜机空调", "defaultPower": 3200, "requiresRCD": false },
  { "id": "dp_water_heater", "name": "储水式电热水器", "defaultPower": 3000, "requiresRCD": true },
  { "id": "dp_oven", "name": "嵌入式蒸烤箱", "defaultPower": 3500, "requiresRCD": true },
  { "id": "dp_instant", "name": "即热式热水器", "defaultPower": 6000, "requiresRCD": true },
  { "id": "dp_charger", "name": "7kW充电桩", "defaultPower": 7000, "requiresRCD": false }
];
