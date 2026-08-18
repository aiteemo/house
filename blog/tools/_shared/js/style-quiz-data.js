// ========== 装修风格助手 - 问题与计分数据 ==========

const STYLE_LIST = {
    modern_minimalist: { name: '现代简约', color: '#6c8cff' },
    minimalist: { name: '极简', color: '#a3a3a3' },
    japanese: { name: '日式', color: '#c4a882' },
    american: { name: '美式', color: '#8b6f47' },
    cream: { name: '奶油风', color: '#f5e6d3' },
    mid_century: { name: '中古风', color: '#b8860b' },
    wabi_sabi: { name: '侘寂', color: '#9e9e9e' },
    wood: { name: '原木风', color: '#a0845c' },
    italian: { name: '意式', color: '#2c2c2c' },
    bauhaus: { name: '包豪斯', color: '#e74c3c' },
    european: { name: '欧式', color: '#daa520' },
    french_light: { name: '轻法式', color: '#d4a5a5' },
    mediterranean: { name: '地中海', color: '#1e90ff' },
    song_dynasty: { name: '宋式', color: '#8fbc8f' },
    chinese: { name: '中式', color: '#8b0000' },
    countryside: { name: '乡村田园', color: '#6b8e23' },
    industrial: { name: '工业风', color: '#696969' },
    southeast_asian: { name: '南洋复古', color: '#2e8b57' },
    light_luxury: { name: '轻奢', color: '#daa520' },
    post_modern: { name: '后现代', color: '#9370db' },
    baroque: { name: '巴洛克', color: '#8b4513' },
    bohemian: { name: '波西米亚', color: '#ff6347' },
    dopamine: { name: '多巴胺', color: '#ff69b4' },
    old_money: { name: '老钱风', color: '#556b2f' }
};

