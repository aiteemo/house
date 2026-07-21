// ========== 电线选型计算器 v2.0 ==========
class WireCalculatorManager {
    constructor() {
        this.spaces = [];
        this.dedicatedCircuits = [];
        this._collapsedSpaces = new Set();
        this.loadState();
    }

    // ========== 持久化 ==========
    loadState() {
        const saved = localStorage.getItem('wire_calculator_v2');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.spaces = data.spaces || [];
                this.dedicatedCircuits = data.dedicatedCircuits || [];
            } catch (e) { /* ignore */ }
        }
        if (this.spaces.length === 0 && this.dedicatedCircuits.length === 0) {
            this.resetToDefault();
        }
    }

    saveState() {
        localStorage.setItem('wire_calculator_v2', JSON.stringify({
            spaces: this.spaces,
            dedicatedCircuits: this.dedicatedCircuits
        }));
    }

    resetToDefault() {
        this.spaces = [];
        this.dedicatedCircuits = [];
        PRESET_CATEGORIES.forEach(cat => {
            if (cat.spaceId === 'dedicated_presets') return;
            const space = {
                id: cat.spaceId,
                name: cat.spaceName,
                icon: cat.icon,
                appliances: []
            };
            cat.appliances.forEach(a => {
                if (a.isDedicated) {
                    this.dedicatedCircuits.push({
                        id: a.id + '_' + Date.now(),
                        spaceId: cat.spaceId,
                        spaceName: cat.spaceName,
                        name: a.name,
                        power: a.defaultPower,
                        checked: true,
                        requiresRCD: a.requiresRCD
                    });
                } else {
                    space.appliances.push({
                        id: a.id,
                        name: a.name,
                        power: a.defaultPower,
                        checked: true,
                        isDedicated: false,
                        requiresRCD: a.requiresRCD
                    });
                }
            });
            this.spaces.push(space);
        });
        this.saveState();
    }

    // ========== 算法：普通回路推荐 ==========
    getSpaceStats(space) {
        let totalPower = 0, checkedCount = 0;
        const checkedAppliances = [];
        space.appliances.forEach(a => {
            if (a.checked) {
                totalPower += a.power;
                checkedCount++;
                checkedAppliances.push(a);
            }
        });
        const totalCurrent = totalPower / 220;
        const recommendation = this.getRecommendation(totalPower, checkedAppliances, space.name);
        return { totalPower, totalCurrent, checkedCount, recommendation };
    }

    getRecommendation(totalPower, appliances, spaceName) {
        if (totalPower <= 0) {
            return { wire: null, breaker: null, breakerType: null, level: 'none', tips: [] };
        }

        const tips = [];
        const totalCurrent = totalPower / 220;
        const isLightingOnly = appliances.every(a => !a.checked || a.power <= 100);
        const minWire = isLightingOnly ? 1.5 : DEDICATED_RULES.minSocketWireArea;

        // 是否为涉水空间
        const isRcdSpace = DEDICATED_RULES.rcdRequiredSpaces.includes(spaceName);
        const breakerType = isRcdSpace
            ? DEDICATED_RULES.breakerTypeMapping.withRCD
            : DEDICATED_RULES.breakerTypeMapping.withoutRCD;

        // 匹配断路器
        let wire, breaker, level;
        const matched = BREAKER_MAP.find(b => b.maxCurrent >= totalCurrent);

        if (matched) {
            wire = matched.wire;
            breaker = matched.breaker;
            level = matched.level;
        } else {
            return { wire: null, breaker: null, breakerType, level: 'overload', tips: [{ type: 'split', text: '总电流超过 40A，建议拆分为多条回路' }] };
        }

        // 保底线径
        if (wire !== null && wire < minWire) {
            wire = 2.5;
            if (totalCurrent <= 20) { breaker = 'C20'; }
            else { wire = 4.0; breaker = 'C25'; }
            level = wire === 2.5 ? 'normal' : 'high';
        }

        // 提示
        if (isLightingOnly) {
            tips.push({ type: 'economy', text: '纯灯具回路，可选用 1.5 平方线节省预算' });
        }
        if (isRcdSpace) {
            tips.push({ type: 'rcd', text: `涉水空间，建议配备漏电保护断路器 (RCBO)` });
        }

        return { wire, breaker, breakerType, level, tips };
    }

    // ========== 算法：专线推荐 ==========
    getDedicatedStats(circuit) {
        const current = circuit.power / 220;
        const rec = this.getDedicatedRecommendation(circuit);
        return { current, ...rec };
    }

    getDedicatedRecommendation(circuit) {
        const current = circuit.power / 220;
        const matched = BREAKER_MAP.find(b => b.maxCurrent >= current);
        if (!matched) {
            return { wire: null, breaker: null, breakerType: null, level: 'overload' };
        }
        let wire = matched.wire;
        // 专线最低 2.5㎡
        if (wire < 2.5) wire = 2.5;
        const breakerType = circuit.requiresRCD
            ? DEDICATED_RULES.breakerTypeMapping.withRCD
            : DEDICATED_RULES.breakerTypeMapping.withoutRCD;
        return { wire: wire, breaker: matched.breaker, breakerType, level: matched.level };
    }

    // ========== 空间管理 ==========
    addSpace(name) {
        this.spaces.push({ id: 'space_' + Date.now(), name: name || '新空间', icon: '🔌', appliances: [] });
        this.saveState();
    }

    removeSpace(spaceId) {
        this.spaces = this.spaces.filter(s => s.id !== spaceId);
        this.saveState();
    }

    renameSpace(spaceId, name) {
        const s = this.spaces.find(s => s.id === spaceId);
        if (s) { s.name = name; this.saveState(); }
    }

    // ========== 电器管理 ==========
    addAppliance(spaceId) {
        const space = this.spaces.find(s => s.id === spaceId);
        if (!space) return;
        space.appliances.push({
            id: 'app_' + Date.now(), name: '新电器', power: 500,
            checked: true, isDedicated: false, requiresRCD: false
        });
        this.saveState();
    }

    removeAppliance(spaceId, appId) {
        const space = this.spaces.find(s => s.id === spaceId);
        if (!space) return;
        space.appliances = space.appliances.filter(a => a.id !== appId);
        this.saveState();
    }

    toggleAppliance(spaceId, appId) {
        const space = this.spaces.find(s => s.id === spaceId);
        if (!space) return;
        const app = space.appliances.find(a => a.id === appId);
        if (app) { app.checked = !app.checked; this.saveState(); }
    }

    updateAppliance(spaceId, appId, field, value) {
        const space = this.spaces.find(s => s.id === spaceId);
        if (!space) return;
        const app = space.appliances.find(a => a.id === appId);
        if (app) {
            if (field === 'power') app.power = Math.max(0, Math.round(value));
            else if (field === 'name') app.name = value;
            this.saveState();
        }
    }

    // 转为专线
    moveToDedicated(spaceId, appId) {
        const space = this.spaces.find(s => s.id === spaceId);
        if (!space) return;
        const idx = space.appliances.findIndex(a => a.id === appId);
        if (idx === -1) return;
        const [app] = space.appliances.splice(idx, 1);
        this.dedicatedCircuits.push({
            id: 'dc_' + Date.now(),
            spaceId: spaceId,
            spaceName: space.name,
            name: app.name,
            power: app.power,
            checked: true,
            requiresRCD: app.requiresRCD || DEDICATED_RULES.rcdRequiredSpaces.includes(space.name)
        });
        this.saveState();
    }

    // ========== 专线管理 ==========
    addDedicated(preset) {
        const spaceName = this.spaces.length > 0 ? this.spaces[0].name : '未指定';
        this.dedicatedCircuits.push({
            id: 'dc_' + Date.now(),
            spaceId: '',
            spaceName: spaceName,
            name: preset.name,
            power: preset.defaultPower,
            checked: true,
            requiresRCD: preset.requiresRCD
        });
        this.saveState();
    }

    removeDedicated(dcId) {
        this.dedicatedCircuits = this.dedicatedCircuits.filter(d => d.id !== dcId);
        this.saveState();
    }

    toggleDedicated(dcId) {
        const dc = this.dedicatedCircuits.find(d => d.id === dcId);
        if (dc) { dc.checked = !dc.checked; this.saveState(); }
    }

    updateDedicated(dcId, field, value) {
        const dc = this.dedicatedCircuits.find(d => d.id === dcId);
        if (!dc) return;
        if (field === 'power') dc.power = Math.max(0, Math.round(value));
        else if (field === 'name') dc.name = value;
        else if (field === 'spaceName') dc.spaceName = value;
        this.saveState();
    }

    // ========== 拖拽 ==========
    moveAppliance(fromSpaceId, toSpaceId, appId) {
        if (fromSpaceId === toSpaceId) return;
        const from = this.spaces.find(s => s.id === fromSpaceId);
        const to = this.spaces.find(s => s.id === toSpaceId);
        if (!from || !to) return;
        const idx = from.appliances.findIndex(a => a.id === appId);
        if (idx === -1) return;
        const [app] = from.appliances.splice(idx, 1);
        to.appliances.push(app);
        this.saveState();
    }

    // ========== 配电箱汇总 ==========
    getDistributionSummary() {
        let totalCircuits = 0;
        const mixedCircuits = this.spaces.filter(s => {
            const hasChecked = s.appliances.some(a => a.checked);
            if (hasChecked) totalCircuits++;
            return hasChecked;
        }).length;

        const dedCount = this.dedicatedCircuits.filter(d => d.checked).length;
        totalCircuits += dedCount;

        // 主开关推荐
        const allPowers = [];
        this.spaces.forEach(s => s.appliances.forEach(a => { if (a.checked) allPowers.push(a.power); }));
        this.dedicatedCircuits.forEach(d => { if (d.checked) allPowers.push(d.power); });
        const grandTotalPower = allPowers.reduce((s, p) => s + p, 0);
        const grandTotalCurrent = grandTotalPower / 220;

        let mainBreaker = 'C63';
        if (grandTotalCurrent <= 40) mainBreaker = 'C40';
        else if (grandTotalCurrent <= 50) mainBreaker = 'C50';

        return {
            mixedCircuits,
            dedicatedCircuits: dedCount,
            totalCircuits,
            grandTotalPower,
            grandTotalCurrent,
            mainBreaker
        };
    }

    // ========== 渲染 ==========
    render(container) {
        container.innerHTML = `
            <div class="wire-calc">
                <div class="wire-calc-header">
                    <div class="wire-calc-title">
                        <h2>电线选型计算器</h2>
                        <p class="wire-calc-desc">勾选家中电器，自动计算各回路推荐电线规格，支持专线回路分离</p>
                    </div>
                    <div class="wire-calc-actions">
                        <button class="btn-secondary" id="wireResetBtn">重置默认</button>
                        <button class="btn-primary" id="wireAddSpaceBtn">+ 新增空间</button>
                    </div>
                </div>

                <div class="wire-standards-section">
                    <div class="wire-standards-toggle" id="wireStandardsToggle">
                        <span>📐 家用电线规范参考表</span>
                        <span class="wire-standards-arrow">▼</span>
                    </div>
                    <div class="wire-standards-body" id="wireStandardsBody" style="display:none;">
                        <div class="wire-standards-table">
                            <div class="wire-std-header">
                                <div class="wire-std-cell">线径</div>
                                <div class="wire-std-cell">安全电流</div>
                                <div class="wire-std-cell">降额后功率</div>
                                <div class="wire-std-cell">建议空开</div>
                                <div class="wire-std-cell">适用场景</div>
                            </div>
                            ${WIRE_SPECS.map(s => `
                                <div class="wire-std-row">
                                    <div class="wire-std-cell wire-std-area">${s.area}㎡</div>
                                    <div class="wire-std-cell">${s.deratingCurrent}A</div>
                                    <div class="wire-std-cell wire-std-power">${s.maxPower.toLocaleString()}W</div>
                                    <div class="wire-std-cell">${s.breaker}</div>
                                    <div class="wire-std-cell wire-std-usage">${s.usage}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="wire-principle">
                            <div class="wire-principle-title">💡 为什么标称功率比理论值低？</div>
                            <div class="wire-principle-text">
                                穿管暗敷后散热受限，安全载流量需打 <strong>8折</strong>（降额系数 0.8）。<br>
                                例：4平方线明敷约32A，穿管后 32×0.8=25.6A，即 220V×25.6A=5632W。
                            </div>
                        </div>
                    </div>
                </div>

                <div class="wire-section-label">🏠 普通空间回路</div>
                <div class="wire-spaces" id="wireSpaces"></div>

                <div class="wire-section-label wire-section-dedicated">⚡ 独立专线回路</div>
                <div class="wire-dedicated-header">
                    <span class="wire-dedicated-desc">功率 ≥ ${DEDICATED_RULES.powerThreshold}W 的设备建议独立走线</span>
                    <div class="wire-dedicated-add-group">
                        <select class="wire-dedicated-select" id="wireDedSelect">
                            <option value="">选择专线设备...</option>
                            ${DEDICATED_PRESETS.map(p => `<option value="${p.id}">${p.name} ${p.defaultPower}W</option>`).join('')}
                        </select>
                        <button class="btn-primary btn-sm" id="wireAddDedBtn">添加</button>
                    </div>
                </div>
                <div class="wire-dedicated-list" id="wireDedList"></div>

                <div class="wire-section-label wire-section-summary">📊 配电箱汇总</div>
                <div class="wire-summary-panel" id="wireSummaryPanel"></div>
            </div>
        `;

        this.bindEvents(container);
        this.renderSpaces(container.querySelector('#wireSpaces'));
        this.renderDedicated(container.querySelector('#wireDedList'));
        this.renderSummary(container.querySelector('#wireSummaryPanel'));
    }

    bindEvents(container) {
        container.querySelector('#wireResetBtn').addEventListener('click', () => {
            if (confirm('确定重置为默认数据？')) {
                this.resetToDefault();
                this.render(container);
            }
        });
        container.querySelector('#wireAddSpaceBtn').addEventListener('click', () => {
            const name = prompt('空间名称：');
            if (name && name.trim()) {
                this.addSpace(name.trim());
                this.renderSpaces(container.querySelector('#wireSpaces'));
            }
        });
        container.querySelector('#wireStandardsToggle').addEventListener('click', () => {
            const body = container.querySelector('#wireStandardsBody');
            const visible = body.style.display !== 'none';
            body.style.display = visible ? 'none' : '';
            container.querySelector('.wire-standards-arrow').textContent = visible ? '▼' : '▲';
        });
        container.querySelector('#wireAddDedBtn').addEventListener('click', () => {
            const sel = container.querySelector('#wireDedSelect');
            const preset = DEDICATED_PRESETS.find(p => p.id === sel.value);
            if (preset) {
                this.addDedicated(preset);
                sel.value = '';
                this.renderDedicated(container.querySelector('#wireDedList'));
                this.renderSummary(container.querySelector('#wireSummaryPanel'));
            }
        });
    }

    renderSpaces(container) {
        container.innerHTML = '';
        this.spaces.forEach(space => {
            const stats = this.getSpaceStats(space);
            container.appendChild(this.createSpaceCard(space, stats));
        });
    }

    createSpaceCard(space, stats) {
        const card = document.createElement('div');
        card.className = 'wire-space-card';
        const rec = stats.recommendation;
        const collapsed = this._collapsedSpaces.has(space.id);
        const shouldCollapse = space.appliances.length > 4;
        const lc = { none: 'var(--text-dim)', low: '#4ade80', normal: '#6c8cff', high: '#fb923c', very_high: '#f87171', overload: '#ef4444' };

        card.innerHTML = `
            <div class="wire-card-header">
                <div class="wire-card-title">
                    <span class="wire-card-icon">${space.icon}</span>
                    <input type="text" class="wire-card-name" value="${space.name}" data-space="${space.id}">
                    <span class="wire-card-count">${stats.checkedCount} 个电器</span>
                </div>
                <div class="wire-card-stats">
                    <div class="wire-stat"><span class="wire-stat-value">${stats.totalPower.toLocaleString()}</span><span class="wire-stat-label">W</span></div>
                    <div class="wire-stat"><span class="wire-stat-value">${stats.totalCurrent.toFixed(1)}</span><span class="wire-stat-label">A</span></div>
                    <button class="wire-card-del" data-space="${space.id}" title="删除空间">×</button>
                </div>
            </div>
            <div class="wire-appliance-list ${shouldCollapse ? (collapsed ? 'collapsed' : 'expanded') : ''}" data-space="${space.id}">
                ${space.appliances.map(a => this.createApplianceRow(space, a)).join('')}
            </div>
            ${shouldCollapse ? `<button class="wire-expand-btn" data-space="${space.id}">${collapsed ? '展开全部 ' + space.appliances.length + ' 个电器 ▼' : '收起 ▲'}</button>` : ''}
            <div class="wire-card-footer">
                <button class="wire-add-btn" data-space="${space.id}">+ 新增电器</button>
                <div class="wire-recommendation" style="border-left-color: ${lc[rec.level] || 'var(--text-dim)'}">
                    ${rec.wire ? `
                        <div class="wire-rec-main">推荐使用 <strong style="color:${lc[rec.level]}">${rec.wire} 平方</strong> 电线 <span class="wire-rec-breaker">匹配 ${rec.breaker} 断路器</span></div>
                        ${rec.breakerType ? `<div class="wire-rec-type">${rec.breakerType}</div>` : ''}
                    ` : `<div class="wire-rec-main wire-rec-warn">⚠️ ${stats.totalPower > 0 ? '总功率过高，建议拆分回路' : '请勾选电器'}</div>`}
                    ${rec.tips.map(t => `<div class="wire-rec-tip">${t.type === 'rcd' ? '🔒' : '💡'} ${t.text}</div>`).join('')}
                </div>
            </div>
        `;

        // 事件绑定
        card.querySelector('.wire-card-name').addEventListener('change', e => { this.renameSpace(space.id, e.target.value); });
        card.querySelector('.wire-card-del').addEventListener('click', () => {
            if (confirm(`确定删除「${space.name}」？`)) {
                this.removeSpace(space.id);
                this.renderSpaces(card.parentElement);
                this.renderSummary(document.querySelector('#wireSummaryPanel'));
            }
        });
        card.querySelector('.wire-add-btn').addEventListener('click', () => {
            this.addAppliance(space.id);
            this.renderSpaces(card.parentElement);
            this.renderSummary(document.querySelector('#wireSummaryPanel'));
        });

        const expandBtn = card.querySelector('.wire-expand-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                if (this._collapsedSpaces.has(space.id)) this._collapsedSpaces.delete(space.id);
                else this._collapsedSpaces.add(space.id);
                this.renderSpaces(card.parentElement);
            });
        }

        // 电器行事件
        card.querySelectorAll('.wire-appliance-item').forEach(item => {
            const appId = item.dataset.app;
            item.querySelector('.wire-app-check').addEventListener('click', () => {
                this.toggleAppliance(space.id, appId);
                this.renderSpaces(card.parentElement);
                this.renderSummary(document.querySelector('#wireSummaryPanel'));
            });
            item.querySelector('.wire-app-name').addEventListener('change', e => this.updateAppliance(space.id, appId, 'name', e.target.value));

            const powerInput = item.querySelector('.wire-app-power');
            const currentInput = item.querySelector('.wire-app-current');
            powerInput.addEventListener('input', e => {
                const p = parseInt(e.target.value) || 0;
                this.updateAppliance(space.id, appId, 'power', p);
                currentInput.value = (p / 220).toFixed(1);
                this.refreshCard(card, space);
                this.renderSummary(document.querySelector('#wireSummaryPanel'));
            });
            currentInput.addEventListener('input', e => {
                const c = parseFloat(e.target.value) || 0;
                this.updateAppliance(space.id, appId, 'power', Math.round(c * 220));
                powerInput.value = Math.round(c * 220);
                this.refreshCard(card, space);
                this.renderSummary(document.querySelector('#wireSummaryPanel'));
            });

            item.querySelector('.wire-app-del').addEventListener('click', () => {
                this.removeAppliance(space.id, appId);
                this.renderSpaces(card.parentElement);
                this.renderSummary(document.querySelector('#wireSummaryPanel'));
            });

            // 一键转专线
            const dedBtn = item.querySelector('.wire-app-to-ded');
            if (dedBtn) {
                dedBtn.addEventListener('click', () => {
                    this.moveToDedicated(space.id, appId);
                    this.renderSpaces(card.parentElement);
                    this.renderDedicated(document.querySelector('#wireDedList'));
                    this.renderSummary(document.querySelector('#wireSummaryPanel'));
                });
            }

            // 拖拽
            item.draggable = true;
            item.addEventListener('dragstart', e => {
                this._dragItem = appId;
                this._dragSource = space.id;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => { item.classList.remove('dragging'); this._dragItem = null; this._dragSource = null; });
        });

        // 放置
        const listEl = card.querySelector('.wire-appliance-list');
        listEl.addEventListener('dragover', e => { e.preventDefault(); listEl.classList.add('drag-over'); });
        listEl.addEventListener('dragleave', () => listEl.classList.remove('drag-over'));
        listEl.addEventListener('drop', e => {
            e.preventDefault();
            listEl.classList.remove('drag-over');
            if (this._dragItem && this._dragSource) {
                this.moveAppliance(this._dragSource, space.id, this._dragItem);
                this.renderSpaces(card.parentElement);
                this.renderSummary(document.querySelector('#wireSummaryPanel'));
            }
        });

        return card;
    }

    createApplianceRow(space, app) {
        const current = (app.power / 220).toFixed(1);
        const isHighPower = app.power >= DEDICATED_RULES.powerThreshold;
        return `
            <div class="wire-appliance-item ${app.checked ? 'checked' : ''}" data-app="${app.id}">
                <div class="wire-app-check"><span>${app.checked ? '✓' : ''}</span></div>
                <input type="text" class="wire-app-name" value="${app.name}">
                <div class="wire-app-power-wrap"><input type="number" class="wire-app-power" value="${app.power}" min="0" step="10"><span class="wire-app-unit">W</span></div>
                <div class="wire-app-current-wrap"><input type="number" class="wire-app-current" value="${current}" min="0" step="0.1"><span class="wire-app-unit">A</span></div>
                ${isHighPower ? `<button class="wire-app-to-ded" title="转为专线">⚡</button>` : ''}
                <button class="wire-app-del" title="删除">×</button>
            </div>
        `;
    }

    refreshCard(card, space) {
        const stats = this.getSpaceStats(space);
        const countEl = card.querySelector('.wire-card-count');
        const vals = card.querySelectorAll('.wire-stat-value');
        if (countEl) countEl.textContent = `${stats.checkedCount} 个电器`;
        if (vals[0]) vals[0].textContent = stats.totalPower.toLocaleString();
        if (vals[1]) vals[1].textContent = stats.totalCurrent.toFixed(1);

        const rec = stats.recommendation;
        const lc = { none: 'var(--text-dim)', low: '#4ade80', normal: '#6c8cff', high: '#fb923c', very_high: '#f87171', overload: '#ef4444' };
        const recEl = card.querySelector('.wire-recommendation');
        recEl.style.borderLeftColor = lc[rec.level] || 'var(--text-dim)';
        recEl.innerHTML = rec.wire ? `
            <div class="wire-rec-main">推荐使用 <strong style="color:${lc[rec.level]}">${rec.wire} 平方</strong> 电线 <span class="wire-rec-breaker">匹配 ${rec.breaker} 断路器</span></div>
            ${rec.breakerType ? `<div class="wire-rec-type">${rec.breakerType}</div>` : ''}
        ` : `<div class="wire-rec-main wire-rec-warn">⚠️ ${stats.totalPower > 0 ? '总功率过高' : '请勾选电器'}</div>`;
        rec.tips.forEach(t => { recEl.innerHTML += `<div class="wire-rec-tip">${t.type === 'rcd' ? '🔒' : '💡'} ${t.text}</div>`; });
    }

    // ========== 渲染专线 ==========
    renderDedicated(container) {
        container.innerHTML = '';
        if (this.dedicatedCircuits.length === 0) {
            container.innerHTML = '<div class="wire-ded-empty">暂无独立专线回路</div>';
            return;
        }
        this.dedicatedCircuits.forEach(dc => {
            const stats = this.getDedicatedStats(dc);
            const lc = { low: '#4ade80', normal: '#6c8cff', high: '#fb923c', very_high: '#f87171' };
            const item = document.createElement('div');
            item.className = `wire-ded-item ${dc.checked ? 'checked' : ''}`;
            item.innerHTML = `
                <div class="wire-app-check"><span>${dc.checked ? '✓' : ''}</span></div>
                <input type="text" class="wire-ded-name" value="${dc.name}" data-id="${dc.id}">
                <input type="text" class="wire-ded-space" value="${dc.spaceName}" placeholder="所属空间" data-id="${dc.id}">
                <div class="wire-app-power-wrap"><input type="number" class="wire-ded-power" value="${dc.power}" min="0" step="10" data-id="${dc.id}"><span class="wire-app-unit">W</span></div>
                <span class="wire-ded-result">${stats.current.toFixed(1)}A → <strong>${stats.wire}㎡</strong> + ${stats.breaker}</span>
                ${dc.requiresRCD ? '<span class="wire-ded-rcd">🔒 RCBO</span>' : ''}
                <button class="wire-app-del" data-id="${dc.id}" title="删除">×</button>
            `;
            // 事件
            item.querySelector('.wire-app-check').addEventListener('click', () => { this.toggleDedicated(dc.id); this.renderDedicated(container); this.renderSummary(document.querySelector('#wireSummaryPanel')); });
            item.querySelector('.wire-ded-name').addEventListener('change', e => { this.updateDedicated(dc.id, 'name', e.target.value); });
            item.querySelector('.wire-ded-space').addEventListener('change', e => { this.updateDedicated(dc.id, 'spaceName', e.target.value); });
            item.querySelector('.wire-ded-power').addEventListener('input', e => { this.updateDedicated(dc.id, 'power', parseInt(e.target.value) || 0); this.renderDedicated(container); this.renderSummary(document.querySelector('#wireSummaryPanel')); });
            item.querySelector('.wire-app-del').addEventListener('click', () => { this.removeDedicated(dc.id); this.renderDedicated(container); this.renderSummary(document.querySelector('#wireSummaryPanel')); });
            container.appendChild(item);
        });
    }

    // ========== 渲染配电箱汇总 ==========
    renderSummary(container) {
        const summary = this.getDistributionSummary();
        container.innerHTML = `
            <div class="wire-summary-grid">
                <div class="wire-summary-item">
                    <div class="wire-summary-num">${summary.mixedCircuits}</div>
                    <div class="wire-summary-label">普通回路</div>
                </div>
                <div class="wire-summary-item">
                    <div class="wire-summary-num">${summary.dedicatedCircuits}</div>
                    <div class="wire-summary-label">专线回路</div>
                </div>
                <div class="wire-summary-item wire-summary-total">
                    <div class="wire-summary-num">${summary.totalCircuits}</div>
                    <div class="wire-summary-label">总回路数</div>
                </div>
                <div class="wire-summary-item">
                    <div class="wire-summary-num">${summary.grandTotalPower.toLocaleString()}W</div>
                    <div class="wire-summary-label">全屋总功率</div>
                </div>
                <div class="wire-summary-item">
                    <div class="wire-summary-num">${summary.grandTotalCurrent.toFixed(1)}A</div>
                    <div class="wire-summary-label">全屋总电流</div>
                </div>
                <div class="wire-summary-item wire-summary-main">
                    <div class="wire-summary-num">${summary.mainBreaker}</div>
                    <div class="wire-summary-label">入户总开关</div>
                </div>
            </div>
        `;
    }
}
