// ========== 价格计算器 ==========
class PriceCalculator {
    constructor(reqManager) {
        this.req = reqManager;
        this.activeTab = 'estimate'; // 'estimate' | 'boloni'
        this._loadBoloniVars();
    }

    _saveBoloniVars() {
        const data = {
            vars: { ...BOLONI_QUOTE.vars },
            personalized: BOLONI_QUOTE.personalized.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
        };
        localStorage.setItem('boloni_vars', JSON.stringify(data));
    }

    _loadBoloniVars() {
        try {
            const saved = JSON.parse(localStorage.getItem('boloni_vars'));
            if (!saved) return;
            if (saved.vars) {
                Object.assign(BOLONI_QUOTE.vars, saved.vars);
                // 校验空调设备价格范围
                if (BOLONI_QUOTE.vars.acEquipment < 10000 || BOLONI_QUOTE.vars.acEquipment > 25000) {
                    BOLONI_QUOTE.vars.acEquipment = 15000;
                }
            }
            if (saved.personalized) {
                saved.personalized.forEach(sv => {
                    const item = BOLONI_QUOTE.personalized.find(i => i.name === sv.name);
                    if (item && item.fixedTotal == null) {
                        item.price = sv.price;
                        item.qty = sv.qty;
                    }
                });
            }
        } catch (e) {}
    }

    getItemEffectivePrice(item) {
        const solution = this.req.getSelectedSolution(item);
        if (solution) return solution.price;
        return getItemPrice(item, 'comfort');
    }

