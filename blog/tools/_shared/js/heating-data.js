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

  // 壁挂炉机型：日常只改 js/heating-boiler-models.json（博客镜像同路径）；启动时 fetch 载入
  // thermal_efficiency 在 JSON 里用百分数（如 104）；载入后归一为小数 1.04
  boiler_models: [],
  boiler_models_url: (typeof window !== 'undefined' && window.AITEEMO_HEATING_BOILER_MODELS_URL)
    ? window.AITEEMO_HEATING_BOILER_MODELS_URL
    : 'js/heating-boiler-models.json',
  _boilerModelsPromise: null,

  // fetch 失败时的兜底（file:// 或离线）
  boiler_models_fallback: [
    {
      brand: '力科', model: 'S4', model_name: '力科 S4',
      is_condenser: true, thermal_efficiency: 1.04,
      min_power: 3.8, max_power: 22.8, has_outdoor_comp: false,
      boiler_price_ref: 6999, boiler_service_life: 8, annual_maintain_cost: 400,
      remark: '表单原始基准机型，全预混冷凝'
    },
    {
      brand: '菲斯曼', model: 'B1JG', model_name: '菲斯曼 B1JG',
      is_condenser: true, thermal_efficiency: 1.08,
      min_power: 2.6, max_power: 24, has_outdoor_comp: true,
      boiler_price_ref: 8600, boiler_service_life: 10, annual_maintain_cost: 450,
      remark: '全预混冷凝，带室外温度补偿'
    }
  ],

  normalizeBoilerCatalogEntry(row) {
    if (!row || typeof row !== 'object') return null;
    const brand = String(row.brand || '').trim();
    const model = String(row.model || '').trim();
    const model_name = String(row.model_name || [brand, model].filter(Boolean).join(' ')).trim();
    if (!model_name) return null;
    let eta = Number(row.thermal_efficiency);
    if (!(eta > 0) || !isFinite(eta)) {
      eta = (row.is_condenser === 1 || row.is_condenser === true) ? 1.08 : 0.90;
    } else if (eta > 2) {
      eta = eta / 100; // 104 → 1.04
    }
    const truthy = (v) => v === 1 || v === true || v === '1' || v === 'true';
    return {
      brand,
      model,
      model_name,
      is_condenser: truthy(row.is_condenser),
      has_outdoor_comp: truthy(row.has_outdoor_compensation) || truthy(row.has_outdoor_comp),
      thermal_efficiency: eta,
      min_power: Number(row.min_power_kW != null ? row.min_power_kW : row.min_power) || 0,
      max_power: Number(row.max_power_kW != null ? row.max_power_kW : row.max_power) || 0,
      boiler_price_ref: Number(row.price != null ? row.price : row.boiler_price_ref) || 0,
      boiler_service_life: Number(row.life_year != null ? row.life_year : row.boiler_service_life) || 8,
      annual_maintain_cost: Number(row.annual_maintain_cost) || 0,
      remark: String(row.remark || '')
    };
  },

  applyBoilerCatalog(rawList) {
    const list = Array.isArray(rawList) ? rawList : [];
    const mapped = list.map((row) => this.normalizeBoilerCatalogEntry(row)).filter(Boolean);
    this.boiler_models = mapped.length ? mapped : this.boiler_models_fallback.slice();
    return this.boiler_models;
  },

  loadBoilerModels() {
    if (this.boiler_models && this.boiler_models.length) {
      return Promise.resolve(this.boiler_models);
    }
    if (this._boilerModelsPromise) return this._boilerModelsPromise;
    const url = this.boiler_models_url + (this.boiler_models_url.indexOf('?') >= 0 ? '&' : '?') + 'v=20260916b';
    this._boilerModelsPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => this.applyBoilerCatalog(data))
      .catch((err) => {
        console.warn('[供暖助手] 机型 JSON 加载失败，使用内置兜底', err);
        return this.applyBoilerCatalog(this.boiler_models_fallback);
      });
    return this._boilerModelsPromise;
  },

  // η 快选（小数；UI 按百分数展示）
  efficiency_presets: [0.90, 0.92, 0.94, 0.98, 1.04, 1.06, 1.08],

  // 北京燃气阶梯政策
  gas_ladder: [
    { level: 1, upper: 1500, price: 2.61, desc: "0～1500m³" },
    { level: 2, upper: 2500, price: 2.83, desc: "1500～2500m³" },
    { level: 3, upper: 999999, price: 4.23, desc: "2500m³以上" }
  ],

  // 计算常量（热指标/气热值对齐宣传图默认；气费仍用上方阶梯）
  constants: {
    // 0.08 kW/㎡ = 80 W/㎡（宣传同构默认）
    base_heat_load: 0.08,
    hour_per_day: 24,
    // 9.8 kWh/m³：对齐宣传的高位热值折算口径（非严格 HHV×LHV-η 物理极限）
    gas_heat_equivalent: 9.8,
    heating_season_days: 120,
    default_year_life_gas: 300,
    // 停供期间仍需缴纳的基本热费比例（约 30%）
    pause_basic_fee_ratio: 0.3
  },

  // 使用模式（3 档；看板分段一点即切，乘在 Q 上）
  user_modes: [
    { id: 'comfort', label: '舒适', coeff: 1.0, desc: '24h恒温高舒适' },
    { id: 'normal', label: '正常', coeff: 0.7, desc: '白天降温/下班恢复' },
    { id: 'eco', label: '节能', coeff: 0.5, desc: '低温保温/局部关回路' }
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
