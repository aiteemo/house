// ========== 供暖助手 v2.0 ==========
class HeatingAssistantManager {
    constructor() {
        this.area = 88.45;
        this.pavingArea = 61;
        this.selectedKey = '市热力集团城市热网__';
        // 自采暖参数
        this.boiler = {
            model: '',
            is_condenser: true,
            min_power: 3.8,
            max_power: 22.8,
            has_outdoor_comp: false,
            price: 6999,
            service_life: 8,
            maintain_cost: 400
        };
        this.user_coeff = 1.0;
        this.year_life_gas = 300;
        this.customPrice = null;
        // 对比口径：heating=刨除生活用气（默认） / household=家庭燃气总账
        this.compareMode = 'heating';
        // 改自采暖时是否计入停供基本热费（约 30%），默认开启
        this.includePauseFee = true;
        // 设备升级选型分析（可选）：基准炉 vs 升级炉
        this.upgrade = {
            compareKey: '',      // '' 未启用 | 机型下标 | 'custom'
            basePrice: 3500,
            upgradePrice: 7000,
            baseFree: false,     // 精装自带/旧炉拆换 → 基准价按 0
            saveRate: 0.3,       // 节能率 η
            lifeYears: 10
        };
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('heating_assistant_v2');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (d.area) this.area = d.area;
                if (d.pavingArea) this.pavingArea = d.pavingArea;
                if (d.selectedKey) this.selectedKey = d.selectedKey;
                if (d.boiler) Object.assign(this.boiler, d.boiler);
                if (d.user_coeff !== undefined) this.user_coeff = d.user_coeff;
                if (d.year_life_gas) this.year_life_gas = d.year_life_gas;
                if (d.customPrice !== undefined) this.customPrice = d.customPrice;
                if (d.compareMode === 'heating' || d.compareMode === 'household') this.compareMode = d.compareMode;
                if (d.includePauseFee !== undefined) this.includePauseFee = !!d.includePauseFee;
                if (d.upgrade) Object.assign(this.upgrade, d.upgrade);
            } catch (e) {}
        }
    }

    saveState() {
        localStorage.setItem('heating_assistant_v2', JSON.stringify({
            area: this.area,
            pavingArea: this.pavingArea,
            selectedKey: this.selectedKey,
            boiler: this.boiler,
            user_coeff: this.user_coeff,
            year_life_gas: this.year_life_gas,
            customPrice: this.customPrice,
            compareMode: this.compareMode,
            includePauseFee: this.includePauseFee,
            upgrade: this.upgrade
        }));
    }

    /** 北京居民阶梯气价累进计价（含分档明细，便于核对） */
    calcLadderCost(volume) {
        const ladder = HEATING_DATA.gas_ladder;
        const v = Math.max(0, volume || 0);
        const steps = [];
        let cost = 0;
        let tier = 1;
        let prevUpper = 0;
        let remaining = v;

        for (let i = 0; i < ladder.length; i++) {
            const band = ladder[i];
            const bandCap = band.upper - prevUpper;
            const take = Math.min(remaining, Math.max(0, bandCap));
            if (v === 0 && i === 0) {
                steps.push({ level: band.level, desc: band.desc, volume: 0, price: band.price, subtotal: 0 });
                break;
            }
            if (take > 0) {
                const subtotal = take * band.price;
                steps.push({ level: band.level, desc: band.desc, volume: take, price: band.price, subtotal });
                cost += subtotal;
                remaining -= take;
                tier = band.level;
            }
            prevUpper = band.upper;
            if (remaining <= 0) break;
        }
        return { cost, tier, steps };
    }

    makeKey(opt) {
        return `${opt.supply_type}__${opt.supply_sub_type || ''}`;
    }

    getOptions() {
        const list = HEATING_DATA.heating_fee_list;
        return {
            residential: list.filter(i => i.user_type === '居民'),
            commercial: list.filter(i => i.user_type === '非居民')
        };
    }

    getSelectedOption() {
        return HEATING_DATA.heating_fee_list.find(i => this.makeKey(i) === this.selectedKey);
    }

    // ========== 集中供暖计算 ==========
    calcCentral() {
        let price = 0;
        if (this.selectedKey === 'custom' && this.customPrice !== null && this.customPrice > 0) {
            price = this.customPrice;
        } else {
            const opt = this.getSelectedOption();
            if (opt) price = opt.price;
        }
        if (price <= 0) return null;
        return { fee: this.area * price, pricePerUnit: price };
    }

    // ========== 自采暖计算 ==========
    calcSelfHeating() {
        const C = HEATING_DATA.constants;
        const area = this.pavingArea;
        if (area <= 0) return null;

        // FR02 基础热负荷
        const daily_base_kwh = area * C.base_heat_load * C.hour_per_day;
        const daily_base_gas = daily_base_kwh / C.gas_heat_equivalent;

        // FR03 修正系数
        const condenser_coeff = this.boiler.is_condenser ? 0.7 : 1.0;
        const temp_comp_coeff = this.boiler.has_outdoor_comp ? 0.9 : 1.0;
        let power_coeff = 1.0;
        let power_coeff_rule = '最小功率 > 3.8kW → ×1.05';
        if (this.boiler.min_power <= 3.1) {
            power_coeff = 0.95;
            power_coeff_rule = '最小功率 ≤ 3.1kW → ×0.95';
        } else if (this.boiler.min_power <= 3.8) {
            power_coeff = 1.0;
            power_coeff_rule = '3.1kW < 最小功率 ≤ 3.8kW → ×1.0';
        } else {
            power_coeff = 1.05;
            power_coeff_rule = '最小功率 > 3.8kW → ×1.05';
        }

        // FR04 实际耗气量
        const daily_real_gas = daily_base_gas * condenser_coeff * temp_comp_coeff * power_coeff * this.user_coeff;
        const season_gas = daily_real_gas * C.heating_season_days;

        // FR05 阶梯气价（生活用气参与梯度，抬高采暖用气单价）
        const total_gas = season_gas + this.year_life_gas;
        const ladder_total = this.calcLadderCost(total_gas);
        const ladder_life = this.calcLadderCost(this.year_life_gas);
        const gas_cost = ladder_total.cost;
        const tier = ladder_total.tier;
        const life_gas_cost = ladder_life.cost;
        // 采暖归因燃气费 = 全年总燃气费 − 仅生活用气费用（差额法）
        const heating_gas_cost = gas_cost - life_gas_cost;

        // FR06 固定成本
        const year_depreciation = this.boiler.price / this.boiler.service_life;
        const year_fixed = year_depreciation + this.boiler.maintain_cost;

        // FR07 综合总成本
        // heating_compare_cost：供暖对比口径（刨除生活用气）
        // household_total_cost：家庭燃气总账（含生活用气）
        const heating_compare_cost = heating_gas_cost + year_fixed;
        const household_total_cost = gas_cost + year_fixed;

        return {
            paving_area: area,
            daily_base_kwh, daily_base_gas, daily_real_gas, season_gas, total_gas,
            tier, gas_cost, life_gas_cost, heating_gas_cost,
            ladder_total, ladder_life,
            year_depreciation, year_fixed,
            heating_compare_cost, household_total_cost,
            // 兼容旧字段名
            total_cost: household_total_cost,
            avg_price: total_gas > 0 ? gas_cost / total_gas : 0,
            heating_avg_price: season_gas > 0 ? heating_gas_cost / season_gas : 0,
            condenser_coeff, temp_comp_coeff, power_coeff, power_coeff_rule,
            constants: {
                base_heat_load: C.base_heat_load,
                hour_per_day: C.hour_per_day,
                gas_heat_equivalent: C.gas_heat_equivalent,
                heating_season_days: C.heating_season_days
            }
        };
    }

    // ========== 对比计算 ==========
    calcCompare() {
        const central = this.calcCentral();
        const self = this.calcSelfHeating();
        if (!central || !self) return null;

        const mode = this.compareMode === 'household' ? 'household' : 'heating';
        const self_base = mode === 'heating' ? self.heating_compare_cost : self.household_total_cost;
        const ratio = HEATING_DATA.constants.pause_basic_fee_ratio || 0.3;
        const pause_basic_fee = this.includePauseFee ? central.fee * ratio : 0;
        const self_total = self_base + pause_basic_fee;
        // diff：自采暖 − 集中；>0 表示自采暖更贵
        const diff = self_total - central.fee;
        // annual_saving：集中 − 自采暖；>0 表示自采暖每年更省，才可谈回本
        const annual_saving = central.fee - self_total;
        let payback_years = null;
        if (annual_saving > 0) {
            payback_years = this.boiler.price / annual_saving;
        }

        const upgrade = this.calcUpgradeAnalysis();

        return {
            mode,
            central_fee: central.fee,
            self_base,
            pause_basic_fee,
            pause_ratio: ratio,
            includePauseFee: this.includePauseFee,
            self_total,
            self_gas_part: mode === 'heating' ? self.heating_gas_cost : self.gas_cost,
            diff,
            annual_saving,
            payback_years,
            upgrade,
            self
        };
    }

    /** 普通二级能效炉采暖季耗气（基准 V0，不含冷凝/温补节能） */
    calcOrdinarySeasonGas() {
        const C = HEATING_DATA.constants;
        const area = this.pavingArea;
        if (area <= 0) return 0;
        const daily_base_kwh = area * C.base_heat_load * C.hour_per_day;
        const daily_base_gas = daily_base_kwh / C.gas_heat_equivalent;
        let power_coeff = 1.0;
        if (this.boiler.min_power <= 3.1) power_coeff = 0.95;
        else if (this.boiler.min_power <= 3.8) power_coeff = 1.0;
        else power_coeff = 1.05;
        return daily_base_gas * power_coeff * this.user_coeff * C.heating_season_days;
    }

    /** 设备升级选型：基准炉 → 升级炉 的增量回本 */
    calcUpgradeAnalysis() {
        const u = this.upgrade;
        if (!u.compareKey) return null;

        const V0 = this.calcOrdinarySeasonGas();
        const eta = Math.min(0.9, Math.max(0, Number(u.saveRate) || 0));
        const dV = V0 * eta;
        const life = Math.max(0, this.year_life_gas || 0);
        const costBase = this.calcLadderCost(life + V0).cost;
        const costUp = this.calcLadderCost(life + V0 - dV).cost;
        const dC = costBase - costUp;

        const pBase = u.baseFree ? 0 : Math.max(0, Number(u.basePrice) || 0);
        const pUp = Math.max(0, Number(u.upgradePrice) || 0);
        const dP = pUp - pBase;
        const years = Math.max(1, Number(u.lifeYears) || 10);

        let payback = null;
        let paybackLabel = '不适用';
        if (dC > 0 && dP > 0) {
            payback = dP / dC;
            paybackLabel = payback.toFixed(1) + ' 年';
        } else if (dC > 0 && dP <= 0) {
            payback = 0;
            paybackLabel = '即时（无增量投资）';
        } else if (dC <= 0) {
            paybackLabel = '不适用（无节气收益）';
        }

        const netLife = dC * years - dP;
        const recommend = payback != null && payback > 0 && payback <= years;

        let compareName = '自定义升级炉';
        if (u.compareKey !== 'custom' && u.compareKey !== '') {
            const m = HEATING_DATA.boiler_models[u.compareKey];
            if (m) compareName = m.model_name;
        }

        return {
            enabled: true,
            compareName,
            V0, eta, dV,
            life_gas: life,
            cost_base_gas: costBase,
            cost_upgrade_gas: costUp,
            dC, dP, pBase, pUp,
            years, payback, paybackLabel, netLife, recommend,
            baseFree: !!u.baseFree
        };
    }

    /** 按指定壁挂炉参数估算采暖季耗气 */
    calcSeasonGasForBoiler(boiler) {
        const C = HEATING_DATA.constants;
        const area = this.pavingArea;
        if (area <= 0) return 0;
        const daily_base_kwh = area * C.base_heat_load * C.hour_per_day;
        const daily_base_gas = daily_base_kwh / C.gas_heat_equivalent;
        const condenser_coeff = boiler.is_condenser ? 0.7 : 1.0;
        const temp_comp_coeff = boiler.has_outdoor_comp ? 0.9 : 1.0;
        let power_coeff = 1.0;
        const minP = boiler.min_power;
        if (minP <= 3.1) power_coeff = 0.95;
        else if (minP <= 3.8) power_coeff = 1.0;
        else power_coeff = 1.05;
        return daily_base_gas * condenser_coeff * temp_comp_coeff * power_coeff * this.user_coeff * C.heating_season_days;
    }

    /** 累计花费趋势：年限与各方案序列 */
    buildCostTrendData(c) {
        const s = c.self;
        const isHeatingMode = c.mode === 'heating';
        const pause = c.includePauseFee ? c.pause_basic_fee : 0;
        const life = Math.max(0, this.year_life_gas || 0);
        const maintain = Math.max(0, this.boiler.maintain_cost || 0);

        let horizon;
        if (c.upgrade && c.upgrade.payback != null && c.upgrade.payback > 0) {
            horizon = Math.ceil(c.upgrade.payback) + 1;
        } else if (c.upgrade) {
            horizon = Math.max(2, Math.ceil(c.upgrade.years || 10) + 1);
        } else {
            horizon = Math.max(2, Math.ceil(this.boiler.service_life || 8) + 1);
        }
        horizon = Math.min(40, Math.max(2, horizon));

        const years = [];
        for (let y = 0; y <= horizon; y++) years.push(y);

        const centralAnnual = c.central_fee;
        const selfGasAnnual = isHeatingMode ? s.heating_gas_cost : s.gas_cost;
        const selfAnnual = selfGasAnnual + maintain + pause;
        const selfCapex = Math.max(0, this.boiler.price || 0);
        const selfName = this.boiler.model
            ? `自采暖 · ${this.boiler.model} ¥${selfCapex.toLocaleString('zh-CN')}`
            : `自采暖 · 当前方案 ¥${selfCapex.toLocaleString('zh-CN')}`;

        const centralSeries = years.map(y => Math.round(y * centralAnnual));
        const selfSeries = years.map(y => Math.round(selfCapex + y * selfAnnual));

        const series = [
            { key: 'central', name: '市政集中供暖', color: '#60a5fa', data: centralSeries, area: true },
            { key: 'self', name: selfName, color: '#fbbf24', data: selfSeries, area: false }
        ];

        let upgradeAnnual = null;
        if (c.upgrade) {
            let seasonUp;
            let maintainUp = maintain;
            const key = this.upgrade.compareKey;
            if (key !== '' && key !== 'custom' && HEATING_DATA.boiler_models[key]) {
                const m = HEATING_DATA.boiler_models[key];
                seasonUp = this.calcSeasonGasForBoiler(m);
                maintainUp = m.annual_maintain_cost;
            } else {
                seasonUp = c.upgrade.V0 * (1 - c.upgrade.eta);
            }
            const lifeCost = this.calcLadderCost(life).cost;
            const totalUp = this.calcLadderCost(life + seasonUp).cost;
            const upgradeGas = isHeatingMode ? (totalUp - lifeCost) : totalUp;
            upgradeAnnual = upgradeGas + maintainUp + pause;
            const upgradeCapex = Math.max(0, c.upgrade.pUp || 0);
            const upName = `自采暖 · ${c.upgrade.compareName} ¥${upgradeCapex.toLocaleString('zh-CN')}`;
            series.push({
                key: 'upgrade',
                name: upName,
                color: '#4ade80',
                data: years.map(y => Math.round(upgradeCapex + y * upgradeAnnual)),
                area: false
            });
        }

        const noteParts = [
            `自采暖曲线含初次购炉成本、每年${isHeatingMode ? '采暖气费' : '燃气总费'}（当前方案 ¥${selfGasAnnual.toFixed(2)}）`,
            `年维保（¥${maintain.toFixed(0)}）`
        ];
        if (c.includePauseFee) noteParts.push(`停供基本热费（¥${pause.toFixed(0)}）`);
        if (c.upgrade && upgradeAnnual != null) {
            noteParts.push(`对比机型年运行费约 ¥${upgradeAnnual.toFixed(2)}`);
        }

        return {
            horizon,
            years,
            series,
            note: '注：' + noteParts.join('、') + '。不含设备折旧重复计入。',
            summaries: c.upgrade ? [
                { label: `集中供暖 ${horizon}年总成本`, value: '¥' + centralSeries[horizon].toLocaleString('zh-CN') },
                { label: `${c.upgrade.compareName} ${horizon}年总成本`, value: '¥' + series[2].data[horizon].toLocaleString('zh-CN') },
                { label: '升级回本周期 (B)', value: c.upgrade.paybackLabel }
            ] : [
                { label: `集中供暖 ${horizon}年总成本`, value: '¥' + centralSeries[horizon].toLocaleString('zh-CN') },
                { label: `自采暖 ${horizon}年总成本`, value: '¥' + selfSeries[horizon].toLocaleString('zh-CN') },
                { label: '回本周期 (A)', value: c.payback_years != null ? c.payback_years.toFixed(1) + ' 年' : '不适用' }
            ]
        };
    }

    renderCostTrendBlock(c) {
        const t = this.buildCostTrendData(c);
        return `
            <div class="heating-trend" data-horizon="${t.horizon}">
                <div class="heating-section-title" style="margin-top:8px;">📈 累计总支出趋势（${t.horizon} 年）</div>
                <div class="heating-trend-summary">
                    ${t.summaries.map(s => `
                        <div class="trend-sum-card">
                            <div class="trend-sum-label">${s.label}</div>
                            <div class="trend-sum-value">${s.value}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="heating-trend-chart" id="heatingTrendChart" style="width:100%;height:360px;"></div>
                <p class="heating-trend-note">${t.note}</p>
            </div>
        `;
    }

    mountCostTrendChart(container, c) {
        const el = container.querySelector('#heatingTrendChart');
        if (!el) return;
        if (typeof echarts === 'undefined') {
            el.innerHTML = '<div class="heating-trend-fallback">图表库未加载，请检查 echarts 脚本。</div>';
            return;
        }
        const t = this.buildCostTrendData(c);
        if (this._trendChart) {
            try { this._trendChart.dispose(); } catch (e) {}
            this._trendChart = null;
        }
        const chart = echarts.init(el);
        this._trendChart = chart;
        chart.setOption({
            color: t.series.map(s => s.color),
            tooltip: {
                trigger: 'axis',
                valueFormatter: v => '¥' + Number(v).toLocaleString('zh-CN')
            },
            legend: {
                bottom: 0,
                textStyle: { color: '#94a3b8', fontSize: 11 },
                type: 'scroll'
            },
            grid: { left: 52, right: 20, top: 28, bottom: 56 },
            xAxis: {
                type: 'category',
                name: '年份',
                nameTextStyle: { color: '#64748b' },
                data: t.years,
                boundaryGap: false,
                axisLabel: { color: '#94a3b8' },
                axisLine: { lineStyle: { color: '#334155' } }
            },
            yAxis: {
                type: 'value',
                name: '累计总支出 (元)',
                nameTextStyle: { color: '#64748b', fontSize: 11 },
                axisLabel: {
                    color: '#94a3b8',
                    formatter: v => (v >= 1000 ? (v / 1000) + 'K' : v)
                },
                splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)', type: 'dashed' } }
            },
            series: t.series.map(s => ({
                name: s.name,
                type: 'line',
                smooth: false,
                showSymbol: false,
                lineStyle: { width: 2.5 },
                areaStyle: s.area ? { opacity: 0.12 } : undefined,
                data: s.data
            }))
        });
        if (!this._trendResizeBound) {
            this._trendResizeBound = () => {
                if (this._trendChart) this._trendChart.resize();
            };
            window.addEventListener('resize', this._trendResizeBound);
        }
    }

    // ========== 渲染 ==========
    render(container) {
        const { residential, commercial } = this.getOptions();
        const selected = this.getSelectedOption();
        const central = this.calcCentral();
        const selfResult = this.calcSelfHeating();
        const compare = this.calcCompare();

        container.innerHTML = `
            <div class="heating-calc-wrap">
                <nav class="heating-side-nav" id="heatingNav">
                    <a class="hnav-item active" href="#sec-house">🏠 房屋信息</a>
                    <a class="hnav-item" href="#sec-central">🏢 集中供暖</a>
                    <a class="hnav-item" href="#sec-self">🔥 燃气自采暖</a>
                    <a class="hnav-item" href="#sec-result" style="display:${compare ? '' : 'none'}">📊 对比结果</a>
                    <a class="hnav-item" href="#sec-ref">📄 引用资料</a>
                </nav>
                <div class="heating-calc">
                <div class="heating-header">
                    <div class="heating-title">
                        <h2>供暖助手</h2>
                        <p class="heating-desc">市政集中供暖 vs 燃气壁挂炉自采暖 · 年度成本对比</p>
                    </div>
                </div>

                <!-- 房屋信息 -->
                <div class="heating-section" id="sec-house">
                    <div class="heating-section-title">🏠 房屋信息</div>
                    <div class="heating-row">
                        <div class="heating-field">
                            <label>房本建筑面积（㎡）</label>
                            <input type="number" class="heating-input" id="hArea" value="${this.area}" min="0" step="0.01">
                            <div class="heating-hint">集中供暖唯一计费面积</div>
                        </div>
                        <div class="heating-field">
                            <label>地暖实际铺设面积（㎡）</label>
                            <input type="number" class="heating-input" id="hPaving" value="${this.pavingArea}" min="0" step="0.01">
                            <div class="heating-hint">自采暖专用，扣除柜体、厨卫等不铺区域，如不知可先填套内面积</div>
                        </div>
                    </div>
                </div>

                <!-- 集中供暖 -->
                <div class="heating-section" id="sec-central">
                    <div class="heating-section-title">🏢 市政集中供暖</div>
                    <div class="heating-row">
                        <div class="heating-field heating-field-full">
                            <label>供暖类型</label>
                            <div class="heating-type-grid">
                                <div class="heating-type-sub">居民用户</div>
                                <div class="heating-type-opts">
                                    ${residential.map(opt => {
                                        const key = this.makeKey(opt);
                                        const label = opt.supply_sub_type ? `${opt.supply_type}（${opt.supply_sub_type}）` : opt.supply_type;
                                        return `<div class="heating-tcard ${this.selectedKey === key && this.customPrice === null ? 'active' : ''}" data-key="${key}">
                                            <div class="tc-name">${label}</div><div class="tc-price">${opt.price} 元/㎡·季</div>
                                        </div>`;
                                    }).join('')}
                                </div>
                                <div class="heating-type-sub">非居民用户</div>
                                <div class="heating-type-opts">
                                    ${commercial.map(opt => {
                                        const key = this.makeKey(opt);
                                        const sub = opt.supply_sub_type ? `（${opt.supply_sub_type}）` : '';
                                        return `<div class="heating-tcard ${this.selectedKey === key && this.customPrice === null ? 'active' : ''}" data-key="${key}">
                                            <div class="tc-name">${opt.supply_type} ${sub}</div><div class="tc-price">${opt.price} 元/㎡·季</div>
                                        </div>`;
                                    }).join('')}
                                    <div class="heating-tcard heating-tcard-custom ${this.customPrice !== null ? 'active' : ''}" data-key="custom">
                                        <div class="tc-name">自定义价格</div>
                                        <div class="tc-price-wrap">
                                            <input type="number" class="tc-price-input" id="hCustomPrice" value="${this.customPrice !== null ? this.customPrice : ''}" min="0" step="0.5" placeholder="输入">
                                            <span class="tc-price-unit">元/㎡·季</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="heating-result-bar" id="centralResultBar" style="display:${central ? '' : 'none'}">
                        <span>本采暖季费用</span>
                        <span class="heating-result-val">¥${central ? central.fee.toFixed(2) : '0'}</span>
                        <span class="heating-result-formula">${central ? this.area + '㎡ × ' + central.pricePerUnit + '元/㎡' : ''}</span>
                    </div>
                </div>

                <!-- 燃气自采暖 -->
                <div class="heating-section" id="sec-self">
                    <div class="heating-section-title">🔥 燃气壁挂炉自采暖</div>

                    <div class="heating-form-grid">
                        <div class="heating-field">
                            <label>机型快捷选择</label>
                            <select class="heating-select" id="hModel">
                                <option value="">自定义参数</option>
                                ${HEATING_DATA.boiler_models.map((m, i) => `<option value="${i}" ${this.boiler.model === m.model_name ? 'selected' : ''}>${m.model_name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="heating-field">
                            <label>对比机型选择<span class="heating-optional">非必选</span></label>
                            <select class="heating-select" id="hCompareModel">
                                <option value="" ${this.upgrade.compareKey === '' ? 'selected' : ''}>不对比</option>
                                ${HEATING_DATA.boiler_models.map((m, i) => `<option value="${i}" ${String(this.upgrade.compareKey) === String(i) ? 'selected' : ''}>${m.model_name}</option>`).join('')}
                                <option value="custom" ${this.upgrade.compareKey === 'custom' ? 'selected' : ''}>自定义升级参数</option>
                            </select>
                            <div class="heating-hint">选择后可计算不同机型之间的升级回本周期</div>
                        </div>

                        ${this.upgrade.compareKey !== '' ? `
                        <div class="heating-field">
                            <label>基准炉价格（元）</label>
                            <input type="number" class="heating-input" id="hUpBasePrice" value="${this.upgrade.baseFree ? 0 : this.upgrade.basePrice}" min="0" step="100" ${this.upgrade.baseFree ? 'disabled' : ''}>
                            <label class="heating-inline-check">
                                <input type="checkbox" id="hUpBaseFree" ${this.upgrade.baseFree ? 'checked' : ''}>
                                <span>精装自带 / 旧炉拆换（基准价按 0）</span>
                            </label>
                        </div>
                        <div class="heating-field">
                            <label>升级炉价格（元）</label>
                            <input type="number" class="heating-input" id="hUpPrice" value="${this.upgrade.upgradePrice}" min="0" step="100">
                            <div class="heating-hint">拟购高效机型采购价</div>
                        </div>
                        <div class="heating-field">
                            <label>设备节能率 η</label>
                            <input type="number" class="heating-input" id="hUpSaveRate" value="${Math.round(this.upgrade.saveRate * 100)}" min="0" max="90" step="5">
                            <div class="heating-hint">相对普通炉少耗气的比例，默认 30%</div>
                        </div>
                        <div class="heating-field">
                            <label>生命周期（年）</label>
                            <input type="number" class="heating-input" id="hUpLifeYears" value="${this.upgrade.lifeYears}" min="1" max="30" step="1">
                            <div class="heating-hint">用于计算全周期净收益，默认 10 年</div>
                        </div>
                        ` : ''}

                        <div class="heating-field">
                            <label>是否全预混冷凝炉</label>
                            <div class="heating-radio-group">
                                <label class="heating-radio ${this.boiler.is_condenser ? 'active' : ''}"><input type="radio" name="condenser" value="1" ${this.boiler.is_condenser ? 'checked' : ''}> 是</label>
                                <label class="heating-radio ${!this.boiler.is_condenser ? 'active' : ''}"><input type="radio" name="condenser" value="0" ${!this.boiler.is_condenser ? 'checked' : ''}> 否</label>
                            </div>
                        </div>
                        <div class="heating-field">
                            <label>是否带室外温度补偿</label>
                            <div class="heating-radio-group">
                                <label class="heating-radio ${this.boiler.has_outdoor_comp ? 'active' : ''}"><input type="radio" name="outdoor" value="1" ${this.boiler.has_outdoor_comp ? 'checked' : ''}> 是</label>
                                <label class="heating-radio ${!this.boiler.has_outdoor_comp ? 'active' : ''}"><input type="radio" name="outdoor" value="0" ${!this.boiler.has_outdoor_comp ? 'checked' : ''}> 否</label>
                            </div>
                        </div>

                        <div class="heating-field">
                            <label>最小输出功率（kW）</label>
                            <input type="number" class="heating-input" id="hMinPower" value="${this.boiler.min_power}" min="0" step="0.1">
                        </div>
                        <div class="heating-field">
                            <label>最大输出功率（kW）</label>
                            <input type="number" class="heating-input" id="hMaxPower" value="${this.boiler.max_power}" min="0" step="0.1">
                        </div>

                        <div class="heating-field">
                            <label>壁挂炉采购总价（元）</label>
                            <input type="number" class="heating-input" id="hPrice" value="${this.boiler.price}" min="0" step="1">
                        </div>
                        <div class="heating-field">
                            <label>计划使用/质保年限</label>
                            <input type="number" class="heating-input" id="hLife" value="${this.boiler.service_life}" min="1" step="1">
                        </div>

                        <div class="heating-field">
                            <label><span>年度保养费用（元）</span><button type="button" class="heating-calc-help" id="hMaintainHelpBtn">🔢 帮我算</button></label>
                            <input type="number" class="heating-input" id="hMaintain" value="${this.boiler.maintain_cost}" min="0" step="50">
                        </div>
                        <div class="heating-field">
                            <label>使用模式</label>
                            <select class="heating-select" id="hMode">
                                ${HEATING_DATA.user_modes.map(m => `<option value="${m.coeff}" ${this.user_coeff === m.coeff ? 'selected' : ''}>${m.label}（${m.coeff}）</option>`).join('')}
                            </select>
                        </div>

                        <div class="heating-field heating-field-span2">
                            <label><span>全年生活用气（m³）</span><button type="button" class="heating-calc-help" id="hGasHelpBtn">🔢 帮我算</button></label>
                            <input type="number" class="heating-input" id="hLifeGas" value="${this.year_life_gas}" min="0" step="10">
                            <div class="heating-hint">做饭、日常热水，不含采暖；参与阶梯计价，默认不计入供暖对比</div>
                        </div>

                        <div class="heating-field heating-field-span2 heating-actions">
                            <button class="heating-btn heating-btn-primary" id="hCalcBtn">🔢 计算对比</button>
                            <button class="heating-btn" id="hResetBtn">↻ 重置参数</button>
                        </div>
                    </div>
                </div>

                <!-- 对比结果 -->
                <div class="heating-section" id="sec-result" style="display:${compare ? '' : 'none'}">
                    <div class="heating-section-title">📊 方案对比结果</div>
                    <div class="heating-section-content">${compare ? this.renderCompare(compare) : ''}</div>
                </div>

                <!-- 知识卡片 -->
                <div class="heating-section">
                    <div class="heating-section-title">📚 供暖小知识</div>
                    <div class="heating-kn-grid">
                        <div class="heating-kn-card">
                            <div class="kn-title">供暖季时间</div>
                            <div class="kn-text">北京市法定供暖季为每年 <strong>11月15日至次年3月15日</strong>，共约120天。</div>
                        </div>
                        <div class="heating-kn-card">
                            <div class="kn-title">停供申请</div>
                            <div class="kn-text">用户需在供暖季开始前30日提出停供申请，停供期间需缴纳基本热费（约30%）。</div>
                        </div>
                        <div class="heating-kn-card">
                            <div class="kn-title">室温标准</div>
                            <div class="kn-text">卧室/起居室不低于 <strong>18℃</strong>，卫生间不低于 <strong>18℃</strong>，厨房不低于 <strong>14℃</strong>。</div>
                        </div>
                        <div class="heating-kn-card">
                            <div class="kn-title">冷凝炉优势</div>
                            <div class="kn-text">全预混冷凝炉热效率可达 108%+，比普通炉节能约 30%，但采购价更高。</div>
                        </div>
                    </div>
                </div>

                <!-- 引用资料 -->
                <div class="heating-section" id="sec-ref">
                    <div class="heating-section-title">📄 引用资料</div>
                    <div class="heating-ref-list">
                        <a class="heating-ref-link" href="https://fgw.beijing.gov.cn/bmcx/djcx/jzldj/202003/t20200331_1752797.htm" target="_blank" rel="noopener">
                            <span>🔗</span> 北京市居民用管道天然气销售价格表 - 北京市发改委
                        </a>
                        <a class="heating-ref-link" href="https://www.bjdx.gov.cn/bjsdxqrmzf/zwfw/ztlm/djgn/index.html" target="_blank" rel="noopener">
                            <span>🔗</span> 集中供暖/天然气采暖费用价格 - 大兴区政府
                        </a>
                        <a class="heating-ref-link" href="https://csglw.beijing.gov.cn/zwxx/2024zcwj/202405/t20240516_3685695.html" target="_blank" rel="noopener">
                            <span>🔗</span> 《北京市居民集中供热暂停和恢复供热指导意见》（京管发〔2022〕22号）
                        </a>
                        <a class="heating-ref-link" href="https://www.bjhd.gov.cn/ztzx/2024zt/gnfw/bsfw/qt/202511/t20251110_4792790.shtml" target="_blank" rel="noopener">
                            <span>🔗</span> 申请暂停供暖 - 海淀区政府
                        </a>
                        <a class="heating-ref-link" href="https://www.beijing.gov.cn/fwcj/htsfwb/shxfl/qita/677c9676663d0d63c3bf7651.html" target="_blank" rel="noopener">
                            <span>🔗</span> 北京市居民供热采暖合同（按面积计费版）
                        </a>
                    </div>
                </div>

                <div class="heating-disclaimer">
                    💡 说明：本测算采用标准基准热负荷 0.1kW/㎡，未纳入墙体保温、门窗、楼层散热等变量，结果为理论参考区间。
                </div>
            </div>

            <!-- 生活用气计算器弹窗 -->
            <div class="heating-gas-modal" id="gasModal">
                <div class="hgm-backdrop" id="gasModalClose"></div>
                <div class="hgm-panel">
                    <div class="hgm-header">
                        <h3>🔢 生活用气量估算</h3>
                        <button class="hgm-close" id="gasModalCloseBtn">×</button>
                    </div>
                    <div class="hgm-body">
                        <div class="hgm-desc">基准条件：2人、1卫、正常日常做饭、无零冷水、几乎不用浴缸<br>基准值：<strong>220 m³/年</strong>（不含采暖）</div>
                        <div class="hgm-field">
                            <label>家庭人数</label>
                            <div class="hgm-opts" data-gas="population">
                                ${HEATING_DATA.life_gas.population.map((o,i) => `<div class="hgm-opt ${i===1?'active':''}" data-coeff="${o.coeff}">${o.label}</div>`).join('')}
                            </div>
                        </div>
                        <div class="hgm-field">
                            <label>做饭频率</label>
                            <div class="hgm-opts" data-gas="cook">
                                ${HEATING_DATA.life_gas.cook.map((o,i) => `<div class="hgm-opt ${i===1?'active':''}" data-coeff="${o.coeff}">${o.label}</div>`).join('')}
                            </div>
                        </div>
                        <div class="hgm-field">
                            <label>卫生间数量</label>
                            <div class="hgm-opts" data-gas="bathroom">
                                ${HEATING_DATA.life_gas.bathroom.map((o,i) => `<div class="hgm-opt ${i===0?'active':''}" data-coeff="${o.coeff}">${o.label}</div>`).join('')}
                            </div>
                        </div>
                        <div class="hgm-field">
                            <label>浴缸使用频率</label>
                            <div class="hgm-opts" data-gas="tub">
                                ${HEATING_DATA.life_gas.tub.map((o,i) => `<div class="hgm-opt ${i===0?'active':''}" data-coeff="${o.coeff}">${o.label}</div>`).join('')}
                            </div>
                        </div>
                        <div class="hgm-field">
                            <label>零冷水</label>
                            <div class="hgm-opts" data-gas="recirculation">
                                ${HEATING_DATA.life_gas.recirculation.map((o,i) => `<div class="hgm-opt ${i===0?'active':''}" data-coeff="${o.coeff}">${o.label}</div>`).join('')}
                            </div>
                        </div>
                        <div class="hgm-result">
                            <span>估算结果</span>
                            <span class="hgm-result-val" id="gasEstimateVal">220</span>
                            <span>m³/年</span>
                        </div>
                        <button class="heating-btn heating-btn-primary hgm-confirm" id="gasConfirmBtn">确认并填入</button>
                    </div>
                </div>
            </div>

            <!-- 年度保养费用估算弹窗 -->
            <div class="heating-gas-modal" id="maintainModal">
                <div class="hgm-backdrop" id="maintainModalClose"></div>
                <div class="hgm-panel">
                    <div class="hgm-header">
                        <h3>🔢 年度保养费用估算</h3>
                        <button class="hgm-close" id="maintainModalCloseBtn">×</button>
                    </div>
                    <div class="hgm-body">
                        <div class="hgm-desc" id="maintainHint">
                            常规炉：周期 2 年 1 保，年均 = 单次价格 ÷ 2<br>
                            冷凝炉：周期 1 年 1 保，年均 = 单次价格
                        </div>
                        <div class="hgm-field">
                            <label>设备类型</label>
                            <div class="hgm-opts" data-maintain="type">
                                ${HEATING_DATA.maintain_estimate.types.map(t =>
                                    `<div class="hgm-opt" data-id="${t.id}" data-period="${t.period_years}">${t.label}</div>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="hgm-field">
                            <label>产地档次</label>
                            <div class="hgm-opts" data-maintain="origin">
                                ${HEATING_DATA.maintain_estimate.origins.map((o, i) =>
                                    `<div class="hgm-opt ${i === 1 ? 'active' : ''}" data-id="${o.id}">${o.label}</div>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="hgm-result hgm-result-stack">
                            <div class="hgm-result-main">
                                <span>年均保养</span>
                                <span class="hgm-result-val" id="maintainEstimateVal">210</span>
                                <span>元/年</span>
                            </div>
                            <div class="hgm-result-sub" id="maintainEstimateDetail">单次 ¥420 ÷ 2 年 = ¥210/年</div>
                        </div>
                        <button class="heating-btn heating-btn-primary hgm-confirm" id="maintainConfirmBtn">确认并填入</button>
                    </div>
                </div>
            </div>
            </div>
        `;

        this.bindEvents(container);
        this.bindCompareMode(container);
        const compareAfter = this.calcCompare();
        if (compareAfter) this.mountCostTrendChart(container, compareAfter);
    }

    formatLadderSteps(ladderResult) {
        if (!ladderResult || !ladderResult.steps || !ladderResult.steps.length) return '<div class="hf-plug">无耗气</div>';
        return ladderResult.steps.map(step =>
            `<div class="hf-plug">第${step.level}档 ${step.desc}：${step.volume.toFixed(2)} m³ × ¥${step.price}/m³ = ¥${step.subtotal.toFixed(2)}</div>`
        ).join('');
    }

    renderFormulaReview(c) {
        const s = c.self;
        const C = s.constants;
        const isHeatingMode = c.mode === 'heating';
        const central = this.calcCentral();
        const pricePerUnit = central ? central.pricePerUnit : 0;
        const pausePct = Math.round((c.pause_ratio || 0.3) * 100);
        const modeLabel = isHeatingMode ? '供暖对比口径（刨除生活用气）' : '家庭燃气总账';

        return `
            <details class="heating-formula-review">
                <summary class="hf-summary">🧮 核心公式与计算过程（可核对）</summary>
                <div class="hf-body">
                    <p class="hf-intro">下面按计算顺序展开：左侧是公式，右侧是当前参数代入后的过程。改上方输入后会实时刷新。</p>

                    <div class="hf-step">
                        <div class="hf-step-title">① 集中供暖费用</div>
                        <div class="hf-eq">费用 = 房本建筑面积 × 单价</div>
                        <div class="hf-plug">${this.area} ㎡ × ¥${pricePerUnit}/㎡·季 = <strong>¥${c.central_fee.toFixed(2)}</strong></div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">② 基础热负荷 → 日基础耗气</div>
                        <div class="hf-eq">日基础热负荷(kWh) = 地暖铺设面积 × 基础热指标 × 日运行小时</div>
                        <div class="hf-plug">${s.paving_area} ㎡ × ${C.base_heat_load} kW/㎡ × ${C.hour_per_day} h = <strong>${s.daily_base_kwh.toFixed(2)} kWh/日</strong></div>
                        <div class="hf-eq">日基础耗气(m³) = 日基础热负荷 ÷ 气热当量</div>
                        <div class="hf-plug">${s.daily_base_kwh.toFixed(2)} ÷ ${C.gas_heat_equivalent} kWh/m³ = <strong>${s.daily_base_gas.toFixed(4)} m³/日</strong></div>
                        <div class="hf-note">常量：基础热指标 ${C.base_heat_load}、气热当量 ${C.gas_heat_equivalent}（约 1m³ 气 ≈ ${C.gas_heat_equivalent} kWh）</div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">③ 修正系数 → 日实际耗气</div>
                        <div class="hf-eq">日实际耗气 = 日基础耗气 × 冷凝炉系数 × 室外温补系数 × 功率适配系数 × 使用模式系数</div>
                        <div class="hf-plug">冷凝炉：${this.boiler.is_condenser ? '是 → ×0.7' : '否 → ×1.0'}（当前 ×${s.condenser_coeff}）</div>
                        <div class="hf-plug">室外温度补偿：${this.boiler.has_outdoor_comp ? '是 → ×0.9' : '否 → ×1.0'}（当前 ×${s.temp_comp_coeff}）</div>
                        <div class="hf-plug">功率适配：最小功率 ${this.boiler.min_power} kW，规则「${s.power_coeff_rule}」（当前 ×${s.power_coeff}）</div>
                        <div class="hf-plug">使用模式系数：×${this.user_coeff}</div>
                        <div class="hf-plug">${s.daily_base_gas.toFixed(4)} × ${s.condenser_coeff} × ${s.temp_comp_coeff} × ${s.power_coeff} × ${this.user_coeff} = <strong>${s.daily_real_gas.toFixed(4)} m³/日</strong></div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">④ 采暖季耗气量</div>
                        <div class="hf-eq">采暖季耗气 = 日实际耗气 × 采暖季天数</div>
                        <div class="hf-plug">${s.daily_real_gas.toFixed(4)} × ${C.heating_season_days} 天 = <strong>${s.season_gas.toFixed(2)} m³</strong></div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">⑤ 阶梯气价（生活用气参与梯度）</div>
                        <div class="hf-eq">全年总耗气 = 采暖季耗气 + 全年生活用气</div>
                        <div class="hf-plug">${s.season_gas.toFixed(2)} + ${this.year_life_gas.toFixed(2)} = <strong>${s.total_gas.toFixed(2)} m³</strong></div>
                        <div class="hf-eq">全年总燃气费 = 阶梯累进计价(总耗气)</div>
                        ${this.formatLadderSteps(s.ladder_total)}
                        <div class="hf-plug">合计全年总燃气费 = <strong>¥${s.gas_cost.toFixed(2)}</strong></div>
                        <div class="hf-eq">仅生活用气费用 = 阶梯累进计价(生活用气)</div>
                        ${this.formatLadderSteps(s.ladder_life)}
                        <div class="hf-plug">合计生活用气费用 = <strong>¥${s.life_gas_cost.toFixed(2)}</strong></div>
                        <div class="hf-eq">采暖归因气费（差额法）= 全年总燃气费 − 仅生活用气费用</div>
                        <div class="hf-plug">¥${s.gas_cost.toFixed(2)} − ¥${s.life_gas_cost.toFixed(2)} = <strong>¥${s.heating_gas_cost.toFixed(2)}</strong></div>
                        <div class="hf-note">差额法含义：生活用气先占低价档，采暖用气落在更高档，把「被抬高的那部分」算进采暖气费。</div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">⑥ 设备固定成本（年化）</div>
                        <div class="hf-eq">年均折旧 = 壁挂炉采购总价 ÷ 计划使用年限</div>
                        <div class="hf-plug">¥${this.boiler.price} ÷ ${this.boiler.service_life} 年 = <strong>¥${s.year_depreciation.toFixed(2)}</strong></div>
                        <div class="hf-eq">年固定成本 = 年均折旧 + 年度保养</div>
                        <div class="hf-plug">¥${s.year_depreciation.toFixed(2)} + ¥${this.boiler.maintain_cost} = <strong>¥${s.year_fixed.toFixed(2)}</strong></div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">⑦ 自采暖口径费用（当前：${modeLabel}）</div>
                        ${isHeatingMode ? `
                        <div class="hf-eq">供暖对比基础费用 = 采暖归因气费 + 年固定成本</div>
                        <div class="hf-plug">¥${s.heating_gas_cost.toFixed(2)} + ¥${s.year_fixed.toFixed(2)} = <strong>¥${s.heating_compare_cost.toFixed(2)}</strong></div>
                        ` : `
                        <div class="hf-eq">家庭总账基础费用 = 全年总燃气费 + 年固定成本</div>
                        <div class="hf-plug">¥${s.gas_cost.toFixed(2)} + ¥${s.year_fixed.toFixed(2)} = <strong>¥${s.household_total_cost.toFixed(2)}</strong></div>
                        `}
                        <div class="hf-eq">停供基本热费 = 集中供暖费用 × ${pausePct}%${c.includePauseFee ? '' : '（当前未计入）'}</div>
                        <div class="hf-plug">¥${c.central_fee.toFixed(2)} × ${c.pause_ratio} = <strong>${c.includePauseFee ? '¥' + c.pause_basic_fee.toFixed(2) : '¥0.00（开关关闭）'}</strong></div>
                        <div class="hf-eq">自采暖侧对比费用 = 口径基础费用 + 停供基本热费</div>
                        <div class="hf-plug">¥${c.self_base.toFixed(2)} + ¥${c.pause_basic_fee.toFixed(2)} = <strong>¥${c.self_total.toFixed(2)}</strong></div>
                    </div>

                    <div class="hf-step hf-step-final">
                        <div class="hf-step-title">⑧ 回本 A：自采暖 vs 集中供暖</div>
                        <div class="hf-eq">年节约 = 集中供暖 − 自采暖对比费用</div>
                        <div class="hf-plug">¥${c.central_fee.toFixed(2)} − ¥${c.self_total.toFixed(2)} = <strong>${c.annual_saving >= 0 ? '' : '-'}¥${Math.abs(c.annual_saving).toFixed(2)}</strong></div>
                        <div class="hf-eq">回本 A = 壁挂炉价格 ÷ 年节约（仅当自采暖更省）</div>
                        ${c.payback_years != null ? `
                        <div class="hf-plug">¥${this.boiler.price} ÷ ¥${c.annual_saving.toFixed(2)} = <strong>${c.payback_years.toFixed(1)} 年</strong></div>
                        ` : `
                        <div class="hf-plug"><strong>不适用</strong>${c.annual_saving < 0 ? '（相对集中供暖为消费升级，无节约可摊）' : '（持平）'}</div>
                        `}
                    </div>

                    ${c.upgrade ? `
                    <div class="hf-step hf-step-final">
                        <div class="hf-step-title">⑨ 回本 B：机型升级（${c.upgrade.compareName} vs 基准炉）</div>
                        <div class="hf-eq">基准采暖耗气 V0（普通炉）= ${c.upgrade.V0.toFixed(2)} m³</div>
                        <div class="hf-eq">节气量 ΔV = V0 × η = ${c.upgrade.V0.toFixed(2)} × ${c.upgrade.eta} = ${c.upgrade.dV.toFixed(2)} m³</div>
                        <div class="hf-eq">年节约气费 ΔC = 阶梯(生活+V0) − 阶梯(生活+V0−ΔV)</div>
                        <div class="hf-plug">¥${c.upgrade.cost_base_gas.toFixed(2)} − ¥${c.upgrade.cost_upgrade_gas.toFixed(2)} = <strong>¥${c.upgrade.dC.toFixed(2)}</strong></div>
                        <div class="hf-eq">增量投资 ΔP = 升级炉价 − 基准炉价${c.upgrade.baseFree ? '（精装自带按 0）' : ''}</div>
                        <div class="hf-plug">¥${c.upgrade.pUp.toFixed(0)} − ¥${c.upgrade.pBase.toFixed(0)} = <strong>¥${c.upgrade.dP.toFixed(2)}</strong></div>
                        <div class="hf-eq">回本 B = ΔP ÷ ΔC（仅当有增量投资且有节气收益）</div>
                        <div class="hf-plug"><strong>${c.upgrade.paybackLabel}</strong>${c.upgrade.recommend ? ' · 推荐升级（≤生命周期）' : (c.upgrade.payback != null && c.upgrade.payback > c.upgrade.years ? ' · 回收期较长' : '')}</div>
                        <div class="hf-eq">${c.upgrade.years} 年净收益 = ΔC×${c.upgrade.years} − ΔP</div>
                        <div class="hf-plug">¥${c.upgrade.dC.toFixed(2)} × ${c.upgrade.years} − ¥${c.upgrade.dP.toFixed(2)} = <strong>¥${c.upgrade.netLife.toFixed(2)}</strong></div>
                    </div>
                    ` : ''}
                </div>
            </details>
        `;
    }

    renderCompare(c) {
        const s = c.self;
        const tierDesc = ['', '第一档（≤1500m³）', '第二档（1500～2500m³）', '第三档（>2500m³）'];
        const cheaperSelf = c.diff < 0;
        const cheaperCentral = c.diff > 0;
        const isHeatingMode = c.mode === 'heating';
        const central = this.calcCentral();
        const pricePerUnit = central ? central.pricePerUnit : 24;
        const pausePct = Math.round((c.pause_ratio || 0.3) * 100);
        const gasLabel = isHeatingMode ? '采暖气费' : '全年气费';
        const gasVal = isHeatingMode ? s.heating_gas_cost : s.gas_cost;
        const formulaLines = [
            `${gasLabel} ¥${gasVal.toFixed(2)}`,
            `设备及保养 ¥${s.year_fixed.toFixed(2)}`,
        ];
        if (c.includePauseFee) {
            formulaLines.push(`停供基本热费 ¥${c.pause_basic_fee.toFixed(2)}`);
        }

        return `
            <div class="heating-mode-toggle" id="hCompareMode">
                <button type="button" class="hmode-btn ${isHeatingMode ? 'active' : ''}" data-mode="heating">供暖对比（刨除生活用气）</button>
                <button type="button" class="hmode-btn ${!isHeatingMode ? 'active' : ''}" data-mode="household">家庭燃气总账</button>
            </div>
            <label class="heating-pause-opt">
                <input type="checkbox" id="hPauseFee" ${c.includePauseFee ? 'checked' : ''}>
                <span>计入停供基本热费（约 ${pausePct}%）</span>
            </label>
            <div class="heating-mode-hint">${isHeatingMode
                ? '生活用气只参与阶梯计价，不计入对比费用；两边比的是「供暖本身」花了多少钱'
                : '自采暖侧含全年生活用气+采暖用气；集中供暖侧仍只有供暖费，适合看家庭气费总账，不宜直接比优劣'}
                ${c.includePauseFee
                    ? `；改自采暖后停供仍需缴基本热费约 ${pausePct}%（¥${c.pause_basic_fee.toFixed(2)}），已加到自采暖侧`
                    : '；未计入停供基本热费，可打开上方开关纳入对比'}</div>

            <div class="heating-compare-grid">
                <div class="heating-cmp-card">
                    <div class="cmp-label">🏢 集中供暖年度费用</div>
                    <div class="cmp-value cmp-central">¥${c.central_fee.toFixed(2)}</div>
                    <div class="cmp-formula">${this.area}㎡ × ¥${pricePerUnit}/㎡</div>
                </div>
                <div class="heating-cmp-card">
                    <div class="cmp-label">${isHeatingMode ? '🔥 自采暖供暖费用' : '🔥 自采暖家庭总账'}</div>
                    <div class="cmp-value cmp-self">¥${c.self_total.toFixed(2)}</div>
                    <div class="cmp-formula cmp-formula-stack">${formulaLines.map((line, i) =>
                        `<div class="cmp-formula-line">${line}${i < formulaLines.length - 1 ? ' +' : ''}</div>`
                    ).join('')}</div>
                </div>
                <div class="heating-cmp-card ${cheaperSelf ? 'cmp-win' : cheaperCentral ? 'cmp-lose' : ''}">
                    <div class="cmp-label">年度差额</div>
                    <div class="cmp-value" style="color:${cheaperSelf ? '#22c55e' : cheaperCentral ? '#f87171' : 'var(--text)'}">
                        ${cheaperCentral ? '+' : ''}¥${c.diff.toFixed(2)}
                    </div>
                    <div class="cmp-formula">${cheaperSelf ? '自采暖更省钱' : cheaperCentral ? '集中供暖更省钱' : '持平'}</div>
                </div>
            </div>

            <div class="heating-payback-row">
                <div class="pb-chip" title="自采暖相对市政集中供暖：壁挂炉采购价 ÷ 每年相对集中供暖省下的钱">
                    <span class="pb-key">回本 A</span>
                    <span class="pb-val">${c.payback_years != null ? c.payback_years.toFixed(1) + ' 年' : '不适用'}</span>
                    <span class="pb-sub">vs 集中供暖</span>
                </div>
                ${c.upgrade ? `
                <div class="pb-chip ${c.upgrade.recommend ? 'pb-chip-rec' : ''}" title="升级炉相对基准炉：增量投资 ΔP ÷ 每年节约气费 ΔC；悬停查看含义">
                    <span class="pb-key">回本 B</span>
                    <span class="pb-val">${c.upgrade.paybackLabel}</span>
                    <span class="pb-sub">机型升级 · ${c.upgrade.compareName}</span>
                </div>
                <div class="pb-chip" title="${c.upgrade.years} 年节约气费累计 − 增量投资">
                    <span class="pb-key">${c.upgrade.years}年净收益</span>
                    <span class="pb-val">¥${c.upgrade.netLife.toFixed(0)}</span>
                    <span class="pb-sub">ΔC×${c.upgrade.years} − ΔP</span>
                </div>
                ` : `
                <div class="pb-chip pb-chip-muted" title="在「对比机型选择」中选一个机型后，可计算升级炉相对基准炉的回本">
                    <span class="pb-key">回本 B</span>
                    <span class="pb-val">未启用</span>
                    <span class="pb-sub">选对比机型后计算</span>
                </div>
                `}
            </div>

            ${this.renderCostTrendBlock(c)}

            ${this.renderFormulaReview(c)}

            <div class="heating-detail-grid">
                <div class="heating-detail-card">
                    <div class="dt-title">自采暖明细</div>
                    <div class="dt-row"><span>采暖季耗气量</span><span>${s.season_gas.toFixed(1)} m³</span></div>
                    <div class="dt-row"><span>全年生活用气</span><span>${this.year_life_gas.toFixed(1)} m³</span></div>
                    <div class="dt-row"><span>全年总耗气量</span><span>${s.total_gas.toFixed(1)} m³</span></div>
                    <div class="dt-row"><span>所处阶梯</span><span>${tierDesc[s.tier]}</span></div>
                    <div class="dt-row"><span>综合气价</span><span>¥${s.avg_price.toFixed(2)}/m³</span></div>
                    <div class="dt-row"><span>生活用气费用（单独计价）</span><span>¥${s.life_gas_cost.toFixed(2)}</span></div>
                    <div class="dt-row"><span>采暖归因气费（差额法）</span><span>¥${s.heating_gas_cost.toFixed(2)}</span></div>
                    <div class="dt-row"><span>全年总燃气费</span><span>¥${s.gas_cost.toFixed(2)}</span></div>
                    <div class="dt-row"><span>设备年均折旧</span><span>¥${s.year_depreciation.toFixed(2)}</span></div>
                    <div class="dt-row"><span>年度维保</span><span>¥${this.boiler.maintain_cost}</span></div>
                    <div class="dt-row"><span>口径基础费用</span><span>¥${c.self_base.toFixed(2)}</span></div>
                    <div class="dt-row"><span>停供基本热费（约 ${pausePct}%）</span><span>${c.includePauseFee ? '¥' + c.pause_basic_fee.toFixed(2) : '未计入'}</span></div>
                    <div class="dt-row dt-total"><span>${isHeatingMode ? '供暖对比费用' : '家庭总账费用'}</span><span>¥${c.self_total.toFixed(2)}</span></div>
                </div>
                <div class="heating-detail-card">
                    <div class="dt-title">修正系数明细</div>
                    <div class="dt-row"><span>冷凝炉修正</span><span>×${s.condenser_coeff}</span></div>
                    <div class="dt-row"><span>室外温度补偿</span><span>×${s.temp_comp_coeff}</span></div>
                    <div class="dt-row"><span>功率适配修正</span><span>×${s.power_coeff}</span></div>
                    <div class="dt-row"><span>用户行为系数</span><span>×${this.user_coeff}</span></div>
                    <div class="dt-row"><span>基础日耗气</span><span>${s.daily_base_gas.toFixed(2)} m³/日</span></div>
                    <div class="dt-row"><span>实际日耗气</span><span>${s.daily_real_gas.toFixed(2)} m³/日</span></div>
                    <div class="dt-row"><span>采暖气费边际均价</span><span>¥${s.heating_avg_price.toFixed(2)}/m³</span></div>
                    <div class="dt-row dt-total" style="color:var(--orange);">
                        <span title="自采暖相对市政集中供暖的静态回本">回本 A · vs 集中</span>
                        <span>${c.payback_years != null
                            ? c.payback_years.toFixed(1) + ' 年'
                            : (cheaperCentral ? '不适用' : '不适用')}</span>
                    </div>
                    ${c.upgrade ? `
                    <div class="dt-row dt-total" style="color:var(--orange);">
                        <span title="升级炉相对基准炉的增量投资回本">回本 B · 机型升级</span>
                        <span>${c.upgrade.paybackLabel}</span>
                    </div>
                    <div class="dt-row">
                        <span>升级增量投资 ΔP</span>
                        <span>¥${c.upgrade.dP.toFixed(0)}</span>
                    </div>
                    <div class="dt-row">
                        <span>每年节约气费 ΔC</span>
                        <span>¥${c.upgrade.dC.toFixed(2)}</span>
                    </div>
                    <div class="dt-row">
                        <span>${c.upgrade.years} 年净收益</span>
                        <span>¥${c.upgrade.netLife.toFixed(0)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    bindEvents(container) {
        // 房屋面积
        container.querySelector('#hArea').addEventListener('input', e => {
            this.area = parseFloat(e.target.value) || 0;
            this.saveState();
            this.refreshResult(container);
        });
        container.querySelector('#hPaving').addEventListener('input', e => {
            this.pavingArea = parseFloat(e.target.value) || 0;
            this.saveState();
            this.refreshResult(container);
        });

        // 选中卡片的统一方法
        const selectCard = (card) => {
            container.querySelectorAll('.heating-tcard').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };

        // 更新集中供暖费用 + 对比结果
        const updateAll = () => {
            const central = this.calcCentral();
            const bar = container.querySelector('#centralResultBar');
            if (bar) {
                if (central) {
                    bar.innerHTML = `<span>本采暖季费用</span><span class="heating-result-val">¥${central.fee.toFixed(2)}</span><span class="heating-result-formula">${this.area}㎡ × ${central.pricePerUnit}元/㎡</span>`;
                    bar.style.display = '';
                } else {
                    bar.style.display = 'none';
                }
            }
            this.refreshResult(container);
        };

        // 集中供暖类型选择
        container.querySelectorAll('.heating-tcard').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                selectCard(card);
                if (card.classList.contains('heating-tcard-custom')) {
                    // 点击自定义卡片区域，聚焦输入框
                    this.selectedKey = 'custom';
                    const inp = card.querySelector('input');
                    if (inp) setTimeout(() => inp.focus(), 0);
                } else {
                    // 点击预设选项，清空自定义价格
                    this.selectedKey = card.dataset.key;
                    this.customPrice = null;
                    // 清空自定义输入框
                    const inp = container.querySelector('#hCustomPrice');
                    if (inp) inp.value = '';
                }
                this.saveState();
                updateAll();
            });
        });

        // 自定义价格输入
        const customPriceInput = container.querySelector('#hCustomPrice');
        if (customPriceInput) {
            customPriceInput.addEventListener('focus', () => {
                // 聚焦时自动切换到自定义卡片
                const customCard = container.querySelector('.heating-tcard-custom');
                if (customCard) selectCard(customCard);
                this.selectedKey = 'custom';
                this.saveState();
            });
            customPriceInput.addEventListener('input', e => {
                const val = parseFloat(e.target.value);
                this.customPrice = isNaN(val) || val <= 0 ? null : val;
                this.selectedKey = 'custom';
                this.saveState();
                updateAll();
            });
            customPriceInput.addEventListener('click', e => e.stopPropagation());
        }

        // 壁挂炉机型
        container.querySelector('#hModel').addEventListener('change', e => {
            const idx = e.target.value;
            if (idx !== '') {
                const m = HEATING_DATA.boiler_models[idx];
                this.boiler.model = m.model_name;
                this.boiler.is_condenser = m.is_condenser;
                this.boiler.min_power = m.min_power;
                this.boiler.max_power = m.max_power;
                this.boiler.has_outdoor_comp = m.has_outdoor_comp;
                this.boiler.price = m.boiler_price_ref;
                this.boiler.service_life = m.boiler_service_life;
                this.boiler.maintain_cost = m.annual_maintain_cost;
                this.saveState();
                this.render(container);
            }
        });

        // 对比机型（设备升级选型）
        const compareSel = container.querySelector('#hCompareModel');
        if (compareSel) {
            compareSel.addEventListener('change', e => {
                const key = e.target.value;
                this.upgrade.compareKey = key;
                if (key !== '' && key !== 'custom') {
                    const m = HEATING_DATA.boiler_models[key];
                    if (m) {
                        this.upgrade.upgradePrice = m.boiler_price_ref;
                        this.upgrade.saveRate = m.is_condenser ? 0.3 : 0.2;
                    }
                }
                this.saveState();
                this.render(container);
            });
        }
        const upBase = container.querySelector('#hUpBasePrice');
        if (upBase) {
            upBase.addEventListener('input', e => {
                this.upgrade.basePrice = parseFloat(e.target.value) || 0;
                this.saveState();
                this.refreshResult(container);
            });
        }
        const upFree = container.querySelector('#hUpBaseFree');
        if (upFree) {
            upFree.addEventListener('change', e => {
                this.upgrade.baseFree = e.target.checked;
                this.saveState();
                this.render(container);
            });
        }
        const upPrice = container.querySelector('#hUpPrice');
        if (upPrice) {
            upPrice.addEventListener('input', e => {
                this.upgrade.upgradePrice = parseFloat(e.target.value) || 0;
                this.saveState();
                this.refreshResult(container);
            });
        }
        const upRate = container.querySelector('#hUpSaveRate');
        if (upRate) {
            upRate.addEventListener('input', e => {
                this.upgrade.saveRate = (parseFloat(e.target.value) || 0) / 100;
                this.saveState();
                this.refreshResult(container);
            });
        }
        const upYears = container.querySelector('#hUpLifeYears');
        if (upYears) {
            upYears.addEventListener('input', e => {
                this.upgrade.lifeYears = parseInt(e.target.value, 10) || 10;
                this.saveState();
                this.refreshResult(container);
            });
        }

        // 冷凝炉/室外补偿
        container.querySelectorAll('input[name="condenser"]').forEach(r => {
            r.addEventListener('change', e => {
                this.boiler.is_condenser = e.target.value === '1';
                this.syncRadios(container, 'condenser', this.boiler.is_condenser);
                this.saveState();
            });
        });
        container.querySelectorAll('input[name="outdoor"]').forEach(r => {
            r.addEventListener('change', e => {
                this.boiler.has_outdoor_comp = e.target.value === '1';
                this.syncRadios(container, 'outdoor', this.boiler.has_outdoor_comp);
                this.saveState();
            });
        });

        // 数值输入
        const numBind = (id, field) => {
            container.querySelector(id).addEventListener('input', e => {
                this.boiler[field] = parseFloat(e.target.value) || 0;
                this.saveState();
            });
        };
        numBind('#hMinPower', 'min_power');
        numBind('#hMaxPower', 'max_power');
        numBind('#hPrice', 'price');
        numBind('#hLife', 'service_life');
        numBind('#hMaintain', 'maintain_cost');

        // 使用模式
        container.querySelector('#hMode').addEventListener('change', e => {
            this.user_coeff = parseFloat(e.target.value);
            this.saveState();
        });

        // 生活用气
        container.querySelector('#hLifeGas').addEventListener('input', e => {
            this.year_life_gas = parseFloat(e.target.value) || 0;
            this.saveState();
        });

        // 计算按钮
        container.querySelector('#hCalcBtn').addEventListener('click', () => {
            this.render(container);
        });

        // 重置
        container.querySelector('#hResetBtn').addEventListener('click', () => {
            if (confirm('确定重置自采暖参数？')) {
                this.boiler = {
                    model: '', is_condenser: true, min_power: 3.8, max_power: 22.8,
                    has_outdoor_comp: false, price: 6999, service_life: 8, maintain_cost: 400
                };
                this.user_coeff = 1.0;
                this.year_life_gas = 300;
                this.customPrice = null;
                this.upgrade = {
                    compareKey: '', basePrice: 3500, upgradePrice: 7000,
                    baseFree: false, saveRate: 0.3, lifeYears: 10
                };
                this.saveState();
                this.render(container);
            }
        });

        // 帮我算 - 生活用气 / 年度保养
        this.bindGasHelper(container);
        this.bindMaintainHelper(container);

        // 侧边导航
        this.bindSideNav(container);
    }

    bindGasHelper(container) {
        const gasModal = container.querySelector('#gasModal');
        const openBtn = container.querySelector('#hGasHelpBtn');
        const closeBtn = container.querySelector('#gasModalCloseBtn');
        const backdrop = container.querySelector('#gasModalClose');
        const confirmBtn = container.querySelector('#gasConfirmBtn');
        const valEl = container.querySelector('#gasEstimateVal');

        if (!gasModal || !openBtn) return;

        // 打开弹窗
        openBtn.addEventListener('click', e => {
            e.preventDefault();
            gasModal.classList.add('open');
            this.updateGasEstimate(container);
        });

        // 关闭弹窗
        const closeModal = () => { gasModal.classList.remove('open'); };
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        // 选项点击
        gasModal.querySelectorAll('.hgm-opts').forEach(group => {
            group.querySelectorAll('.hgm-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    group.querySelectorAll('.hgm-opt').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    this.updateGasEstimate(container);
                });
            });
        });

        // 确认填入
        confirmBtn.addEventListener('click', () => {
            const val = parseInt(valEl.textContent) || 0;
            this.year_life_gas = val;
            this.saveState();
            const input = container.querySelector('#hLifeGas');
            if (input) input.value = val;
            closeModal();
            this.refreshResult(container);
        });
    }

    updateGasEstimate(container) {
        const modal = container.querySelector('#gasModal');
        const valEl = modal.querySelector('#gasEstimateVal');
        const base = HEATING_DATA.life_gas.base_value;
        let result = base;
        modal.querySelectorAll('.hgm-opts').forEach(group => {
            const active = group.querySelector('.hgm-opt.active');
            if (active) result *= parseFloat(active.dataset.coeff);
        });
        valEl.textContent = Math.ceil(result);
    }

    bindMaintainHelper(container) {
        const modal = container.querySelector('#maintainModal');
        const openBtn = container.querySelector('#hMaintainHelpBtn');
        const closeBtn = container.querySelector('#maintainModalCloseBtn');
        const backdrop = container.querySelector('#maintainModalClose');
        const confirmBtn = container.querySelector('#maintainConfirmBtn');
        const valEl = container.querySelector('#maintainEstimateVal');

        if (!modal || !openBtn) return;

        const syncTypeFromBoiler = () => {
            const typeGroup = modal.querySelector('.hgm-opts[data-maintain="type"]');
            if (!typeGroup) return;
            const wantId = this.boiler.is_condenser ? 'condenser' : 'conventional';
            typeGroup.querySelectorAll('.hgm-opt').forEach(o => {
                o.classList.toggle('active', o.dataset.id === wantId);
            });
        };

        openBtn.addEventListener('click', e => {
            e.preventDefault();
            syncTypeFromBoiler();
            modal.classList.add('open');
            this.updateMaintainEstimate(container);
        });

        const closeModal = () => { modal.classList.remove('open'); };
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        modal.querySelectorAll('.hgm-opts').forEach(group => {
            group.querySelectorAll('.hgm-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    group.querySelectorAll('.hgm-opt').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    this.updateMaintainEstimate(container);
                });
            });
        });

        confirmBtn.addEventListener('click', () => {
            const val = parseInt(valEl.textContent, 10) || 0;
            this.boiler.maintain_cost = val;
            this.saveState();
            const input = container.querySelector('#hMaintain');
            if (input) input.value = val;
            closeModal();
            this.refreshResult(container);
        });
    }

    updateMaintainEstimate(container) {
        const modal = container.querySelector('#maintainModal');
        if (!modal) return;
        const data = HEATING_DATA.maintain_estimate;
        const typeOpt = modal.querySelector('.hgm-opts[data-maintain="type"] .hgm-opt.active');
        const originOpt = modal.querySelector('.hgm-opts[data-maintain="origin"] .hgm-opt.active');
        const typeId = (typeOpt && typeOpt.dataset.id) || 'conventional';
        const originId = (originOpt && originOpt.dataset.id) || 'domestic';
        const typeMeta = data.types.find(t => t.id === typeId) || data.types[0];
        const period = typeMeta.period_years || 1;
        const unitPrice = data.prices[`${typeId}_${originId}`] || 0;
        const annual = Math.round(unitPrice / period);

        const valEl = modal.querySelector('#maintainEstimateVal');
        const detailEl = modal.querySelector('#maintainEstimateDetail');
        const hintEl = modal.querySelector('#maintainHint');
        if (valEl) valEl.textContent = String(annual);
        if (detailEl) {
            detailEl.textContent = period > 1
                ? `单次 ¥${unitPrice} ÷ ${period} 年 = ¥${annual}/年`
                : `单次 ¥${unitPrice}（年保）= ¥${annual}/年`;
        }
        if (hintEl && typeMeta.hint) {
            hintEl.innerHTML = `常规炉：周期 2 年 1 保，年均 = 单次价格 ÷ 2<br>冷凝炉：周期 1 年 1 保，年均 = 单次价格<br><strong>当前：${typeMeta.label}</strong> — ${typeMeta.hint}`;
        }
    }

    bindSideNav(container) {
        const nav = container.querySelector('#heatingNav');
        if (!nav) return;
        const links = nav.querySelectorAll('.hnav-item');
        const sections = ['sec-house', 'sec-central', 'sec-self', 'sec-result', 'sec-ref'];

        const setActive = (id) => {
            links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
        };

        // 点击滚动 + 立即切换样式
        links.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const id = link.getAttribute('href').slice(1);
                setActive(id);
                const target = container.querySelector('#' + id);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        // 滚动高亮
        const onScroll = () => {
            let current = sections[0];
            for (const id of sections) {
                const el = container.querySelector('#' + id);
                if (el && el.getBoundingClientRect().top <= 200) current = id;
            }
            setActive(current);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    syncRadios(container, name, val) {
        container.querySelectorAll(`input[name="${name}"]`).forEach(r => {
            const label = r.closest('.heating-radio');
            if (label) label.classList.toggle('active', r.value === (val ? '1' : '0'));
        });
    }

    refreshResult(container) {
        const compare = this.calcCompare();
        const section = container.querySelector('#sec-result');
        if (!section) return;
        const contentEl = section.querySelector('.heating-section-content');
        if (compare) {
            section.style.display = '';
            if (contentEl) {
                contentEl.innerHTML = this.renderCompare(compare);
                this.bindCompareMode(container);
                this.mountCostTrendChart(container, compare);
            }
        } else {
            section.style.display = 'none';
            if (contentEl) contentEl.innerHTML = '';
            if (this._trendChart) {
                try { this._trendChart.dispose(); } catch (e) {}
                this._trendChart = null;
            }
        }
        // 更新导航显示
        const nav = document.getElementById('heatingNav');
        if (nav) {
            const resultLink = nav.querySelector('a[href="#sec-result"]');
            if (resultLink) resultLink.style.display = compare ? '' : 'none';
        }
    }

    bindCompareMode(container) {
        const toggle = container.querySelector('#hCompareMode');
        if (toggle) {
            toggle.querySelectorAll('.hmode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    if (mode !== 'heating' && mode !== 'household') return;
                    if (this.compareMode === mode) return;
                    this.compareMode = mode;
                    this.saveState();
                    this.refreshResult(container);
                });
            });
        }
        const pauseChk = container.querySelector('#hPauseFee');
        if (pauseChk) {
            pauseChk.addEventListener('change', () => {
                this.includePauseFee = pauseChk.checked;
                this.saveState();
                this.refreshResult(container);
            });
        }
    }
}
