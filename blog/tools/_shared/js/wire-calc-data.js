// ========== 电线选型计算器 - 国标电线规范 ==========
const WIRE_SPECS = [
  { "area": 1.5, "safeCurrent": 16, "deratingCurrent": 12.8, "maxPower": 2816, "breaker": "C10", "usage": "照明回路" },
  { "area": 2.5, "safeCurrent": 25, "deratingCurrent": 20.0, "maxPower": 4400, "breaker": "C16", "usage": "普通插座回路" },
  { "area": 4.0, "safeCurrent": 32, "deratingCurrent": 25.6, "maxPower": 5632, "breaker": "C25", "usage": "厨房/空调等大功率回路" },
  { "area": 6.0, "safeCurrent": 45, "deratingCurrent": 36.0, "maxPower": 7920, "breaker": "C32", "usage": "即热热水器/入户主线" }
];

const DEDICATED_RULES = {
  "powerThreshold": 2000,
  "minSocketWireArea": 2.5,
  "rcdRequiredSpaces": ["卫生间", "厨房", "阳台"],
  "breakerTypeMapping": {
    "withRCD": "1P+N / 2P 漏电保护断路器 (RCBO)",
    "withoutRCD": "1P+N / 2P 微型断路器 (MCB)"
  }
};

const BREAKER_MAP = [
  { maxCurrent: 10, wire: 1.5, breaker: 'C10', level: 'low' },
  { maxCurrent: 16, wire: 2.5, breaker: 'C16', level: 'normal' },
  { maxCurrent: 20, wire: 2.5, breaker: 'C20', level: 'normal' },
  { maxCurrent: 25, wire: 4.0, breaker: 'C25', level: 'high' },
  { maxCurrent: 32, wire: 4.0, breaker: 'C32', level: 'high' },
  { maxCurrent: 40, wire: 6.0, breaker: 'C40', level: 'very_high' },
];
