// Master: js/heating-assistant.js | Mirror: blog/tools/_shared/js/heating-assistant.js
// ========== 供暖助手 v2.0 ==========
class HeatingAssistantManager {
    constructor() {
        this.sheetOpen = false;
        this._refreshTimer = null;
        this._host = null;
        this._vvBound = false;
        this.area = 88.45;
        this.pavingArea = 61;
        this.pavingSameAsArea = false;
        this.selectedKey = '市热力集团城市热网__';
        // 自采暖参数
        this.boiler = {
            model: '',
            is_condenser: true,
            thermal_efficiency: 1.08,
            is_eta_customized: false,
            min_power: 3.8,
            max_power: 22.8,
            has_outdoor_comp: false,
            price: 6999,
            service_life: 8,
            maintain_cost: 400
        };
        this.user_coeff = 0.7;
        this.year_life_gas = 300;
        this.customPrice = null;
        // 难量化常量：默认对齐宣传图，高级可改
        this.heat_load = HEATING_DATA.constants.base_heat_load;
        this.gas_heat_equivalent = HEATING_DATA.constants.gas_heat_equivalent;
        // 对比口径：heating=刨除生活用气（默认） / household=家庭燃气总账
        this.compareMode = 'heating';
        // 改自采暖时是否计入停供基本热费（约 30%），默认开启
        this.includePauseFee = true;
        // 设备升级选型（可选）：当前表单机型 = 基准；仅当选择对比炉时计算回本 B
        this.upgrade = { compareKey: '' };
        this.compareBoiler = this.cloneBoiler(this.boiler);
        // 按机型名本地校正覆盖（不写回 JSON；重选机型仍保留；「重置参数」清空）
        this.boiler_overrides = {};
        this.loadState();
    }

    normalizeBoiler(boiler) {
        if (!boiler) return;
        if (boiler.is_eta_customized === undefined) boiler.is_eta_customized = false;
        const eta = Number(boiler.thermal_efficiency);
        if (!(eta > 0) || !isFinite(eta)) {
            boiler.thermal_efficiency = boiler.is_condenser ? 1.08 : 0.90;
        }
    }

    suggestedEta(boiler) {
        let eta = boiler.is_condenser ? 1.08 : 0.90;
        if (boiler.has_outdoor_comp) eta = Math.round((eta + 0.02) * 100) / 100;
        return eta;
    }

    applySuggestedEta(boiler) {
        if (!boiler || boiler.is_eta_customized) return;
        boiler.thermal_efficiency = this.suggestedEta(boiler);
    }

    resolveEta(boiler) {
        const eta = Number(boiler && boiler.thermal_efficiency);
        if (eta > 0 && isFinite(eta)) return eta;
        return (boiler && boiler.is_condenser) ? 1.08 : 0.90;
    }

    snapshotBoilerOverride(boiler) {
        if (!boiler) return null;
        return {
            is_condenser: !!boiler.is_condenser,
            thermal_efficiency: Number(boiler.thermal_efficiency),
            is_eta_customized: !!boiler.is_eta_customized,
            min_power: Number(boiler.min_power) || 0,
            max_power: Number(boiler.max_power) || 0,
            has_outdoor_comp: !!boiler.has_outdoor_comp,
            price: Number(boiler.price) || 0,
            service_life: Number(boiler.service_life) || 8,
            maintain_cost: Number(boiler.maintain_cost) || 0
        };
    }

    rememberBoilerOverride(boiler) {
        const name = boiler && boiler.model;
        if (!name) return;
        if (!this.boiler_overrides || typeof this.boiler_overrides !== 'object') {
            this.boiler_overrides = {};
        }
        this.boiler_overrides[name] = this.snapshotBoilerOverride(boiler);
    }

    hasBoilerOverride(modelName) {
        return !!(modelName && this.boiler_overrides && this.boiler_overrides[modelName]);
    }

    clearBoilerOverrides() {
        this.boiler_overrides = {};
    }

