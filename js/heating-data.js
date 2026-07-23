// ========== 供暖助手 - 数据 ==========
const HEATING_DATA = {
  "title": "集中供热按面积收费价格标准",
  "unit": "元/平方米·采暖季",
  "heating_fee_list": [
    {
      "supply_type": "市热力集团城市热网",
      "supply_type_desc": "市政统一大型集中热力管网供暖，居民主流集中供暖方式",
      "user_type": "居民",
      "price": 24,
      "price_desc": "单平米单采暖季24元"
    },
    {
      "supply_type": "燃煤锅炉",
      "supply_type_desc": "以煤炭为燃料的小区自建锅炉集中供暖",
      "user_type": "居民",
      "supply_sub_type": "直供",
      "supply_sub_type_desc": "锅炉直接输送热水至住户，无换热中转",
      "price": 16.5,
      "price_desc": "单平米单采暖季16.5元"
    },
    {
      "supply_type": "燃煤锅炉",
      "supply_type_desc": "以煤炭为燃料的小区自建锅炉集中供暖",
      "user_type": "居民",
      "supply_sub_type": "间供",
      "supply_sub_type_desc": "锅炉先换热至小区换热站，再输送入户",
      "price": 19,
      "price_desc": "单平米单采暖季19元"
    },
    {
      "supply_type": "燃气、燃油、电锅炉",
      "supply_type_desc": "以天然气、燃油、电力为燃料的小区自建锅炉集中供暖",
      "user_type": "居民",
      "price": 30,
      "price_desc": "单平米单采暖季30元"
    },
    {
      "supply_type": "集中供热",
      "supply_type_desc": "各类市政/自建锅炉集中供暖（商用、办公等非住宅）",
      "user_type": "非居民",
      "supply_sub_type": "城六区",
      "price": 45,
      "price_desc": "单平米单采暖季45元"
    },
    {
      "supply_type": "集中供热",
      "supply_type_desc": "各类市政/自建锅炉集中供暖（商用、办公等非住宅）",
      "user_type": "非居民",
      "supply_sub_type": "其他区域",
      "price": 43,
      "price_desc": "单平米单采暖季43元"
    }
  ]
};
