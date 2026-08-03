// ========== 供暖助手 - 数据 ==========
const HEATING_DATA = {
  // 集中供暖价格
  heating_fee_list: [
    { supply_type: "市热力集团城市热网", supply_type_desc: "市政统一大型集中热力管网供暖", user_type: "居民", price: 24 },
    { supply_type: "燃煤锅炉", supply_type_desc: "以煤炭为燃料的小区自建锅炉集中供暖", user_type: "居民", supply_sub_type: "直供", price: 16.5 },
    { supply_type: "燃煤锅炉", supply_type_desc: "以煤炭为燃料的小区自建锅炉集中供暖", user_type: "居民", supply_sub_type: "间供", price: 19 },
    { supply_type: "燃气、燃油、电锅炉", supply_type_desc: "以天然气、燃油、电力为燃料的小区自建锅炉", user_type: "居民", price: 30 },
    { supply_type: "集中供热", supply_type_desc: "非住宅用户", user_type: "非居民", supply_sub_type: "城六区", price: 45 },
    { supply_type: "集中供热", supply_type_desc: "非住宅用户", user_type: "非居民", supply_sub_type: "其他区域", price: 43 }
  ],

  // 壁挂炉机型预设
  boiler_models: [
    {
      model_name: "力科 S4",
      is_condenser: true,
      min_power: 3.8,
      max_power: 22.8,
      has_outdoor_comp: false,
      boiler_price_ref: 6999,
      boiler_service_life: 8,
      annual_maintain_cost: 400
    },
    {
      model_name: "菲斯曼 B1JG",
      is_condenser: true,
      min_power: 3.1,
      max_power: 25,
      has_outdoor_comp: true,
      boiler_price_ref: 21500,
      boiler_service_life: 5,
      annual_maintain_cost: 400
    }
  ],

  // 北京燃气阶梯政策
  gas_ladder: [
    { level: 1, upper: 1500, price: 2.61, desc: "0～1500m³" },
    { level: 2, upper: 2500, price: 2.83, desc: "1500～2500m³" },
    { level: 3, upper: 999999, price: 4.23, desc: "2500m³以上" }
  ],

  // 计算常量
  constants: {
    base_heat_load: 0.1,
    hour_per_day: 24,
    gas_heat_equivalent: 10,
    heating_season_days: 120,
    default_year_life_gas: 300,
    // 停供期间仍需缴纳的基本热费比例（约 30%）
    pause_basic_fee_ratio: 0.3
  },

  // 使用模式选项
  user_modes: [
    { label: "24小时恒温运行", coeff: 1.0 },
    { label: "离家低温节能模式", coeff: 0.7 }
  ],

  // 生活用气估算
  life_gas: {
    base_value: 220,
    population: [
      { label: "1人", coeff: 0.70 },
      { label: "2人", coeff: 1.00 },
      { label: "3人", coeff: 1.25 },
      { label: "4人及以上", coeff: 1.50 }
    ],
    cook: [
      { label: "几乎不开火（外卖为主）", coeff: 0.75 },
      { label: "正常日常做饭", coeff: 1.00 }
    ],
    bathroom: [
      { label: "1个卫生间", coeff: 1.00 },
      { label: "2个及以上卫生间", coeff: 1.15 }
    ],
    tub: [
      { label: "几乎不使用浴缸", coeff: 1.00 },
      { label: "偶尔使用浴缸", coeff: 1.15 },
      { label: "经常使用浴缸", coeff: 1.30 }
    ],
    recirculation: [
      { label: "无热水零冷水", coeff: 1.00 },
      { label: "有零冷水｜点动按需开启（节能）", coeff: 1.15 },
      { label: "有零冷水｜定时自动循环（舒适）", coeff: 1.30 }
    ]
  },

  // 年度保养费用估算（年均折算）
  maintain_estimate: {
    types: [
      {
        id: "conventional",
        label: "常规炉",
        period_years: 2,
        hint: "周期 2 年 1 保，年均保养成本 = 单次价格 ÷ 2"
      },
      {
        id: "condenser",
        label: "冷凝炉",
        period_years: 1,
        hint: "周期 1 年 1 保，年均保养成本 = 单次价格"
      }
    ],
    origins: [
      { id: "import", label: "进口" },
      { id: "domestic", label: "国产" }
    ],
    // key = `${typeId}_${originId}` → 单次保养价格（元）
    prices: {
      conventional_import: 500,
      conventional_domestic: 420,
      condenser_import: 650,
      condenser_domestic: 480
    }
  }
};
