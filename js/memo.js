// ========== 沟通备忘管理 ==========
class MemoManager {
    constructor() {
        this.data = JSON.parse(JSON.stringify(MEMO_DATA));
        this.activeCategory = this.data[0].id;
        this.companies = [];
        this.activeCompany = null;
        this.showComparison = false;
        this.loadState();
        this.loadCompanies();
    }

    loadState() {
        const saved = localStorage.getItem('renovation_memo');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.data.forEach(cat => {
                    cat.items.forEach(item => {
                        if (state[item.id]) {
                            const s = state[item.id];
                            if (s.status) item.status = s.status;
                            if (s.notes !== undefined) item.notes = s.notes;
                            if (s.value !== undefined) item.value = s.value;
                        }
                    });
                });
            } catch (e) { /* ignore */ }
        }
    }

    saveState() {
        const state = {};
        this.data.forEach(cat => {
            cat.items.forEach(item => {
                state[item.id] = { status: item.status, notes: item.notes, value: item.value };
            });
        });
        localStorage.setItem('renovation_memo', JSON.stringify(state));
    }

    loadCompanies() {
        const saved = localStorage.getItem('renovation_companies');
        if (saved) {
            try {
                this.companies = JSON.parse(saved);
                if (this.companies.length > 0 && !this.activeCompany) {
                    this.activeCompany = this.companies[0].id;
                }
            } catch (e) { /* ignore */ }
        }
        // 合并预置公司数据（按名字匹配，已有的合并答案，没有的新增）
        if (typeof DEFAULT_COMPANIES !== 'undefined') {
            let dirty = false;
            DEFAULT_COMPANIES.forEach(dc => {
                const existing = this.companies.find(c => c.name === dc.name);
                if (existing) {
                    if (!existing.answers) existing.answers = {};
                    Object.entries(dc.answers).forEach(([qid, ans]) => {
                        const cur = existing.answers[qid];
                        // 迁移旧格式：value 里品牌+规格混在一起 → 拆分到 value(规格) + notes(品牌)
                        if (cur && cur.value && !cur.notes && ans.notes && cur.value.includes(ans.notes)) {
                            existing.answers[qid] = {
                                value: cur.value.replace(ans.notes, '').trim(),
                                notes: ans.notes
                            };
                            dirty = true;
                        }
                        // 空字段直接填入
                        if (!cur || !cur.value) {
                            existing.answers[qid] = JSON.parse(JSON.stringify(ans));
                            dirty = true;
                        }
                    });
                } else {
                    this.companies.push(JSON.parse(JSON.stringify(dc)));
                    dirty = true;
                }
            });
            if (!this.activeCompany && this.companies.length > 0) {
                this.activeCompany = this.companies[0].id;
            }
            if (dirty) this.saveCompanies();
        }
    }

    saveCompanies() {
        localStorage.setItem('renovation_companies', JSON.stringify(this.companies));
    }

    addCompany(name) {
        const id = 'company_' + Date.now();
        this.companies.push({ id, name, answers: {} });
        this.activeCompany = id;
        this.saveCompanies();
    }

    removeCompany(id) {
        this.companies = this.companies.filter(c => c.id !== id);
        if (this.activeCompany === id) {
            this.activeCompany = this.companies.length > 0 ? this.companies[0].id : null;
        }
        this.saveCompanies();
    }

    renameCompany(id, name) {
        const c = this.companies.find(c => c.id === id);
        if (c) { c.name = name; this.saveCompanies(); }
    }

    getActiveCompany() {
        return this.companies.find(c => c.id === this.activeCompany);
    }

    setCompanyAnswer(questionId, value, notes) {
        const c = this.getActiveCompany();
        if (!c) return;
        if (!c.answers) c.answers = {};
        c.answers[questionId] = { value: value || '', notes: notes || '' };
        this.saveCompanies();
        this.syncDatalist(questionId);
    }

    setCategoryNotes(categoryName, notes) {
        const c = this.getActiveCompany();
        if (!c) return;
        if (!c.categoryNotes) c.categoryNotes = {};
        c.categoryNotes[categoryName] = notes;
        this.saveCompanies();
    }

    syncDatalist(questionId) {
        const q = COMPARE_QUESTIONS.find(q => q.id === questionId);
        if (!q) return;
        const values = new Set(q.options || []);
        this.companies.forEach(c => {
            const a = (c.answers && c.answers[questionId]) || {};
            if (a.value) values.add(a.value);
        });
        const dl = document.getElementById(`dl-${questionId}`);
        if (!dl) return;
        dl.innerHTML = '';
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            dl.appendChild(opt);
        });
    }

    findItem(itemId) {
        for (const cat of this.data) {
            const item = cat.items.find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    toggleItem(itemId) {
        const item = this.findItem(itemId);
        if (!item) return;
        item.status = item.status === 'checked' ? 'pending' : 'checked';
        this.saveState();
    }

    updateNotes(itemId, notes) {
        const item = this.findItem(itemId);
        if (!item) return;
        item.notes = notes;
        this.saveState();
    }

    updateItemDesc(itemId, desc) {
        const item = this.findItem(itemId);
        if (!item) return;
        item.desc = desc;
        this.saveState();
    }

    getActiveCategory() {
        return this.data.find(c => c.id === this.activeCategory);
    }

    getCategoryStats(catId) {
        const cat = this.data.find(c => c.id === catId);
        if (!cat) return { checked: 0, total: 0 };
        let checked = 0;
        cat.items.forEach(item => { if (item.status === 'checked') checked++; });
        return { checked, total: cat.items.length };
    }

    getOverallStats() {
        let checked = 0, total = 0;
        this.data.forEach(cat => {
            cat.items.forEach(item => {
                total++;
                if (item.status === 'checked') checked++;
            });
        });
        return { checked, total };
    }

    // ========== 业主信息复制 ==========
    copyOwnerInfo() {
        const cat = this.data.find(c => c.id === 'owner_info');
        if (!cat) return;
        const lines = ['【业主信息】', ''];
        cat.items.forEach(item => {
            const val = item.desc;
            lines.push(`${item.name}：${val}`);
        });
        lines.push('');
        lines.push('—— 来自装修助手');
        const text = lines.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            return true;
        }).catch(() => {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        });
        return text;
    }

    // ========== 渲染 ==========
    renderCategoryList(container) {
        container.innerHTML = '';
        this.data.forEach(cat => {
            const stats = this.getCategoryStats(cat.id);
            const li = document.createElement('li');
            li.className = cat.id === this.activeCategory && !this.showComparison ? 'active' : '';
            li.innerHTML = `
                <span class="module-icon">${cat.icon}</span>
                <span>${cat.name}</span>
                <span class="module-count">${stats.checked}/${stats.total}</span>
            `;
            li.addEventListener('click', () => {
                this.activeCategory = cat.id;
                this.showComparison = false;
                this.renderCategoryList(container);
                this.renderItems(document.getElementById('memoItems'));
                document.getElementById('currentMemoName').textContent = cat.name;
                document.getElementById('currentMemoDesc').textContent = cat.desc;
                document.getElementById('memoActions').innerHTML = '';
            });
            container.appendChild(li);
        });

        // 公司对比入口
        const compLi = document.createElement('li');
        compLi.className = this.showComparison ? 'active' : '';
        compLi.innerHTML = `
            <span class="module-icon">🏢</span>
            <span>公司对比</span>
            <span class="module-count">${this.companies.length}家</span>
        `;
        compLi.addEventListener('click', () => {
            this.showComparison = true;
            this.renderCategoryList(container);
            this.renderComparison(document.getElementById('memoItems'));
            document.getElementById('currentMemoName').textContent = '公司对比';
            document.getElementById('currentMemoDesc').textContent = '记录各装修公司沟通细节，快速对比差异';
        });
        container.appendChild(compLi);
    }

    renderItems(container) {
        container.innerHTML = '';
        const cat = this.getActiveCategory();
        if (!cat) return;

        const isOwnerInfo = cat.id === 'owner_info';

        // 业主信息顶部操作栏
        const actionsEl = document.getElementById('memoActions');
        if (actionsEl) {
            if (isOwnerInfo) {
                actionsEl.innerHTML = `
                    <button class="btn-primary" id="btnCopyOwnerInfo">一键复制</button>
                `;
                actionsEl.querySelector('#btnCopyOwnerInfo').addEventListener('click', () => {
                    const text = this.copyOwnerInfo();
                    const btn = document.getElementById('btnCopyOwnerInfo');
                    btn.textContent = '已复制 ✓';
                    setTimeout(() => { btn.textContent = '一键复制'; }, 2000);
                });
            } else {
                actionsEl.innerHTML = '';
            }
        }

        cat.items.forEach(item => {
            const div = document.createElement('div');
            div.className = `memo-item ${item.status}`;

            if (isOwnerInfo) {
                // 业主信息：desc可编辑
                div.innerHTML = `
                    <div class="memo-check" data-id="${item.id}">
                        <span class="memo-check-icon">${item.status === 'checked' ? '✓' : ''}</span>
                    </div>
                    <div class="memo-content">
                        <div class="memo-name">${item.name}</div>
                        <textarea class="memo-editable-desc" data-id="${item.id}" rows="1">${item.desc}</textarea>
                        ${item.tip ? `<div class="memo-tip">💡 ${item.tip}</div>` : ''}
                    </div>
                `;

                const textarea = div.querySelector('.memo-editable-desc');
                requestAnimationFrame(() => autoResizeTextarea(textarea));
                let descTimer = null;
                textarea.addEventListener('input', () => {
                    autoResizeTextarea(textarea);
                    clearTimeout(descTimer);
                    descTimer = setTimeout(() => {
                        this.updateItemDesc(item.id, textarea.value);
                    }, 300);
                });
            } else {
                // 其他分类：标准显示
                div.innerHTML = `
                    <div class="memo-check" data-id="${item.id}">
                        <span class="memo-check-icon">${item.status === 'checked' ? '✓' : ''}</span>
                    </div>
                    <div class="memo-content">
                        <div class="memo-name">${item.name}</div>
                        <div class="memo-desc">${item.desc}</div>
                        ${item.tip ? `<div class="memo-tip">💡 ${item.tip}</div>` : ''}
                        <div class="memo-notes-row">
                            <textarea class="memo-notes-input" data-id="${item.id}" placeholder="备注..." rows="1">${item.notes || ''}</textarea>
                        </div>
                    </div>
                `;

                const notesInput = div.querySelector('.memo-notes-input');
                requestAnimationFrame(() => autoResizeTextarea(notesInput));
                let notesTimer = null;
                notesInput.addEventListener('input', () => {
                    autoResizeTextarea(notesInput);
                    clearTimeout(notesTimer);
                    notesTimer = setTimeout(() => {
                        this.updateNotes(item.id, notesInput.value);
                    }, 500);
                });
            }

            div.querySelector('.memo-check').addEventListener('click', () => {
                this.toggleItem(item.id);
                this.renderItems(container);
                this.renderCategoryList(document.getElementById('memoCategoryList'));
                this.renderProgress();
            });

            container.appendChild(div);
        });
    }

    // ========== 公司对比 ==========
    renderComparison(container) {
        container.innerHTML = '';

        // 公司管理栏
        const header = document.createElement('div');
        header.className = 'comp-header';
        header.innerHTML = `
            <div class="comp-company-tabs">
                ${this.companies.map(c => `
                    <button class="comp-tab ${c.id === this.activeCompany ? 'active' : ''}" data-id="${c.id}">
                        ${c.name}
                        <span class="comp-tab-del" data-del="${c.id}">×</span>
                    </button>
                `).join('')}
                <button class="comp-tab-add" id="btnAddCompany">+ 添加公司</button>
            </div>
            <div class="comp-search-bar">
                <input type="text" class="comp-search-input" id="compSearchInput" placeholder="搜索对比项...">
            </div>
        `;
        container.appendChild(header);

        // 搜索（模糊匹配问题名称 + 所有输入框值 + 备注）
        const searchInput = header.querySelector('#compSearchInput');
        let searchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const q = searchInput.value.trim().toLowerCase();
                const sections = container.querySelectorAll('.comp-cat-section');
                const rows = container.querySelectorAll('.comp-row');

                // 按分类名收集每个 section 的名字
                const sectionNames = [];
                sections.forEach(s => {
                    const n = s.querySelector('.comp-cat-name');
                    sectionNames.push(n ? n.textContent : '');
                });

                // 先隐藏/显示每行
                rows.forEach(row => {
                    if (!q) { row.style.display = ''; return; }
                    const allText = row.textContent.toLowerCase();
                    row.style.display = allText.includes(q) ? '' : 'none';
                });

                // 再按 section 判断是否有可见行
                sections.forEach((section, i) => {
                    if (!q) { section.style.display = ''; return; }
                    // 行紧跟在 section 后面，直到下一个 section
                    let nextSection = sections[i + 1];
                    let hasMatch = sectionNames[i].toLowerCase().includes(q);
                    let sibling = section.nextElementSibling;
                    while (sibling && !sibling.classList.contains('comp-cat-section')) {
                        if (sibling.classList.contains('comp-row') && sibling.style.display !== 'none') {
                            hasMatch = true;
                            break;
                        }
                        sibling = sibling.nextElementSibling;
                    }
                    section.style.display = hasMatch ? '' : 'none';
                    if (hasMatch) section.classList.remove('collapsed');
                });
            }, 150);
        });

        // 公司tab切换
        header.querySelectorAll('.comp-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (e.target.closest('.comp-tab-del')) return;
                this.activeCompany = tab.dataset.id;
                this.renderComparison(container);
            });
        });
        header.querySelectorAll('.comp-tab-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.del;
                if (confirm('确定删除该公司？')) {
                    this.removeCompany(id);
                    this.renderComparison(container);
                    this.renderCategoryList(document.getElementById('memoCategoryList'));
                }
            });
        });
        header.querySelector('#btnAddCompany').addEventListener('click', () => {
            const name = prompt('公司名称：');
            if (name && name.trim()) {
                this.addCompany(name.trim());
                this.renderComparison(container);
                this.renderCategoryList(document.getElementById('memoCategoryList'));
            }
        });

        if (this.companies.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'comp-empty';
            empty.textContent = '点击「添加公司」开始记录各装修公司沟通细节';
            container.appendChild(empty);
            return;
        }

        // 对比表格
        const table = document.createElement('div');
        table.className = 'comp-table';

        // 表头：公司名
        const thead = document.createElement('div');
        thead.className = 'comp-thead';
        thead.innerHTML = `<div class="comp-th comp-th-label">对比项</div>
            ${this.companies.map(c => `<div class="comp-th ${c.id === this.activeCompany ? 'active' : ''}">${c.name}</div>`).join('')}`;
        table.appendChild(thead);

        // datalist（供所有input复用）
        const datalistContainer = document.createElement('div');
        datalistContainer.style.display = 'none';
        COMPARE_QUESTIONS.forEach(q => {
            const existingValues = new Set(q.options || []);
            this.companies.forEach(c => {
                const a = (c.answers && c.answers[q.id]) || {};
                if (a.value) existingValues.add(a.value);
            });
            const dl = document.createElement('datalist');
            dl.id = `dl-${q.id}`;
            existingValues.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                dl.appendChild(opt);
            });
            datalistContainer.appendChild(dl);
        });
        table.appendChild(datalistContainer);

        // 按分类分组
        const categories = {};
        COMPARE_QUESTIONS.forEach(q => {
            if (!categories[q.category]) categories[q.category] = [];
            categories[q.category].push(q);
        });

        Object.entries(categories).forEach(([catName, questions]) => {
            // 分类标题 + 提示 + 备注
            const tipData = COMPARE_CATEGORY_TIPS[catName] || {};
            const company = this.getActiveCompany();
            const catNotes = (company && company.categoryNotes && company.categoryNotes[catName]) || '';

            const catSection = document.createElement('div');
            catSection.className = 'comp-cat-section';
            catSection.innerHTML = `
                <div class="comp-cat-header" data-cat="${catName}">
                    <span class="comp-cat-name">${catName}</span>
                    <span class="comp-cat-toggle">▼</span>
                </div>
                <div class="comp-cat-body">
                    ${tipData.tip ? `<div class="comp-cat-tip">${tipData.tip}</div>` : ''}
                    ${tipData.guide ? `<div class="comp-cat-guide">${tipData.guide}</div>` : ''}
                    <div class="comp-cat-notes-area">
                        <div class="comp-cat-notes-view" data-cat="${catName}">
                            <div class="comp-cat-notes-text">${catNotes || '<span class="comp-cat-notes-placeholder">点击编辑，记录本模块沟通要点...</span>'}</div>
                            <button class="comp-cat-notes-edit" data-cat="${catName}">编辑</button>
                        </div>
                        <div class="comp-cat-notes-editing" data-cat="${catName}" style="display:none;">
                            <textarea class="comp-cat-notes-textarea" data-cat="${catName}" placeholder="记录本模块沟通要点...">${catNotes}</textarea>
                            <button class="comp-cat-notes-save" data-cat="${catName}">保存</button>
                        </div>
                    </div>
                </div>
            `;
            table.appendChild(catSection);

            // 折叠切换
            catSection.querySelector('.comp-cat-header').addEventListener('click', () => {
                catSection.classList.toggle('collapsed');
            });

            // 编辑按钮
            catSection.querySelector('.comp-cat-notes-edit').addEventListener('click', () => {
                catSection.querySelector('.comp-cat-notes-view').style.display = 'none';
                catSection.querySelector('.comp-cat-notes-editing').style.display = '';
                catSection.querySelector('.comp-cat-notes-textarea').focus();
            });

            // 保存按钮
            catSection.querySelector('.comp-cat-notes-save').addEventListener('click', () => {
                const val = catSection.querySelector('.comp-cat-notes-textarea').value;
                this.setCategoryNotes(catName, val);
                catSection.querySelector('.comp-cat-notes-text').innerHTML = val || '<span class="comp-cat-notes-placeholder">点击编辑，记录本模块沟通要点...</span>';
                catSection.querySelector('.comp-cat-notes-view').style.display = '';
                catSection.querySelector('.comp-cat-notes-editing').style.display = 'none';
            });

            questions.forEach(q => {
                const row = document.createElement('div');
                row.className = 'comp-row';

                const labelCell = document.createElement('div');
                labelCell.className = 'comp-cell comp-cell-label';
                labelCell.innerHTML = `<span class="comp-q-name">${q.question}</span>`;
                row.appendChild(labelCell);

                const datalistId = `dl-${q.id}`;

                this.companies.forEach(c => {
                    const cell = document.createElement('div');
                    cell.className = `comp-cell ${c.id === this.activeCompany ? 'active' : ''}`;
                    const answer = (c.answers && c.answers[q.id]) || {};

                    cell.innerHTML = `
                        <input type="text" class="comp-text-input" data-cid="${c.id}" data-qid="${q.id}" list="${datalistId}" placeholder="选择或输入..." value="${answer.value || ''}">
                        <input type="text" class="comp-note-input" data-cid="${c.id}" data-qid="${q.id}" placeholder="补充..." value="${answer.notes || ''}">
                    `;
                    cell.querySelector('.comp-text-input').addEventListener('input', (e) => {
                        const prev = this.activeCompany;
                        this.activeCompany = c.id;
                        this.setCompanyAnswer(q.id, e.target.value, cell.querySelector('.comp-note-input').value);
                        this.activeCompany = prev;
                    });
                    cell.querySelector('.comp-note-input').addEventListener('input', (e) => {
                        const prev = this.activeCompany;
                        this.activeCompany = c.id;
                        this.setCompanyAnswer(q.id, cell.querySelector('.comp-text-input').value, e.target.value);
                        this.activeCompany = prev;
                    });

                    row.appendChild(cell);
                });

                table.appendChild(row);
            });
        });

        container.appendChild(table);
    }

    renderProgress(container) {
        if (!container) container = document.getElementById('memoProgress');
        if (!container) return;
        const stats = this.getOverallStats();
        const pct = stats.total > 0 ? Math.round(stats.checked / stats.total * 100) : 0;
        container.innerHTML = `
            <div class="memo-progress-bar">
                <div class="memo-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="memo-progress-text">${stats.checked}/${stats.total} 已确认 · ${pct}%</div>
        `;
    }

    renderAll() {
        this.renderCategoryList(document.getElementById('memoCategoryList'));
        if (this.showComparison) {
            this.renderComparison(document.getElementById('memoItems'));
            document.getElementById('currentMemoName').textContent = '公司对比';
            document.getElementById('currentMemoDesc').textContent = '记录各装修公司沟通细节，快速对比差异';
            document.getElementById('memoActions').innerHTML = '';
        } else {
            this.renderItems(document.getElementById('memoItems'));
        }
        this.renderProgress();
        if (!this.showComparison) {
            const cat = this.getActiveCategory();
            if (cat) {
                document.getElementById('currentMemoName').textContent = cat.name;
                document.getElementById('currentMemoDesc').textContent = cat.desc;
            }
        }
    }
}

// ========== 工具函数 ==========
function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}
