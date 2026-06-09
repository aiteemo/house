// ========== JSON坐标 → Three.js场景坐标转换 ==========
// JSON: 原点在卧室B左上角，X向右，Y向下，单位mm
// Three.js: X向右，Z向下(前)，单位m，以户型中心为原点
const JSON_ORIGIN_X = 4165;  // (0 + 8330) / 2
const JSON_ORIGIN_Z = 5392;  // (0 + 10784) / 2

function jsonToScene(jsonX, jsonY) {
    return {
        x: (jsonX - JSON_ORIGIN_X) / 1000,
        z: (jsonY - JSON_ORIGIN_Z) / 1000,
    };
}

function polygonCenter(polygon) {
    const cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
    const cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
    return jsonToScene(cx, cy);
}

function polygonSize(polygon, wallThickness) {
    const xs = polygon.map(p => p.x);
    const ys = polygon.map(p => p.y);
    return {
        width: (Math.max(...xs) - Math.min(...xs) - wallThickness * 2) / 1000,
        depth: (Math.max(...ys) - Math.min(...ys) - wallThickness * 2) / 1000,
    };
}

// ========== 户型数据（基于JSON精确坐标） ==========
const WT_MM = 240; // JSON中的墙厚(mm)
const ROOM_DATA = {
    totalArea: 89.8,  // 各房间面积之和(OBJ墙体提取)
    floor: 1,
    rooms: [
        {
            id: 'bedroom_b', name: '卧室B', area: 7.9,
            cx: -2.164, cz: -2.827,
            width: 2.942, depth: 2.720,
            color: 0x06b6d4, desc: '次卧室',
            polygon: [{x:0,y:0},{x:2942,y:0},{x:2942,y:2720},{x:0,y:2720}],
        },
        {
            id: 'kitchen', name: '厨房', area: 1.6,
            cx: -2.164, cz: -1.892,
            width: 2.942, depth: 0.545,
            color: 0xf59e0b, desc: '厨房',
            polygon: [{x:0,y:2720},{x:2942,y:2720},{x:2942,y:3265},{x:0,y:3265}],
        },
        {
            id: 'bedroom_a', name: '卧室A', area: 17.9,
            cx: -2.164, cz: 1.794,
            width: 2.942, depth: 6.065,
            color: 0x8b5cf6, desc: '主卧室',
            polygon: [{x:0,y:3265},{x:2942,y:3265},{x:2942,y:9330},{x:0,y:9330}],
        },
        {
            id: 'bedroom_a_balcony', name: '卧室A阳台', area: 4.3,
            cx: -2.164, cz: 3.621,
            width: 2.942, depth: 1.454,
            color: 0x34d399, desc: '卧室A阳台',
            polygon: [{x:0,y:9330},{x:2942,y:9330},{x:2942,y:10784},{x:0,y:10784}],
        },
        {
            id: 'living_room', name: '客厅', area: 34.1,
            cx: 1.270, cz: 1.359,
            width: 5.388, depth: 6.322,
            color: 0x3b82f6, desc: '客厅，连接阳台',
            polygon: [{x:2942,y:3005},{x:8330,y:3005},{x:8330,y:9330},{x:2942,y:9330}],
        },
        {
            id: 'living_balcony', name: '客厅阳台', area: 7.8,
            cx: 1.537, cz: 3.621,
            width: 5.388, depth: 1.454,
            color: 0x22c55e, desc: '客厅阳台',
            polygon: [{x:2942,y:9330},{x:8330,y:9330},{x:8330,y:10784},{x:2942,y:10784}],
        },
        {
            id: 'entrance_hallway', name: '玄关/过道', area: 3.0,
            cx: -0.077, cz: -2.227,
            width: 0.986, depth: 3.005,
            color: 0x64748b, desc: '玄关和过道',
            polygon: [{x:5174,y:0},{x:6160,y:0},{x:6160,y:3005},{x:5174,y:3005}],
        },
        {
            id: 'bathroom', name: '卫生间', area: 6.5,
            cx: 2.123, cz: -2.227,
            width: 2.170, depth: 3.005,
            color: 0x14b8a6, desc: '卫生间',
            polygon: [{x:6160,y:0},{x:8330,y:0},{x:8330,y:3005},{x:6160,y:3005}],
        },
    ],
    wallHeight: 2.8,
    wallThickness: WT_MM / 1000,  // 0.24m
    doorWidth: 0.9,
    doorHeight: 2.1,
    windowWidth: 1.5,
    windowHeight: 1.2,
    windowSillHeight: 0.9,
};

