// ========== 沟通备忘管理 ==========
class MemoManager {
    constructor() {
        this.data = JSON.parse(JSON.stringify(MEMO_DATA));
        this.activeCategory = this.data[0].id;
        this.companies = [];
        this.activeCompany = null;
        this.showComparison = false;
        this.showWindowDiagram = false;
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
                            if (s.images !== undefined) item.images = s.images;
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
                state[item.id] = {
                    status: item.status,
                    notes: item.notes,
                    value: item.value,
                    images: item.images || []
                };
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

    // ========== 图片管理 ==========
    async uploadImage(itemId, file) {
        const item = this.findItem(itemId);
        if (!item) return;
        if (!item.images) item.images = [];

        if (location.protocol === 'file:') {
            alert('请通过服务器访问此页面（python3 server.py），file:// 协议无法上传图片');
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const resp = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await resp.json();
            if (data.ok) {
                item.images.push({ url: data.url, filename: data.filename, name: file.name });
                this.saveState();
                return data.url;
            }
        } catch (e) {
            console.error('Upload failed:', e);
        }
        return null;
    }

    async deleteImage(itemId, filename) {
        const item = this.findItem(itemId);
        if (!item || !item.images) return;
        try {
            await fetch(`/api/image/${filename}`, { method: 'DELETE' });
        } catch (e) { /* ignore */ }
        item.images = item.images.filter(img => img.filename !== filename);
        this.saveState();
    }

    getImages(itemId) {
        const item = this.findItem(itemId);
        return item ? (item.images || []) : [];
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
            li.className = cat.id === this.activeCategory && !this.showComparison && !this.showWindowDiagram ? 'active' : '';
            li.innerHTML = `
                <span class="module-icon">${cat.icon}</span>
                <span>${cat.name}</span>
                <span class="module-count">${stats.checked}/${stats.total}</span>
            `;
            li.addEventListener('click', () => {
                this.activeCategory = cat.id;
                this.showComparison = false;
                this.showWindowDiagram = false;
                this.renderCategoryList(container);
                this.renderItems(document.getElementById('memoItems'));
                document.getElementById('currentMemoName').textContent = cat.name;
                document.getElementById('currentMemoDesc').textContent = cat.desc;
                document.getElementById('memoActions').innerHTML = '';
            });
            container.appendChild(li);

            // 窗户方案图解入口（仅门窗分类后面显示）
            if (cat.id === 'door_window') {
                const winLi = document.createElement('li');
                winLi.className = this.showWindowDiagram ? 'active' : '';
                winLi.innerHTML = `
                    <span class="module-icon">📐</span>
                    <span>窗户方案图解</span>
                `;
                winLi.addEventListener('click', () => {
                    this.showWindowDiagram = true;
                    this.showComparison = false;
                    this.renderCategoryList(container);
                    this.renderWindowDiagrams(document.getElementById('memoItems'));
                    document.getElementById('currentMemoName').textContent = '窗户方案图解';
                    document.getElementById('currentMemoDesc').textContent = '鲁班门窗实做方案 C1–C5（室内视角 · 等比例）';
                    document.getElementById('memoActions').innerHTML = '';
                });
                container.appendChild(winLi);
            }
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
                const images = item.images || [];
                const imagesHtml = images.length > 0 ? `
                    <div class="memo-images">
                        ${images.map(img => `
                            <div class="memo-thumb-wrap">
                                <img class="memo-thumb" src="${img.url}" alt="${img.name || ''}" data-full="${img.url}">
                                <button class="memo-thumb-del" data-filename="${img.filename}" data-item="${item.id}">×</button>
                            </div>
                        `).join('')}
                    </div>
                ` : '';

                const colorCardBtn = item.id === 'dw_color' ? `<button class="memo-color-card-btn" data-item="${item.id}">🎨 下载色卡</button>` : '';

                div.innerHTML = `
                    <div class="memo-check" data-id="${item.id}">
                        <span class="memo-check-icon">${item.status === 'checked' ? '✓' : ''}</span>
                    </div>
                    <div class="memo-content">
                        <div class="memo-name">${item.name} ${colorCardBtn}</div>
                        <div class="memo-desc">${item.desc}</div>
                        ${item.tip ? `<div class="memo-tip">💡 ${item.tip}</div>` : ''}
                        <div class="memo-notes-row">
                            <textarea class="memo-notes-input" data-id="${item.id}" placeholder="备注..." rows="1">${item.notes || ''}</textarea>
                        </div>
                        ${imagesHtml}
                        <div class="memo-image-actions">
                            <label class="memo-upload-btn" data-item="${item.id}">
                                📷 添加图片
                                <input type="file" accept="image/*" class="memo-file-input" data-item="${item.id}" hidden>
                            </label>
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

                // 图片上传
                const fileInput = div.querySelector('.memo-file-input');
                const uploadBtn = div.querySelector('.memo-upload-btn');
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    uploadBtn.disabled = true;
                    uploadBtn.textContent = '上传中...';
                    const url = await this.uploadImage(item.id, file);
                    if (url) {
                        this.renderItems(container);
                        this.renderCategoryList(document.getElementById('memoCategoryList'));
                    } else {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '📷 添加图片<input type="file" accept="image/*" class="memo-file-input" data-item="' + item.id + '" hidden>';
                        const newInput = uploadBtn.querySelector('.memo-file-input');
                        newInput.addEventListener('change', fileInput.onchange);
                    }
                });

                // 图片删除
                div.querySelectorAll('.memo-thumb-del').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm('确定删除这张图片？')) {
                            await this.deleteImage(btn.dataset.item, btn.dataset.filename);
                            this.renderItems(container);
                        }
                    });
                });

                // 图片点击查看
                div.querySelectorAll('.memo-thumb').forEach(thumb => {
                    thumb.addEventListener('click', () => {
                        MemoManager.openLightbox(thumb.dataset.full);
                    });
                });

                // 色卡下载
                const colorCardBtnEl = div.querySelector('.memo-color-card-btn');
                if (colorCardBtnEl) {
                    colorCardBtnEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        MemoManager.openColorCardModal();
                    });
                }
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

    // ========== 窗户方案图解（鲁班门窗实做 C1–C5） ==========
    renderWindowDiagrams(container) {
        container.innerHTML = '';

        const banner = document.createElement('div');
        banner.className = 'win-spec-banner';
        banner.innerHTML = `
            <div class="win-spec-title">鲁班门窗定稿 · 名匠85平齐内开窗</div>
            <div class="win-spec-meta">C1 客厅 · C3 主卧 · C5 次卧 · C4 厨房 · C2 空调井门。编号以鲁班图纸为准（初期对比稿里 C1/C3 是客厅原方案/改版、C2/C4 是主卧原方案/改版，已作废）。内象牙白 / 外8019麻 · 三玻 5+10A+5+10A+5 · 诺托隐形海洋执手白 · 高透纱 · 室内视角</div>
        `;
        container.appendChild(banner);

        const legend = document.createElement('div');
        legend.className = 'win-legend';
        legend.innerHTML = `
            <span class="win-legend-item"><span class="win-dot" style="background:#2a5a8a;"></span> 固定玻璃</span>
            <span class="win-legend-item"><span class="win-dot" style="background:#c47a32;"></span> 内开扇（含纱）</span>
            <span class="win-legend-item"><span class="win-dot" style="background:#3d8b6e;"></span> 四连杆外开（含纱）</span>
            <span class="win-legend-item"><span class="win-dot" style="background:var(--border);"></span> 窗框/横梁</span>
        `;
        container.appendChild(legend);

        const row1 = document.createElement('div');
        row1.className = 'win-row';
        row1.appendChild(this.createWindowCard('C1', '客厅', '落地全景窗', '2300 × 2300 · 左700分格 + 右1600整玻 · 扇 658×1258', this.svgC1(), '右侧大固定约 3.7㎡，确认玻璃厚度与吊装。'));
        row1.appendChild(this.createWindowCard('C3', '主卧', 'L型转角窗', '正面1730 + 侧面552 × 1990高 · 扇 658×1248', this.svgC3(), '仅左上内开一扇，正面中段与转角侧面均为落地固定。'));
        container.appendChild(row1);

        const row2 = document.createElement('div');
        row2.className = 'win-row';
        row2.appendChild(this.createWindowCard('C5', '次卧', '左右分格内开窗', '905 × 1500 · 左355固定 + 右550内开 · 扇 508×1441', this.svgC5(), '见图纸第二页（103_01）。'));
        row2.appendChild(this.createWindowCard('C4', '厨房', '四连杆外开窗', '865 × 1400 · 上1000外开 + 下400固定 · 扇 806×958', this.svgC4(), '台面上方用外开，避免内开挡灶台；开启方向勿与其他窗搞混。'));
        row2.appendChild(this.createWindowCard('C2', '空调井', '内开门', '570 × 1267 · 整扇内开 · 扇 511×1208', this.svgC2(), '空调井检修门。同小区井内有发霉案例，密封与井内防水一并核对。'));
        container.appendChild(row2);
    }

    createWindowCard(label, room, title, spec, svgHtml, tip) {
        const div = document.createElement('div');
        div.className = 'win-card';
        div.innerHTML = `
            <div class="win-card-header">
                <h3>${label} · ${title}</h3>
                <span class="win-room-tag">${room}</span>
            </div>
            <p class="win-spec">${spec}</p>
            <div class="win-svg-wrap">${svgHtml}</div>
            ${tip ? `<div class="win-tip">💡 ${tip}</div>` : ''}
        `;
        return div;
    }

    // 标注辅助：水平尺寸
    _dimH(x1, x2, y, label) {
        const mid = (x1 + x2) / 2;
        return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#888" stroke-width="0.8"/>
            <line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="#888" stroke-width="0.8"/>
            <line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" stroke="#888" stroke-width="0.8"/>
            <text x="${mid}" y="${y - 5}" text-anchor="middle" font-size="9" fill="#888">${label}</text>`;
    }
    _dimV(x, y1, y2, label) {
        const mid = (y1 + y2) / 2;
        return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#888" stroke-width="0.8"/>
            <line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}" stroke="#888" stroke-width="0.8"/>
            <line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}" stroke="#888" stroke-width="0.8"/>
            <text x="${x - 6}" y="${mid}" text-anchor="middle" font-size="9" fill="#888" transform="rotate(-90,${x - 6},${mid})">${label}</text>`;
    }
    _paneFixed(x, y, w, h, label) {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a5a8a" rx="2" opacity="0.7"/>
            <text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-size="10" fill="#fff">${label || '固定'}</text>`;
    }
    _paneIn(x, y, w, h, label, sub) {
        const cx = x + w / 2, cy = y + h / 2;
        const subText = sub === undefined ? '含纱' : sub;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#c47a32" rx="2" opacity="0.88"/>
            <line x1="${x + 4}" y1="${y + 4}" x2="${x + w - 4}" y2="${y + h - 4}" stroke="#fff" stroke-width="0.9" stroke-dasharray="3 2" opacity="0.7"/>
            <line x1="${x + w - 4}" y1="${y + 4}" x2="${x + 4}" y2="${y + h - 4}" stroke="#fff" stroke-width="0.9" stroke-dasharray="3 2" opacity="0.7"/>
            <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${label || '内开'}</text>
            ${subText ? `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="8" fill="#fff">${subText}</text>` : ''}`;
    }
    _paneOut(x, y, w, h, label) {
        const cx = x + w / 2, cy = y + h / 2;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3d8b6e" rx="2" opacity="0.88"/>
            <polyline points="${x + 8},${y + h - 8} ${cx},${y + 10} ${x + w - 8},${y + h - 8}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3 2" opacity="0.85"/>
            <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${label || '外开'}</text>
            <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" fill="#fff">四连杆·含纱</text>`;
    }

    svgC1() {
        // 2300×2300：左700（上1300内开/下1000固）+ 右1600整固
        const W = 230, H = 230, L = 70, R = 160, T = 130, B = 100;
        return `<svg viewBox="-48 -32 310 290" width="100%" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#555" stroke-width="2.5"/>
            <line x1="${L}" y1="0" x2="${L}" y2="${H}" stroke="#555" stroke-width="2.5"/>
            <line x1="0" y1="${T}" x2="${L}" y2="${T}" stroke="#555" stroke-width="2.5"/>
            ${this._paneIn(1.5, 1.5, L - 3, T - 3)}
            ${this._paneFixed(1.5, T + 1.5, L - 3, B - 3)}
            ${this._paneFixed(L + 1.5, 1.5, R - 3, H - 3, '固定 1600×2300')}
            ${this._dimH(0, W, -14, '2300')}
            ${this._dimV(-18, 0, H, '2300')}
            <text x="${L / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">700</text>
            <text x="${L + R / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">1600</text>
            <text x="${W + 8}" y="${T / 2}" font-size="8" fill="#666">1300</text>
            <text x="${W + 8}" y="${T + B / 2}" font-size="8" fill="#666">1000</text>
        </svg>`;
    }

    svgC2() {
        // 570×1267 整扇内开
        const W = 57, H = 127;
        return `<svg viewBox="-48 -32 140 180" width="100%" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#555" stroke-width="2.5"/>
            ${this._paneIn(1.5, 1.5, W - 3, H - 3, '内开门')}
            ${this._dimH(0, W, -14, '570')}
            ${this._dimV(-18, 0, H, '1267')}
        </svg>`;
    }

    svgC3() {
        // 正面1730（700+1030）+ 侧面552，高1990；左上1290内开/左下700固；中+侧落地固
        const H = 199, L = 70, M = 103, S = 55, T = 129, B = 70, F = L + M;
        return `<svg viewBox="-48 -36 300 260" width="100%" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${F}" height="${H}" fill="none" stroke="#555" stroke-width="2.5"/>
            <rect x="${F}" y="0" width="${S}" height="${H}" fill="none" stroke="#555" stroke-width="2.5"/>
            <line x1="${L}" y1="0" x2="${L}" y2="${H}" stroke="#555" stroke-width="2.5"/>
            <line x1="${F}" y1="0" x2="${F}" y2="${H}" stroke="#555" stroke-width="2.5"/>
            <line x1="0" y1="${T}" x2="${L}" y2="${T}" stroke="#555" stroke-width="2.5"/>
            <text x="${F - 2}" y="12" font-size="7" fill="#6c8cff" text-anchor="end">90°转角</text>
            ${this._paneIn(1.5, 1.5, L - 3, T - 3)}
            ${this._paneFixed(1.5, T + 1.5, L - 3, B - 3)}
            ${this._paneFixed(L + 1.5, 1.5, M - 3, H - 3, '固定')}
            ${this._paneFixed(F + 1.5, 1.5, S - 3, H - 3, '固定')}
            ${this._dimH(0, F + S, -18, '2282')}
            <text x="${F / 2}" y="-6" text-anchor="middle" font-size="8" fill="#666">正面 1730</text>
            <text x="${F + S / 2}" y="-6" text-anchor="middle" font-size="8" fill="#666">侧面 552</text>
            ${this._dimV(-18, 0, H, '1990')}
            <text x="${L / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">700</text>
            <text x="${L + M / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">1030</text>
            <text x="${F + S / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">552</text>
            <text x="${F + S + 8}" y="${T / 2}" font-size="8" fill="#666">1290</text>
            <text x="${F + S + 8}" y="${T + B / 2}" font-size="8" fill="#666">700</text>
        </svg>`;
    }

    svgC4() {
        // 865×1400：上1000外开 + 下400固定
        const W = 87, H = 140, T = 100, B = 40;
        return `<svg viewBox="-48 -32 170 190" width="100%" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#555" stroke-width="2.5"/>
            <line x1="0" y1="${T}" x2="${W}" y2="${T}" stroke="#555" stroke-width="2.5"/>
            ${this._paneOut(1.5, 1.5, W - 3, T - 3)}
            ${this._paneFixed(1.5, T + 1.5, W - 3, B - 3)}
            ${this._dimH(0, W, -14, '865')}
            ${this._dimV(-18, 0, H, '1400')}
            <text x="${W + 8}" y="${T / 2}" font-size="8" fill="#666">1000</text>
            <text x="${W + 8}" y="${T + B / 2}" font-size="8" fill="#666">400</text>
        </svg>`;
    }

    svgC5() {
        // 905×1500：左355固定 + 右550内开
        const W = 91, H = 150, L = 36, R = 55;
        return `<svg viewBox="-48 -32 180 200" width="100%" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#555" stroke-width="2.5"/>
            <line x1="${L}" y1="0" x2="${L}" y2="${H}" stroke="#555" stroke-width="2.5"/>
            ${this._paneFixed(1.5, 1.5, L - 3, H - 3)}
            ${this._paneIn(L + 1.5, 1.5, R - 3, H - 3)}
            ${this._dimH(0, W, -14, '905')}
            ${this._dimV(-18, 0, H, '1500')}
            <text x="${L / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">355</text>
            <text x="${L + R / 2}" y="${H + 16}" text-anchor="middle" font-size="8" fill="#666">550</text>
        </svg>`;
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
        } else if (this.showWindowDiagram) {
            this.renderWindowDiagrams(document.getElementById('memoItems'));
            document.getElementById('currentMemoName').textContent = '窗户方案图解';
            document.getElementById('currentMemoDesc').textContent = '鲁班门窗实做方案 C1–C5（室内视角 · 等比例）';
            document.getElementById('memoActions').innerHTML = '';
        } else {
            this.renderItems(document.getElementById('memoItems'));
        }
        this.renderProgress();
        if (!this.showComparison && !this.showWindowDiagram) {
            const cat = this.getActiveCategory();
            if (cat) {
                document.getElementById('currentMemoName').textContent = cat.name;
                document.getElementById('currentMemoDesc').textContent = cat.desc;
            }
        }
    }

    // ========== Lightbox ==========
    static openLightbox(src) {
        if (!document.getElementById('memoLightbox')) {
            const overlay = document.createElement('div');
            overlay.id = 'memoLightbox';
            overlay.className = 'memo-lightbox';
            overlay.innerHTML = `
                <div class="memo-lightbox-backdrop"></div>
                <img class="memo-lightbox-img" src="">
                <button class="memo-lightbox-close">×</button>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('.memo-lightbox-backdrop').addEventListener('click', () => MemoManager.closeLightbox());
            overlay.querySelector('.memo-lightbox-close').addEventListener('click', () => MemoManager.closeLightbox());
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') MemoManager.closeLightbox();
            });
        }
        const lb = document.getElementById('memoLightbox');
        lb.querySelector('.memo-lightbox-img').src = src;
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    static closeLightbox() {
        const lb = document.getElementById('memoLightbox');
        if (lb) {
            lb.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    // ========== 色卡下载 ==========
    static openColorCardModal() {
        const defaultColor = '#3F3A3A';
        const defaultName = 'RAL 8019';
        const defaultCn = '灰棕色 (Grey brown)';

        if (!document.getElementById('memoColorCardModal')) {
            const modal = document.createElement('div');
            modal.id = 'memoColorCardModal';
            modal.className = 'memo-colorcard-modal';
            modal.innerHTML = `
                <div class="memo-colorcard-backdrop"></div>
                <div class="memo-colorcard-panel">
                    <div class="memo-colorcard-header">
                        <h3>色卡生成器</h3>
                        <button class="memo-colorcard-close">×</button>
                    </div>
                    <div class="memo-colorcard-body">
                        <div class="memo-colorcard-preview">
                            <canvas id="colorCardCanvas" width="540" height="960"></canvas>
                        </div>
                        <div class="memo-colorcard-controls">
                            <label class="memo-colorcard-label">色值 (HEX)</label>
                            <div class="memo-colorcard-input-row">
                                <input type="color" id="ccColorPicker" value="${defaultColor}" class="memo-colorcard-picker">
                                <input type="text" id="ccHexInput" value="${defaultColor}" class="memo-colorcard-hex" maxlength="7">
                            </div>
                            <label class="memo-colorcard-label">颜色名称</label>
                            <input type="text" id="ccNameInput" value="${defaultName}" class="memo-colorcard-text" placeholder="如 RAL 8019">
                            <label class="memo-colorcard-label">中英文说明</label>
                            <input type="text" id="ccDescInput" value="${defaultCn}" class="memo-colorcard-text" placeholder="如 灰棕色 (Grey brown)">
                            <button class="memo-colorcard-download" id="ccDownload">⬇ 下载色卡</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.memo-colorcard-backdrop').addEventListener('click', () => MemoManager.closeColorCardModal());
            modal.querySelector('.memo-colorcard-close').addEventListener('click', () => MemoManager.closeColorCardModal());

            const picker = modal.querySelector('#ccColorPicker');
            const hexInput = modal.querySelector('#ccHexInput');
            const nameInput = modal.querySelector('#ccNameInput');
            const descInput = modal.querySelector('#ccDescInput');

            const syncAndUpdate = () => MemoManager.renderColorCard(
                picker.value, hexInput.value, nameInput.value, descInput.value
            );

            picker.addEventListener('input', () => { hexInput.value = picker.value; syncAndUpdate(); });
            hexInput.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
                    picker.value = hexInput.value;
                    syncAndUpdate();
                }
            });
            nameInput.addEventListener('input', syncAndUpdate);
            descInput.addEventListener('input', syncAndUpdate);

            modal.querySelector('#ccDownload').addEventListener('click', () => {
                MemoManager.downloadColorCard(hexInput.value, nameInput.value, descInput.value);
            });
        }

        document.getElementById('memoColorCardModal').classList.add('open');
        document.body.style.overflow = 'hidden';
        MemoManager.renderColorCard(defaultColor, defaultColor, defaultName, defaultCn);
    }

    static closeColorCardModal() {
        const modal = document.getElementById('memoColorCardModal');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    static renderColorCard(color, hex, name, desc) {
        const canvas = document.getElementById('colorCardCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        // 背景色
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, H);

        // 底部白色信息区
        const infoH = 200;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, H - infoH, W, infoH);

        // 分割线
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - infoH);
        ctx.lineTo(W, H - infoH);
        ctx.stroke();

        // 色值大字
        ctx.fillStyle = '#222222';
        ctx.font = 'bold 36px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hex.toUpperCase(), W / 2, H - infoH + 50);

        // 颜色名称
        ctx.fillStyle = '#333333';
        ctx.font = '600 24px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(name, W / 2, H - infoH + 85);

        // 中英文说明
        ctx.fillStyle = '#888888';
        ctx.font = '18px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(desc, W / 2, H - infoH + 118);

        // 右下角色值小方块
        const swatchSize = 56;
        const sx = W - 40 - swatchSize;
        const sy = H - infoH + (infoH - swatchSize) / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(sx, sy, swatchSize, swatchSize, 8);
        } else {
            const r = 8;
            ctx.moveTo(sx + r, sy);
            ctx.lineTo(sx + swatchSize - r, sy);
            ctx.quadraticCurveTo(sx + swatchSize, sy, sx + swatchSize, sy + r);
            ctx.lineTo(sx + swatchSize, sy + swatchSize - r);
            ctx.quadraticCurveTo(sx + swatchSize, sy + swatchSize, sx + swatchSize - r, sy + swatchSize);
            ctx.lineTo(sx + r, sy + swatchSize);
            ctx.quadraticCurveTo(sx, sy + swatchSize, sx, sy + swatchSize - r);
            ctx.lineTo(sx, sy + r);
            ctx.quadraticCurveTo(sx, sy, sx + r, sy);
        }
        ctx.fill();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    static downloadColorCard(hex, name, desc) {
        const canvas = document.getElementById('colorCardCanvas');
        if (!canvas) return;
        MemoManager.renderColorCard(hex, hex, name, desc);
        const link = document.createElement('a');
        link.download = `色卡_${name.replace(/\s+/g, '_')}_${hex}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

// ========== 工具函数 ==========
function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}
