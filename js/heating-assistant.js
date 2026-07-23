// ========== 供暖助手 ==========
class HeatingAssistantManager {
    constructor() {
        this.area = 88.45;
        this.selectedKey = '市热力集团城市热网__';
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('heating_assistant_state');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.area) this.area = data.area;
                if (data.selectedKey) this.selectedKey = data.selectedKey;
            } catch (e) { /* ignore */ }
        }
    }

    saveState() {
        localStorage.setItem('heating_assistant_state', JSON.stringify({
            area: this.area,
            selectedKey: this.selectedKey
        }));
    }

    makeKey(opt) {
        return `${opt.supply_type}__${opt.supply_sub_type || ''}`;
    }

    getOptions() {
        const list = HEATING_DATA.heating_fee_list;
        const residential = list.filter(i => i.user_type === '居民');
        const commercial = list.filter(i => i.user_type === '非居民');
        return { residential, commercial };
    }

    getSelectedOption() {
        return HEATING_DATA.heating_fee_list.find(i => this.makeKey(i) === this.selectedKey);
    }

    calculate(area, option) {
        if (!option || area <= 0) return null;
        const fee = area * option.price;
        const pauseFee = Math.round(fee * 0.3 * 100) / 100;
        const saved = Math.round((fee - pauseFee) * 100) / 100;
        return { fee, pauseFee, saved, pricePerUnit: option.price };
    }

    render(container) {
        const { residential, commercial } = this.getOptions();
        const selected = this.getSelectedOption();
        const result = this.calculate(this.area, selected);

        container.innerHTML = `
            <div class="heating-calc">
                <div class="heating-header">
                    <div class="heating-title">
                        <h2>供暖助手</h2>
                        <p class="heating-desc">北京市居民集中供热费用计算器</p>
                    </div>
                </div>

                <div class="heating-input-section">
                    <div class="heating-input-group">
                        <label class="heating-label">房屋建筑面积（㎡）</label>
                        <input type="number" class="heating-input" id="heatingArea" value="${this.area}" min="0" step="0.01">
                    </div>
                    <div class="heating-input-group">
                        <label class="heating-label">供暖类型</label>
                        <div class="heating-type-section">
                            <div class="heating-type-label">居民用户</div>
                            <div class="heating-type-options">
                                ${residential.map(opt => {
                                    const key = this.makeKey(opt);
                                    const sub = opt.supply_sub_type ? `（${opt.supply_sub_type}）` : '';
                                    const label = opt.supply_sub_type ? `${opt.supply_type} ${opt.supply_sub_type}` : opt.supply_type;
                                    return `<div class="heating-type-card ${this.selectedKey === key ? 'active' : ''}" data-key="${key}">
                                        <div class="heating-type-name">${label}</div>
                                        <div class="heating-type-price">${opt.price} 元/㎡·季</div>
                                        <div class="heating-type-desc">${opt.supply_type_desc}</div>
                                    </div>`;
                                }).join('')}
                            </div>
                            <div class="heating-type-label">非居民用户</div>
                            <div class="heating-type-options">
                                ${commercial.map(opt => {
                                    const key = this.makeKey(opt);
                                    const sub = opt.supply_sub_type ? `（${opt.supply_sub_type}）` : '';
                                    return `<div class="heating-type-card ${this.selectedKey === key ? 'active' : ''}" data-key="${key}">
                                        <div class="heating-type-name">${opt.supply_type} ${sub}</div>
                                        <div class="heating-type-price">${opt.price} 元/㎡·季</div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                ${result ? `
                <div class="heating-result-section">
                    <div class="heating-result-grid">
                        <div class="heating-result-card heating-result-main">
                            <div class="heating-result-label">本采暖季应缴费用</div>
                            <div class="heating-result-value">¥${result.fee.toFixed(2)}</div>
                            <div class="heating-result-formula">${this.area}㎡ × ${result.pricePerUnit}元/㎡ = ¥${result.fee.toFixed(2)}</div>
                        </div>
                        <div class="heating-result-card heating-result-pause">
                            <div class="heating-result-label">申请停供费用（30%）</div>
                            <div class="heating-result-value">¥${result.pauseFee.toFixed(2)}</div>
                            <div class="heating-result-formula">正常费用 × 30% = ¥${result.pauseFee.toFixed(2)}</div>
                        </div>
                        <div class="heating-result-card heating-result-save">
                            <div class="heating-result-label">停供可节省</div>
                            <div class="heating-result-value">¥${result.saved.toFixed(2)}</div>
                            <div class="heating-result-formula">正常费用 − 停供费用 = ¥${result.saved.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="heating-result-note">
                        💡 根据《北京市居民集中供热暂停和恢复供热指导意见》，申请停供需缴纳基本热费（一般为正常供暖费的30%）。
                    </div>
                </div>
                ` : ''}

                <div class="heating-knowledge-section">
                    <div class="heating-knowledge-title">📚 供暖小知识</div>
                    <div class="heating-knowledge-grid">
                        <div class="heating-knowledge-card">
                            <div class="heating-kn-title">供暖季时间</div>
                            <div class="heating-kn-text">北京市法定供暖季为每年 <strong>11月15日至次年3月15日</strong>，共4个月。如遇极端天气可提前或延后。</div>
                        </div>
                        <div class="heating-knowledge-card">
                            <div class="heating-kn-title">停供申请条件</div>
                            <div class="heating-kn-text">用户需在 <strong>供暖季开始前30日</strong> 提出停供申请。停供期间需缴纳基本热费（一般为30%）。</div>
                        </div>
                        <div class="heating-knowledge-card">
                            <div class="heating-kn-title">室温标准</div>
                            <div class="heating-kn-text">卧室、起居室温度应不低于 <strong>18℃</strong>，卫生间不低于 <strong>18℃</strong>，厨房不低于 <strong>14℃</strong>。</div>
                        </div>
                        <div class="heating-knowledge-card">
                            <div class="heating-kn-title">报修渠道</div>
                            <div class="heating-kn-text">供暖问题可拨打 <strong>12345</strong> 市民服务热线，或联系小区供暖单位报修。</div>
                        </div>
                    </div>
                </div>

                <div class="heating-ref-section">
                    <div class="heating-ref-title">📄 引用资料</div>
                    <div class="heating-ref-list">
                        <a class="heating-ref-link" href="https://www.bjdx.gov.cn/bjsdxqrmzf/zwfw/ztlm/djgn/index.html" target="_blank" rel="noopener">
                            <span class="heating-ref-icon">🔗</span>
                            <span>集中供暖/天然气采暖费用价格 - 大兴区政府</span>
                        </a>
                        <a class="heating-ref-link" href="https://csglw.beijing.gov.cn/zwxx/2024zcwj/202405/t20240516_3685695.html" target="_blank" rel="noopener">
                            <span class="heating-ref-icon">🔗</span>
                            <span>《北京市居民集中供热暂停和恢复供热指导意见》（京管发〔2022〕22号）</span>
                        </a>
                        <a class="heating-ref-link" href="https://www.bjhd.gov.cn/ztzx/2024zt/gnfw/bsfw/qt/202511/t20251110_4792790.shtml" target="_blank" rel="noopener">
                            <span class="heating-ref-icon">🔗</span>
                            <span>申请暂停供暖 - 海淀区政府</span>
                        </a>
                        <a class="heating-ref-link" href="https://www.beijing.gov.cn//fwcj/htsfwb/shxfl/qita/677c9676663d0d63c3bf7651.html" target="_blank" rel="noopener">
                            <span class="heating-ref-icon">🔗</span>
                            <span>北京市居民供热采暖合同（按面积计费版）</span>
                        </a>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container);
    }

    bindEvents(container) {
        const areaInput = container.querySelector('#heatingArea');
        areaInput.addEventListener('input', (e) => {
            this.area = parseFloat(e.target.value) || 0;
            this.saveState();
            this.refreshResult(container);
        });

        container.querySelectorAll('.heating-type-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedKey = card.dataset.key;
                this.saveState();
                this.render(container);
            });
        });
    }

    refreshResult(container) {
        // Re-render result section only
        const selected = this.getSelectedOption();
        const result = this.calculate(this.area, selected);
        const resultSection = container.querySelector('.heating-result-section');
        if (!resultSection) return;

        if (result) {
            resultSection.innerHTML = `
                <div class="heating-result-grid">
                    <div class="heating-result-card heating-result-main">
                        <div class="heating-result-label">本采暖季应缴费用</div>
                        <div class="heating-result-value">¥${result.fee.toFixed(2)}</div>
                        <div class="heating-result-formula">${this.area}㎡ × ${result.pricePerUnit}元/㎡ = ¥${result.fee.toFixed(2)}</div>
                    </div>
                    <div class="heating-result-card heating-result-pause">
                        <div class="heating-result-label">申请停供费用（30%）</div>
                        <div class="heating-result-value">¥${result.pauseFee.toFixed(2)}</div>
                        <div class="heating-result-formula">正常费用 × 30% = ¥${result.pauseFee.toFixed(2)}</div>
                    </div>
                    <div class="heating-result-card heating-result-save">
                        <div class="heating-result-label">停供可节省</div>
                        <div class="heating-result-value">¥${result.saved.toFixed(2)}</div>
                        <div class="heating-result-formula">正常费用 − 停供费用 = ¥${result.saved.toFixed(2)}</div>
                    </div>
                </div>
                <div class="heating-result-note">
                    💡 根据《北京市居民集中供热暂停和恢复供热指导意见》，申请停供需缴纳基本热费（一般为正常供暖费的30%）。
                </div>
            `;
        } else {
            resultSection.innerHTML = '';
        }
    }
}
