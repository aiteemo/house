// ========== 需求清单管理 ==========
class RequirementsManager {
    constructor() {
        this.modules = JSON.parse(JSON.stringify(REQUIREMENTS_DATA));
        this.activeModule = this.modules[0].id;
        this.searchQuery = '';
        this.viewMode = 'module'; // 'module' or 'stage'
        this.activeStage = STAGES[0].id;
        this.onUpdate = null;
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('renovation_requirements');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.modules.forEach(m => {
                    m.items.forEach(item => {
                        if (state[item.id]) {
                            const s = state[item.id];
                            if (typeof s === 'string') {
                                item.status = s;
                            } else {
                                if (s.status) item.status = s.status;
                                if (s.solutions) {
                                    // Migrate old format (price1/price2/price3) to new format (price)
                                    item.solutions = s.solutions.map(sol => {
                                        if (sol.price === undefined && sol.price2 !== undefined) {
                                            return { provider: sol.provider || '', name: sol.name || '', tier: sol.tier || 'comfort', price: sol.price2 };
                                        }
                                        return sol;
                                    });
                                }
                                if (s.selectedSolution !== undefined) item.selectedSolution = s.selectedSolution;
                            }
                        }
                    });
                });
            } catch (e) { /* ignore */ }
        }
    }

    saveState() {
        const state = {};
        this.modules.forEach(m => {
            m.items.forEach(item => {
                state[item.id] = {
                    status: item.status,
                    solutions: item.solutions || [],
                    selectedSolution: item.selectedSolution || 0,
                };
            });
        });
        localStorage.setItem('renovation_requirements', JSON.stringify(state));
    }

    getActiveModule() {
        return this.modules.find(m => m.id === this.activeModule);
    }

    setActiveModule(moduleId) {
        this.activeModule = moduleId;
    }

    toggleItem(itemId) {
        for (const m of this.modules) {
            const item = m.items.find(i => i.id === itemId);
            if (item) {
                if (item.status === 'checked') {
                    item.status = 'skipped';
                } else if (item.status === 'skipped') {
                    item.status = 'pending';
                } else {
                    item.status = 'checked';
                }
                this.saveState();
                if (this.onUpdate) this.onUpdate();
                return item.status;
            }
        }
    }

    cycleStatus(itemId) {
        for (const m of this.modules) {
            const item = m.items.find(i => i.id === itemId);
            if (item) {
                const cycle = ['pending', 'checked', 'skipped'];
                const idx = cycle.indexOf(item.status);
                item.status = cycle[(idx + 1) % 3];
                this.saveState();
                if (this.onUpdate) this.onUpdate();
                return item.status;
            }
        }
    }

    addItem(moduleId, name, desc) {
        const mod = this.modules.find(m => m.id === moduleId);
        if (mod) {
            const id = 'custom_' + Date.now();
            mod.items.push({
                id, name, desc,
                status: 'pending',
                room: null,
                price3: 0, price2: 0, price1: 0,
            });
            this.saveState();
            if (this.onUpdate) this.onUpdate();
        }
    }

    getStats() {
        let checked = 0, total = 0;
        this.modules.forEach(m => {
            m.items.forEach(item => {
                total++;
                if (item.status === 'checked') checked++;
            });
        });
        return { checked, total };
    }

    getModuleStats(moduleId) {
        const mod = this.modules.find(m => m.id === moduleId);
        if (!mod) return { checked: 0, total: 0 };
        let checked = 0;
        mod.items.forEach(item => { if (item.status === 'checked') checked++; });
        return { checked, total: mod.items.length };
    }

    // ========== 阶段管理 ==========
    getItemsByStage(stageId) {
        const items = [];
        this.modules.forEach(m => {
            m.items.forEach(item => {
                if (ITEM_STAGE_MAP[item.id] === stageId) {
                    items.push({ ...item, moduleName: m.name, moduleIcon: m.icon });
                }
            });
        });
        return items;
    }

    getStageStats(stageId) {
        let checked = 0, total = 0;
        this.modules.forEach(m => {
            m.items.forEach(item => {
                if (ITEM_STAGE_MAP[item.id] === stageId) {
                    total++;
                    if (item.status === 'checked') checked++;
                }
            });
        });
        return { checked, total };
    }

    getStageStatsAll() {
        return STAGES.map(stage => ({
            ...stage,
            ...this.getStageStats(stage.id),
        }));
    }

    getAllCheckedItems() {
        const items = [];
        this.modules.forEach(m => {
            m.items.forEach(item => {
                if (item.status === 'checked') items.push({ ...item, module: m.name });
            });
        });
        return items;
    }

    // ========== 方案管理 ==========
    findItem(itemId) {
        for (const m of this.modules) {
            const item = m.items.find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    getSelectedSolution(item) {
        if (!item.solutions || item.solutions.length === 0) return null;
        const idx = item.selectedSolution || 0;
        return item.solutions[idx] || null;
    }

    addSolution(itemId, solution) {
        const item = this.findItem(itemId);
        if (!item) return;
        if (!item.solutions) item.solutions = [];
        item.solutions.push(solution);
        item.selectedSolution = item.solutions.length - 1;
        this.saveState();
        return item.solutions;
    }

    removeSolution(itemId, index) {
        const item = this.findItem(itemId);
        if (!item || !item.solutions) return;
        item.solutions.splice(index, 1);
        if (item.selectedSolution >= item.solutions.length) {
            item.selectedSolution = Math.max(0, item.solutions.length - 1);
        }
        this.saveState();
    }

    selectSolution(itemId, index) {
        const item = this.findItem(itemId);
        if (!item) return;
        item.selectedSolution = index;
        this.saveState();
    }

    updateSolution(itemId, index, solution) {
        const item = this.findItem(itemId);
        if (!item || !item.solutions || !item.solutions[index]) return;
        item.solutions[index] = solution;
        this.saveState();
    }

    getAllProviders() {
        const providers = new Set();
        this.modules.forEach(m => {
            m.items.forEach(item => {
                (item.solutions || []).forEach(s => {
                    if (s.provider) providers.add(s.provider);
                });
            });
        });
        return [...providers];
    }

    renderModuleList(container) {
        container.innerHTML = '';
        this.modules.forEach(mod => {
            const stats = this.getModuleStats(mod.id);
            const li = document.createElement('li');
            li.className = mod.id === this.activeModule ? 'active' : '';
            li.innerHTML = `
                <span class="module-icon">${mod.icon}</span>
                <span>${mod.name}</span>
                <span class="module-count">${stats.checked}/${stats.total}</span>
            `;
            li.addEventListener('click', () => {
                this.activeModule = mod.id;
                this.renderModuleList(container);
                this.renderReqList(document.getElementById('reqList'));
                document.getElementById('currentModuleName').textContent = mod.name;
            });
            container.appendChild(li);
        });
    }

    renderStageList(container) {
        container.innerHTML = '';
        const allStats = this.getStageStatsAll();
        allStats.forEach(stage => {
            const li = document.createElement('li');
            li.className = stage.id === this.activeStage ? 'active' : '';
            const pct = stage.total > 0 ? Math.round(stage.checked / stage.total * 100) : 0;
            li.innerHTML = `
                <span class="module-icon">${stage.icon}</span>
                <span>${stage.name}</span>
                <span class="stage-progress-mini">
                    <span class="stage-progress-bar"><span style="width:${pct}%"></span></span>
                    <span class="module-count">${stage.checked}/${stage.total}</span>
                </span>
            `;
            li.addEventListener('click', () => {
                this.activeStage = stage.id;
                this.renderStageList(container);
                this.renderReqList(document.getElementById('reqList'));
                document.getElementById('currentModuleName').textContent = stage.name;
            });
            container.appendChild(li);
        });
    }

    renderReqList(container) {
        container.innerHTML = '';

        if (this.searchQuery) {
            this.renderSearchResults(container);
        } else if (this.viewMode === 'stage') {
            this.renderStageItems(container, this.activeStage);
        } else {
            this.renderModuleItems(container, this.getActiveModule());
        }

        this.updateStats();
    }

    renderSearchResults(container) {
        const q = this.searchQuery.toLowerCase();
        let matchCount = 0;

        this.modules.forEach(mod => {
            const matches = mod.items.filter(item =>
                item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
            );
            if (matches.length === 0) return;

            const header = document.createElement('div');
            header.className = 'req-module-header';
            header.textContent = `${mod.icon} ${mod.name}`;
            container.appendChild(header);

            matches.forEach(item => {
                this.renderItemCard(container, item);
                matchCount++;
            });
        });

        if (matchCount === 0) {
            const empty = document.createElement('div');
            empty.className = 'req-empty';
            empty.textContent = '未找到匹配的需求项';
            container.appendChild(empty);
        }
    }

    renderModuleItems(container, mod) {
        if (!mod) return;
        mod.items.forEach(item => this.renderItemCard(container, item));
    }

    renderStageItems(container, stageId) {
        const items = this.getItemsByStage(stageId);
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'req-empty';
            empty.textContent = '该阶段暂无需求项';
            container.appendChild(empty);
            return;
        }
        // Group by module within stage
        const groups = {};
        items.forEach(item => {
            const key = item.moduleName;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        Object.entries(groups).forEach(([moduleName, groupItems]) => {
            const header = document.createElement('div');
            header.className = 'req-module-header';
            header.textContent = `${groupItems[0].moduleIcon} ${moduleName}`;
            container.appendChild(header);
            groupItems.forEach(item => this.renderItemCard(container, item));
        });
    }

    renderItemCard(container, item) {
        const div = document.createElement('div');
        div.className = `req-item ${item.status}`;
        div.dataset.id = item.id;

        const tier = window._currentTier || 'comfort';
        const solution = this.getSelectedSolution(item);
        let desc, price;

        if (solution) {
            desc = [solution.provider, solution.name].filter(Boolean).join(' - ');
            price = solution.price || 0;
        } else {
            desc = item.desc;
            price = getItemPrice(item, tier);
        }

        const priceStr = price > 0 ? formatPriceShort(price) : '';
        const solutionCount = (item.solutions && item.solutions.length) || 0;

        div.innerHTML = `
            <div class="req-checkbox"></div>
            <div class="req-content">
                <div class="req-name">${item.name}</div>
                <div class="req-desc">${desc}</div>
                ${priceStr ? `<div class="req-price">${priceStr}</div>` : ''}
            </div>
            <div class="req-actions">
                <button class="req-action-btn" data-action="solution" title="方案管理">📋${solutionCount > 1 ? '<span class="solution-badge">' + solutionCount + '</span>' : ''}</button>
                <button class="req-action-btn" data-action="cycle" title="切换状态">⟳</button>
            </div>
        `;

        div.querySelector('.req-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleItem(item.id);
            this.renderReqList(container);
            this.renderModuleList(document.getElementById('moduleList'));
        });

        div.querySelector('[data-action="cycle"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.cycleStatus(item.id);
            this.renderReqList(container);
            this.renderModuleList(document.getElementById('moduleList'));
        });

        div.querySelector('[data-action="solution"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showSolutionModal(item, container);
        });

        container.appendChild(div);
    }

    updateStats() {
        const stats = this.getStats();
        const checkedEl = document.getElementById('reqChecked');
        const totalEl = document.getElementById('reqTotal');
        if (checkedEl) checkedEl.textContent = stats.checked;
        if (totalEl) totalEl.textContent = stats.total;
    }

    showSolutionModal(item, reqListContainer) {
        let solutions = item.solutions || [];
        let selectedIdx = item.selectedSolution || 0;
        const tierLabels = { economy: '经济型', comfort: '舒适型', quality: '品质型' };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const renderModal = () => {
            const listHtml = solutions.length > 0
                ? solutions.map((s, i) => `
                    <div class="solution-row ${i === selectedIdx ? 'selected' : ''}" data-idx="${i}">
                        <div class="solution-radio ${i === selectedIdx ? 'active' : ''}"></div>
                        <div class="solution-info">
                            <div class="solution-title">${[s.provider, s.name].filter(Boolean).join(' - ')} <span class="solution-tier-tag">${tierLabels[s.tier] || ''}</span></div>
                            <div class="solution-prices">${s.price ? formatPriceShort(s.price) : '未设置价格'}</div>
                        </div>
                        <button class="solution-del-btn" data-del="${i}" title="删除方案">×</button>
                    </div>
                `).join('')
                : '<div class="solution-empty">暂无方案，使用默认价格</div>';

            overlay.innerHTML = `
                <div class="modal solution-modal">
                    <h3>方案管理 · ${item.name}</h3>
                    <div class="solution-list">${listHtml}</div>
                    <div class="solution-add-form" id="solutionAddForm" style="display:none;">
                        <label>提供方（商家/品牌）</label>
                        <input type="text" id="solProvider" list="providerList" placeholder="输入或选择已添加的提供方">
                        <datalist id="providerList"></datalist>
                        <label>详细方案</label>
                        <input type="text" id="solName" placeholder="例如：1拖3+新风、石英石台面">
                        <label>档位</label>
                        <select id="solTier">
                            <option value="economy">经济型</option>
                            <option value="comfort" selected>舒适型</option>
                            <option value="quality">品质型</option>
                        </select>
                        <label>价格（元）</label>
                        <input type="number" id="solPrice" placeholder="0">
                        <div class="modal-actions">
                            <button class="btn-secondary" id="cancelAddSol">取消</button>
                            <button class="btn-primary" id="confirmAddSol">添加</button>
                        </div>
                    </div>
                    <div class="modal-actions" id="solutionModalActions">
                        <button class="btn-secondary" id="closeSolModal">关闭</button>
                        <button class="btn-primary" id="addSolBtn">+ 添加方案</button>
                    </div>
                </div>
            `;

            // Select solution
            overlay.querySelectorAll('.solution-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.solution-del-btn')) return;
                    const idx = parseInt(row.dataset.idx);
                    this.selectSolution(item.id, idx);
                    selectedIdx = idx;
                    this.renderReqList(reqListContainer);
                    this.renderModuleList(document.getElementById('moduleList'));
                    renderModal();
                });
            });

            // Delete solution
            overlay.querySelectorAll('.solution-del-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.del);
                    this.removeSolution(item.id, idx);
                    solutions = item.solutions || [];
                    selectedIdx = item.selectedSolution || 0;
                    this.renderReqList(reqListContainer);
                    this.renderModuleList(document.getElementById('moduleList'));
                    renderModal();
                });
            });

            // Close
            const closeBtn = overlay.querySelector('#closeSolModal');
            if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove());

            // Add solution form toggle
            const addBtn = overlay.querySelector('#addSolBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    overlay.querySelector('#solutionAddForm').style.display = 'block';
                    overlay.querySelector('#solutionModalActions').style.display = 'none';
                    // Populate provider datalist
                    const datalist = overlay.querySelector('#providerList');
                    datalist.innerHTML = this.getAllProviders().map(p => `<option value="${p}">`).join('');
                });
            }

            // Cancel add
            const cancelBtn = overlay.querySelector('#cancelAddSol');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    overlay.querySelector('#solutionAddForm').style.display = 'none';
                    overlay.querySelector('#solutionModalActions').style.display = 'flex';
                });
            }

            // Confirm add
            const confirmBtn = overlay.querySelector('#confirmAddSol');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    const provider = overlay.querySelector('#solProvider').value.trim();
                    const name = overlay.querySelector('#solName').value.trim();
                    const tier = overlay.querySelector('#solTier').value;
                    const price = parseInt(overlay.querySelector('#solPrice').value) || 0;
                    if (!name) return;
                    const updated = this.addSolution(item.id, { provider, name, tier, price });
                    solutions = updated;
                    selectedIdx = item.selectedSolution || 0;
                    this.renderReqList(reqListContainer);
                    this.renderModuleList(document.getElementById('moduleList'));
                    renderModal();
                });
            }
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
        renderModal();
    }
}