    loadState() {
        const saved = localStorage.getItem('heating_assistant_v2');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (d.area) this.area = d.area;
                if (d.pavingArea) this.pavingArea = d.pavingArea;
                if (d.pavingSameAsArea !== undefined) this.pavingSameAsArea = !!d.pavingSameAsArea;
                if (d.selectedKey) this.selectedKey = d.selectedKey;
                if (d.boiler) Object.assign(this.boiler, d.boiler);
                if (d.user_coeff !== undefined) this.user_coeff = d.user_coeff;
                if (d.year_life_gas) this.year_life_gas = d.year_life_gas;
                if (d.customPrice !== undefined) this.customPrice = d.customPrice;
                if (d.compareMode === 'heating' || d.compareMode === 'household') this.compareMode = d.compareMode;
                if (d.includePauseFee !== undefined) this.includePauseFee = !!d.includePauseFee;
                if (d.heat_load > 0) this.heat_load = d.heat_load;
                if (d.gas_heat_equivalent > 0) this.gas_heat_equivalent = d.gas_heat_equivalent;
                if (d.upgrade) Object.assign(this.upgrade, d.upgrade);
                if (d.boiler_overrides && typeof d.boiler_overrides === 'object') {
                    this.boiler_overrides = d.boiler_overrides;
                }
                if (d.compareBoiler) {
                    Object.assign(this.compareBoiler, d.compareBoiler);
                } else if (this.upgrade.compareKey && this.upgrade.compareKey !== 'custom') {
                    const m = HEATING_DATA.boiler_models[this.upgrade.compareKey];
                    if (m) this.compareBoiler = this.boilerFromCatalogWithOverride(m);
                } else if (this.upgrade.compareKey === 'custom') {
                    this.compareBoiler = this.cloneBoiler(this.boiler);
                    if (this.upgrade.upgradePrice) this.compareBoiler.price = this.upgrade.upgradePrice;
                    this.compareBoiler.model = '';
                }
            } catch (e) {}
        }
        const C = HEATING_DATA.constants;
        if (!(this.heat_load > 0)) this.heat_load = C.base_heat_load;
        if (!(this.gas_heat_equivalent > 0)) this.gas_heat_equivalent = C.gas_heat_equivalent;
        this.normalizeBoiler(this.boiler);
        this.normalizeBoiler(this.compareBoiler);
        if (this.pavingSameAsArea) this.pavingArea = this.area;
    }

    saveState() {
        localStorage.setItem('heating_assistant_v2', JSON.stringify({
            area: this.area,
            pavingArea: this.pavingArea,
            pavingSameAsArea: this.pavingSameAsArea,
            selectedKey: this.selectedKey,
            boiler: this.boiler,
            user_coeff: this.user_coeff,
            year_life_gas: this.year_life_gas,
            customPrice: this.customPrice,
            compareMode: this.compareMode,
            includePauseFee: this.includePauseFee,
            heat_load: this.heat_load,
            gas_heat_equivalent: this.gas_heat_equivalent,
            upgrade: this.upgrade,
            compareBoiler: this.compareBoiler,
            boiler_overrides: this.boiler_overrides || {}
        }));
    }

    cloneBoiler(src) {
        src = src || {};
        const isCond = !!src.is_condenser;
        const eta = Number(src.thermal_efficiency);
        return {
            model: src.model || '',
            is_condenser: isCond,
            thermal_efficiency: (eta > 0 && isFinite(eta)) ? eta : (isCond ? 1.08 : 0.90),
            is_eta_customized: !!src.is_eta_customized,
            min_power: src.min_power || 3.8,
            max_power: src.max_power || 22.8,
            has_outdoor_comp: !!src.has_outdoor_comp,
            price: src.price || 0,
            service_life: src.service_life || 8,
            maintain_cost: src.maintain_cost || 0
        };
    }

    boilerFromCatalog(m) {
        return {
            model: m.model_name,
            is_condenser: m.is_condenser,
            thermal_efficiency: m.thermal_efficiency || (m.is_condenser ? 1.08 : 0.90),
            is_eta_customized: false,
            min_power: m.min_power,
            max_power: m.max_power,
            has_outdoor_comp: m.has_outdoor_comp,
            price: m.boiler_price_ref,
            service_life: m.boiler_service_life,
            maintain_cost: m.annual_maintain_cost
        };
    }

    /** 目录默认 + 本机校正覆盖（若有） */
    boilerFromCatalogWithOverride(m) {
        const base = this.boilerFromCatalog(m);
        const ov = this.boiler_overrides && this.boiler_overrides[base.model];
        if (ov && typeof ov === 'object') {
            Object.assign(base, ov, { model: base.model });
            this.normalizeBoiler(base);
        }
        return base;
    }

    applyCompareKey(key) {
        this.upgrade.compareKey = key;
        if (!key) return;
        if (key === 'custom') {
            this.compareBoiler = this.cloneBoiler(this.boiler);
            this.compareBoiler.model = '';
            return;
        }
        const m = HEATING_DATA.boiler_models[key];
        if (m) this.compareBoiler = this.boilerFromCatalogWithOverride(m);
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

        const heatLoad = this.heat_load > 0 ? this.heat_load : C.base_heat_load;
        const H = this.gas_heat_equivalent > 0 ? this.gas_heat_equivalent : C.gas_heat_equivalent;
        const eta = this.resolveEta(this.boiler);
        const days = C.heating_season_days;
        const hours = C.hour_per_day;

        // Q_season = 面积 × 热指标 × 小时 × 天数 × 使用系数
        const Q_season = area * heatLoad * hours * days * this.user_coeff;
        const season_gas = Q_season / (H * eta);
        const daily_real_gas = season_gas / days;
        const daily_base_kwh = area * heatLoad * hours;
        const daily_base_gas = daily_base_kwh / H;

        // 阶梯气价（生活用气参与梯度）— 计价口径未改
        const total_gas = season_gas + this.year_life_gas;
        const ladder_total = this.calcLadderCost(total_gas);
        const ladder_life = this.calcLadderCost(this.year_life_gas);
        const gas_cost = ladder_total.cost;
        const tier = ladder_total.tier;
        const life_gas_cost = ladder_life.cost;
        const heating_gas_cost = gas_cost - life_gas_cost;

        const year_depreciation = this.boiler.price / this.boiler.service_life;
        const year_fixed = year_depreciation + this.boiler.maintain_cost;
        const heating_compare_cost = heating_gas_cost + year_fixed;
        const household_total_cost = gas_cost + year_fixed;

        return {
            paving_area: area,
            Q_season,
            eta,
            daily_base_kwh, daily_base_gas, daily_real_gas, season_gas, total_gas,
            tier, gas_cost, life_gas_cost, heating_gas_cost,
            ladder_total, ladder_life,
            year_depreciation, year_fixed,
            heating_compare_cost, household_total_cost,
            total_cost: household_total_cost,
            avg_price: total_gas > 0 ? gas_cost / total_gas : 0,
            heating_avg_price: season_gas > 0 ? heating_gas_cost / season_gas : 0,
            constants: {
                base_heat_load: heatLoad,
                hour_per_day: hours,
                gas_heat_equivalent: H,
                heating_season_days: days
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

    /** 机型对比：当前表单炉（基准）vs 所选对比炉 的增量回本 */
    calcUpgradeAnalysis() {
        if (!this.upgrade.compareKey) return null;

        const b0 = this.boiler;
        const b1 = this.compareBoiler;
        const V0 = this.calcSeasonGasForBoiler(b0);
        const V1 = this.calcSeasonGasForBoiler(b1);
        const eta = V0 > 0 ? (V0 - V1) / V0 : 0;
        const compareName = (this.upgrade.compareKey !== 'custom' && b1.model)
            ? b1.model
            : (b1.model || '自定义对比炉');

        const dV = V0 - V1;
        const life = Math.max(0, this.year_life_gas || 0);
        const costBase = this.calcLadderCost(life + V0).cost;
        const costUp = this.calcLadderCost(life + V1).cost;
        const dC = costBase - costUp;

        const pBase = Math.max(0, Number(b0.price) || 0);
        const pUp = Math.max(0, Number(b1.price) || 0);
        const dP = pUp - pBase;
        const years = Math.max(1, Number(b1.service_life) || Number(b0.service_life) || 8);

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
        const baseLabel = this.boiler.model || '当前表单机型';

        return {
            enabled: true,
            compareName,
            baseLabel,
            V0, V1, eta, dV,
            life_gas: life,
            cost_base_gas: costBase,
            cost_upgrade_gas: costUp,
            dC, dP, pBase, pUp,
            years, payback, paybackLabel, netLife, recommend
        };
    }

    /** 按指定壁挂炉参数估算采暖季耗气：V = Q / (H × η) */
    calcSeasonGasForBoiler(boiler) {
        const C = HEATING_DATA.constants;
        const area = this.pavingArea;
        if (area <= 0) return 0;
        const heatLoad = this.heat_load > 0 ? this.heat_load : C.base_heat_load;
        const H = this.gas_heat_equivalent > 0 ? this.gas_heat_equivalent : C.gas_heat_equivalent;
        const eta = this.resolveEta(boiler);
        const Q_season = area * heatLoad * C.hour_per_day * C.heating_season_days * this.user_coeff;
        return Q_season / (H * eta);
    }

    /** 累计花费趋势：年限与各方案序列 */
    buildCostTrendData(c) {
        const s = c.self;
        const isHeatingMode = c.mode === 'heating';
        const pause = c.includePauseFee ? c.pause_basic_fee : 0;
        const life = Math.max(0, this.year_life_gas || 0);
        const maintain = Math.max(0, this.boiler.maintain_cost || 0);
        const lifeCost = this.calcLadderCost(life).cost;

        let horizon;
        if (c.upgrade && c.upgrade.payback != null && c.upgrade.payback > 0) {
            horizon = Math.ceil(c.upgrade.payback) + 1;
        } else if (c.upgrade) {
            horizon = Math.max(2, Math.ceil(c.upgrade.years || this.boiler.service_life || 8) + 1);
        } else {
            horizon = Math.max(2, Math.ceil(this.boiler.service_life || 8) + 1);
        }
        horizon = Math.min(40, Math.max(2, horizon));

        const years = [];
        for (let y = 0; y <= horizon; y++) years.push(y);

        const centralAnnual = c.central_fee;
        const centralSeries = years.map(y => Math.round(y * centralAnnual));
        const series = [
            { key: 'central', name: '市政集中供暖', color: '#60a5fa', data: centralSeries, area: true }
        ];

        let noteParts = [];
        let markPaybackYear = null;

        if (c.upgrade) {
            // 与回本 B 同一口径：黄=当前炉，绿=对比炉
            const baseCapex = Math.max(0, c.upgrade.pBase || 0);
            const upCapex = Math.max(0, c.upgrade.pUp || 0);

            const seasonBase = c.upgrade.V0;
            const totalBase = this.calcLadderCost(life + seasonBase).cost;
            const gasBase = isHeatingMode ? (totalBase - lifeCost) : totalBase;
            const opexExtra = maintain + pause;
            const baseAnnual = gasBase + opexExtra;

            const seasonUp = c.upgrade.V1 != null ? c.upgrade.V1 : c.upgrade.V0 * (1 - c.upgrade.eta);
            const totalUp = this.calcLadderCost(life + seasonUp).cost;
            const gasUp = isHeatingMode ? (totalUp - lifeCost) : totalUp;
            const upAnnual = gasUp + opexExtra;

            const baseName = `当前炉 · ${c.upgrade.baseLabel} ¥${baseCapex.toLocaleString('zh-CN')}`;
            const upName = `对比炉 · ${c.upgrade.compareName} ¥${upCapex.toLocaleString('zh-CN')}`;

            series.push(
                { key: 'base', name: baseName, color: '#fbbf24', data: years.map(y => Math.round(baseCapex + y * baseAnnual)), area: false },
                { key: 'upgrade', name: upName, color: '#4ade80', data: years.map(y => Math.round(upCapex + y * upAnnual)), area: false }
            );

            if (c.upgrade.payback != null && c.upgrade.payback > 0) {
                markPaybackYear = Math.round(c.upgrade.payback * 10) / 10;
            }

            noteParts = [
                `回本 B 口径：黄线=当前炉（购炉 ¥${baseCapex.toFixed(0)}，年采暖气费 ¥${gasBase.toFixed(2)}），绿线=对比炉（购炉 ¥${upCapex.toFixed(0)}，年采暖气费 ¥${gasUp.toFixed(2)}）`,
                `年维保与停供基本热费两边相同（各 ¥${opexExtra.toFixed(0)}），不影响交汇`
            ];
            noteParts.push(`黄/绿交汇年 ≈ 机型对比回本 B（${c.upgrade.paybackLabel}）`);
        } else {
            // 未选对比机型：集中 vs 当前自采暖
            const selfGasAnnual = isHeatingMode ? s.heating_gas_cost : s.gas_cost;
            const selfAnnual = selfGasAnnual + maintain + pause;
            const selfCapex = Math.max(0, this.boiler.price || 0);
            const selfName = this.boiler.model
                ? `自采暖 · ${this.boiler.model} ¥${selfCapex.toLocaleString('zh-CN')}`
                : `自采暖 · 当前方案 ¥${selfCapex.toLocaleString('zh-CN')}`;
            const selfSeries = years.map(y => Math.round(selfCapex + y * selfAnnual));
            series.push({ key: 'self', name: selfName, color: '#fbbf24', data: selfSeries, area: false });

            noteParts = [
                `自采暖曲线含初次购炉成本、每年${isHeatingMode ? '采暖气费' : '燃气总费'}（¥${selfGasAnnual.toFixed(2)}）`,
                `年维保（¥${maintain.toFixed(0)}）`
            ];
            if (c.includePauseFee) noteParts.push(`停供基本热费（¥${pause.toFixed(0)}）`);
        }

        const last = series[series.length - 1];
        return {
            horizon,
            years,
            series,
            markPaybackYear,
            note: '注：' + noteParts.join('；') + '。',
            summaries: c.upgrade ? [
                { label: `集中供暖 ${horizon}年总成本`, value: '¥' + centralSeries[horizon].toLocaleString('zh-CN') },
                { label: `${c.upgrade.compareName} ${horizon}年总成本`, value: '¥' + last.data[horizon].toLocaleString('zh-CN') },
                { label: '升级回本周期 (B)', value: c.upgrade.paybackLabel }
            ] : [
                { label: `集中供暖 ${horizon}年总成本`, value: '¥' + centralSeries[horizon].toLocaleString('zh-CN') },
                { label: `自采暖 ${horizon}年总成本`, value: '¥' + last.data[horizon].toLocaleString('zh-CN') },
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
        if (el.offsetParent === null || el.clientWidth < 8) {
            return;
        }
        const t = this.buildCostTrendData(c);
        let chart = this._trendChart;
        if (!chart || chart.getDom() !== el) {
            if (chart) {
                try { chart.dispose(); } catch (e) {}
            }
            chart = echarts.init(el);
            this._trendChart = chart;
        }
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
                data: s.data,
                markLine: (s.key === 'upgrade' && t.markPaybackYear != null) ? {
                    symbol: 'none',
                    label: {
                        formatter: '回本 B ≈ ' + t.markPaybackYear + ' 年',
                        color: '#fbbf24',
                        fontSize: 11
                    },
                    lineStyle: { type: 'dashed', color: 'rgba(251,191,36,0.7)' },
                    data: [{ xAxis: String(Math.min(t.horizon, Math.round(t.markPaybackYear))) }]
                } : undefined
            }))
        });
        if (!this._trendResizeBound) {
            this._trendResizeBound = () => {
                if (this._trendChart) this._trendChart.resize();
            };
            window.addEventListener('resize', this._trendResizeBound);
        }
        requestAnimationFrame(() => {
            if (this._trendChart) this._trendChart.resize();
        });
    }

    applyPavingSameLock(container) {
        const paving = container.querySelector('#hPaving');
        const chk = container.querySelector('#hSameArea');
        if (chk) chk.checked = this.pavingSameAsArea;
        if (!paving) return;
        if (this.pavingSameAsArea) {
            this.pavingArea = this.area;
            paving.value = this.area;
            paving.setAttribute('readonly', 'true');
            paving.classList.add('is-locked');
        } else {
            paving.removeAttribute('readonly');
            paving.classList.remove('is-locked');
        }
    }

    modeTagLabel(mode) {
        return mode === 'household' ? '含生活用气' : '仅采暖';
    }

    resolveUserMode() {
        const modes = HEATING_DATA.user_modes || [];
        const hit = modes.find(m => Math.abs(Number(m.coeff) - Number(this.user_coeff)) < 0.001);
        return hit || modes.find(m => Math.abs(Number(m.coeff) - 0.7) < 0.001) || modes[0] || { label: '正常', coeff: 0.7, desc: '' };
    }

    renderUsageModeControls(idPrefix) {
        const modes = HEATING_DATA.user_modes || [];
        const cur = this.resolveUserMode();
        return `
            <div class="heating-usage-block" id="${idPrefix}UsageMode">
                <div class="heating-usage-head">
                    <span class="heating-usage-title">使用模式</span>
                    <span class="heating-usage-meta">×${Number(cur.coeff).toFixed(1)} · ${cur.desc || ''}</span>
                </div>
                <div class="heating-usage-seg" role="tablist" aria-label="使用模式">
                    ${modes.map(m => {
                        const active = Math.abs(Number(m.coeff) - Number(this.user_coeff)) < 0.001 ? 'active' : '';
                        return `<button type="button" class="husage-btn ${active}" data-coeff="${m.coeff}" title="${m.label}（${m.coeff}）· ${m.desc || ''}" role="tab" aria-selected="${active ? 'true' : 'false'}">${m.label}</button>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderModeControls(c, idPrefix) {
        const isHeatingMode = c.mode === 'heating';
        const pausePct = Math.round((c.pause_ratio || 0.3) * 100);
        return `
            <div class="heating-mode-toggle" id="${idPrefix}CompareMode">
                <button type="button" class="hmode-btn ${isHeatingMode ? 'active' : ''}" data-mode="heating" title="刨除生活用气，只比供暖本身">纯供暖对比</button>
                <button type="button" class="hmode-btn ${!isHeatingMode ? 'active' : ''}" data-mode="household" title="含生活用气的家庭燃气总账">家庭总燃气</button>
            </div>
            <label class="heating-pause-opt">
                <input type="checkbox" id="${idPrefix}PauseFee" ${c.includePauseFee ? 'checked' : ''}>
                <span>计入停供基本热费（约 ${pausePct}%）</span>
            </label>
            <div class="heating-mode-hint">${isHeatingMode
                ? '生活用气只参与阶梯计价，不计入对比费用；两边比的是「供暖本身」花了多少钱'
                : '自采暖侧含全年生活用气+采暖用气；集中供暖侧仍只有供暖费，适合看家庭气费总账，不宜直接比优劣'}
                ${c.includePauseFee
                    ? `；改自采暖后停供仍需缴基本热费约 ${pausePct}%（¥${c.pause_basic_fee.toFixed(2)}），已加到自采暖侧`
                    : '；未计入停供基本热费，可打开上方开关纳入对比'}</div>
        `;
    }

    renderCostStructure(gasShare, pauseShare, equipShare) {
        const slices = [
            { color: 'var(--orange)', label: '气费', value: gasShare, leg: 'hbs-leg-gas' },
            { color: '#a78bfa', label: '停供基本热费', value: pauseShare, leg: 'hbs-leg-pause' },
            { color: 'var(--accent)', label: '设备/维保', value: equipShare, leg: 'hbs-leg-equip' },
        ].filter(s => s.value > 0.005);
        const total = slices.reduce((n, s) => n + s.value, 0);
        if (!total) return '';
        const r = 37;
        const circ = 2 * Math.PI * r;
        let offset = 0;
        const rings = slices.map(s => {
            const len = (s.value / total) * circ;
            const ring = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${s.color}" stroke-width="18" stroke-dasharray="${len.toFixed(3)} ${(circ - len).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 50 50)"/>`;
            offset += len;
            return ring;
        }).join('');
        const legend = slices.map(s => {
            const pct = (s.value / total) * 100;
            return `<span class="${s.leg}">${s.label} ${pct.toFixed(0)}% · ¥${s.value.toFixed(0)}</span>`;
        }).join('');
        return `
            <div class="heating-board-pie-wrap" title="自采暖费用结构：气费 / 停供基本热费 / 设备·维保">
                <svg class="heating-board-pie" viewBox="0 0 100 100" role="img" aria-label="自采暖费用结构">${rings}</svg>
                <div class="heating-board-stack-legend">${legend}</div>
            </div>`;
    }

    renderBoard(c) {
        if (!c) {
            return `<div class="heating-board-kicker">实时费用看板</div>
            ${this.renderUsageModeControls('board')}
            <div class="heating-board-empty">填写面积并选择供暖类型后，这里会实时给出年度对比。</div>`;
        }
        const cheaperSelf = c.diff < 0;
        const cheaperCentral = c.diff > 0;
        const pct = c.central_fee > 0 ? Math.abs(c.diff) / c.central_fee * 100 : 0;
        const gasShare = Math.max(0, c.self_gas_part || 0);
        const pauseShare = c.includePauseFee ? Math.max(0, c.pause_basic_fee || 0) : 0;
        const equipShare = Math.max(0, c.self.year_fixed || 0);
        return `
            <div class="heating-board-kicker">实时费用看板</div>
            ${this.renderUsageModeControls('board')}
            ${this.renderModeControls(c, 'board')}
            <div class="heating-board-kpis">
                <div class="heating-board-kpi">
                    <span class="bk-label">集中供暖</span>
                    <span class="bk-val cmp-central">¥${c.central_fee.toFixed(0)}</span>
                </div>
                <div class="heating-board-kpi">
                    <span class="bk-label">${c.mode === 'heating' ? '自采暖（采暖）' : '自采暖（总账）'}</span>
                    <span class="bk-val cmp-self">¥${c.self_total.toFixed(0)}</span>
                </div>
            </div>
            <div class="heating-board-diff ${cheaperSelf ? 'is-save' : cheaperCentral ? 'is-cost' : ''}">
                ${cheaperSelf ? '自采暖更省' : cheaperCentral ? '自采暖更贵' : '持平'}
                · ${cheaperCentral ? '+' : ''}¥${Math.abs(c.diff).toFixed(0)}/年
                ${c.central_fee > 0 ? `（${pct.toFixed(0)}%）` : ''}
            </div>
            ${this.renderCostStructure(gasShare, pauseShare, equipShare)}
            <div class="heating-board-payback">回本 A · ${c.payback_years != null ? c.payback_years.toFixed(1) + ' 年' : '不适用'}</div>
        `;
    }

    peekHeadline(c) {
        if (!c) return { main: '填写参数后实时出结论', extra: '', showExtra: false };
        const cheaperSelf = c.diff < 0;
        const cheaperCentral = c.diff > 0;
        const abs = Math.abs(c.diff);
        const main = cheaperSelf
            ? `自采暖预计省 ¥${abs.toFixed(0)}/年`
            : cheaperCentral
                ? `自采暖预计多花 ¥${abs.toFixed(0)}/年`
                : '自采暖与集中供暖持平';
        const extra = (c.payback_years != null && c.payback_years > 0 && c.payback_years < 40)
            ? `回本 ${c.payback_years.toFixed(1)}年`
            : '';
        return { main, extra, showExtra: !!extra };
    }

    renderPeekBar(c) {
        const tag = this.modeTagLabel(this.compareMode);
        const h = this.peekHeadline(c);
        const open = this.sheetOpen;
        return `
            <button type="button" class="heating-peek-row" id="heatingPeekToggle" aria-expanded="${open ? 'true' : 'false'}">
                <span class="heating-mode-tag">[${tag}]</span>
                <span class="heating-peek-main">${h.main}</span>
                ${h.showExtra ? `<span class="heating-peek-extra">${h.extra}</span>` : ''}
                <span class="heating-peek-cta">${open ? '收起明细 ▼' : '查看明细 ▲'}</span>
            </button>
        `;
    }

    renderSheetPanel(c) {
        if (!c) {
            return `
                <div class="heating-sheet-head">
                    <span>年度对比</span>
                    <button type="button" class="heating-sheet-close" id="heatingSheetClose">关闭</button>
                </div>
                <div class="heating-board-empty">暂无对比结果</div>
            `;
        }
        const gasShare = Math.max(0, c.self_gas_part || 0);
        const pauseShare = c.includePauseFee ? Math.max(0, c.pause_basic_fee || 0) : 0;
        const equipShare = Math.max(0, c.self.year_fixed || 0);
        return `
            <div class="heating-sheet-head">
                <span>年度对比</span>
                <button type="button" class="heating-sheet-close" id="heatingSheetClose">关闭</button>
            </div>
            <div class="heating-sheet-lines">
                <div class="heating-sheet-line"><span>市政集中供暖</span><span>¥${c.central_fee.toFixed(2)}</span></div>
                <div class="heating-sheet-line"><span>壁挂炉自采暖</span><span>¥${c.self_total.toFixed(2)}</span></div>
                <div class="heating-sheet-line"><span>回本 A</span><span>${c.payback_years != null ? c.payback_years.toFixed(1) + ' 年' : '不适用'}</span></div>
            </div>
            ${this.renderCostStructure(gasShare, pauseShare, equipShare)}
            ${this.renderUsageModeControls('sheet')}
            ${this.renderModeControls(c, 'sheet')}
            <p class="heating-sheet-foot">修改上方表单或此处档位，计算结果实时更新</p>
        `;
    }

    scheduleRefresh(container, immediate) {
        if (immediate) {
            if (this._refreshTimer) {
                clearTimeout(this._refreshTimer);
                this._refreshTimer = null;
            }
            this.refreshResult(container);
            return;
        }
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
        this._refreshTimer = setTimeout(() => {
            this._refreshTimer = null;
            this.refreshResult(container);
        }, 100);
    }

    updateMobileSheetPosition() {
        const sheet = document.getElementById('heatingMobileSheet');
        if (!sheet) return;
        if (window.visualViewport) {
            const pendingBottom = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
            sheet.style.bottom = Math.max(0, pendingBottom) + 'px';
        } else {
            sheet.style.bottom = 'env(safe-area-inset-bottom, 0px)';
        }
    }

    bindVisualViewport() {
        if (this._vvBound) return;
        this._vvBound = true;
        const fn = () => {
            this.updateMobileSheetPosition();
            this.applySheetLock();
            if (this._host && this._trendChart) {
                try { this._trendChart.resize(); } catch (e) {}
            } else if (this._host) {
                const c = this.calcCompare();
                if (c) this.mountCostTrendChart(this._host, c);
            }
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', fn);
            window.visualViewport.addEventListener('scroll', fn);
        }
        window.addEventListener('resize', fn);
        this.updateMobileSheetPosition();
    }

    applySheetLock() {
        const mobile = window.matchMedia('(max-width: 1099px)').matches;
        const lock = mobile && this.sheetOpen;
        document.documentElement.classList.toggle('heating-sheet-lock', lock);
        document.body.classList.toggle('heating-sheet-lock', lock);
        const sheet = document.getElementById('heatingMobileSheet');
        const backdrop = document.getElementById('heatingSheetBackdrop');
        if (sheet) sheet.classList.toggle('is-open', this.sheetOpen);
        if (backdrop) backdrop.classList.toggle('is-open', this.sheetOpen);
        const toggle = document.getElementById('heatingPeekToggle');
        if (toggle) toggle.setAttribute('aria-expanded', this.sheetOpen ? 'true' : 'false');
        const cta = toggle && toggle.querySelector('.heating-peek-cta');
        if (cta) cta.textContent = this.sheetOpen ? '收起明细 ▼' : '查看明细 ▲';
    }

    bindSheet(container) {
        const sheet = container.querySelector('#heatingMobileSheet');
        if (sheet && !sheet.dataset.bound) {
            sheet.dataset.bound = '1';
            sheet.addEventListener('click', (e) => {
                if (e.target.closest('#heatingPeekToggle')) {
                    this.sheetOpen = !this.sheetOpen;
                    this.applySheetLock();
                    return;
                }
                if (e.target.closest('#heatingSheetClose')) {
                    this.sheetOpen = false;
                    this.applySheetLock();
                }
            });
        }
        const backdrop = container.querySelector('#heatingSheetBackdrop');
        if (backdrop && !backdrop.dataset.bound) {
            backdrop.dataset.bound = '1';
            backdrop.addEventListener('click', () => {
                this.sheetOpen = false;
                this.applySheetLock();
            });
        }
        this.applySheetLock();
        this.bindVisualViewport();
    }

    attrEscape(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    tipBtn(text) {
        const plain = String(text || '').replace(/<[^>]+>/g, '');
        return `<button type="button" class="heating-tip" aria-label="说明" aria-expanded="false" data-tip="${this.attrEscape(plain)}">i</button>`;
    }

    closeTipOverlay() {
        const overlay = document.getElementById('heatingTipOverlay');
        if (overlay) overlay.classList.remove('is-open');
        document.querySelectorAll('.heating-tip.is-open').forEach(el => {
            el.classList.remove('is-open');
            el.setAttribute('aria-expanded', 'false');
        });
    }

    ensureTipOverlay() {
        let overlay = document.getElementById('heatingTipOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'heatingTipOverlay';
        overlay.className = 'heating-tip-overlay';
        overlay.innerHTML = `
            <div class="heating-tip-dialog" role="dialog" aria-modal="true" aria-labelledby="heatingTipText">
                <p id="heatingTipText"></p>
                <button type="button" class="heating-btn heating-btn-primary heating-tip-close" data-tip-close>知道了</button>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.closest('[data-tip-close]')) this.closeTipOverlay();
        });
        if (!this._tipVvBound) {
            this._tipVvBound = true;
            const fn = () => {
                const tip = document.querySelector('.heating-tip.is-open');
                const ov = document.getElementById('heatingTipOverlay');
                if (tip && ov && ov.classList.contains('is-open')) this.placeTipOnScreen(tip);
            };
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', fn);
                window.visualViewport.addEventListener('scroll', fn);
            }
            window.addEventListener('resize', fn);
        }
        return overlay;
    }

    placeTipOnScreen(tip) {
        const overlay = document.getElementById('heatingTipOverlay');
        const dialog = overlay && overlay.querySelector('.heating-tip-dialog');
        if (!overlay || !dialog) return;
        const vv = window.visualViewport;
        const vw = vv ? vv.width : window.innerWidth;
        const vh = vv ? vv.height : window.innerHeight;
        const ox = vv ? vv.offsetLeft : 0;
        const oy = vv ? vv.offsetTop : 0;
        overlay.style.top = oy + 'px';
        overlay.style.left = ox + 'px';
        overlay.style.width = vw + 'px';
        overlay.style.height = vh + 'px';
        const margin = 16;
        dialog.style.left = '50%';
        dialog.style.right = 'auto';
        dialog.style.width = Math.min(360, Math.max(0, vw - margin * 2)) + 'px';
        dialog.style.top = margin + 'px';
        const dh = dialog.getBoundingClientRect().height;
        const tipRect = tip.getBoundingClientRect();
        const tipBottom = tipRect.bottom - oy;
        const tipTop = tipRect.top - oy;
        let top = tipBottom + 8;
        if (top + dh > vh - margin) top = tipTop - dh - 8;
        if (top < margin) top = margin;
        if (top + dh > vh - margin) top = Math.max(margin, vh - dh - margin);
        dialog.style.top = top + 'px';
    }

    openTipOverlay(tip) {
        const overlay = this.ensureTipOverlay();
        const textEl = overlay.querySelector('#heatingTipText');
        if (!textEl) return;
        textEl.textContent = tip.getAttribute('data-tip') || '';
        this.closeTipOverlay();
        tip.classList.add('is-open');
        tip.setAttribute('aria-expanded', 'true');
        overlay.classList.add('is-open');
        this.placeTipOnScreen(tip);
    }

    bindHintTips(container) {
        if (!container || container.dataset.tipBound) return;
        container.dataset.tipBound = '1';
        this.ensureTipOverlay();
        container.addEventListener('click', (e) => {
            const tip = e.target.closest('.heating-tip');
            if (!tip) {
                this.closeTipOverlay();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            const was = tip.classList.contains('is-open');
            this.closeTipOverlay();
            if (!was) this.openTipOverlay(tip);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeTipOverlay();
        });
    }

    renderEtaField(boiler, idPrefix, chipGroup) {
        const etaPct = Math.round(this.resolveEta(boiler) * 100);
        const presets = HEATING_DATA.efficiency_presets || [0.90, 0.94, 0.98, 1.04, 1.08];
        const etaTip = '填百分数，如 108 表示 108%。常见铭牌/宣传值可点选；手改后不再被「是否冷凝/室外补偿」覆盖';
        return `
            <div class="heating-field heating-field-span2">
                <label for="${idPrefix}Eta">热效率 η ${this.tipBtn(etaTip)}</label>
                <div class="heating-eta-row">
                    <div class="heating-input-with-unit">
                        <input type="number" class="heating-input" id="${idPrefix}Eta" value="${etaPct}" min="80" max="110" step="1" inputmode="numeric">
                        <span class="heating-unit" aria-hidden="true">%</span>
                    </div>
                    <div class="heating-eta-chips" data-eta-group="${chipGroup}">
                        ${presets.map(p => {
                            const pct = Math.round(p * 100);
                            const active = Math.abs(etaPct - pct) < 0.5 ? 'active' : '';
                            return `<button type="button" class="heating-eta-chip ${active}" data-eta="${pct}">${pct}%</button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="heating-hint">${etaTip}</div>
            </div>
        `;
    }

    renderCompareBoilerFields() {
        if (!this.upgrade.compareKey) return '';
        const b = this.compareBoiler;
        const isCustom = this.upgrade.compareKey === 'custom';
        return `
                        <div class="heating-compare-block">
                            <div class="heating-compare-block-title">${isCustom ? '自定义对比炉参数' : '对比炉参数（已载入所选机型，可按报价微调）'}</div>
                            <p class="heating-hint heating-field-span2">耗气按 V=Q/(H×η)；相对节能率是两边 η 演算结果。趋势图年限：有回本按回本周期+1，否则按对比炉质保年限+1。</p>
                            ${this.renderEtaField(b, 'hCmp', 'cmp')}
                            <div class="heating-field">
                                <label>是否全预混冷凝炉 ${this.tipBtn('未手改 η 时：否→建议 90%，是→建议 108%')}</label>
                                <div class="heating-radio-group">
                                    <label class="heating-radio ${b.is_condenser ? 'active' : ''}"><input type="radio" name="cmpCondenser" value="1" ${b.is_condenser ? 'checked' : ''}> 是</label>
                                    <label class="heating-radio ${!b.is_condenser ? 'active' : ''}"><input type="radio" name="cmpCondenser" value="0" ${!b.is_condenser ? 'checked' : ''}> 否</label>
                                </div>
                                <div class="heating-hint">未手改 η 时：否→建议 90%，是→建议 108%</div>
                            </div>
                            <div class="heating-field">
                                <label>是否带室外温度补偿 ${this.tipBtn('未手改 η 时：有补偿相对建议 η +2 个百分点')}</label>
                                <div class="heating-radio-group">
                                    <label class="heating-radio ${b.has_outdoor_comp ? 'active' : ''}"><input type="radio" name="cmpOutdoor" value="1" ${b.has_outdoor_comp ? 'checked' : ''}> 是</label>
                                    <label class="heating-radio ${!b.has_outdoor_comp ? 'active' : ''}"><input type="radio" name="cmpOutdoor" value="0" ${!b.has_outdoor_comp ? 'checked' : ''}> 否</label>
                                </div>
                                <div class="heating-hint">未手改 η 时：有补偿相对建议 η +2 个百分点</div>
                            </div>
                            <div class="heating-field">
                                <label>壁挂炉采购总价（元）</label>
                                <input type="number" class="heating-input" id="hCmpPrice" value="${b.price}" min="0" step="1" inputmode="decimal">
                            </div>
                            <div class="heating-field">
                                <label>计划使用/质保年限</label>
                                <input type="number" class="heating-input" id="hCmpLife" value="${b.service_life}" min="1" step="1" inputmode="numeric">
                            </div>
                            <div class="heating-field">
                                <label>年度保养费用（元）</label>
                                <input type="number" class="heating-input" id="hCmpMaintain" value="${b.maintain_cost}" min="0" step="50" inputmode="decimal">
                            </div>
                            <details class="heating-advanced heating-field-span2">
                                <summary>规格信息（不参与耗气）</summary>
                                <div class="heating-advanced-grid">
                                    <div class="heating-field">
                                        <label>最小输出功率（kW） ${this.tipBtn('规格信息，不参与耗气')}</label>
                                        <input type="number" class="heating-input" id="hCmpMinPower" value="${b.min_power}" min="0" step="0.1" inputmode="decimal">
                                    </div>
                                    <div class="heating-field">
                                        <label>最大输出功率（kW） ${this.tipBtn('规格信息，不参与耗气')}</label>
                                        <input type="number" class="heating-input" id="hCmpMaxPower" value="${b.max_power}" min="0" step="0.1" inputmode="decimal">
                                    </div>
                                </div>
                            </details>
                        </div>
        `;
    }

    // ========== 渲染 ==========
    render(container) {
        const { residential, commercial } = this.getOptions();
        const selected = this.getSelectedOption();
        const central = this.calcCentral();
        const selfResult = this.calcSelfHeating();
        const compare = this.calcCompare();

        this._host = container;
        container.innerHTML = `
            <div class="heating-page">
                <div class="heating-header">
                    <div class="heating-title">
                        <h2>供暖助手</h2>
                        <p class="heating-desc">市政集中供暖 vs 燃气壁挂炉自采暖 · 年度成本对比</p>
                        <p class="heating-live-hint">参数已实时演算</p>
                    </div>
                </div>
                <div class="heating-main-grid">
                <main class="heating-main-form">

                <!-- 房屋信息 -->
                <div class="heating-section" id="sec-house">
                    <div class="heating-section-title">🏠 房屋信息</div>
                    <div class="heating-row">
                        <div class="heating-field">
                            <label for="hArea">房本建筑面积（㎡） ${this.tipBtn('集中供暖唯一计费面积')}</label>
                            <input type="number" class="heating-input" id="hArea" value="${this.area}" min="0" step="0.01" inputmode="decimal">
                            <div class="heating-hint">集中供暖唯一计费面积</div>
                        </div>
                        <div class="heating-field">
                            <div class="heating-field-header">
                                <label for="hPaving">地暖实际铺设面积（㎡） ${this.tipBtn('自采暖专用，扣除柜体、厨卫等不铺区域；不确定时可勾选同房本面积')}</label>
                                <label class="heating-checkbox-inline">
                                    <input type="checkbox" id="hSameArea" ${this.pavingSameAsArea ? 'checked' : ''}> 同房本面积
                                </label>
                            </div>
                            <input type="number" class="heating-input ${this.pavingSameAsArea ? 'is-locked' : ''}" id="hPaving" value="${this.pavingSameAsArea ? this.area : this.pavingArea}" min="0" step="0.01" inputmode="decimal" ${this.pavingSameAsArea ? 'readonly' : ''}>
                            <div class="heating-hint">自采暖专用，扣除柜体、厨卫等不铺区域；不确定时可勾选同房本面积</div>
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
                                            <input type="number" class="tc-price-input" id="hCustomPrice" value="${this.customPrice !== null ? this.customPrice : ''}" min="0" step="0.5" placeholder="输入" inputmode="decimal">
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
                            <label>机型快捷选择 ${this.tipBtn('选机型载入目录默认；手改会按机型名记在本机，再选仍保留。永久改默认请改 JSON')}</label>
                            <select class="heating-select" id="hModel">
                                <option value="">自定义参数</option>
                                ${HEATING_DATA.boiler_models.map((m, i) => `<option value="${i}" ${this.boiler.model === m.model_name ? 'selected' : ''} title="${(m.remark || '').replace(/"/g, '&quot;')}">${m.model_name}</option>`).join('')}
                            </select>
                            <div class="heating-hint">选机型载入目录默认；手改会按机型名记在本机，再选仍保留${this.hasBoilerOverride(this.boiler.model) ? ' · <strong>当前机型已校正</strong>' : ''}。永久改默认请改 JSON</div>
                        </div>

                        <div class="heating-field">
                            <label>是否全预混冷凝炉 ${this.tipBtn('未手改 η 时：是→建议 108%，否→建议 90%。仅建议默认 η，不再单独 ×0.7')}</label>
                            <div class="heating-radio-group">
                                <label class="heating-radio ${this.boiler.is_condenser ? 'active' : ''}"><input type="radio" name="condenser" value="1" ${this.boiler.is_condenser ? 'checked' : ''}> 是</label>
                                <label class="heating-radio ${!this.boiler.is_condenser ? 'active' : ''}"><input type="radio" name="condenser" value="0" ${!this.boiler.is_condenser ? 'checked' : ''}> 否</label>
                            </div>
                            <div class="heating-hint">仅建议默认 η，不再单独 ×0.7</div>
                        </div>
                        <div class="heating-field">
                            <label>是否带室外温度补偿 ${this.tipBtn('不直接乘耗气；未手改时：有补偿相对建议 η +2 个百分点')}</label>
                            <div class="heating-radio-group">
                                <label class="heating-radio ${this.boiler.has_outdoor_comp ? 'active' : ''}"><input type="radio" name="outdoor" value="1" ${this.boiler.has_outdoor_comp ? 'checked' : ''}> 是</label>
                                <label class="heating-radio ${!this.boiler.has_outdoor_comp ? 'active' : ''}"><input type="radio" name="outdoor" value="0" ${!this.boiler.has_outdoor_comp ? 'checked' : ''}> 否</label>
                            </div>
                            <div class="heating-hint">不直接乘耗气；未手改时微调建议 η</div>
                        </div>

                        ${this.renderEtaField(this.boiler, 'h', 'main')}

                        <details class="heating-advanced heating-field-span2">
                            <summary>高级参数：热指标 / 气热值 / 功率规格</summary>
                            <div class="heating-advanced-grid">
                        <div class="heating-field">
                            <label for="hHeatLoad">热指标（W/㎡） ${this.tipBtn('默认 80，对齐宣传图；难量化假设')}</label>
                            <input type="number" class="heating-input" id="hHeatLoad" value="${Math.round(this.heat_load * 1000)}" min="40" max="150" step="1" inputmode="numeric">
                            <div class="heating-hint">默认 80，对齐宣传图；难量化假设</div>
                        </div>
                        <div class="heating-field">
                            <label for="hGasHeat">气热值 H（kWh/m³） ${this.tipBtn('默认 9.8 为宣传同构高位折算口径；可改低位拟合')}</label>
                            <input type="number" class="heating-input" id="hGasHeat" value="${this.gas_heat_equivalent}" min="8" max="12" step="0.1" inputmode="decimal">
                            <div class="heating-hint">默认 9.8 为宣传同构高位折算口径；可改低位拟合</div>
                        </div>
                        <div class="heating-field">
                            <label>最小输出功率（kW） ${this.tipBtn('规格信息，不参与耗气')}</label>
                            <input type="number" class="heating-input" id="hMinPower" value="${this.boiler.min_power}" min="0" step="0.1" inputmode="decimal">
                            <div class="heating-hint">规格信息，不参与耗气</div>
                        </div>
                        <div class="heating-field">
                            <label>最大输出功率（kW） ${this.tipBtn('规格信息，不参与耗气')}</label>
                            <input type="number" class="heating-input" id="hMaxPower" value="${this.boiler.max_power}" min="0" step="0.1" inputmode="decimal">
                            <div class="heating-hint">规格信息，不参与耗气</div>
                        </div>
                            </div>
                        </details>

                        <div class="heating-field">
                            <label>壁挂炉采购总价（元）</label>
                            <input type="number" class="heating-input" id="hPrice" value="${this.boiler.price}" min="0" step="1" inputmode="decimal">
                        </div>
                        <div class="heating-field">
                            <label>计划使用/质保年限</label>
                            <input type="number" class="heating-input" id="hLife" value="${this.boiler.service_life}" min="1" step="1" inputmode="numeric">
                        </div>

                        <div class="heating-field">
                            <label class="heating-label-with-action" for="hMaintain">
                                <span>年度保养费用（元）</span>
                                <button type="button" class="heating-calc-link" id="hMaintainHelpBtn">帮我算</button>
                            </label>
                            <input type="number" class="heating-input" id="hMaintain" value="${this.boiler.maintain_cost}" min="0" step="50" inputmode="decimal">
                        </div>
                        <div class="heating-field heating-field-span2">
                            <div class="heating-hint">使用模式（舒适/正常/节能）请在右侧实时看板一点切换，便于对照各档费用</div>
                        </div>

                        <div class="heating-field heating-field-span2">
                            <label class="heating-label-with-action" for="hLifeGas">
                                <span>全年生活用气（m³） ${this.tipBtn('做饭、日常热水，不含采暖；参与阶梯计价，默认不计入供暖对比')}</span>
                                <button type="button" class="heating-calc-link" id="hGasHelpBtn">帮我算</button>
                            </label>
                            <input type="number" class="heating-input" id="hLifeGas" value="${this.year_life_gas}" min="0" step="10" inputmode="decimal">
                            <div class="heating-hint">做饭、日常热水，不含采暖；参与阶梯计价，默认不计入供暖对比</div>
                        </div>

                        <div class="heating-field heating-field-span2">
                            <label>对比机型<span class="heating-optional">非必选</span> ${this.tipBtn('选对比炉后载入目录默认（含本机校正）；与上方当前炉比价（回本 B）')}</label>
                            <select class="heating-select" id="hCompareModel">
                                <option value="" ${this.upgrade.compareKey === '' ? 'selected' : ''}>不对比</option>
                                ${HEATING_DATA.boiler_models.map((m, i) => `<option value="${i}" ${String(this.upgrade.compareKey) === String(i) ? 'selected' : ''} title="${(m.remark || '').replace(/"/g, '&quot;')}">${m.model_name}</option>`).join('')}
                                <option value="custom" ${this.upgrade.compareKey === 'custom' ? 'selected' : ''}>自定义对比参数</option>
                            </select>
                            <div class="heating-hint">选对比炉后载入目录默认（含本机校正）；与上方当前炉比价（回本 B）${this.compareBoiler.model && this.hasBoilerOverride(this.compareBoiler.model) ? ' · <strong>对比炉已校正</strong>' : ''}</div>
                        </div>

                        ${this.renderCompareBoilerFields()}

                        <div class="heating-field heating-field-span2 heating-actions">
                            <button class="heating-btn" id="hResetBtn" title="清空本机对各机型的校正覆盖，恢复目录 JSON 默认">↻ 重置参数</button>
                        </div>
                    </div>
                </div>

                <!-- 对比结果 -->
                <div class="heating-section" id="sec-result" style="display:${compare ? '' : 'none'}">
                    <div class="heating-section-title">📊 方案对比结果</div>
                    <div class="heating-section-content">${compare ? this.renderCompare(compare) : ''}</div>
                </div>

                <details class="heating-section heating-fold" id="sec-knowledge">
                    <summary class="heating-section-title">📚 供暖小知识</summary>
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
                </details>

                <details class="heating-section heating-fold" id="sec-ref">
                    <summary class="heating-section-title">📄 引用资料</summary>
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
                </details>

                <div class="heating-disclaimer">
                    💡 说明：本测算采用标准基准热负荷 0.1kW/㎡，未纳入墙体保温、门窗、楼层散热等变量，结果为理论参考区间。
                </div>
                </main>
                <aside class="heating-sticky-board" id="heatingStickyBoard" aria-label="实时费用看板">
                    ${this.renderBoard(compare)}
                </aside>
                </div>

            <div class="heating-sheet-backdrop" id="heatingSheetBackdrop"></div>
            <div class="heating-mobile-sheet" id="heatingMobileSheet">
                ${this.renderPeekBar(compare)}
                <div class="heating-sheet-body" id="heatingSheetBody">
                    ${this.renderSheetPanel(compare)}
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
        this.bindSheet(container);
        const compareAfter = this.calcCompare();
        if (compareAfter) this.mountCostTrendChart(container, compareAfter);
        this.updateMobileSheetPosition();
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
                        <div class="hf-step-title">② 采暖季总热量 Q → 耗气 V = Q ÷ (H × η)</div>
                        <div class="hf-eq">Q = 铺设面积 × 热指标 × 日运行小时 × 采暖季天数 × 使用模式系数</div>
                        <div class="hf-plug">${s.paving_area} ㎡ × ${C.base_heat_load} kW/㎡ × ${C.hour_per_day} h × ${C.heating_season_days} 天 × ${this.user_coeff} = <strong>${s.Q_season.toFixed(2)} kWh</strong></div>
                        <div class="hf-eq">V = Q ÷ (气热值 H × 热效率 η)</div>
                        <div class="hf-plug">${s.Q_season.toFixed(2)} ÷ (${C.gas_heat_equivalent} × ${s.eta.toFixed(2)}) = <strong>${s.season_gas.toFixed(2)} m³</strong></div>
                        <div class="hf-note">热指标默认 80 W/㎡（${C.base_heat_load} kW/㎡）；H 默认 9.8 kWh/m³ 为对齐宣传的高位热值折算口径；η=${(s.eta * 100).toFixed(0)}%（市场常见可含 LHV 标称 &gt;100%）。气费仍按北京阶梯，非一口价。</div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">③ 日均参考（由采暖季均摊）</div>
                        <div class="hf-plug">日均热量 ≈ ${(s.Q_season / C.heating_season_days).toFixed(2)} kWh/日；日均耗气 ≈ <strong>${s.daily_real_gas.toFixed(4)} m³/日</strong></div>
                        <div class="hf-note">冷凝/室外补偿/功率为机型规格；未手改 η 时冷凝与室外补偿仅用于建议默认 η，不另乘耗气系数。</div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">④ 阶梯气价（生活用气参与梯度）</div>
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
                        <div class="hf-step-title">⑤ 设备固定成本（年化）</div>
                        <div class="hf-eq">年均折旧 = 壁挂炉采购总价 ÷ 计划使用年限</div>
                        <div class="hf-plug">¥${this.boiler.price} ÷ ${this.boiler.service_life} 年 = <strong>¥${s.year_depreciation.toFixed(2)}</strong></div>
                        <div class="hf-eq">年固定成本 = 年均折旧 + 年度保养</div>
                        <div class="hf-plug">¥${s.year_depreciation.toFixed(2)} + ¥${this.boiler.maintain_cost} = <strong>¥${s.year_fixed.toFixed(2)}</strong></div>
                    </div>

                    <div class="hf-step">
                        <div class="hf-step-title">⑥ 自采暖口径费用（当前：${modeLabel}）</div>
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
                        <div class="hf-step-title">⑦ 回本 A：自采暖 vs 集中供暖</div>
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
                        <div class="hf-step-title">⑧ 回本 B：机型对比（${c.upgrade.compareName} vs ${c.upgrade.baseLabel}）</div>
                        <div class="hf-eq">当前炉采暖耗气 V0 = ${c.upgrade.V0.toFixed(2)} m³</div>
                        <div class="hf-eq">对比炉采暖耗气 V1 = ${c.upgrade.V1.toFixed(2)} m³（相对节能 ${(c.upgrade.eta * 100).toFixed(1)}%，由两边参数演算）</div>
                        <div class="hf-eq">年节约气费 ΔC = 阶梯(生活+V0) − 阶梯(生活+V1)</div>
                        <div class="hf-plug">¥${c.upgrade.cost_base_gas.toFixed(2)} − ¥${c.upgrade.cost_upgrade_gas.toFixed(2)} = <strong>¥${c.upgrade.dC.toFixed(2)}</strong></div>
                        <div class="hf-eq">增量投资 ΔP = 对比炉价 − 当前炉采购价</div>
                        <div class="hf-plug">¥${c.upgrade.pUp.toFixed(0)} − ¥${c.upgrade.pBase.toFixed(0)} = <strong>¥${c.upgrade.dP.toFixed(2)}</strong></div>
                        <div class="hf-eq">回本 B = ΔP ÷ ΔC（仅当有增量投资且有节气收益）</div>
                        <div class="hf-plug"><strong>${c.upgrade.paybackLabel}</strong>${c.upgrade.recommend ? ' · 推荐更换（回本 ≤ 对比炉质保年限）' : (c.upgrade.payback != null && c.upgrade.payback > c.upgrade.years ? ' · 回收期较长' : '')}</div>
                        <div class="hf-eq">${c.upgrade.years} 年净收益（按对比炉质保年限）= ΔC×${c.upgrade.years} − ΔP</div>
                        <div class="hf-plug">¥${c.upgrade.dC.toFixed(2)} × ${c.upgrade.years} − ¥${c.upgrade.dP.toFixed(2)} = <strong>¥${c.upgrade.netLife.toFixed(2)}</strong></div>
                    </div>
                    ` : ''}
                </div>
            </details>
        `;
    }

    /** 回本 B 下方宣传式省气摘要（仅左侧结果区；仅 payback>0） */
    renderUpgradeSavings(c) {
        const u = c && c.upgrade;
        if (!u || !(u.payback > 0) || !(u.dC > 0)) return '';
        const dV = u.dV;
        const dC = u.dC;
        const N = u.years;
        const X = u.payback;
        const show5 = true;
        const showN = Math.abs(N - 5) >= 0.1;
        const showX = Math.abs(X - N) >= 0.1 && Math.abs(X - 5) >= 0.1;
        const overLife = X > N;
        return `
            <div class="heating-upgrade-savings">
                <div class="heating-upgrade-savings-title">换机省气摘要 · 累计少花的气费（未扣购机差）</div>
                <div class="heating-upgrade-savings-row">每年共省燃气约 <strong>${dV.toFixed(0)} m³</strong></div>
                <div class="heating-upgrade-savings-row">每年共省燃气费约 <strong>¥${dC.toFixed(0)}</strong></div>
                ${show5 ? `<div class="heating-upgrade-savings-row">5 年共省约 <strong>¥${(5 * dC).toFixed(0)}</strong></div>` : ''}
                ${showN ? `<div class="heating-upgrade-savings-row">${N} 年（质保/计划使用）共省约 <strong>¥${(N * dC).toFixed(0)}</strong></div>` : ''}
                ${showX ? `<div class="heating-upgrade-savings-row">回本年限 ${X.toFixed(1)} 年累计少花气费约 <strong>¥${(X * dC).toFixed(0)}</strong>${overLife ? '<span class="heating-upgrade-savings-warn"> · 超出计划使用/质保年限</span>' : ''}</div>` : ''}
                <div class="heating-upgrade-savings-note">气费按北京居民阶梯差额法，非固定单价 3.5 元/m³</div>
            </div>
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
        ];
        if (c.includePauseFee) {
            formulaLines.push(`停供基本热费 ¥${c.pause_basic_fee.toFixed(2)}`);
        }
        formulaLines.push(`设备/维保 ¥${s.year_fixed.toFixed(2)}`);

        return `
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
                <div class="pb-chip ${c.upgrade.recommend ? 'pb-chip-rec' : ''}" title="对比炉相对当前炉：增量投资 ΔP ÷ 每年节约气费 ΔC">
                    <span class="pb-key">回本 B</span>
                    <span class="pb-val">${c.upgrade.paybackLabel}</span>
                    <span class="pb-sub">vs 当前炉 · ${c.upgrade.compareName}</span>
                </div>
                <div class="pb-chip" title="${c.upgrade.years} 年节约气费累计 − 增量投资（按对比炉质保年限）">
                    <span class="pb-key">${c.upgrade.years}年净收益</span>
                    <span class="pb-val">¥${c.upgrade.netLife.toFixed(0)}</span>
                    <span class="pb-sub">ΔC×${c.upgrade.years} − ΔP</span>
                </div>
                ` : `
                <div class="pb-chip pb-chip-muted" title="选择对比机型后，才计算对比炉相对当前炉的回本">
                    <span class="pb-key">回本 B</span>
                    <span class="pb-val">未启用</span>
                    <span class="pb-sub">选对比机型后计算</span>
                </div>
                `}
            </div>
            ${this.renderUpgradeSavings(c)}

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
                    <div class="dt-title">热效率与耗气</div>
                    <div class="dt-row"><span>热效率 η</span><span>${(s.eta * 100).toFixed(0)}%</span></div>
                    <div class="dt-row"><span>热指标</span><span>${(s.constants.base_heat_load * 1000).toFixed(0)} W/㎡</span></div>
                    <div class="dt-row"><span>气热值 H</span><span>${s.constants.gas_heat_equivalent} kWh/m³</span></div>
                    <div class="dt-row"><span>使用模式系数</span><span>×${this.user_coeff}</span></div>
                    <div class="dt-row"><span>采暖季热量 Q</span><span>${s.Q_season.toFixed(0)} kWh</span></div>
                    <div class="dt-row"><span>日均耗气</span><span>${s.daily_real_gas.toFixed(2)} m³/日</span></div>
                    <div class="dt-row"><span>采暖气费边际均价</span><span>¥${s.heating_avg_price.toFixed(2)}/m³</span></div>
                    <div class="dt-row"><span>室外补偿 / 功率</span><span>规格信息，不参与耗气</span></div>
                    <div class="dt-row dt-total" style="color:var(--orange);">
                        <span title="自采暖相对市政集中供暖的静态回本">回本 A · vs 集中</span>
                        <span>${c.payback_years != null
                            ? c.payback_years.toFixed(1) + ' 年'
                            : (cheaperCentral ? '不适用' : '不适用')}</span>
                    </div>
                    ${c.upgrade ? `
                    <div class="dt-row dt-total" style="color:var(--orange);">
                        <span title="对比炉相对当前炉的增量投资回本">回本 B · vs 当前炉</span>
                        <span>${c.upgrade.paybackLabel}</span>
                    </div>
                    <div class="dt-row">
                        <span>增量投资 ΔP</span>
                        <span>¥${c.upgrade.dP.toFixed(0)}</span>
                    </div>
                    <div class="dt-row">
                        <span>每年节约气费 ΔC</span>
                        <span>¥${c.upgrade.dC.toFixed(2)}</span>
                    </div>
                    <div class="dt-row">
                        <span>相对当前炉节能率</span>
                        <span>${(c.upgrade.eta * 100).toFixed(1)}%</span>
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
        this.bindHintTips(container);
        const onNum = (fn) => {
            this.saveState();
            fn();
            this.scheduleRefresh(container, false);
        };
        const onNow = () => {
            this.saveState();
            this.scheduleRefresh(container, true);
        };

        container.querySelector('#hArea').addEventListener('input', e => {
            this.area = parseFloat(e.target.value) || 0;
            if (this.pavingSameAsArea) this.applyPavingSameLock(container);
            onNum(() => this.updateCentralBar(container));
        });
        container.querySelector('#hPaving').addEventListener('input', e => {
            if (this.pavingSameAsArea) return;
            this.pavingArea = parseFloat(e.target.value) || 0;
            onNum(() => {});
        });
        const sameChk = container.querySelector('#hSameArea');
        if (sameChk) {
            sameChk.addEventListener('change', () => {
                this.pavingSameAsArea = sameChk.checked;
                this.applyPavingSameLock(container);
                onNow();
            });
        }

        const selectCard = (card) => {
            container.querySelectorAll('.heating-tcard').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };

        const updateAll = () => {
            this.updateCentralBar(container);
            this.scheduleRefresh(container, true);
        };

        container.querySelectorAll('.heating-tcard').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                selectCard(card);
                if (card.classList.contains('heating-tcard-custom')) {
                    this.selectedKey = 'custom';
                    const inp = card.querySelector('input');
                    if (inp) setTimeout(() => inp.focus(), 0);
                } else {
                    this.selectedKey = card.dataset.key;
                    this.customPrice = null;
                    const inp = container.querySelector('#hCustomPrice');
                    if (inp) inp.value = '';
                }
                this.saveState();
                updateAll();
            });
        });

        const customPriceInput = container.querySelector('#hCustomPrice');
        if (customPriceInput) {
            customPriceInput.addEventListener('focus', () => {
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
                this.updateCentralBar(container);
                this.scheduleRefresh(container, false);
            });
            customPriceInput.addEventListener('click', e => e.stopPropagation());
        }

        container.querySelector('#hModel').addEventListener('change', e => {
            const idx = e.target.value;
            if (idx !== '') {
                const m = HEATING_DATA.boiler_models[idx];
                Object.assign(this.boiler, this.boilerFromCatalogWithOverride(m));
                this.saveState();
                this.render(container);
            } else {
                this.boiler.model = '';
                this.saveState();
                this.scheduleRefresh(container, true);
            }
        });

        const compareSel = container.querySelector('#hCompareModel');
        if (compareSel) {
            compareSel.addEventListener('change', e => {
                this.applyCompareKey(e.target.value);
                this.saveState();
                this.render(container);
            });
        }
        container.querySelectorAll('input[name="cmpCondenser"]').forEach(r => {
            r.addEventListener('change', e => {
                this.compareBoiler.is_condenser = e.target.value === '1';
                this.applySuggestedEta(this.compareBoiler);
                this.rememberBoilerOverride(this.compareBoiler);
                this.saveState();
                this.render(container);
            });
        });
        container.querySelectorAll('input[name="cmpOutdoor"]').forEach(r => {
            r.addEventListener('change', e => {
                this.compareBoiler.has_outdoor_comp = e.target.value === '1';
                this.applySuggestedEta(this.compareBoiler);
                this.rememberBoilerOverride(this.compareBoiler);
                this.saveState();
                this.render(container);
            });
        });
        const cmpBind = (id, field, intMode) => {
            const el = container.querySelector(id);
            if (!el) return;
            el.addEventListener('input', e => {
                this.compareBoiler[field] = intMode ? (parseInt(e.target.value, 10) || 0) : (parseFloat(e.target.value) || 0);
                this.rememberBoilerOverride(this.compareBoiler);
                onNum(() => {});
            });
        };
        cmpBind('#hCmpMinPower', 'min_power');
        cmpBind('#hCmpMaxPower', 'max_power');
        cmpBind('#hCmpPrice', 'price');
        cmpBind('#hCmpLife', 'service_life', true);
        cmpBind('#hCmpMaintain', 'maintain_cost');

        container.querySelectorAll('input[name="condenser"]').forEach(r => {
            r.addEventListener('change', e => {
                this.boiler.is_condenser = e.target.value === '1';
                this.applySuggestedEta(this.boiler);
                this.rememberBoilerOverride(this.boiler);
                this.saveState();
                this.render(container);
            });
        });
        container.querySelectorAll('input[name="outdoor"]').forEach(r => {
            r.addEventListener('change', e => {
                this.boiler.has_outdoor_comp = e.target.value === '1';
                this.applySuggestedEta(this.boiler);
                this.rememberBoilerOverride(this.boiler);
                this.saveState();
                this.render(container);
            });
        });

        const bindEtaGroup = (group, boilerRef, inputId) => {
            container.querySelectorAll(`.heating-eta-chips[data-eta-group="${group}"] .heating-eta-chip`).forEach(btn => {
                btn.addEventListener('click', () => {
                    const pct = parseInt(btn.dataset.eta, 10);
                    if (!(pct > 0)) return;
                    boilerRef.thermal_efficiency = pct / 100;
                    boilerRef.is_eta_customized = true;
                    this.rememberBoilerOverride(boilerRef);
                    this.saveState();
                    this.render(container);
                });
            });
            const etaInput = container.querySelector(inputId);
            if (etaInput) {
                etaInput.addEventListener('input', e => {
                    const pct = parseFloat(e.target.value);
                    if (!(pct > 0) || !isFinite(pct)) return;
                    boilerRef.thermal_efficiency = pct / 100;
                    boilerRef.is_eta_customized = true;
                    this.rememberBoilerOverride(boilerRef);
                    onNum(() => {});
                });
            }
        };
        bindEtaGroup('main', this.boiler, '#hEta');
        bindEtaGroup('cmp', this.compareBoiler, '#hCmpEta');

        const numBind = (id, field, intMode) => {
            const el = container.querySelector(id);
            if (!el) return;
            el.addEventListener('input', e => {
                this.boiler[field] = intMode ? (parseInt(e.target.value, 10) || 0) : (parseFloat(e.target.value) || 0);
                this.rememberBoilerOverride(this.boiler);
                onNum(() => {});
            });
        };
        numBind('#hMinPower', 'min_power');
        numBind('#hMaxPower', 'max_power');
        numBind('#hPrice', 'price');
        numBind('#hLife', 'service_life', true);
        numBind('#hMaintain', 'maintain_cost');

        const heatLoadEl = container.querySelector('#hHeatLoad');
        if (heatLoadEl) {
            heatLoadEl.addEventListener('input', e => {
                const w = parseFloat(e.target.value);
                this.heat_load = (w > 0 ? w : 80) / 1000;
                onNum(() => {});
            });
        }
        const gasHeatEl = container.querySelector('#hGasHeat');
        if (gasHeatEl) {
            gasHeatEl.addEventListener('input', e => {
                const h = parseFloat(e.target.value);
                this.gas_heat_equivalent = h > 0 ? h : HEATING_DATA.constants.gas_heat_equivalent;
                onNum(() => {});
            });
        }

        container.querySelector('#hLifeGas').addEventListener('input', e => {
            this.year_life_gas = parseFloat(e.target.value) || 0;
            onNum(() => {});
        });

        container.querySelector('#hResetBtn').addEventListener('click', () => {
            if (confirm('确定重置自采暖参数？\n将清除本机对各机型的校正覆盖，并恢复为目录 JSON 默认（不影响线上 JSON 文件）。')) {
                this.clearBoilerOverrides();
                this.boiler = {
                    model: '', is_condenser: true, thermal_efficiency: 1.08, is_eta_customized: false,
                    min_power: 3.8, max_power: 22.8,
                    has_outdoor_comp: false, price: 6999, service_life: 8, maintain_cost: 400
                };
                this.user_coeff = 0.7;
                this.year_life_gas = 300;
                this.customPrice = null;
                this.heat_load = HEATING_DATA.constants.base_heat_load;
                this.gas_heat_equivalent = HEATING_DATA.constants.gas_heat_equivalent;
                this.upgrade = { compareKey: '' };
                this.compareBoiler = this.cloneBoiler(this.boiler);
                this.saveState();
                this.render(container);
            }
        });

        this.bindGasHelper(container);
        this.bindMaintainHelper(container);
    }

    updateCentralBar(container) {
        const central = this.calcCentral();
        const bar = container.querySelector('#centralResultBar');
        if (!bar) return;
        if (central) {
            bar.innerHTML = `<span>本采暖季费用</span><span class="heating-result-val">¥${central.fee.toFixed(2)}</span><span class="heating-result-formula">${this.area}㎡ × ${central.pricePerUnit}元/㎡</span>`;
            bar.style.display = '';
        } else {
            bar.style.display = 'none';
        }
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
            e.stopPropagation();
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
            e.stopPropagation();
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

    syncRadios(container, name, val) {
        container.querySelectorAll(`input[name="${name}"]`).forEach(r => {
            const label = r.closest('.heating-radio');
            if (label) label.classList.toggle('active', r.value === (val ? '1' : '0'));
        });
    }

    updatePeek(container, compare) {
        const toggle = container.querySelector('#heatingPeekToggle');
        if (!toggle) return;
        const h = this.peekHeadline(compare);
        const tag = toggle.querySelector('.heating-mode-tag');
        const main = toggle.querySelector('.heating-peek-main');
        if (tag) tag.textContent = `[${this.modeTagLabel(this.compareMode)}]`;
        if (main) main.textContent = h.main;
        let extra = toggle.querySelector('.heating-peek-extra');
        if (h.showExtra) {
            if (!extra) {
                extra = document.createElement('span');
                extra.className = 'heating-peek-extra';
                const cta = toggle.querySelector('.heating-peek-cta');
                toggle.insertBefore(extra, cta);
            }
            extra.textContent = h.extra;
            extra.style.display = '';
        } else if (extra) {
            extra.remove();
            extra = null;
        }
        if (extra && toggle.scrollWidth > toggle.clientWidth + 2) extra.remove();
    }

    refreshResult(container) {
        const compare = this.calcCompare();
        const board = container.querySelector('#heatingStickyBoard');
        const sheetBody = container.querySelector('#heatingSheetBody');
        if (board) board.innerHTML = this.renderBoard(compare);
        if (sheetBody) sheetBody.innerHTML = this.renderSheetPanel(compare);
        this.updatePeek(container, compare);

        const section = container.querySelector('#sec-result');
        if (section) {
            const contentEl = section.querySelector('.heating-section-content');
            if (compare) {
                section.style.display = '';
                if (contentEl) {
                    contentEl.innerHTML = this.renderCompare(compare);
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
        }
        this.bindCompareMode(container);
    }

    bindCompareMode(container) {
        container.querySelectorAll('.heating-mode-toggle .hmode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode !== 'heating' && mode !== 'household') return;
                if (this.compareMode === mode) return;
                this.compareMode = mode;
                this.saveState();
                this.refreshResult(container);
            });
        });
        container.querySelectorAll('#boardPauseFee, #sheetPauseFee').forEach(chk => {
            chk.addEventListener('change', () => {
                this.includePauseFee = chk.checked;
                this.saveState();
                this.refreshResult(container);
            });
        });
        container.querySelectorAll('.heating-usage-seg .husage-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const coeff = parseFloat(btn.dataset.coeff);
                if (!(coeff > 0) || !isFinite(coeff)) return;
                if (Math.abs(this.user_coeff - coeff) < 0.001) return;
                this.user_coeff = coeff;
                this.saveState();
                this.refreshResult(container);
            });
        });
    }
}