// ========== 需求模块和需求项 ==========
const REQUIREMENTS_DATA = [
    {
        id: 'basic',
        name: '基础工程',
        icon: '🔨',
        items: [
            { id: 'basic_demolish', name: '拆改工程', desc: '墙体拆除、新建墙体等', status: 'checked', room: null, price3: 3000, price2: 2500, price1: 2000 },
            { id: 'basic_water', name: '水电改造', desc: '全屋水电线路重新铺设，含强弱电', status: 'checked', room: null, price3: 12000, price2: 8000, price1: 5500 },
            { id: 'basic_waterproof', name: '防水工程', desc: '厨房、卫生间、阳台防水处理', status: 'checked', room: null, price3: 4000, price2: 3000, price1: 2000 },
            { id: 'basic_ceiling', name: '吊顶工程', desc: '客厅/卧室局部吊顶、厨房卫生间集成吊顶', status: 'checked', room: null, price3: 8000, price2: 5500, price1: 3500 },
            { id: 'basic_wall', name: '墙面处理', desc: '刮腻子、打磨、乳胶漆（含底漆面漆）', status: 'checked', room: null, price3: 10000, price2: 7000, price1: 4500 },
            { id: 'basic_floor', name: '地面找平', desc: '地面水泥找平，为铺设地板/地砖做准备', status: 'checked', room: null, price3: 4000, price2: 3000, price1: 2000 },
            { id: 'basic_master_bath_layout', name: '主卧动线优化', desc: '调整主卧与卫生间动线，缩短夜间洗漱距离', status: 'pending', room: 'bedroom_a', price3: 15000, price2: 10000, price1: 6000 },
        ]
    },
    {
        id: 'hvac',
        name: '暖通系统',
        icon: '🌡',
        items: [
            { id: 'hvac_floor_heat', name: '地暖系统', desc: '全屋地暖铺设（水地暖/电地暖），含分集水器', status: 'checked', room: null, price3: 18000, price2: 12000, price1: 8000 },
            { id: 'hvac_ac', name: '中央空调', desc: '一拖多中央空调系统，含安装和铜管', status: 'pending', room: null, price3: 35000, price2: 25000, price1: 18000 },
            { id: 'hvac_fresh_air', name: '新风系统', desc: '全热交换新风系统，含管道和风口', status: 'checked', room: null, price3: 20000, price2: 14000, price1: 9000 },
            { id: 'hvac_dehumidifier', name: '除湿系统', desc: '1楼潮湿，建议安装中央除湿机', status: 'pending', room: null, price3: 8000, price2: 5000, price1: 3000 },
        ]
    },
    {
        id: 'kitchen',
        name: '厨房',
        icon: '🍳',
        items: [
            { id: 'kitchen_cabinet', name: '橱柜定制', desc: '整体橱柜（地柜+吊柜+台面），约4米', status: 'checked', room: 'kitchen', price3: 15000, price2: 10000, price1: 6000 },
            { id: 'kitchen_countertop', name: '台面材质', desc: '石英石/岩板台面', status: 'checked', room: 'kitchen', price3: 5000, price2: 3500, price1: 2000 },
            { id: 'kitchen_hood', name: '油烟机+灶具', desc: '侧吸/顶吸油烟机 + 燃气灶', status: 'checked', room: 'kitchen', price3: 8000, price2: 5000, price1: 3000 },
            { id: 'kitchen_sink', name: '水槽+龙头', desc: '大单槽/双槽 + 抽拉龙头', status: 'checked', room: 'kitchen', price3: 3000, price2: 1500, price1: 800 },
            { id: 'kitchen_tile', name: '墙地砖', desc: '厨房墙砖+地砖铺贴', status: 'checked', room: 'kitchen', price3: 5000, price2: 3500, price1: 2000 },
            { id: 'kitchen_door', name: '厨房推拉门', desc: '玻璃推拉门/折叠门', status: 'checked', room: 'kitchen', price3: 3000, price2: 2000, price1: 1200 },
        ]
    },
    {
        id: 'bathroom',
        name: '卫浴',
        icon: '🚿',
        items: [
            { id: 'bath_toilet', name: '马桶', desc: '虹吸式/直冲式马桶，或智能马桶', status: 'checked', room: 'bathroom', price3: 5000, price2: 2500, price1: 1200 },
            { id: 'bath_shower', name: '淋浴系统', desc: '花洒套装+淋浴屏/隔断', status: 'checked', room: 'bathroom', price3: 4000, price2: 2500, price1: 1500 },
            { id: 'bath_vanity', name: '浴室柜', desc: '浴室柜+镜柜', status: 'checked', room: 'bathroom', price3: 4000, price2: 2500, price1: 1500 },
            { id: 'bath_tile', name: '墙地砖', desc: '卫生间墙砖+地砖铺贴', status: 'checked', room: 'bathroom', price3: 4000, price2: 3000, price1: 2000 },
            { id: 'bath_exhaust', name: '排风扇', desc: '卫生间排风换气', status: 'checked', room: 'bathroom', price3: 800, price2: 500, price1: 300 },
            { id: 'bath_water_heater', name: '热水器', desc: '燃气热水器/电热水器', status: 'checked', room: 'bathroom', price3: 6000, price2: 3500, price1: 2000 },
        ]
    },
    {
        id: 'living_room',
        name: '客厅',
        icon: '🛋',
        items: [
            { id: 'living_floor', name: '地面材料', desc: '木地板/木纹砖铺贴', status: 'checked', room: 'living_room', price3: 12000, price2: 8000, price1: 5000 },
            { id: 'living_tv_wall', name: '电视背景墙', desc: '造型设计+材料', status: 'checked', room: 'living_room', price3: 8000, price2: 4000, price1: 2000 },
            { id: 'living_curtain', name: '窗帘', desc: '客厅窗帘（含轨道/罗马杆）', status: 'checked', room: 'living_room', price3: 4000, price2: 2500, price1: 1500 },
            { id: 'living_water_bar', name: '水吧台', desc: '厨房门口客厅位置，含水槽和台面', status: 'checked', room: 'living_room', price3: 8000, price2: 5000, price1: 3000 },
            { id: 'living_dining', name: '餐厅区域', desc: '餐桌椅+餐边柜', status: 'checked', room: 'living_room', price3: 6000, price2: 4000, price1: 2500 },
            { id: 'living_sofa', name: '沙发', desc: 'L型/一字型沙发', status: 'checked', room: 'living_room', price3: 8000, price2: 5000, price1: 3000 },
            { id: 'living_coffee_table', name: '茶几+电视柜', desc: '茶几和电视柜', status: 'checked', room: 'living_room', price3: 4000, price2: 2500, price1: 1500 },
        ]
    },
    {
        id: 'bedroom',
        name: '卧室',
        icon: '🛏',
        items: [
            { id: 'bed_master_bed', name: '主卧床+床垫', desc: '1.8m双人床+床垫', status: 'checked', room: 'bedroom_a', price3: 10000, price2: 6000, price1: 3500 },
            { id: 'bed_master_wardrobe', name: '主卧衣柜', desc: '定制衣柜，约2.4米宽', status: 'checked', room: 'bedroom_a', price3: 10000, price2: 6000, price1: 3500 },
            { id: 'bed_second_bed', name: '次卧床+床垫', desc: '1.5m单人床+床垫', status: 'checked', room: 'bedroom_b', price3: 6000, price2: 4000, price1: 2500 },
            { id: 'bed_second_wardrobe', name: '次卧衣柜', desc: '定制衣柜，约1.8米宽', status: 'checked', room: 'bedroom_b', price3: 7000, price2: 4500, price1: 2500 },
            { id: 'bed_floor', name: '卧室地面', desc: '木地板铺贴', status: 'checked', room: null, price3: 10000, price2: 7000, price1: 4500 },
            { id: 'bed_curtain', name: '卧室窗帘', desc: '遮光窗帘（含轨道）', status: 'checked', room: null, price3: 3000, price2: 2000, price1: 1200 },
            { id: 'bed_balcony_tile', name: '卧室A阳台', desc: '阳台地砖+封阳台+晾衣区', status: 'checked', room: 'bedroom_a_balcony', price3: 8000, price2: 5000, price1: 3000 },
        ]
    },
    {
        id: 'balcony_area',
        name: '阳台',
        icon: '🌿',
        items: [
            { id: 'balcony_tile', name: '阳台地砖', desc: '防滑地砖铺贴', status: 'checked', room: 'living_balcony', price3: 3000, price2: 2000, price1: 1200 },
            { id: 'balcony_seal', name: '封阳台', desc: '断桥铝窗户封闭阳台', status: 'checked', room: 'living_balcony', price3: 6000, price2: 4000, price1: 2500 },
            { id: 'balcony_wash', name: '洗衣区', desc: '洗衣机柜+晾衣架', status: 'checked', room: 'living_balcony', price3: 4000, price2: 2500, price1: 1500 },
            { id: 'balcony_storage', name: '阳台柜', desc: '储物柜/杂物柜', status: 'pending', room: 'living_balcony', price3: 3000, price2: 2000, price1: 1200 },
        ]
    },
    {
        id: 'lighting',
        name: '灯光照明',
        icon: '💡',
        items: [
            { id: 'light_living_main', name: '客厅主灯', desc: '吸顶灯/吊灯', status: 'checked', room: 'living_room', price3: 3000, price2: 1500, price1: 800 },
            { id: 'light_living_downlight', name: '客厅筒灯', desc: '嵌入式筒灯 x8', status: 'checked', room: 'living_room', price3: 2400, price2: 1600, price1: 800 },
            { id: 'light_living_strip', name: '客厅灯带', desc: '吊顶灯带', status: 'checked', room: 'living_room', price3: 1500, price2: 800, price1: 500 },
            { id: 'light_master_main', name: '主卧主灯', desc: '吸顶灯', status: 'checked', room: 'bedroom_a', price3: 1500, price2: 800, price1: 400 },
            { id: 'light_master_bedside', name: '主卧床头灯', desc: '壁灯/台灯 x2', status: 'checked', room: 'bedroom_a', price3: 1200, price2: 600, price1: 300 },
            { id: 'light_second_main', name: '次卧主灯', desc: '吸顶灯', status: 'checked', room: 'bedroom_b', price3: 1000, price2: 600, price1: 300 },
            { id: 'light_kitchen', name: '厨房灯', desc: '集成吊顶灯+操作台灯', status: 'checked', room: 'kitchen', price3: 800, price2: 500, price1: 300 },
            { id: 'light_bathroom', name: '卫生间灯', desc: '集成吊顶灯+镜前灯', status: 'checked', room: 'bathroom', price3: 800, price2: 500, price1: 300 },
            { id: 'light_entrance', name: '玄关灯', desc: '感应灯/筒灯', status: 'checked', room: 'entrance_hallway', price3: 500, price2: 300, price1: 200 },
            { id: 'light_smart', name: '智能灯光控制', desc: '智能开关/调光面板', status: 'pending', room: null, price3: 5000, price2: 3000, price1: 1500 },
        ]
    },
    {
        id: 'door_window',
        name: '门窗',
        icon: '🚪',
        items: [
            { id: 'dw_entrance_door', name: '入户门', desc: '防盗门（如需更换）', status: 'pending', room: null, price3: 5000, price2: 3000, price1: 2000 },
            { id: 'dw_room_door', name: '室内门', desc: '卧室门x2 + 卫生间门x1', status: 'checked', room: null, price3: 6000, price2: 4000, price1: 2500 },
            { id: 'dw_window', name: '窗户更换', desc: '断桥铝窗户（如需更换）', status: 'pending', room: null, price3: 12000, price2: 8000, price1: 5000 },
        ]
    },
    {
        id: 'other',
        name: '其他',
        icon: '📦',
        items: [
            { id: 'other_clean', name: '开荒保洁', desc: '装修完成后全屋保洁', status: 'checked', room: null, price3: 2000, price2: 1500, price1: 1000 },
            { id: 'other_monitor', name: '甲醛治理', desc: '除甲醛+空气质量检测', status: 'checked', room: null, price3: 3000, price2: 2000, price1: 1000 },
            { id: 'other_smart_lock', name: '智能门锁', desc: '指纹/密码锁', status: 'pending', room: null, price3: 3000, price2: 2000, price1: 1000 },
            { id: 'other_storage', name: '入户鞋柜', desc: '玄关鞋柜定制', status: 'checked', room: 'entrance_hallway', price3: 4000, price2: 2500, price1: 1500 },
            { id: 'other_cat_litter', name: '猫厕所换气', desc: '猫厕所位置规划+专用排风换气', status: 'pending', room: null, price3: 3000, price2: 2000, price1: 1000 },
        ]
    },
];