    calculate() {
        let total = 0;
        const modules = [];
        this.req.modules.forEach(mod => {
            let modTotal = 0;
            const items = [];
            mod.items.forEach(item => {
                const price = this.getItemEffectivePrice(item);
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

    // ========== 需求估价渲染 ==========
    renderEstimate(container) {
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

    renderEstimateSummary() {
        const data = this.calculate();
        document.getElementById('totalPrice').textContent = formatPrice(data.total);
        document.getElementById('totalTier').textContent = '舒适型';

        const summary = document.getElementById('priceSummary');
        summary.innerHTML = `
            <div style="margin-bottom:8px;font-weight:600;color:#e4e6f0;">需求估价汇总</div>
            <div>舒适型总价：${formatPrice(data.total)}</div>
            <div style="margin-top:8px;color:#8b8fa3;">面积：${ROOM_DATA.totalArea}㎡ · 均价：¥${Math.round(data.total / ROOM_DATA.totalArea)}/㎡</div>
        `;
    }

    renderEstimateChart() {
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

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();

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

    // ========== 博洛尼报价渲染（联动计算） ==========
    _boloniCalc() {
        return calcBolonQuote(BOLONI_QUOTE.vars, BOLONI_QUOTE.rates, BOLONI_QUOTE.personalized);
    }

    renderBolonQuote(container) {
        container.innerHTML = '';
        const q = BOLONI_QUOTE;
        const r = this._boloniCalc();

        // === 费用汇总（可编辑优惠/减免） ===
        this._renderSummaryTable(container, r);

        // === 标准包明细 ===
        this._renderStandardPackage(container, r);

        // === 个性化施工（可编辑单价+数量） ===
        this._renderPersonalized(container);

        // === 老房翻新模板 ===
        this._renderOldHouseTemplate(container);

        // === 赠送权益 ===
        this._renderGifts(container, q.gifts);

        // === 主辅材品牌 ===
        this._renderMaterials(container, q.materials);
    }

    _renderSummaryTable(container, r) {
        const v = BOLONI_QUOTE.vars;
        const section = this._section('费用汇总与折扣');
        const rows = [
            { name: '全案标准包小计', original: r.standardSubtotal, discount: 0, final: r.standardSubtotal, note: '基础包 + 面积补差' },
            { name: '装饰管理费 (15%)', original: r.managementFee, discount: 0, final: r.managementFee, note: '全案小计 × 15%' },
            { name: '工程税金 (3.41%)', original: r.taxFee, discount: 0, final: r.taxFee, note: '全案小计 × 3.41%' },
            { name: '全案套餐专属优惠', original: 0, discount: v.packageDiscount, final: v.packageDiscount, note: '套餐直降减免', editKey: 'packageDiscount' },
            { name: '设计师费', original: r.designFeeOriginal, discount: v.designDiscount, final: r.designFeeFinal, note: `${v.designFeeRate}元/㎡×${v.buildingArea}㎡`, editKey: 'designDiscount' },
            { name: '个性化施工小计', original: r.personalWithTax, discount: -(r.personalDiscount - v.personalExtraDiscount), final: r.personalRawTotal + v.personalExtraDiscount, note: '含管理费+税金后减免', editKey: 'personalExtraDiscount' },
            { name: '中央空调设备', original: v.acEquipment, discount: v.acDiscount, final: v.acEquipment + v.acDiscount, note: '预估（可选15000-18000）', editKey: 'acDiscount' },
        ];

        const table = this._table(['费用大项','原始金额','优惠/减免','最终金额','说明'], ['28%','15%','16%','15%','26%']);
        rows.forEach(row => {
            const tr = document.createElement('div');
            tr.className = 'quote-row';
            // 费用大项
            tr.appendChild(this._td(row.name, '28%'));
            // 原始金额
            tr.appendChild(this._tdPrice(row.original, '15%'));
            // 优惠/减免（可编辑）
            const tdDiscount = document.createElement('div');
            tdDiscount.className = 'quote-td';
            tdDiscount.style.width = '16%';
            if (row.editKey) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'quote-edit-input';
                input.value = row.discount;
                input.addEventListener('change', () => {
                    BOLONI_QUOTE.vars[row.editKey] = parseFloat(input.value) || 0;
                    this._saveBoloniVars();
                    this.renderAll();
                });
                tdDiscount.appendChild(input);
            } else {
                tdDiscount.textContent = row.discount === 0 ? '—' : formatPriceShort(row.discount);
                tdDiscount.classList.add('quote-price');
            }
            tr.appendChild(tdDiscount);
            // 最终金额
            tr.appendChild(this._tdPrice(row.final, '15%'));
            // 说明
            tr.appendChild(this._td(row.note, '26%'));
            table.appendChild(tr);
        });

        // 总合计行
        const totalRow = document.createElement('div');
        totalRow.className = 'quote-row quote-row-highlight';
        totalRow.appendChild(this._td('最终总合计', '28%'));
        const origTotal = rows.reduce((s, row) => s + row.original, 0);
        const discTotal = rows.reduce((s, row) => s + row.discount, 0);
        totalRow.appendChild(this._tdPrice(origTotal, '15%'));
        totalRow.appendChild(this._tdPrice(discTotal, '16%'));
        totalRow.appendChild(this._tdPrice(r.total, '15%'));
        totalRow.appendChild(this._td('到手总价', '26%'));
        table.appendChild(totalRow);

        section.appendChild(table);
        container.appendChild(section);
    }

    _renderStandardPackage(container, r) {
        const v = BOLONI_QUOTE.vars;
        const section = this._section('Yan high 全案标准包');
        const items = [
            { name: 'Yan high系列', price: v.basePackagePrice, unit: '项', qty: 1, total: v.basePackagePrice, note: '基础标配包' },
            { name: 'Yan high系列 (面积差额)', price: v.extraAreaPrice, unit: '平米', qty: v.extraArea, total: r.extraAreaFee, note: `${v.extraAreaPrice}元/㎡ × ${v.extraArea}㎡` },
        ];

        const table = this._table(['项目名称','单价','单位','数量','金额','说明'], ['28%','12%','8%','10%','15%','27%']);
        items.forEach(item => {
            const tr = document.createElement('div');
            tr.className = 'quote-row';
            tr.appendChild(this._td(item.name, '28%'));
            tr.appendChild(this._tdPrice(item.price, '12%'));
            tr.appendChild(this._td(item.unit, '8%'));
            tr.appendChild(this._td(String(item.qty), '10%'));
            tr.appendChild(this._tdPrice(item.total, '15%'));
            tr.appendChild(this._td(item.note, '27%'));
            table.appendChild(tr);
        });
        // 小计
        const subRow = document.createElement('div');
        subRow.className = 'quote-row quote-row-highlight';
        subRow.appendChild(this._td('小计', '28%'));
        subRow.appendChild(this._td('', '12%'));
        subRow.appendChild(this._td('', '8%'));
        subRow.appendChild(this._td('', '10%'));
        subRow.appendChild(this._tdPrice(r.standardSubtotal, '15%'));
        subRow.appendChild(this._td('', '27%'));
        table.appendChild(subRow);

        section.appendChild(table);
        container.appendChild(section);
    }

    _renderPersonalized(container) {
        const items = BOLONI_QUOTE.personalized;
        const section = this._section('个性化施工项目（单价/数量可调）');
        const table = this._table(['项目名称','单价','单位','数量','金额','说明'], ['24%','13%','8%','12%','15%','28%']);

        items.forEach(item => {
            const tr = document.createElement('div');
            tr.className = 'quote-row';
            tr.appendChild(this._td(item.name, '24%'));

            // 单价（可编辑，fixedTotal 项不可编辑）
            const tdPrice = document.createElement('div');
            tdPrice.className = 'quote-td';
            tdPrice.style.width = '13%';
            if (item.fixedTotal == null) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'quote-edit-input';
                input.value = item.price;
                input.addEventListener('change', () => {
                    item.price = parseFloat(input.value) || 0;
                    this._saveBoloniVars();
                    this.renderAll();
                });
                tdPrice.appendChild(input);
            } else {
                tdPrice.textContent = '—';
            }
            tr.appendChild(tdPrice);

            tr.appendChild(this._td(item.unit, '8%'));

            // 数量（可编辑）
            const tdQty = document.createElement('div');
            tdQty.className = 'quote-td';
            tdQty.style.width = '12%';
            if (item.fixedTotal == null) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'quote-edit-input';
                input.step = '0.01';
                input.value = item.qty;
                input.addEventListener('change', () => {
                    item.qty = parseFloat(input.value) || 0;
                    this._saveBoloniVars();
                    this.renderAll();
                });
                tdQty.appendChild(input);
            } else {
                tdQty.textContent = item.qty || '—';
            }
            tr.appendChild(tdQty);

            // 金额
            const total = item.fixedTotal != null ? item.fixedTotal : item.price * item.qty;
            tr.appendChild(this._tdPrice(Math.round(total * 100) / 100, '15%'));
            tr.appendChild(this._td(item.note, '28%'));
            table.appendChild(tr);
        });

        // 小计
        const r = this._boloniCalc();
        const subRow = document.createElement('div');
        subRow.className = 'quote-row quote-row-highlight';
        subRow.appendChild(this._td('纯工程量小计', '24%'));
        subRow.appendChild(this._td('', '13%'));
        subRow.appendChild(this._td('', '8%'));
        subRow.appendChild(this._td('', '12%'));
        subRow.appendChild(this._tdPrice(r.personalRawTotal, '15%'));
        subRow.appendChild(this._td(`含税费后: ${formatPriceShort(r.personalWithTax)}，减免: ${formatPriceShort(r.personalDiscount)}`, '28%'));
        table.appendChild(subRow);

        section.appendChild(table);
        container.appendChild(section);
    }

    _renderOldHouseTemplate(container) {
        const section = this._section('老房翻新底价模板（已含在全案包内）');
        const items = BOLONI_QUOTE.oldHouseTemplate;
        const table = this._table(['项目名称','标准单价','单位','数量/配置','预算金额','说明'], ['24%','12%','8%','18%','12%','26%']);
        items.forEach(item => {
            const tr = document.createElement('div');
            tr.className = 'quote-row';
            tr.appendChild(this._td(item.name, '24%'));
            tr.appendChild(this._tdPrice(item.price, '12%'));
            tr.appendChild(this._td(item.unit, '8%'));
            tr.appendChild(this._td(String(item.qty), '18%'));
            tr.appendChild(this._td('0.00', '12%'));
            tr.appendChild(this._td(item.note, '26%'));
            table.appendChild(tr);
        });
        section.appendChild(table);
        container.appendChild(section);
    }

    _renderGifts(container, gifts) {
        const section = this._section('官方赠送与升级权益');
        const list = document.createElement('div');
        list.className = 'quote-gifts-list';
        gifts.forEach((gift, idx) => {
            const item = document.createElement('div');
            item.className = 'quote-gift-item';
            item.innerHTML = `
                <span class="quote-gift-num">${idx + 1}</span>
                <div class="quote-gift-content">
                    <div class="quote-gift-name">${gift.name}</div>
                    <div class="quote-gift-desc">${gift.desc}</div>
                </div>
            `;
            list.appendChild(item);
        });
        section.appendChild(list);
        container.appendChild(section);
    }

    _renderMaterials(container, materials) {
        const section = this._section('主辅材品牌规范');
        materials.forEach(mat => {
            const block = document.createElement('div');
            block.className = 'quote-material-block';
            block.innerHTML = `
                <div class="quote-material-area">${mat.area}</div>
                <div class="quote-material-items">${mat.items.replace(/\n/g, '<br>')}</div>
            `;
            section.appendChild(block);
        });
        container.appendChild(section);
    }

    // ========== DOM 工具方法 ==========
    _section(title) {
        const s = document.createElement('div');
        s.className = 'quote-section';
        const h = document.createElement('h4');
        h.className = 'quote-section-title';
        h.textContent = title;
        s.appendChild(h);
        return s;
    }
    _table(headers, widths) {
        const t = document.createElement('div');
        t.className = 'quote-table';
        const thead = document.createElement('div');
        thead.className = 'quote-thead';
        headers.forEach((h, i) => {
            const th = document.createElement('div');
            th.className = 'quote-th';
            th.style.width = widths[i];
            th.textContent = h;
            thead.appendChild(th);
        });
        t.appendChild(thead);
        return t;
    }
    _td(text, width) {
        const d = document.createElement('div');
        d.className = 'quote-td';
        d.style.width = width;
        d.textContent = text ?? '—';
        return d;
    }
    _tdPrice(val, width) {
        const d = document.createElement('div');
        d.className = 'quote-td quote-price';
        d.style.width = width;
        d.textContent = val === 0 ? '—' : formatPriceShort(val);
        return d;
    }

    // ========== 右侧面板 ==========
    renderBolonSummary() {
        const r = this._boloniCalc();
        const v = BOLONI_QUOTE.vars;
        document.getElementById('totalPrice').textContent = formatPrice(r.total);
        document.getElementById('totalTier').textContent = '博洛尼报价';

        const summary = document.getElementById('priceSummary');
        summary.innerHTML = `
            <div style="margin-bottom:8px;font-weight:600;color:#e4e6f0;">博洛尼 Yan π high 套餐</div>
            <div>最终到手价：${formatPrice(r.total)}</div>
            <div style="margin-top:12px;font-weight:600;color:#e4e6f0;">联动公式：</div>
            <div style="color:#8b8fa3;font-size:12px;line-height:1.8;">
                标准包 = ${formatPriceShort(v.basePackagePrice)} + ${v.extraAreaPrice}×${v.extraArea} = ${formatPriceShort(r.standardSubtotal)}<br>
                管理费 = ${formatPriceShort(r.standardSubtotal)} × 15% = ${formatPriceShort(r.managementFee)}<br>
                税金 = ${formatPriceShort(r.standardSubtotal)} × 3.41% = ${formatPriceShort(r.taxFee)}<br>
                设计费 = ${v.designFeeRate}×${v.buildingArea} + (${formatPriceShort(v.designDiscount)}) = ${formatPriceShort(r.designFeeFinal)}<br>
                个性化 = ${formatPriceShort(r.personalRawTotal)}（含税${formatPriceShort(r.personalWithTax)}，减免${formatPriceShort(r.personalDiscount)}${v.personalExtraDiscount ? '，额外减免' + formatPriceShort(v.personalExtraDiscount) : ''}）<br>
                空调 = ${formatPriceShort(v.acEquipment)}${v.acDiscount ? ' + (' + formatPriceShort(v.acDiscount) + ')' : ''} = ${formatPriceShort(v.acEquipment + v.acDiscount)}
            </div>
            <div style="margin-top:12px;font-weight:600;color:#e4e6f0;">付款节点：</div>
            ${BOLONI_QUOTE.paymentRatio.map(p => `<div>${p.stage}：${Math.round(p.ratio * 100)}% · ${formatPriceShort(Math.round(r.total * p.ratio))}</div>`).join('')}
            <div style="margin-top:12px;color:#8b8fa3;">面积：88㎡ · 均价：¥${Math.round(r.total / 88)}/㎡</div>
        `;
    }

    renderBolonChart() {
        const canvas = document.getElementById('priceChart');
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 30;
        const calc = this._boloniCalc();

        ctx.clearRect(0, 0, w, h);

        const v = BOLONI_QUOTE.vars;
        const slices = [
            { name: '标准包', value: calc.standardSubtotal, color: '#6c8cff' },
            { name: '管理费+税金', value: calc.managementFee + calc.taxFee, color: '#fb923c' },
            { name: '个性化施工', value: calc.personalRawTotal, color: '#4ade80' },
            { name: '设计师费', value: calc.designFeeFinal, color: '#a78bfa' },
            { name: '空调设备', value: v.acEquipment, color: '#22d3ee' },
            { name: '套餐优惠', value: Math.abs(v.packageDiscount), color: '#f87171' },
        ];

        const total = slices.reduce((s, sl) => s + Math.abs(sl.value), 0);
        let startAngle = -Math.PI / 2;

        slices.forEach(slice => {
            const sliceAngle = (Math.abs(slice.value) / total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = slice.color;
            ctx.fill();

            if (sliceAngle > 0.15) {
                const midAngle = startAngle + sliceAngle / 2;
                const labelR = r * 0.65;
                const lx = cx + Math.cos(midAngle) * labelR;
                const ly = cy + Math.sin(midAngle) * labelR;
                ctx.fillStyle = '#fff';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(slice.name, lx, ly - 7);
                ctx.fillText(Math.round(Math.abs(slice.value) / total * 100) + '%', lx, ly + 7);
            }

            startAngle = endAngle;
        });

        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1d27';
        ctx.fill();
        ctx.fillStyle = '#6c8cff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatPrice(calc.total), cx, cy);
    }

    // ========== 统一渲染入口 ==========
    renderAll() {
        if (this.activeTab === 'boloni') {
            this.renderBolonQuote(document.getElementById('calcItems'));
            this.renderBolonSummary();
            this.renderBolonChart();
        } else {
            this.renderEstimate(document.getElementById('calcItems'));
            this.renderEstimateSummary();
            this.renderEstimateChart();
        }
    }
}
