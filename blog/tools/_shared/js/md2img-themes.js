// ========== Markdown 转图片 · 主题与默认样例 ==========
const MD2IMG_WIDTHS = [
    { id: 390, label: '手机 390' },
    { id: 750, label: '朋友圈 750' },
    { id: 1080, label: '高清 1080' },
];

const MD2IMG_THEMES = [
    {
        id: 'life',
        name: '生活分享',
        desc: '温暖纸感，适合日常与家居',
        swatch: ['#F7F1E8', '#2C241B', '#C45C26'],
    },
    {
        id: 'work',
        name: '工作简报',
        desc: '干净利落，适合清单与纪要',
        swatch: ['#FFFFFF', '#1A1A1A', '#2563EB'],
    },
    {
        id: 'science',
        name: '科普说明',
        desc: '清爽层级，适合知识卡片',
        swatch: ['#F2F7F5', '#1C2B28', '#0D9488'],
    },
    {
        id: 'code',
        name: '深色代码',
        desc: '深底浅字，适合技术笔记',
        swatch: ['#0F1419', '#E7ECF1', '#5EEAD4'],
    },
];

const MD2IMG_DEFAULT_MD = `# 装修小贴士：一层采光与防潮

一层住得舒服，关键在于**提亮**和**控湿**。

## 色彩建议

| 区域 | 建议 | 避免 |
|------|------|------|
| 地面 | 暖色浅木 / 浅暖灰 | 大面积深色 |
| 墙面 | 暖白、奶油 | 冷白、深灰 |
| 家具 | 浅色为主 | 满屋深色 |

> 局部可用深色点缀，但不要压过主色。

## 代码示例（水电备注）

\`\`\`js
// 米家开关盒务必预留零线
const smartSwitch = { needNeutral: true, brand: '米家' };
\`\`\`

## 流程示意

\`\`\`mermaid
flowchart LR
  A[毛坯交付] --> B[防潮评估]
  B --> C[地暖+新风]
  C --> D[灯光提亮]
  D --> E[入住]
\`\`\`

祝早日住进舒服的小家 🏡
`;
