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

// ========== 户型数据（基于户型图精确坐标） ==========
// 坐标系：原点在左上角，X向右，Y向下，单位mm
// 88平米两室两厅一卫：次卧、厨房、主卧在左侧；餐厅、客厅、卫生间在右侧
const WT_MM = 200; // 墙厚(mm)
const ROOM_DATA = {
    totalArea: 88.45,
    floor: 1,
    rooms: [
        // === 左侧房间（从上到下） ===
        {
            id: 'bedroom_b', name: '次卧', area: 10.5,
            color: 0x6366f1, desc: '次卧室/书房',
            polygon: [{x:0,y:0},{x:3200,y:0},{x:3200,y:3200},{x:0,y:3200}],
        },
        {
            id: 'kitchen', name: '厨房', area: 5.5,
            color: 0xf59e0b, desc: '厨房',
            polygon: [{x:0,y:3200},{x:3200,y:3200},{x:3200,y:4000},{x:0,y:4000}],
        },
        {
            id: 'bedroom_a', name: '主卧', area: 15.0,
            color: 0x8b5cf6, desc: '主卧室，带飘窗',
            polygon: [{x:0,y:4000},{x:3200,y:4000},{x:3200,y:8800},{x:0,y:8800}],
        },
        {
            id: 'bedroom_a_balcony', name: '主卧阳台', area: 2.5,
            color: 0x10b981, desc: '主卧阳台',
            polygon: [{x:0,y:8800},{x:3200,y:8800},{x:3200,y:10000},{x:0,y:10000}],
        },
        // === 右侧房间（从上到下） ===
        {
            id: 'bathroom', name: '卫生间', area: 4.5,
            color: 0x14b8a6, desc: '卫生间',
            polygon: [{x:6800,y:0},{x:8800,y:0},{x:8800,y:3200},{x:6800,y:3200}],
        },
        {
            id: 'dining', name: '餐厅', area: 6.0,
            color: 0xec4899, desc: '餐厅区域',
            polygon: [{x:3200,y:0},{x:6800,y:0},{x:6800,y:3200},{x:3200,y:3200}],
        },
        {
            id: 'living_room', name: '客厅', area: 25.0,
            color: 0x3b82f6, desc: '客厅，连接阳台',
            polygon: [{x:3200,y:3200},{x:8800,y:3200},{x:8800,y:8800},{x:3200,y:8800}],
        },
        {
            id: 'living_balcony', name: '客厅阳台', area: 3.5,
            color: 0x22c55e, desc: '客厅阳台',
            polygon: [{x:3200,y:8800},{x:8800,y:8800},{x:8800,y:10000},{x:3200,y:10000}],
        },
        // === 入户区域 ===
        {
            id: 'entrance', name: '玄关', area: 3.0,
            color: 0x64748b, desc: '入户玄关',
            polygon: [{x:6800,y:3200},{x:8800,y:3200},{x:8800,y:4200},{x:6800,y:4200}],
        },
    ],
    wallHeight: 2.8,
    wallThickness: WT_MM / 1000,
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
            { id: 'kitchen_round_table', name: '圆饭桌', desc: '圆饭桌，平时2人偶尔4人', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
            { id: 'kitchen_sideboard', name: '餐边柜', desc: '餐边柜，收纳餐具和杂物', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
            { id: 'kitchen_snack_storage', name: '零食收纳', desc: '零食收纳（主卧、客厅、餐厅）', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
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
            { id: 'bath_smart_toilet', name: '智能马桶', desc: '智能马桶（自动翻盖/冲洗/烘干）', status: 'pending', room: 'bathroom', price3: 5000, price2: 3000, price1: 1500 },
            { id: 'bath_cat_litter_a', name: '电动猫砂盆A', desc: '电动猫砂盆A，尺寸约60×80cm，需易打理+通风', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_cat_litter_b', name: '电动猫砂盆B', desc: '电动猫砂盆B，需易打理+通风', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_sensor_trash', name: '感应垃圾桶', desc: '卫浴感应垃圾桶，解放双手', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_tissue_holder', name: '厕所纸/收纳', desc: '厕纸收纳方案', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_tissue_wall', name: '纸巾收纳', desc: '纸巾收纳到墙面/柜体内', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_toothbrush_rack', name: '牙刷架', desc: '牙刷立起来，保持干燥卫生', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_face_products', name: '洗面奶收纳', desc: '洗面奶、保湿喷雾随手可拿', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_face_towel', name: '洗脸巾收纳', desc: '洗脸巾收纳到前面/柜体内', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_hair_dryer', name: '吹风机收纳', desc: '吹风机挂起来，方便拿取', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_cosmetics', name: '化妆品收纳', desc: '化妆品收纳方案', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_mirror_pull', name: '化妆镜', desc: '化妆镜可以拉近，方便化妆', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
            { id: 'bath_shower_partition', name: '淋浴干湿分离', desc: '独立淋浴区，干湿分离', status: 'pending', room: 'bathroom', price3: 3000, price2: 2000, price1: 1200 },
            { id: 'bath_quiet_fan', name: '静音排风扇', desc: '静音排风扇，持续除湿', status: 'pending', room: 'bathroom', price3: 800, price2: 500, price1: 300 },
            { id: 'bath_floor_washer', name: '洗地机', desc: '洗地机，需要有充电口', status: 'pending', room: 'bathroom', price3: 0, price2: 0, price1: 0 },
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
            { id: 'living_cat_tree', name: '猫爬架', desc: '猫爬架，崽子们活动空间', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
            { id: 'living_clean_tools', name: '清洁工具收纳', desc: '家政间清洁工具收纳', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
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
            { id: 'bed_temp_bed', name: '临时双人床', desc: '次卧临时床（丈母娘/老丈人/亲友来访用）', status: 'pending', room: 'bedroom_b', price3: 0, price2: 0, price1: 0 },
            { id: 'bed_hang_clothes', name: '常用衣物挂放', desc: '常用衣服挂起来（主卧、次卧）', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
            { id: 'bed_seasonal_clothes', name: '换季衣物收纳', desc: '不常用衣服收纳起来（次卧）', status: 'pending', room: 'bedroom_b', price3: 0, price2: 0, price1: 0 },
            { id: 'bed_quilt_storage', name: '被子收纳', desc: '被子收纳（次卧）', status: 'pending', room: 'bedroom_b', price3: 0, price2: 0, price1: 0 },
            { id: 'bed_suitcase', name: '行李箱收纳', desc: '行李箱收纳位置', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
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
            { id: 'balcony_badminton', name: '羽毛球装备收纳', desc: '羽毛球拍、球、喷雾、鞋收纳，希望拎着就走', status: 'pending', room: 'living_balcony', price3: 0, price2: 0, price1: 0 },
            { id: 'balcony_umbrella', name: '雨伞收纳', desc: '雨伞收纳位置', status: 'pending', room: 'living_balcony', price3: 0, price2: 0, price1: 0 },
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
            { id: 'other_key_hooks', name: '入户随手收纳', desc: '钥匙/围巾/手套/防晒/香水随手放', status: 'pending', room: 'entrance_hallway', price3: 0, price2: 0, price1: 0 },
            { id: 'other_helmet', name: '头盔/护具收纳', desc: '头盔、护具收纳位置', status: 'pending', room: 'entrance_hallway', price3: 0, price2: 0, price1: 0 },
            { id: 'other_cat_food', name: '猫粮收纳', desc: '猫粮收纳（客厅/待定）', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
            { id: 'other_cat_sand', name: '猫砂收纳', desc: '猫砂收纳位置', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
            { id: 'other_display_cabinet', name: '陈列柜', desc: '陈列柜：娃娃、书展示', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
            { id: 'other_tea', name: '喝茶区', desc: '喝茶区设置', status: 'pending', room: null, price3: 0, price2: 0, price1: 0 },
            { id: 'other_coffee', name: '咖啡区', desc: '搞咖啡的地方（餐厅）', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
            { id: 'other_karaoke', name: '唱歌设备', desc: '唱歌设备收纳（客厅/主卧）', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
            { id: 'other_tv_cabinet', name: '电视柜', desc: '电视柜', status: 'pending', room: 'living_room', price3: 0, price2: 0, price1: 0 },
            { id: 'other_dual_desk', name: '双人办公桌', desc: '次卧双人办公桌，同时容纳两人办公', status: 'pending', room: 'bedroom_b', price3: 0, price2: 0, price1: 0 },
            { id: 'other_dual_chair', name: '办公椅x2', desc: '两把办公椅', status: 'pending', room: 'bedroom_b', price3: 0, price2: 0, price1: 0 },
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

// ========== 装修阶段定义 ==========
const STAGES = [
    { id: 'demolish', name: '拆改', icon: '🔨', order: 1 },
    { id: 'plumbing', name: '水电', icon: '🔧', order: 2 },
    { id: 'tiling', name: '泥瓦', icon: '🧱', order: 3 },
    { id: 'carpentry', name: '木工', icon: '🪵', order: 4 },
    { id: 'painting', name: '油漆', icon: '🎨', order: 5 },
    { id: 'installation', name: '安装', icon: '🔩', order: 6 },
    { id: 'finishing', name: '收尾', icon: '✨', order: 7 },
];

// 需求项 → 阶段映射
const ITEM_STAGE_MAP = {
    // 拆改
    basic_demolish: 'demolish',
    basic_master_bath_layout: 'demolish',
    // 水电
    basic_water: 'plumbing',
    hvac_floor_heat: 'plumbing',
    hvac_ac: 'plumbing',
    hvac_fresh_air: 'plumbing',
    hvac_dehumidifier: 'plumbing',
    // 泥瓦
    basic_waterproof: 'tiling',
    basic_floor: 'tiling',
    kitchen_tile: 'tiling',
    bath_tile: 'tiling',
    living_floor: 'tiling',
    bed_floor: 'tiling',
    balcony_tile: 'tiling',
    bed_balcony_tile: 'tiling',
    // 木工
    basic_ceiling: 'carpentry',
    kitchen_cabinet: 'carpentry',
    bath_vanity: 'carpentry',
    living_tv_wall: 'carpentry',
    other_storage: 'carpentry',
    bed_master_wardrobe: 'carpentry',
    bed_second_wardrobe: 'carpentry',
    // 油漆
    basic_wall: 'painting',
    // 安装
    kitchen_countertop: 'installation',
    kitchen_hood: 'installation',
    kitchen_sink: 'installation',
    kitchen_door: 'installation',
    bath_toilet: 'installation',
    bath_shower: 'installation',
    bath_exhaust: 'installation',
    bath_water_heater: 'installation',
    dw_entrance_door: 'installation',
    dw_room_door: 'installation',
    dw_window: 'installation',
    light_living_main: 'installation',
    light_living_downlight: 'installation',
    light_living_strip: 'installation',
    light_master_main: 'installation',
    light_master_bedside: 'installation',
    light_second_main: 'installation',
    light_kitchen: 'installation',
    light_bathroom: 'installation',
    light_entrance: 'installation',
    light_smart: 'installation',
    bed_master_bed: 'installation',
    bed_second_bed: 'installation',
    // 收尾
    living_curtain: 'finishing',
    bed_curtain: 'finishing',
    living_water_bar: 'finishing',
    living_dining: 'finishing',
    living_sofa: 'finishing',
    living_coffee_table: 'finishing',
    balcony_seal: 'finishing',
    balcony_wash: 'finishing',
    balcony_storage: 'finishing',
    other_clean: 'finishing',
    other_monitor: 'finishing',
    other_smart_lock: 'finishing',
    other_cat_litter: 'finishing',
    bath_smart_toilet: 'installation',
    bath_shower_partition: 'installation',
    bath_quiet_fan: 'installation',
};

// ========== 沟通备忘数据 ==========
// 带有个性化的、每家情况不同的内容放这里（如物业规定、业主信息等）
// 通用的、可复制的装修经验放 PITFALLS_DATA（装修避坑）
const MEMO_DATA = [
    {
        id: 'property_info',
        name: '物业相关',
        icon: '🏢',
        desc: '世华泊郡小区装修管理公告（北京城承物业），依据《北京市物业管理条例》、住建部110号文',
        items: [
            { id: 'prop_phone', name: '物业客服电话', desc: '4000-222-111', tip: '有问题随时联系', status: 'checked', notes: '' },
            { id: 'prop_docs', name: '装修申报材料', desc: '①业主身份证 ②装修设计图纸 ③装修合同（有签字页复印件）④装修公司营业执照及资质证明（加盖公章）⑤装修负责人/人员身份证复印件及联系方式 ⑥外立面改动需额外提供方案及高处作业证件', tip: '非业主本人办理需携带委托书+双方身份证复印件；装修出入证需1寸照片', status: 'pending', notes: '' },
            { id: 'prop_time', name: '施工时间规定', desc: '工作日 8:00-12:00、14:00-18:00；双休日及法定节假日仅可进行无噪音/无异味/无粉尘类作业', tip: '严禁非施工时间进行敲、砸、切、钻等噪音作业；每日收工须清理现场、关闭水电阀门、锁好入户门，不得留宿', status: 'pending', notes: '' },
            { id: 'prop_trash', name: '装修垃圾清运', desc: '暂存点：1号楼北侧垃圾站；清运时间：周一/三/五 09:00-18:00；清运单位：北京蓝天顺天环保科技有限公司', tip: '有偿服务，业主付费；必须垃圾分类封装，禁止生活垃圾与建筑垃圾混放；楼内外公共区域禁止放置', status: 'pending', notes: '' },
            { id: 'prop_forbid_structure', name: '禁止：危害建筑结构', desc: '禁止擅自变动承重结构（拆承重墙/剪力墙/梁柱/扩门洞）；禁止拆除改造公共墙体；地面铺设超30mm厚石材增加荷载；禁止改变卫生间/厨房排水功能', tip: '', status: 'pending', notes: '' },
            { id: 'prop_forbid_public', name: '禁止：破坏公共设施', desc: '禁止改动公共给排水/燃气/供暖；禁止占用消防通道/公共区域堆物；禁止搭建阳光房/封闭走廊；禁止擅自改动外窗尺寸/颜色/样式', tip: '', status: 'pending', notes: '' },
            { id: 'prop_forbid_order', name: '禁止：影响小区秩序', desc: '禁止非规定时间施工；禁止随意倾倒垃圾；禁止向下水道倾倒水泥/沙子/涂料造成堵塞', tip: '', status: 'pending', notes: '' },
            { id: 'prop_civilized', name: '文明施工要求', desc: '材料从地下车库进出，做好单元门口/楼道/电梯轿厢防护围挡；配备灭火器/电源箱；明火作业提前报备；做好闭水防渗漏', tip: '大型材料早8:00前/晚18:00后禁入小区；材料堆放不超2天、不占行人通道；不得开门施工', status: 'pending', notes: '' },
            { id: 'prop_penalty', name: '违规处理方式', desc: '违规→发《整改通知书》限期整改→逾期未改或情节严重→责令停工+上报住建/城管执法部门依法处罚', tip: '因违规损毁结构/设施/他人财产，由违规业主承担赔偿，物业可追究法律责任', status: 'pending', notes: '' },
            { id: 'prop_window', name: '更换窗户/阳台要求', desc: '按原有交付标准更换，不得擅自改动外框颜色、分隔尺寸、开启方向；封闭阳台保持楼体外观统一', tip: '需提前咨询管家，携带身份证+装修公司资质（二级以上）+签承诺书；安装前物业在南门验收，完成后现场验收方可撤场', status: 'pending', notes: '' },
            { id: 'prop_door', name: '更换户门要求', desc: '按首次交付标准更换，不得加装外开防盗门或改变开启方向，走廊禁止装饰或垫高', tip: '不了解交付开启方向可向管家咨询', status: 'pending', notes: '' },
            { id: 'prop_completion', name: '完工查验', desc: '装修完工后可向物业服务中心申请完工查验', tip: '', status: 'pending', notes: '' },
        ]
    },
    {
        id: 'owner_info',
        name: '业主信息',
        icon: '👤',
        desc: '我们的基本信息和需求，沟通前先发给设计师',
        items: [
            { id: 'oi_style', name: '装修风格/色彩倾向', desc: '一层采光受限，整体不能选暗色，也不能偏冷色调', tip: '适合：暖白、奶油色、原木色、浅暖灰；避免：深灰、深蓝、冷白', status: 'checked', notes: '' },
            { id: 'oi_furniture', name: '保留家具情况', desc: '有部分电器，无家具带入', tip: '需要全屋家具采购，提前列清单', status: 'checked', notes: '' },
            { id: 'oi_window_door', name: '窗户/暖气/门', desc: '窗户评估后够用不建议换；打算做地暖+新风；防盗门暂不换', tip: '地暖+新风属于大项，需提前和设计师确认层高影响', status: 'checked', notes: '' },
            { id: 'oi_population', name: '常住人口', desc: '2人5猫，偶尔父母过来短住', tip: '次卧需要兼顾办公+客卧+衣帽间功能', status: 'checked', notes: '' },
            { id: 'oi_guest', name: '会客需求', desc: '很少，朋友过来能有地方坐即可', tip: '客厅不需要大沙发，可以更灵活布局', status: 'checked', notes: '' },
            { id: 'oi_dining', name: '用餐人数', desc: '平时2人，偶尔最多4人', tip: '4人餐桌即可，不用占太大空间', status: 'checked', notes: '' },
            { id: 'oi_second_room', name: '次卧规划', desc: '办公+客卧+衣帽间三合一', tip: '方案：榻榻米/墨菲床+书桌+衣柜一体化设计', status: 'checked', notes: '' },
            { id: 'oi_dressing', name: '梳妆台需求', desc: '主卧有最好', tip: '可以和衣柜/床头柜一体化设计，节省空间', status: 'checked', notes: '' },
            { id: 'oi_storage', name: '储物要求', desc: '每个空间都要有储物设计', tip: '重点：玄关鞋柜、卧室衣柜、厨房橱柜、阳台柜、卫生间镜柜', status: 'checked', notes: '' },
            { id: 'oi_laundry', name: '洗衣需求', desc: '需要洗衣机+烘干机', tip: '阳台洗衣区需预留两个位置+上下水', status: 'checked', notes: '' },
            { id: 'oi_smoking', name: '吸烟情况', desc: '无', tip: '', status: 'checked', notes: '' },
            { id: 'oi_pets', name: '宠物情况', desc: '5只猫，2个电动猫砂盆', tip: '猫砂盆需解决摆放位置+专用排风换气，避免异味扩散全屋', status: 'checked', notes: '' },
            { id: 'oi_schedule', name: '工期要求', desc: '正常工期，不加急', tip: '', status: 'checked', notes: '' },
            { id: 'oi_fengshui', name: '风水要求', desc: '注重风水', tip: '提前和设计师沟通：入户门对阳台（穿堂煞）、卫生间位置、床位朝向等', status: 'checked', notes: '' },
            { id: 'oi_supervision', name: '监理安排', desc: '环保、设计、工长都重视，自己请第三方监理', tip: '第三方监理费用约3000-5000元，独立于装修公司', status: 'checked', notes: '' },
        ]
    },
];

// ========== 公司对比分类提示 ==========
const COMPARE_CATEGORY_TIPS = {
    '报价': {
        tip: '拿到报价单后，先看总价区间是否合理，再逐项对比单价。优先争取闭口合同（一口价），避免开口合同（按实结算）——后者增项空间大。付款节点要分4-5期，尾款不低于10%。所有增项必须提前书面签字确认，未经同意不得施工。',
        guide: '怎么问：「请给我一份详细的逐项报价单，包含品牌型号和数量。增项怎么处理？需要书面确认吗？」',
    },
    '拆除清运': {
        tip: '开工第一步，最易隐形增项。90%初始报价仅含铲乳胶漆+腻子，铲基层、保温层、抹灰均会单独加价。垃圾清运要确认小区是否有专用堆放点，无堆放点时外运费用（北京参考：小车300-500元、中车500-800元/车）及预估车数，要求签一口价协议。',
        guide: '怎么问：「铲墙皮铲到什么层？保温层铲不铲？垃圾清运包含到完工吗？外运怎么收费？能签一口价吗？」',
    },
    '基层处理': {
        tip: '装修公司常前期不提地面不平，开工后强制要求找平加价。冲筋找平价格远高于普通找平，后期会以「柜子有缝隙」为由强制要求。挂网材质默认玻璃纤维网，钢丝网需额外加价，施工时以「不挂网会开裂」临时要求加钱。',
        guide: '怎么问：「地面需要找平吗？含自流平吗？墙面要不要冲筋找平？挂网包含哪些位置？用什么材质？」',
    },
    '瓷砖铺贴': {
        tip: '增项高发区。初始报价常按半瓷砖报，业主买全瓷砖后要求加辅材费（瓷砖胶、背胶、拉毛乳液）。海棠角、对缝等特殊工艺常单独收费。大砖（600×1200）、小砖、异形砖有加价标准。北京参考：600×1200全瓷砖铺贴（人工+辅材）90-120元/㎡。',
        guide: '怎么问：「全瓷砖铺贴包含辅材吗？海棠角、对缝怎么收费？大砖加价多少？能写进合同吗？」',
    },
    '施工工艺': {
        tip: '工艺决定质量底线。防水是最容易偷工减料的地方——淋浴区必须刷到1.8m，闭水48小时。厨房、阳台防水常被遗漏后期单独加价。下水管道包封的隔音棉、阻尼片前期不报，施工时以「隔音差」为由强制推荐加价。墙面漆免费调色数量有限，超出收费。',
        guide: '怎么问：「防水做几遍？淋浴区刷多高？厨房阳台做防水吗？闭水多久？管道包封含隔音棉吗？」',
    },
    '辅材品牌': {
        tip: '辅材虽然藏在墙里看不见，但决定了入住后的安全和耐用。电线看截面（2.5㎡/4㎡）、穿线管规格（205轻型vs305中型），水管看品牌（伟星、日丰等）。美缝材料差价大：环氧彩砂>瓷缝剂>勾缝剂，初始报价常用最便宜的。',
        guide: '怎么问：「电线用什么牌子？几平方的？穿线管什么规格？水管什么品牌？美缝用什么材料？」',
    },
    '服务保障': {
        tip: '质保年限看隐蔽工程（水电）是否≥5年。工期要有明确排期和延期违约条款。验收流程要每阶段业主签字确认。施工图纸必须有——没有图纸的施工全靠工人经验。我们已确定请第三方监理，提前告知装修公司。',
        guide: '怎么问：「质保几年？隐蔽工程和表面工程分别多久？延期怎么赔？每个阶段验收标准是什么？」',
    },
    '回填美缝': {
        tip: '卫生间回填材料差价大：发泡水泥>陶粒>碳渣，警惕用便宜碳渣冒充。美缝材料：环氧彩砂>瓷缝剂>勾缝剂，初始报价常用最便宜的勾缝剂，升级需大幅加价。确认美缝剂具体品牌型号。',
        guide: '怎么问：「回填用什么材料？美缝用什么品牌型号？按米还是按平米收费？压缝还是平缝？」',
    },
    '责任划分': {
        tip: '全包含什么、半包含什么、哪些需要自采，必须逐项确认写进合同。灰色地带（封阳台、入户门、窗户更换）最容易扯皮——我们的情况是窗户不换、防盗门不换、封阳台要做。',
        guide: '怎么问：「这个报价包含哪些？哪些不含？封阳台算在里面吗？如果我自己买主材，安装你们负责吗？」',
    },
    '防坑': {
        tip: '低价签约→后期加项是最常见的坑。报价比别人低30%以上要警惕。所有口头承诺必须写进合同或微信留痕。材料进场时拍照验收、对比合同。定金不退、订金可退——签之前搞清楚。',
        guide: '怎么问：「增项超过多少需要我确认？材料进场我能验收吗？这些承诺能写进合同吗？」',
    },
    '补贴办理': {
        tip: '世华泊郡业主装修补贴，官方2-3个月放款。核心流程：先盖章→后合规开票→资料一次性齐全。装修公司必须配合：三方协议盖章（不得拖延拒盖）、开增值税专用发票（普票无效）、小规模纳税人须提供资质查询证明。任何一环缺失补贴就无法报审。',
        guide: '怎么问：「你们是一般纳税人还是小规模？能开增值税专用发票吗？开票项目能写"建筑服务-装饰服务"吗？三方协议盖章配合吗？小规模的话能提供纳税人资质查询证明吗？」',
    },
    '综合': {
        tip: '设计师负责出方案，工长负责落地执行——两个都重要。看设计师是否理解你的需求，工长是否有同户型经验。整体印象看沟通是否顺畅、回复是否及时。尽量签闭口合同，明确「超出部分由装修公司承担」。',
        guide: '怎么问：「设计师跟哪个工长搭配？这个工长做过几套同户型的？能看在建工地吗？」',
    },
    '主材配置': {
        tip: '主材品牌和规格直接影响入住体验和后期维护成本。重点关注地砖品牌及规格、乳胶漆环保等级、开关插座材质、踢脚线工艺。对比时逐项记录品牌+型号+规格，口头承诺的不算数。多个品牌用/分隔表示备选范围。',
        guide: '怎么问：「地砖用的什么品牌什么规格？乳胶漆是水性还是油性？开关插座什么材质？踢脚线是成品还是现场贴？」',
    },
};

// ========== 公司对比问题 ==========
const COMPARE_QUESTIONS = [
    // 报价相关
    { id: 'pricing_type', category: '报价', question: '报价方式', options: ['按项目逐项报', '按平米套餐报', '一口价'] },
    { id: 'electric_pricing', category: '报价', question: '水电计价', options: ['按点位', '按米', '按面积'] },
    { id: 'change_limit', category: '报价', question: '增项上限', options: ['合同约定≤5%', '合同约定≤8%', '合同约定≤10%', '未约定'] },
    { id: 'change_confirm', category: '报价', question: '增项确认方式', options: ['书面签字确认', '微信确认即可', '口头确认', '未约定'] },
    { id: 'payment_ratio', category: '报价', question: '付款节点', options: ['3-3-3-1', '3-3-2-1-1', '5-3-1-1', '其他'] },
    { id: 'deposit', category: '报价', question: '定金/订金', options: ['定金（不退）', '订金（可退）', '无需预付'] },
    { id: 'lump_sum', category: '报价', question: '闭口合同（一口价）', options: ['全包闭口合同', '水电闭口', '开口合同（按实结算）', '待协商'] },

    // 拆除清运
    { id: 'demo_scope', category: '拆除清运', question: '拆除范围', options: ['全屋拆除', '部分拆除', '不含拆除'] },
    { id: 'wall_scrape', category: '拆除清运', question: '铲墙皮标准', options: ['铲至红砖层', '铲至水泥砂浆层', '仅铲腻子+乳胶漆', '未说明'] },
    { id: 'insulation_remove', category: '拆除清运', question: '保温层处理', options: ['包含铲除', '不铲除', '需加价', '无保温层'] },
    { id: 'hollow_wall', category: '拆除清运', question: '空鼓墙面处理', options: ['包含修补', '铲后重新抹灰另收费', '未提及'] },
    { id: 'trash_removal', category: '拆除清运', question: '垃圾清运', options: ['包含到完工', '仅含小区内搬运', '不含', '一口价'] },
    { id: 'trash_haul', category: '拆除清运', question: '外运费用', options: [] },

    // 基层处理
    { id: 'floor_leveling', category: '基层处理', question: '地面找平', options: ['包含', '含自流平', '不含', '需加价'] },
    { id: 'wall_leveling', category: '基层处理', question: '墙面找平', options: ['普通找平包含', '冲筋找平另收费', '冲筋找平包含', '未说明'] },
    { id: 'mesh_type', category: '基层处理', question: '挂网材质', options: ['玻璃纤维网', '钢丝网', '按需选择', '未说明'] },
    { id: 'mesh_scope', category: '基层处理', question: '挂网位置', options: ['新建墙体+开槽处', '全屋挂网', '仅新建墙体', '未说明'] },

    // 瓷砖铺贴
    { id: 'tile_type', category: '瓷砖铺贴', question: '瓷砖类型适配', options: ['全瓷砖包含辅材', '半瓷砖铺贴', '全瓷砖需加辅材费', '未说明'] },
    { id: 'tile_adhesive', category: '瓷砖铺贴', question: '全瓷砖辅材', options: ['瓷砖胶+背胶包含', '仅含水泥砂浆', '需加价', '未说明'] },
    { id: 'tile_edge', category: '瓷砖铺贴', question: '海棠角/对缝工艺', options: ['包含', '单独收费', '未提及'] },
    { id: 'tile_size_price', category: '瓷砖铺贴', question: '大砖/异形砖加价', options: [] },

    // 施工工艺
    { id: 'waterproof_scope', category: '施工工艺', question: '防水区域', options: ['卫生间+厨房+阳台', '仅卫生间+厨房', '仅卫生间'] },
    { id: 'waterproof', category: '施工工艺', question: '防水涂刷标准', options: ['淋浴区1.8m+其他30cm', '全墙1.8m', '全墙1.2m'] },
    { id: 'waterproof_test', category: '施工工艺', question: '闭水试验', options: ['48小时', '24小时', '未承诺'] },
    { id: 'pipe_wrap', category: '施工工艺', question: '下水管道包封', options: ['含隔音棉+阻尼片', '仅包管道不含隔音', '不含', '未说明'] },
    { id: 'ceiling_type', category: '施工工艺', question: '吊顶工艺', options: ['轻钢龙骨+石膏板', '木龙骨+石膏板', '集成吊顶'] },
    { id: 'ceiling_access', category: '施工工艺', question: '检修口', options: ['包含', '另收费', '未提及'] },
    { id: 'paint_process', category: '施工工艺', question: '墙面漆工艺', options: ['1底2面', '1底1面', '2底2面'] },
    { id: 'paint_color', category: '施工工艺', question: '调色', options: ['免费调色不限', '免费2-3色', '调色另收费', '未说明'] },
    { id: 'paint_method', category: '施工工艺', question: '涂刷方式', options: ['滚筒涂刷', '喷涂', '可选', '未说明'] },
    { id: 'putty_type', category: '施工工艺', question: '腻子类型', options: ['耐水腻子', '普通腻子', '未说明'] },
    { id: 'brand_confirm', category: '施工工艺', question: '材料品牌确认方式', options: ['合同写明品牌+型号', '口头承诺', '未确认'] },

    // 辅材品牌
    { id: 'wire_brand', category: '辅材品牌', question: '电线品牌及规格', options: [] },
    { id: 'conduit_brand', category: '辅材品牌', question: '穿线管规格', options: ['205轻型', '305中型', '未说明'] },
    { id: 'pipe_brand', category: '辅材品牌', question: '水管品牌', options: [] },
    { id: 'cement_brand', category: '辅材品牌', question: '水泥品牌', options: [] },
    { id: 'waterproof_brand', category: '辅材品牌', question: '防水涂料品牌', options: [] },
    { id: 'tile_glue_brand', category: '辅材品牌', question: '瓷砖胶/背胶品牌', options: [] },
    { id: 'sealant_brand', category: '辅材品牌', question: '美缝剂品牌型号', options: [] },
    { id: 'backfill_brand', category: '辅材品牌', question: '回填材料', options: ['发泡水泥', '陶粒', '碳渣', '未说明'] },

    // 服务保障
    { id: 'drawing', category: '服务保障', question: '施工图纸', options: ['提供全套图纸', '仅平面图', '不提供'] },
    { id: 'warranty', category: '服务保障', question: '质保年限', options: ['隐蔽工程5年+其他2年', '全屋2年', '隐蔽工程3年+其他1年'] },
    { id: 'schedule', category: '服务保障', question: '工期承诺', options: ['60天', '75天', '90天', '其他'] },
    { id: 'penalty', category: '服务保障', question: '延期违约', options: ['千分之三/天', '千分之五/天', '未约定'] },
    { id: 'supervisor', category: '服务保障', question: '是否配监理', options: ['公司配专属监理', '巡检制（不专属）', '无'] },
    { id: 'acceptance', category: '服务保障', question: '验收流程', options: ['每阶段验收+业主签字', '仅最终验收', '未说明'] },

    // 回填美缝
    { id: 'backfill_type', category: '回填美缝', question: '回填材料', options: ['发泡水泥', '陶粒', '碳渣', '未说明'] },
    { id: 'backfill_included', category: '回填美缝', question: '回填是否包含', options: ['包含找平层', '仅含回填', '不含', '未说明'] },
    { id: 'sealant_type', category: '回填美缝', question: '美缝材料', options: ['环氧彩砂', '瓷缝剂', '勾缝剂', '未说明'] },
    { id: 'sealant_method', category: '回填美缝', question: '美缝工艺', options: ['压缝', '平缝', '未说明'] },
    { id: 'sealant_pricing', category: '回填美缝', question: '美缝计价', options: ['按米', '按平米', '一口价'] },

    // 补贴办理
    { id: 'sub_taxpayer', category: '补贴办理', question: '纳税人类型', options: ['一般纳税人（9%税点）', '小规模纳税人（1%/3%税点）'] },
    { id: 'sub_invoice', category: '补贴办理', question: '发票类型', options: ['增值税专用发票', '仅开普票', '不开票'] },
    { id: 'sub_invoice_item', category: '补贴办理', question: '开票项目', options: ['建筑服务-装饰服务', '其他类目', '待确认'] },
    { id: 'sub_invoice_amount', category: '补贴办理', question: '开票金额', options: ['与合同金额一致', '部分开票', '待协商'] },
    { id: 'sub_qual_cert', category: '补贴办理', question: '资质查询证明', options: ['可提供', '不需要（一般纳税人）', '不提供', '待确认'] },
    { id: 'sub_agreement', category: '补贴办理', question: '三方协议盖章配合', options: ['配合盖章', '需协商', '不配合'] },
    { id: 'sub_materials', category: '补贴办理', question: '资料配合完整性', options: ['全套配合', '部分配合', '不配合'] },

    // 责任划分
    { id: 'scope_construction', category: '责任划分', question: '施工方负责', options: [] },
    { id: 'scope_full_material', category: '责任划分', question: '全包含主材', options: [] },
    { id: 'scope_self_buy', category: '责任划分', question: '需自采项目', options: [] },
    { id: 'scope_grey', category: '责任划分', question: '灰色地带', options: [] },

    // 防坑
    { id: 'pit_oral', category: '防坑', question: '承诺留证方式', options: ['合同+微信留痕', '仅口头', '不清楚'] },
    { id: 'pit_low_price', category: '防坑', question: '报价是否偏低', options: ['正常范围', '明显偏低', '偏高'] },
    { id: 'pit_split_item', category: '防坑', question: '项目拆分情况', options: ['拆分合理', '拆分过细', '未拆分'] },
    { id: 'pit_material_swap', category: '防坑', question: '材料进场验收', options: ['支持业主验收', '公司自检', '未说明'] },

    // 综合评价
    { id: 'design_cycle', category: '综合', question: '设计周期', options: ['3天内', '1周内', '2周内', '其他'] },
    { id: 'total_price', category: '综合', question: '报价总价', options: [] },
    { id: 'designer', category: '综合', question: '设计师', options: [] },
    { id: 'foreman', category: '综合', question: '工长', options: [] },
    { id: 'impression', category: '综合', question: '整体印象', options: ['非常满意', '比较满意', '一般', '不太满意'] },
    { id: 'decision', category: '综合', question: '是否入选', options: ['候选', '优先考虑', '暂不考虑', '淘汰'] },

    // 主材配置 — 门厅/客厅
    { id: 'mat_lv_floor_tile', category: '主材配置', question: '【门厅/客厅】大地砖', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_lv_latex_paint', category: '主材配置', question: '【门厅/客厅】乳胶漆', options: ['大师/芬琳'] },
    { id: 'mat_lv_window_sill', category: '主材配置', question: '【门厅/客厅】窗台板', options: [] },
    { id: 'mat_lv_switch', category: '主材配置', question: '【门厅/客厅】开关插座', options: ['罗格朗/施耐德/公牛/西门子'] },
    { id: 'mat_lv_baseboard', category: '主材配置', question: '【门厅/客厅】踢脚线', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },

    // 主材配置 — 厨房
    { id: 'mat_kt_floor_tile', category: '主材配置', question: '【厨房】大地砖', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_kt_threshold', category: '主材配置', question: '【厨房】过门石', options: [] },
    { id: 'mat_kt_ceiling', category: '主材配置', question: '【厨房】吊顶', options: ['法狮龙/奥普/名族'] },
    { id: 'mat_kt_light', category: '主材配置', question: '【厨房】照明灯', options: ['法狮龙/奥普/名族'] },
    { id: 'mat_kt_wall_tile', category: '主材配置', question: '【厨房】墙砖', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_kt_switch', category: '主材配置', question: '【厨房】开关插座', options: ['罗格朗/施耐德/公牛/西门子'] },
    { id: 'mat_kt_combo_outlet', category: '主材配置', question: '【厨房】联排插座', options: ['罗格朗'] },
    { id: 'mat_kt_cabinet_door', category: '主材配置', question: '【厨房】整体橱柜（门板）', options: ['R+W（H）/金牌/好莱客/欧铂尼'] },
    { id: 'mat_kt_countertop', category: '主材配置', question: '【厨房】橱柜台面', options: ['喜仕隆/赛丽石/富仕隆/金牌/好莱客/欧铂尼'] },
    { id: 'mat_kt_hood_cooktop', category: '主材配置', question: '【厨房】烟机灶具', options: ['老板/方太/卡萨帝/美的'] },
    { id: 'mat_kt_sink', category: '主材配置', question: '【厨房】水槽及龙头', options: ['邦克/维拉/金牌/好莱客/欧派'] },
    { id: 'mat_kt_door', category: '主材配置', question: '【厨房】内门系统', options: ['R+W/TATA'] },

    // 主材配置 — 卫生间
    { id: 'mat_bt_small_tile', category: '主材配置', question: '【卫生间】小地砖', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_bt_threshold', category: '主材配置', question: '【卫生间】过门石', options: [] },
    { id: 'mat_bt_ceiling', category: '主材配置', question: '【卫生间】吊顶', options: ['法狮龙/奥普/名族'] },
    { id: 'mat_bt_bath_heater', category: '主材配置', question: '【卫生间】风暖浴霸', options: ['法狮龙/奥普/名族'] },
    { id: 'mat_bt_wall_tile', category: '主材配置', question: '【卫生间】墙砖', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_bt_switch', category: '主材配置', question: '【卫生间】开关插座', options: ['罗格朗/施耐德/公牛/西门子'] },
    { id: 'mat_bt_sanitary', category: '主材配置', question: '【卫生间】卫浴洁具套装（面盆/花洒/座便器/浴室柜）', options: ['贝朗/法恩莎/恒洁/惠达/九牧/木乐'] },
    { id: 'mat_bt_door', category: '主材配置', question: '【卫生间】内门系统', options: ['精诚鸣仁/欧克美佳'] },
    { id: 'mat_bt_drain', category: '主材配置', question: '【卫生间】地漏', options: ['潜水艇'] },
    { id: 'mat_bt_washer_valve', category: '主材配置', question: '【卫生间】洗衣机龙头', options: ['潜水艇'] },

    // 主材配置 — 客厅/封闭阳台
    { id: 'mat_lr_floor_tile', category: '主材配置', question: '【客厅/阳台】大地砖', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_lr_latex_paint', category: '主材配置', question: '【客厅/阳台】乳胶漆', options: ['大师/芬琳'] },
    { id: 'mat_lr_baseboard', category: '主材配置', question: '【客厅/阳台】踢脚线', options: ['马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人'] },
    { id: 'mat_lr_switch', category: '主材配置', question: '【客厅/阳台】开关插座', options: ['罗格朗/施耐德/公牛/西门子'] },

    // 主材配置 — 卧室/次卧/卧室阳台
    { id: 'mat_br_floor', category: '主材配置', question: '【卧室】地板', options: ['爱格/卢森/圣象/德尔/生活家/和邦盛世'] },
    { id: 'mat_br_threshold', category: '主材配置', question: '【卧室】过门石', options: [] },
    { id: 'mat_br_latex_paint', category: '主材配置', question: '【卧室】乳胶漆', options: ['大师/芬琳'] },
    { id: 'mat_br_window_sill', category: '主材配置', question: '【卧室】窗台板', options: [] },
    { id: 'mat_br_switch', category: '主材配置', question: '【卧室】开关插座', options: ['罗格朗/施耐德/公牛/西门子'] },
    { id: 'mat_br_usb_outlet', category: '主材配置', question: '【卧室】USB五孔插座', options: ['罗格朗/施耐德/公牛/西门子'] },
    { id: 'mat_br_door', category: '主材配置', question: '【卧室】内门系统', options: ['R+W/TATA'] },
];

// ========== 预置公司数据（首次加载时自动填入） ==========
const DEFAULT_COMPANIES = [
    {
        id: 'boloni_default',
        name: '博洛尼',
        answers: {
            // 门厅/客厅
            mat_lv_floor_tile: { value: '800×800MM', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_lv_latex_paint: { value: '水性漆', notes: '大师/芬琳' },
            mat_lv_window_sill: { value: '进深≤250MM', notes: '' },
            mat_lv_switch: { value: 'PC阻燃材料 86×86MM', notes: '罗格朗/施耐德/公牛/西门子' },
            mat_lv_baseboard: { value: '成品瓷质踢脚线', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            // 厨房
            mat_kt_floor_tile: { value: '800×800MM', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_kt_threshold: { value: '900×250×15MM 1块', notes: '' },
            mat_kt_ceiling: { value: '铝扣板 300×600MM', notes: '法狮龙/奥普/名族' },
            mat_kt_light: { value: 'LED照明 300×300MM/300×600MM 1个', notes: '法狮龙/奥普/名族' },
            mat_kt_wall_tile: { value: '300×600MM/400×800MM', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_kt_switch: { value: 'PC阻燃材料 86×86MM', notes: '罗格朗/施耐德/公牛/西门子' },
            mat_kt_combo_outlet: { value: 'PC阻燃材料 86×86MM 1套', notes: '罗格朗' },
            mat_kt_cabinet_door: { value: '耐磨板', notes: 'R+W（H）/金牌/好莱客/欧铂尼' },
            mat_kt_countertop: { value: '石英石', notes: '喜仕隆/赛丽石/富仕隆/金牌/好莱客/欧铂尼' },
            mat_kt_hood_cooktop: { value: '直吸/侧吸烟机+双眼灶 1套', notes: '老板/方太/卡萨帝/美的' },
            mat_kt_sink: { value: '不锈钢 1套', notes: '邦克/维拉/金牌/好莱客/欧派' },
            mat_kt_door: { value: '免漆 1樘', notes: 'R+W/TATA' },
            // 卫生间
            mat_bt_small_tile: { value: '300×300MM', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_bt_threshold: { value: '900×250×15MM', notes: '' },
            mat_bt_ceiling: { value: '铝扣板 300×300MM/300×600MM', notes: '法狮龙/奥普/名族' },
            mat_bt_bath_heater: { value: '300×600MM', notes: '法狮龙/奥普/名族' },
            mat_bt_wall_tile: { value: '300×600MM/400×800MM', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_bt_switch: { value: 'PC阻燃材料 86×86MM', notes: '罗格朗/施耐德/公牛/西门子' },
            mat_bt_sanitary: { value: '陶瓷/纯铜镀铬/航空铝·实木多层板·防潮板 1套', notes: '贝朗/法恩莎/恒洁/惠达/九牧/木乐' },
            mat_bt_door: { value: '合金门 1樘', notes: '精诚鸣仁/欧克美佳' },
            mat_bt_drain: { value: '纯铜镀铬 3个', notes: '潜水艇' },
            mat_bt_washer_valve: { value: '纯铜镀铬 1个', notes: '潜水艇' },
            // 客厅/封闭阳台
            mat_lr_floor_tile: { value: '800×800MM', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_lr_latex_paint: { value: '水性漆', notes: '大师/芬琳' },
            mat_lr_baseboard: { value: '成品瓷质踢脚线', notes: '马可波罗/L&D/冠珠/欧神诺/依诺/金意陶/稻草人' },
            mat_lr_switch: { value: 'PC阻燃材料 86×86MM', notes: '罗格朗/施耐德/公牛/西门子' },
            // 卧室/次卧/卧室阳台
            mat_br_floor: { value: '强化复合地板', notes: '爱格/卢森/圣象/德尔/生活家/和邦盛世' },
            mat_br_threshold: { value: '900×250×15MM 1块', notes: '' },
            mat_br_latex_paint: { value: '水性漆', notes: '大师/芬琳' },
            mat_br_window_sill: { value: '进深≤250MM', notes: '' },
            mat_br_switch: { value: 'PC阻燃材料 86×86MM', notes: '罗格朗/施耐德/公牛/西门子' },
            mat_br_usb_outlet: { value: 'PC阻燃材料 86×86MM 1个', notes: '罗格朗/施耐德/公牛/西门子' },
            mat_br_door: { value: '免漆，平板R+W烤漆', notes: 'R+W/TATA' },
        },
    },
    {
        id: 'yzf_default',
        name: '业之峰',
        answers: {},
    },
    {
        id: 'beiwo_default',
        name: '被窝',
        answers: {},
    },
    {
        id: 'jinzhao_default',
        name: '今朝',
        answers: {},
    },
];

// ========== 装修避坑数据 ==========
// 装修避坑：通用的、可复制的装修经验（不针对特定小区/物业）
const PITFALLS_DATA = [
    {
        id: 'contract',
        name: '合同签约',
        icon: '📝',
        desc: '签合同前必须确认的关键条款',
        items: [
            { id: 'ct_lump', name: '闭口合同（一口价）', desc: '优先签闭口合同，总价锁定，超出部分装修公司承担', tip: '开口合同（按实结算）增项空间极大，尽量避免', status: 'pending', notes: '' },
            { id: 'ct_change', name: '增项书面确认', desc: '所有增项必须提前书面签字确认，未经业主同意不得施工', tip: '口头确认无效', status: 'pending', notes: '' },
            { id: 'ct_payment', name: '付款节点比例', desc: '分4-5期付款，尾款不低于10%验收后付', tip: '建议：开工30%→水电30%→泥木20%→油漆10%→验收10%', status: 'pending', notes: '' },
            { id: 'ct_brand', name: '材料品牌写进合同', desc: '合同写清品牌+型号+规格，"同品牌"不能签字', tip: '进场时拍照验收对比合同', status: 'pending', notes: '' },
            { id: 'ct_oral', name: '口头承诺留痕', desc: '所有承诺写进合同或微信留痕，口头答应的不算数', tip: '微信聊天记录可作为证据', status: 'pending', notes: '' },
            { id: 'ct_deposit', name: '定金/订金区分', desc: '"定金"不退，"订金"可退，签之前搞清楚', tip: '别被忽悠交"定金"', status: 'pending', notes: '' },
            { id: 'ct_warranty', name: '质保条款', desc: '隐蔽工程（水电）质保≥5年，写进合同', tip: '质保范围和维修响应时间也要明确', status: 'pending', notes: '' },
            { id: 'ct_penalty', name: '延期违约条款', desc: '约定延期违约金，没有违约条款的工期承诺等于零', tip: '参考：千分之三~五/天', status: 'pending', notes: '' },
            { id: 'ct_acceptance', name: '验收标准流程', desc: '每阶段完工后验收标准和流程，水电验收必须在封槽前拍照留档', tip: '业主签字确认后才进入下一阶段', status: 'pending', notes: '' },
        ]
    },
    {
        id: 'hidden_cost',
        name: '隐形增项',
        icon: '⚠️',
        desc: '90%会遇到的增项，签合同前逐项确认',
        items: [
            { id: 'hc_trash', name: '垃圾清运', desc: '确认报价是否含全屋垃圾清运至完工，外运费用标准及预估车数', tip: '警惕单独收取"垃圾搬运上车费"，要求签一口价', status: 'pending', notes: '' },
            { id: 'hc_scrape', name: '铲墙皮标准', desc: '确认铲至什么层：红砖层/水泥砂浆层/仅腻子+乳胶漆', tip: '90%初始报价仅含腻子+乳胶漆，铲基层/保温层/抹灰均另加价', status: 'pending', notes: '' },
            { id: 'hc_floor_level', name: '地面找平', desc: '确认是否含全屋找平、自流平，铲至楼板层必须做找平', tip: '装修公司常前期不提，开工后强制加价', status: 'pending', notes: '' },
            { id: 'hc_wall_level', name: '墙面冲筋找平', desc: '确认普通找平还是冲筋找平（价格差远），柜体安装区墙面找平标准', tip: '后期以"柜子有缝隙"为由强制要求高价冲筋', status: 'pending', notes: '' },
            { id: 'hc_mesh', name: '挂网', desc: '确认挂网材质（玻璃纤维/钢丝网）、位置（新建墙体+开槽处）', tip: '施工时以"不挂网会开裂"临时加钱', status: 'pending', notes: '' },
            { id: 'hc_pipe_wrap', name: '管道包封隔音', desc: '确认是否含隔音棉、阻尼片，按根还是按米收费', tip: '前期不报，施工时以"隔音差"强制推荐加价', status: 'pending', notes: '' },
            { id: 'hc_tile_glue', name: '全瓷砖辅材', desc: '买全瓷砖后是否需加瓷砖胶、背胶、拉毛乳液费用', tip: '初始报价按半瓷砖报，买全瓷砖后加辅材费', status: 'pending', notes: '' },
            { id: 'hc_tile_edge', name: '瓷砖特殊工艺', desc: '海棠角、对缝、倒角是否单独收费，大砖/异形砖加价标准', tip: '这些工艺费初始报价常不含', status: 'pending', notes: '' },
            { id: 'hc_ceiling_access', name: '吊顶检修口', desc: '确认检修口数量及收费标准（参考80-120元/个）', tip: '刻意隐瞒检修口项目，施工时单独收费', status: 'pending', notes: '' },
            { id: 'hc_paint_color', name: '墙面调色费', desc: '免费调色数量，超出部分收费标准', tip: '施工时要求更换涂刷方式（滚涂/喷涂）以此加价', status: 'pending', notes: '' },
            { id: 'hc_backfill', name: '卫生间回填', desc: '回填材料确认：发泡水泥>陶粒>碳渣', tip: '用便宜碳渣冒充陶粒/发泡水泥，或后期要求更换加价', status: 'pending', notes: '' },
            { id: 'hc_sealant', name: '美缝', desc: '美缝材料确认：环氧彩砂>瓷缝剂>勾缝剂，按米还是按平米', tip: '初始报价用最便宜的勾缝剂，升级需大幅加价', status: 'pending', notes: '' },
        ]
    },
    {
        id: 'acceptance',
        name: '施工验收',
        icon: '✅',
        desc: '各阶段验收要点，拍照留档',
        items: [
            { id: 'acc_waterproof', name: '防水验收', desc: '闭水48小时，淋浴区≥1.8m，厨房阳台也要做', tip: '闭水前通知楼下邻居，漏水责任划分要明确', status: 'pending', notes: '' },
            { id: 'acc_electric', name: '水电验收', desc: '封槽前拍照留档，确认点位数量、走向、材料品牌', tip: '水电是隐蔽工程，封槽后无法检查', status: 'pending', notes: '' },
            { id: 'acc_pipe', name: '管道验收', desc: '水管打压测试，下水管道通畅测试', tip: '打压0.8MPa保持30分钟不掉压', status: 'pending', notes: '' },
            { id: 'acc_tile', name: '瓷砖验收', desc: '空鼓率检测（单片≤15%，整体≤5%），平整度、对缝检查', tip: '用小锤逐片敲击检查空鼓', status: 'pending', notes: '' },
            { id: 'acc_paint', name: '墙面验收', desc: '无开裂、无色差、无流坠，阴阳角顺直', tip: '侧光观察墙面平整度', status: 'pending', notes: '' },
            { id: 'acc_final', name: '整体验收', desc: '所有项目逐一对照合同验收，确认无遗漏', tip: '验收合格后才付尾款', status: 'pending', notes: '' },
        ]
    },
    {
        id: 'circuit',
        name: '回路规划',
        icon: '🔌',
        desc: '水电阶段就要规划好，哪些设备需要独立回路',
        items: [
            { id: 'cir_fridge', name: '冰箱独立回路', desc: '冰箱单独一路，出远门拉总闸时留这一路', tip: '冰箱断电食物全毁，独立回路是最基本的', status: 'checked', notes: '' },
            { id: 'cir_camera', name: '监控/摄像头回路', desc: '监控单独一路或和路由器同路，断电等于瞎了', tip: '断网也白搭，路由器也要同路', status: 'checked', notes: '' },
            { id: 'cir_router', name: '路由器/光猫回路', desc: '路由器和光猫独立供电，所有智能设备依赖网络', tip: '建议和监控走同一回路，出远门一起留', status: 'checked', notes: '' },
            { id: 'cir_cat_litter', name: '电动猫砂盆回路', desc: '2个电动猫砂盆独立回路，断电猫没法上厕所', tip: '猫砂盆功耗不大但不能断，可以和猫粮器同路', status: 'checked', notes: '' },
            { id: 'cir_cat_feeder', name: '电动猫粮器/饮水机', desc: '自动喂食器和饮水机独立供电', tip: '饮水机断电猫没水喝，出远门几天很危险', status: 'checked', notes: '' },
            { id: 'cir_label', name: '配电箱回路标签', desc: '每个回路贴标签，标注控制哪个区域/设备', tip: '出远门拉闸时一目了然，不用一个个试', status: 'pending', notes: '' },
            { id: 'cir_reserve', name: '预留备用回路', desc: '配电箱预留1-2个空位，未来加设备不用改线', tip: '智能家居、新设备越来越多，预留不吃亏', status: 'pending', notes: '' },
            { id: 'cir_away_group', name: '出远门留电分组', desc: '规划好出门时哪些回路留、哪些断，贴在配电箱内侧', tip: '建议：冰箱+监控+路由器+猫设备一组留电，其他全断', status: 'pending', notes: '' },
        ]
    },
    {
        id: 'purchase',
        name: '采购避坑',
        icon: '🛒',
        desc: '买材料和家具时的注意事项',
        items: [
            { id: 'buy_measure', name: '量尺复核', desc: '定制类产品（橱柜、衣柜、门窗）下单前必须复核尺寸', tip: '设计师出图后自己再量一遍，误差>5mm要反馈', status: 'pending', notes: '' },
            { id: 'buy_contract', name: '采购合同条款', desc: '写清品牌型号、颜色、数量、交货时间、安装时间、退换条件', tip: '口头约定的色号/型号不写进合同，到货可能不对', status: 'pending', notes: '' },
            { id: 'buy_delivery', name: '到货验收', desc: '到货后当面开箱检查，核对品牌型号、数量、外观', tip: '有问题当场拒收或拍照留证，签收后维权难', status: 'pending', notes: '' },
            { id: 'buy_install', name: '安装确认', desc: '安装前确认安装条件（水电位、墙体承重、尺寸）', tip: '安装师傅到场发现条件不具备，可能收取空跑费', status: 'pending', notes: '' },
            { id: 'buy_invoice', name: '索要发票', desc: '大额采购索要正规发票，保修需要', tip: '没有发票可能无法享受品牌质保', status: 'pending', notes: '' },
        ]
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

// ========== 博洛尼报价数据（世华泊郡88㎡ Yan π high 套餐） ==========
const BOLONI_QUOTE = {
    // 可调基础变量
    vars: {
        baseBuildingArea: 80,      // 基准户型面积
        extraArea: 8,              // 超标面积 B（可调）
        basePackagePrice: 123400,  // Yan high 基础标配包
        extraAreaPrice: 1380,      // 面积差额单价 元/平米
        buildingArea: 88,          // 建筑面积（设计费基数）
        designFeeRate: 120,        // 设计费单价 元/平米
        packageDiscount: -23800,   // 全案套餐专属优惠（负数=减免，可调）
        designDiscount: -7560,     // 设计费优惠（负数=减免，可调）
        personalExtraDiscount: 0,  // 个性化施工额外减免（负数=减免，可调）
        acEquipment: 15000,        // 中央空调设备原价
        acDiscount: 0,             // 中央空调优惠减免（负数=减免，可调）
    },
    // 固定费率
    rates: {
        management: 0.15,          // 装饰管理费率 15%
        tax: 0.0341,               // 工程税率 3.41%
    },
    // 付款比例
    paymentRatio: [
        { stage: '意向协议阶段', ratio: 0.30 },
        { stage: '正签正式合同', ratio: 0.50 },
        { stage: '工程中期验收', ratio: 0.18 },
        { stage: '尾期竣工验收', ratio: 0.02 },
    ],
    // 个性化施工项目（单价和数量可调）
    personalized: [
        { name: '吊顶', price: 4000, unit: '平米', qty: 1, note: '直线顶施工' },
        { name: '直线顶 (超标预估)', price: 185, unit: '平米', qty: 0, note: '预估项，根据最后设计方案确定' },
        { name: '窗帘盒', price: 123, unit: '米', qty: 0, note: '预估项' },
        { name: '电源点位增加', price: 203, unit: '个', qty: 0, note: '超出套餐50个后的电位单价' },
        { name: '水位增加', price: 400, unit: '个', qty: 0, note: '超出套餐10个后的水位单价' },
        { name: '配电箱', price: 350, unit: '个', qty: 0, note: '预估项' },
        { name: '入户线', price: 120, unit: '米', qty: 0, note: '预估项' },
        { name: '厨房下水', price: 200, unit: '个', qty: 0, note: '预估项' },
        { name: '拆墙', price: 80, unit: '平米', qty: 0, note: '预估项' },
        { name: '新建墙体', price: 331, unit: '平米', qty: 0, note: '预估项' },
        { name: '过梁', price: 268, unit: '米', qty: 0, note: '预估项' },
        { name: '灯具加零线', price: 1500, unit: '项', qty: 1, note: '独立个性化工艺收费' },
        { name: '基础修复/工艺项 A', price: 103, unit: '平米', qty: 77.28, note: '全屋套内面积基础工艺/修复' },
        { name: '基础修复/工艺项 B', price: 190, unit: '项', qty: 10, note: '零散工艺/小项合并' },
        { name: '基础调增项', price: 0, unit: '—', qty: 0, note: '原始清单明细总和与小计的差额', fixedTotal: 5000 },
    ],
    // 老房翻新模板（已含在套餐内，仅供参考）
    oldHouseTemplate: [
        { name: '水电全改修复', price: 230, unit: '平米', qty: '含50电位/10水位', note: '全屋水电路彻底换新' },
        { name: '破坏性拆除', price: 70, unit: '平米', qty: '含12.4㎡定制柜拆除', note: '拆除到水泥毛坯状态' },
        { name: '上楼费/材料搬运', price: 8, unit: '平米', qty: '7件家具/7㎡定制', note: '搬运上楼' },
        { name: '专项保护及零星', price: 0, unit: '项', qty: 1, note: '防盗门窗防护、布帘、艺术漆、美缝' },
    ],
    gifts: [
        { name: '免费赠送橱柜抽屉/拉篮', desc: '免费赠送橱柜抽屉一组，或锅碗篮一套，或2个大抽屉' },
        { name: '免费赠送烟机封板', desc: '免费赠送橱柜烟机柜顶封板' },
        { name: '免费赠送台下盆工艺', desc: '厨房水槽免费升级为台下盆工艺（更易打理）' },
        { name: '彩色开关面板免费升级', desc: '全屋开关插座面板免费升级为彩色款' },
        { name: '免费赠送厨卫瓷砖薄贴法', desc: '厨卫墙面瓷砖升级为薄贴法施工（稳固、防空鼓）' },
        { name: '厨卫瓷砖规格免费升级', desc: '厨卫墙砖免费升级为400×800规格' },
        { name: '免费赠送保温防结露工艺', desc: '给水管道免费赠送专业的保温防结露保护' },
        { name: '免费赠送下水管静音工艺', desc: '下水管免费赠送金色阻尼片工艺进行降噪包裹' },
    ],
    materials: [
        { area: '基础统一', items: '瓷砖：马可波罗、金意陶、冠珠、L&D、欧神诺等\n地板：圣象、瑞士卢森、德国爱格等（含扣条/踢脚线/过门石）\n电线：飞利浦电线、飞利浦六类屏蔽网线\n水管：朴勒水管\n防水/瓷砖胶：德高防水、德高瓷砖粘接剂\n墙面辅料：瓦涂士石膏及腻子\n密封胶：万华玻璃胶' },
        { area: '厨房空间', items: '橱柜不限延米数（L型/一字型）、油烟机及灶具、水槽龙头及冷热水配件、铝扣板吊顶及配套照明、厨房门、门套、门吸及磁吸静音锁' },
        { area: '卫生间空间', items: '马桶、整体淋浴花洒（手持、顶喷、下出水）、成品浴室柜组合（龙头/面盆/镜柜）、铝扣板吊顶、四合一风暖机、合金门及配套五金' },
        { area: '客卧空间', items: '所有卧室木门、门套、门吸、磁吸静音门锁；全屋开关插座（含厨房多功能插座、床头USB五孔插座）；全屋窗台石' },
        { area: '自备减项退费', items: '马桶不要可减500元；花洒不要可减200-300元；风暖机不要可减200元' },
    ],
};

// ========== 博洛尼报价联动计算引擎 ==========
function calcBolonQuote(vars, rates, personalized) {
    // 1. 联动A：面积超标补差
    const extraAreaFee = vars.extraAreaPrice * vars.extraArea;

    // 2. 全案标准包小计
    const standardSubtotal = vars.basePackagePrice + extraAreaFee;

    // 3. 联动C/D：管理费 & 税金（基于全案小计）
    const managementFee = Math.round(standardSubtotal * rates.management * 100) / 100;
    const taxFee = Math.round(standardSubtotal * rates.tax * 100) / 100;

    // 4. 老房套餐未优惠总计
    const oldHouseBeforeDiscount = standardSubtotal + managementFee + taxFee;

    // 5. 联动B：设计费
    const designFeeOriginal = vars.designFeeRate * vars.buildingArea;
    const designFeeFinal = designFeeOriginal + vars.designDiscount;

    // 6. 个性化施工联动E
    const personalRawTotal = personalized.reduce((sum, item) => {
        return sum + (item.fixedTotal != null ? item.fixedTotal : item.price * item.qty);
    }, 0);
    const personalWithTax = Math.round(personalRawTotal * (1 + rates.management) * (1 + rates.tax) * 100) / 100;
    const personalDiscount = Math.round((personalWithTax - personalRawTotal) * 100) / 100;

    // 7. 联动F：终极总合计
    const total = oldHouseBeforeDiscount + vars.packageDiscount
        + designFeeFinal
        + personalRawTotal + vars.personalExtraDiscount
        + vars.acEquipment + vars.acDiscount;

    return {
        extraAreaFee,
        standardSubtotal,
        managementFee,
        taxFee,
        oldHouseBeforeDiscount,
        designFeeOriginal,
        designFeeFinal,
        personalRawTotal,
        personalWithTax,
        personalDiscount,
        total: Math.round(total * 100) / 100,
    };
}

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