// ========== 核心问题 ==========
const CORE_PROBLEMS = [
    {
        id: 'lighting',
        name: '一层采光问题',
        desc: '1楼采光受限，需要通过灯光设计和窗户优化提升室内亮度',
        severity: 'high',
        linkedItems: ['dw_window', 'light_living_main', 'light_living_downlight', 'light_living_strip', 'light_smart'],
    },
    {
        id: 'moisture',
        name: '一层潮湿问题',
        desc: '1楼地面返潮严重，需要系统性防潮处理',
        severity: 'high',
        linkedItems: ['hvac_dehumidifier', 'basic_waterproof', 'hvac_floor_heat', 'living_floor'],
    },
    {
        id: 'privacy',
        name: '一层隐私问题',
        desc: '1楼窗外行人可视，需要兼顾采光和隐私',
        severity: 'medium',
        linkedItems: ['living_curtain', 'bed_curtain', 'dw_window', 'light_smart'],
    },
    {
        id: 'noise',
        name: '临街噪音/灰尘',
        desc: '临街窗户隔音降噪、防灰尘，提升室内空气质量',
        severity: 'medium',
        linkedItems: ['dw_window', 'dw_entrance_door', 'hvac_fresh_air'],
    },
    {
        id: 'master_bath',
        name: '主卧洗漱动线太长',
        desc: '主卧到卫生间距离远，夜间洗漱不便，需优化动线',
        severity: 'high',
        linkedItems: ['basic_master_bath_layout', 'basic_demolish', 'basic_water'],
    },
    {
        id: 'draft',
        name: '穿堂风问题',
        desc: '入户门到阳台可能形成穿堂风，影响舒适度和能耗',
        severity: 'low',
        linkedItems: ['hvac_fresh_air', 'hvac_ac'],
    },
    {
        id: 'dark_bath',
        name: '暗卫问题',
        desc: '卫生间无窗户，需要强化通风和照明',
        severity: 'medium',
        linkedItems: ['bath_exhaust', 'light_bathroom', 'hvac_fresh_air'],
    },
    {
        id: 'cat_litter',
        name: '猫厕所换气',
        desc: '猫厕所需要合理摆放位置并配备专用排风，避免异味扩散',
        severity: 'medium',
        linkedItems: ['other_cat_litter', 'bath_exhaust', 'hvac_fresh_air'],
    },
];

