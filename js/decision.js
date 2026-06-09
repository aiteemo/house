// ========== 全包/半包决策分析 ==========
class DecisionAnalyzer {
    constructor(reqManager) {
        this.req = reqManager;
    }

    analyze() {
        const checkedItems = this.req.getAllCheckedItems();
        const tier = window._currentTier || 'comfort';

        // 计算总价（使用选中方案的价格）
        let totalPrice = 0;
        checkedItems.forEach(item => {
            const solution = this.req.getSelectedSolution(this.req.findItem(item.id));
            totalPrice += solution ? solution.price : getItemPrice(item, tier);
        });

        // 全包：所有项目都包含，价格上浮10-15%
        const fullPackagePrice = Math.round(totalPrice * 1.12);

        // 半包：基础工程部分（约占总价35%），主材自购
        const halfLaborCost = Math.round(totalPrice * 0.35);
        const halfMaterialCost = Math.round(totalPrice * 0.65);
        // 自购主材通常能省5-10%
        const halfSelfBuyCost = Math.round(halfMaterialCost * 0.92);
        const halfTotalPrice = halfLaborCost + halfSelfBuyCost;

        // 分类
        const laborItems = [];
        const materialItems = [];
        checkedItems.forEach(item => {
            const module = item.module;
            if (['基础工程'].includes(module)) {
                laborItems.push(item);
            } else {
                materialItems.push(item);
            }
        });

        return {
            totalPrice,
            fullPackagePrice,
            halfLaborCost,
            halfSelfBuyCost,
            halfTotalPrice,
            savings: fullPackagePrice - halfTotalPrice,
            laborItems,
            materialItems,
            itemCount: checkedItems.length,
        };
    }

    render(container) {
        const data = this.analyze();
        const tier = window._currentTier || 'comfort';
        const tierName = { economy: '经济型', comfort: '舒适型', quality: '品质型' }[tier];

        container.innerHTML = `
            <div class="decision-card ${data.savings > 0 ? '' : 'recommended'}">
                <h3>全包方案</h3>
                <span class="card-tag">省心之选</span>
                <div class="card-price">${formatPrice(data.fullPackagePrice)}</div>
                <ul>
                    <li>装修公司负责所有材料采购和施工</li>
                    <li>包含全部 ${data.itemCount} 项已确认需求</li>
                    <li>含管理费和利润（约12%）</li>
                    <li>适合：没时间、怕麻烦、首次装修</li>
                </ul>
                <div style="font-size:13px;color:#8b8fa3;line-height:1.6;">
                    包含：基础工程 + 主材 + 辅材 + 施工 + 管理<br>
                    优点：省心省力，售后统一<br>
                    缺点：材料选择受限，个性化低
                </div>
            </div>
            <div class="decision-card ${data.savings > 0 ? 'recommended' : ''}">
                <h3>半包方案</h3>
                <span class="card-tag">性价比之选</span>
                <div class="card-price">${formatPrice(data.halfTotalPrice)}</div>
                <ul>
                    <li>装修公司负责施工和辅材</li>
                    <li>主材自行采购，品质可控</li>
                    <li>预计可节省 ${formatPrice(data.savings)}</li>
                    <li>适合：有时间、想把控品质、有经验</li>
                </ul>
                <div style="font-size:13px;color:#8b8fa3;line-height:1.6;">
                    公司包：${formatPrice(data.halfLaborCost)}（施工+辅材）<br>
                    自购：${formatPrice(data.halfSelfBuyCost)}（主材）<br>
                    优点：品质可控，个性化高<br>
                    缺点：需花时间逛建材市场
                </div>
            </div>
        `;
    }

    renderRecommendation(container) {
        const data = this.analyze();
        const checkedItems = this.req.getAllCheckedItems();

        // 分析复杂度
        const hasHVAC = checkedItems.some(i => i.module === '暖通系统');
        const hasCustomCabinet = checkedItems.some(i => i.name.includes('定制') || i.name.includes('橱柜'));
        const itemCount = checkedItems.length;

        let recommendation, reasons;

        if (hasHVAC && hasCustomCabinet && itemCount > 20) {
            recommendation = '推荐：半包';
            reasons = [
                '您的需求包含暖通系统（地暖/新风/中央空调）和定制柜体，这些专业项目建议分别找专业供应商。',
                '半包可以让您针对每个品类找最专业的商家，例如暖通找暖通公司、橱柜找橱柜品牌。',
                '定制类产品自己选材可以更好地把控品质和风格。',
                `预计可节省 ${formatPrice(data.savings)}，且品质更有保障。`,
            ];
        } else if (itemCount < 15) {
            recommendation = '推荐：全包';
            reasons = [
                '您的需求相对简单，全包可以省去很多麻烦。',
                '项目少的情况下，全包和半包的差价不大。',
                '统一管理更省心，售后也有保障。',
            ];
        } else {
            recommendation = '推荐：半包';
            reasons = [
                '您的需求较为丰富，涉及多个品类，半包更灵活。',
                '可以针对不同品类选择性价比最高的方案。',
                `预计可节省 ${formatPrice(data.savings)}。`,
                '建议找2-3家装修公司分别报价对比。',
            ];
        }

        container.innerHTML = `
            <h3>${recommendation}</h3>
            ${reasons.map(r => `<p style="margin-bottom:8px;">• ${r}</p>`).join('')}
            <div style="margin-top:16px;padding:16px;background:rgba(108,140,255,0.1);border-radius:8px;">
                <div style="font-weight:600;margin-bottom:8px;color:#e4e6f0;">💡 装修小白建议：</div>
                <p>1. 无论选哪种方式，都要签好合同，明确材料品牌和型号</p>
                <p>2. 建议先逛建材市场了解行情，心里有数再谈价格</p>
                <p>3. 水电、防水等隐蔽工程不能省，一定要用好材料</p>
                <p>4. 暖通系统（地暖/新风）建议找专业暖通公司</p>
                <p>5. 1楼注意防潮，建议做好防水和除湿方案</p>
            </div>
        `;
    }

    renderAll() {
        this.render(document.getElementById('decisionComparison'));
        this.renderRecommendation(document.getElementById('decisionRecommendation'));
    }
}
