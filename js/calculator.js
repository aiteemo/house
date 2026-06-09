// ========== 价格计算器 ==========
class PriceCalculator {
    constructor(reqManager) {
        this.req = reqManager;
        this.tier = 'comfort';
        this.tierNames = { economy: '经济型', comfort: '舒适型', quality: '品质型' };
    }

    setTier(tier) {
        this.tier = tier;
        window._currentTier = tier;
    }

    getItemEffectivePrice(item, tier) {
        const solution = this.req.getSelectedSolution(item);
        if (solution) return solution.price;
        return getItemPrice(item, tier);
    }

    calculate() {
        let total = 0;
        const modules = [];
        this.req.modules.forEach(mod => {
            let modTotal = 0;
            const items = [];
            mod.items.forEach(item => {
                const price = this.getItemEffectivePrice(item, this.tier);
                if (item.status === 'checked' && price > 0) {
                    modTotal += price;
                    const solution = this.req.getSelectedSolution(item);
                    items.push({ name: item.name, price, id: item.id, solution });
                }
            });
            total += modTotal;
            modules.push({ name: mod.name, icon: mod.icon, total: modTotal, items });
        });
        return { total, modules };
    }

    calculateAllTiers() {
        const tiers = {};
        ['economy', 'comfort', 'quality'].forEach(tier => {
            let total = 0;
            this.req.modules.forEach(mod => {
                mod.items.forEach(item => {
                    if (item.status === 'checked') {
                        total += this.getItemEffectivePrice(item, tier);
                    }
                });
            });
            tiers[tier] = total;
        });
        return tiers;
    }

    render(container) {
        const data = this.calculate();
        container.innerHTML = '';

        data.modules.forEach(mod => {
            if (mod.items.length === 0) return;
            const groupDiv = document.createElement('div');
            groupDiv.style.cssText = 'margin-bottom: 16px;';

            const header = document.createElement('div');
            header.style.cssText = 'font-size: 14px; color: #8b8fa3; margin-bottom: 8px; font-weight: 600;';
            header.textContent = `${mod.icon} ${mod.name}`;
            groupDiv.appendChild(header);

            mod.items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'calc-item checked';
                const solTag = item.solution ? `<span class="calc-solution-tag">${item.solution.provider || item.solution.name}</span>` : '';
                div.innerHTML = `
                    <div class="calc-item-left">
                        <div class="calc-item-check"></div>
                        <span class="calc-item-name">${item.name}${solTag}</span>
                    </div>
                    <span class="calc-item-price">${formatPriceShort(item.price)}</span>
                `;
                groupDiv.appendChild(div);
            });

            const subtotal = document.createElement('div');
            subtotal.style.cssText = 'text-align: right; font-size: 13px; color: #6c8cff; margin-top: 6px; font-weight: 500;';
            subtotal.textContent = `小计: ${formatPriceShort(mod.total)}`;
            groupDiv.appendChild(subtotal);

            container.appendChild(groupDiv);
        });
    }

    renderTotalCard() {
        const data = this.calculate();
        const tiers = this.calculateAllTiers();

        document.getElementById('totalPrice').textContent = formatPrice(data.total);
        document.getElementById('totalTier').textContent = this.tierNames[this.tier];

        const summary = document.getElementById('priceSummary');
        summary.innerHTML = `
            <div style="margin-bottom:8px;font-weight:600;color:#e4e6f0;">三档对比：</div>
            <div>经济型：${formatPrice(tiers.economy)} ${this.tier === 'economy' ? ' ← 当前' : ''}</div>
            <div>舒适型：${formatPrice(tiers.comfort)} ${this.tier === 'comfort' ? ' ← 当前' : ''}</div>
            <div>品质型：${formatPrice(tiers.quality)} ${this.tier === 'quality' ? ' ← 当前' : ''}</div>
            <div style="margin-top:8px;color:#8b8fa3;">面积：${ROOM_DATA.totalArea}㎡ · 均价：¥${Math.round(data.total / ROOM_DATA.totalArea)}/㎡</div>
        `;
    }

    renderChart() {
        const canvas = document.getElementById('priceChart');
        const ctx = canvas.getContext('2d');
        const data = this.calculate();
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 30;

        ctx.clearRect(0, 0, w, h);

        if (data.total === 0) {
            ctx.fillStyle = '#8b8fa3';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无已确认需求', cx, cy);
            return;
        }

        const colors = [
            '#6c8cff', '#4ade80', '#fb923c', '#f87171',
            '#a78bfa', '#22d3ee', '#fbbf24', '#f472b6',
            '#34d399', '#818cf8',
        ];

        let startAngle = -Math.PI / 2;
        const activeModules = data.modules.filter(m => m.total > 0);

        activeModules.forEach((mod, i) => {
            const sliceAngle = (mod.total / data.total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();

            // 标签
            if (sliceAngle > 0.15) {
                const midAngle = startAngle + sliceAngle / 2;
                const labelR = r * 0.65;
                const lx = cx + Math.cos(midAngle) * labelR;
                const ly = cy + Math.sin(midAngle) * labelR;
                ctx.fillStyle = '#fff';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const pct = Math.round(mod.total / data.total * 100);
                ctx.fillText(`${mod.name}`, lx, ly - 7);
                ctx.fillText(`${pct}%`, lx, ly + 7);
            }

            startAngle = endAngle;
        });

        // 中心圆（甜甜圈效果）
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1d27';
        ctx.fill();
        ctx.fillStyle = '#6c8cff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatPrice(data.total), cx, cy);
    }

    renderAll() {
        this.render(document.getElementById('calcItems'));
        this.renderTotalCard();
        this.renderChart();
    }
}