// ========== 全包/半包定义 ==========
const PACKAGE_DATA = {
    fullPackage: {
        name: '全包',
        desc: '装修公司负责所有材料采购和施工',
        includes: ['基础工程', '暖通系统', '厨房', '卫浴', '客厅', '卧室', '阳台', '灯光照明', '门窗', '其他'],
        advantages: [
            '省心省力，全程不用操心',
            '材料统一采购，可能有价格优势',
            '售后责任明确，找装修公司一家就行',
            '工期相对可控'
        ],
        disadvantages: [
            '材料选择受限于装修公司合作品牌',
            '可能存在材料以次充好的风险',
            '个性化程度相对较低',
            '总价通常高于半包'
        ],
        laborRatio: 0.35,
    },
    halfPackage: {
        name: '半包',
        desc: '装修公司负责辅材和施工，主材自己买',
        includes: ['基础工程'],
        selfBuy: ['厨房（橱柜、电器）', '卫浴（洁具）', '地面材料', '灯具', '门窗', '家具', '窗帘'],
        advantages: [
            '主材自己选，品质有保障',
            '可以淘到性价比高的材料',
            '个性化程度高',
            '总价通常更低'
        ],
        disadvantages: [
            '需要花大量时间逛建材市场',
            '需要自己协调材料进场时间',
            '售后需要分别找不同商家',
            '容易超预算（看到好的就想买）'
        ],
        laborRatio: 0.55,
    }
};

// ========== 档位价格映射（用于汇总） ==========
function getItemPrice(item, tier) {
    switch (tier) {
        case 'economy': return item.price1;
        case 'comfort': return item.price2;
        case 'quality': return item.price3;
        default: return item.price2;
    }
}

// ========== 格式化价格 ==========
function formatPrice(price) {
    if (price >= 10000) {
        return '¥' + (price / 10000).toFixed(2) + '万';
    }
    return '¥' + price.toLocaleString();
}

function formatPriceShort(price) {
    return '¥' + (price || 0).toLocaleString();
}