const STYLE_QUIZ_QUESTIONS = [
    {
        id: 'q1',
        title: '谁住在这里？',
        subtitle: '家庭成员构成决定了设计重点',
        options: [
            {
                id: 'q1_a',
                text: '只有我和伴侣，享受二人世界',
                bonus: { modern_minimalist: 3, cream: 4, light_luxury: 3, french_light: 3, mid_century: 2 },
                penalty: { countryside: -2, baroque: -2 },
                blacklist: []
            },
            {
                id: 'q1_b',
                text: '有小孩，需要安全耐造的空间',
                bonus: { modern_minimalist: 2, wood: 4, japanese: 3, cream: 2 },
                penalty: { baroque: -3, light_luxury: -2, european: -2 },
                blacklist: [
                    { style: 'baroque', reason: '巴洛克风格多尖角雕花和水晶灯，有小孩的家庭存在安全隐患' }
                ]
            },
            {
                id: 'q1_c',
                text: '有老人同住，注重实用与安全',
                bonus: { chinese: 3, song_dynasty: 4, wood: 3, modern_minimalist: 2 },
                penalty: { industrial: -3, post_modern: -2 },
                blacklist: [
                    { style: 'industrial', reason: '工业风裸露管道和粗犷材质不适合老人居家安全' }
                ]
            },
            {
                id: 'q1_d',
                text: '一个人住，完全按自己喜好来',
                bonus: { minimalist: 4, industrial: 3, wabi_sabi: 3, post_modern: 3, dopamine: 2 },
                penalty: { chinese: -2, european: -2 },
                blacklist: []
            }
        ]
    },
    {
        id: 'q2',
        title: '你家多大面积？',
        subtitle: '空间大小直接影响风格选择',
        options: [
            {
                id: 'q2_a',
                text: '60㎡以下，小户型',
                bonus: { modern_minimalist: 4, cream: 3, japanese: 3, minimalist: 3 },
                penalty: { european: -3, baroque: -4, chinese: -2, american: -3 },
                blacklist: [
                    { style: 'baroque', reason: '巴洛克风格需要大面积空间来展现华丽细节，小户型会显得压迫拥挤' },
                    { style: 'european', reason: '欧式风格厚重家具和繁复造型在小户型中会严重压缩活动空间' }
                ]
            },
            {
                id: 'q2_b',
                text: '60-90㎡，紧凑两居',
                bonus: { modern_minimalist: 3, cream: 3, wood: 3, japanese: 2, light_luxury: 2 },
                penalty: { baroque: -3, american: -1 },
                blacklist: []
            },
            {
                id: 'q2_c',
                text: '90-120㎡，标准三居',
                bonus: { modern_minimalist: 2, light_luxury: 3, french_light: 3, mid_century: 2, chinese: 2 },
                penalty: {},
                blacklist: []
            },
            {
                id: 'q2_d',
                text: '120㎡以上，大户型',
                bonus: { chinese: 4, american: 4, european: 3, light_luxury: 3, baroque: 2, italian: 3 },
                penalty: { minimalist: -1 },
                blacklist: []
            }
        ]
    },
    {
        id: 'q3',
        title: '你家采光怎么样？',
        subtitle: '光线条件决定色调深浅',
        options: [
            {
                id: 'q3_a',
                text: '采光很好，阳光充足',
                bonus: { cream: 3, wood: 3, japanese: 2, countryside: 3, bohemian: 2 },
                penalty: {},
                blacklist: []
            },
            {
                id: 'q3_b',
                text: '采光一般，中规中矩',
                bonus: { modern_minimalist: 3, mid_century: 2, french_light: 2 },
                penalty: {},
                blacklist: []
            },
            {
                id: 'q3_c',
                text: '采光较差，偏暗',
                bonus: { modern_minimalist: 4, cream: 4, minimalist: 3 },
                penalty: { industrial: -3, chinese: -2, baroque: -2, american: -2 },
                blacklist: [
                    { style: 'industrial', reason: '工业风以深色调为主，采光差的空间使用会更加阴暗压抑' }
                ]
            }
        ]
    },
    {
        id: 'q4',
        title: '你喜欢什么色调？',
        subtitle: '色彩偏好是最直观的风格信号',
        options: [
            {
                id: 'q4_a',
                text: '浅色明亮，白色米色为主',
                bonus: { cream: 4, modern_minimalist: 3, japanese: 3, minimalist: 3, french_light: 2 },
                penalty: { industrial: -2, chinese: -2 },
                blacklist: []
            },
            {
                id: 'q4_b',
                text: '温暖木色，自然质感',
                bonus: { wood: 5, japanese: 4, countryside: 3, mid_century: 2 },
                penalty: { minimalist: -1, baroque: -1 },
                blacklist: []
            },
            {
                id: 'q4_c',
                text: '深沉稳重，灰色深棕',
                bonus: { chinese: 3, american: 3, italian: 4, old_money: 4, industrial: 2 },
                penalty: { cream: -3, dopamine: -3 },
                blacklist: []
            },
            {
                id: 'q4_d',
                text: '大胆撞色，个性化配色',
                bonus: { post_modern: 4, dopamine: 5, bohemian: 4, bauhaus: 3 },
                penalty: { japanese: -2, minimalist: -2, cream: -2 },
                blacklist: []
            }
        ]
    },
    {
        id: 'q5',
        title: '你喜欢什么材质？',
        subtitle: '材质质感决定了空间的温度',
        options: [
            {
                id: 'q5_a',
                text: '原木、棉麻等天然材质',
                bonus: { wood: 5, japanese: 4, countryside: 3, wabi_sabi: 3, song_dynasty: 2 },
                penalty: { light_luxury: -1, baroque: -1 },
                blacklist: []
            },
            {
                id: 'q5_b',
                text: '大理石、金属、玻璃',
                bonus: { light_luxury: 4, italian: 4, bauhaus: 3, modern_minimalist: 2 },
                penalty: { countryside: -3, wabi_sabi: -2 },
                blacklist: []
            },
            {
                id: 'q5_c',
                text: '丝绒、皮革等高级面料',
                bonus: { light_luxury: 4, american: 3, baroque: 3, european: 3, old_money: 3 },
                penalty: { minimalist: -2, japanese: -1 },
                blacklist: []
            },
            {
                id: 'q5_d',
                text: '混搭材质，不拘一格',
                bonus: { bohemian: 4, post_modern: 3, southeast_asian: 3, mid_century: 2 },
                penalty: { minimalist: -2 },
                blacklist: []
            }
        ]
    },
    {
        id: 'q6',
        title: '你的装修预算？',
        subtitle: '不同风格的造价差异很大',
        options: [
            {
                id: 'q6_a',
                text: '有限预算，追求性价比',
                bonus: { modern_minimalist: 4, cream: 3, japanese: 2, countryside: 2 },
                penalty: { baroque: -4, european: -3, light_luxury: -2, italian: -2 },
                blacklist: [
                    { style: 'baroque', reason: '巴洛克风格需要大量雕花、镀金、水晶灯等昂贵工艺，预算有限难以实现' },
                    { style: 'european', reason: '欧式风格对木工和细节要求极高，材料和人工成本都较贵' }
                ]
            },
            {
                id: 'q6_b',
                text: '中等预算，适度投入',
                bonus: { modern_minimalist: 3, wood: 3, mid_century: 2, french_light: 2, chinese: 2 },
                penalty: {},
                blacklist: []
            },
            {
                id: 'q6_c',
                text: '充足预算，追求品质',
                bonus: { light_luxury: 3, italian: 3, baroque: 2, european: 2, old_money: 3 },
                penalty: {},
                blacklist: []
            },
            {
                id: 'q6_d',
                text: '预算不是问题，要做就做最好',
                bonus: { baroque: 3, european: 3, light_luxury: 2, italian: 3, chinese: 3 },
                penalty: {},
                blacklist: []
            }
        ]
    },
    {
        id: 'q7',
        title: '你的生活方式？',
        subtitle: '装修的本质是生活方式的外在表达',
        options: [
            {
                id: 'q7_a',
                text: '喜欢做饭，厨房是核心',
                bonus: { japanese: 3, wood: 2, modern_minimalist: 2 },
                penalty: { baroque: -1 },
                blacklist: []
            },
            {
                id: 'q7_b',
                text: '经常在家办公，需要安静空间',
                bonus: { modern_minimalist: 4, minimalist: 3, japanese: 2 },
                penalty: { bohemian: -2, dopamine: -2 },
                blacklist: []
            },
            {
                id: 'q7_c',
                text: '喜欢社交聚会，客厅要大气',
                bonus: { american: 3, light_luxury: 3, baroque: 2, european: 2 },
                penalty: { minimalist: -2, wabi_sabi: -1 },
                blacklist: []
            },
            {
                id: 'q7_d',
                text: '喜欢安静阅读，享受独处',
                bonus: { wabi_sabi: 4, song_dynasty: 4, japanese: 3, wood: 2 },
                penalty: { post_modern: -1, dopamine: -2 },
                blacklist: []
            },
            {
                id: 'q7_e',
                text: '喜欢看电影/游戏，要有影音角',
                bonus: { industrial: 3, modern_minimalist: 2, post_modern: 2 },
                penalty: { countryside: -1 },
                blacklist: []
            }
        ]
    },
    {
        id: 'q8',
        title: '你追求什么样的氛围？',
        subtitle: '最终想让家给你什么感觉',
        options: [
            {
                id: 'q8_a',
                text: '温馨治愈，回家就想躺平',
                bonus: { cream: 5, wood: 3, japanese: 3, countryside: 2 },
                penalty: { industrial: -2, baroque: -1 },
                blacklist: []
            },
            {
                id: 'q8_b',
                text: '高级精致，低调有品味',
                bonus: { light_luxury: 4, italian: 4, old_money: 4, french_light: 2 },
                penalty: { countryside: -2, dopamine: -2 },
                blacklist: []
            },
            {
                id: 'q8_c',
                text: '沉稳大气，有文化底蕴',
                bonus: { chinese: 5, song_dynasty: 4, japanese: 2, old_money: 2 },
                penalty: { dopamine: -3, post_modern: -1 },
                blacklist: []
            },
            {
                id: 'q8_d',
                text: '个性前卫，与众不同',
                bonus: { post_modern: 5, bauhaus: 3, dopamine: 3, bohemian: 3, industrial: 2 },
                penalty: { chinese: -2, countryside: -2 },
                blacklist: []
            },
            {
                id: 'q8_e',
                text: '自然放松，像度假一样',
                bonus: { wabi_sabi: 4, countryside: 3, southeast_asian: 4, mediterranean: 3 },
                penalty: { baroque: -1, light_luxury: -1 },
                blacklist: []
            }
        ]
    }
];
