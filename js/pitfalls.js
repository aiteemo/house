// ========== 装修避坑管理 ==========
class PitfallsManager {
    constructor() {
        this.data = JSON.parse(JSON.stringify(PITFALLS_DATA));
        this.activeCategory = this.data[0].id;
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('renovation_pitfalls');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.data.forEach(cat => {
                    cat.items.forEach(item => {
                        if (state[item.id]) {
                            const s = state[item.id];
                            if (s.status) item.status = s.status;
                            if (s.notes !== undefined) item.notes = s.notes;
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
                state[item.id] = { status: item.status, notes: item.notes };
            });
        });
        localStorage.setItem('renovation_pitfalls', JSON.stringify(state));
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
        const cycle = ['pending', 'checked', 'skipped'];
        const idx = cycle.indexOf(item.status);
        item.status = cycle[(idx + 1) % 3];
        this.saveState();
    }

    updateNotes(itemId, notes) {
        const item = this.findItem(itemId);
        if (!item) return;
        item.notes = notes;
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

    renderCategoryList(container) {
        container.innerHTML = '';
        this.data.forEach(cat => {
            const stats = this.getCategoryStats(cat.id);
            const li = document.createElement('li');
            li.className = cat.id === this.activeCategory ? 'active' : '';
            li.innerHTML = `
                <span class="module-icon">${cat.icon}</span>
                <span>${cat.name}</span>
                <span class="module-count">${stats.checked}/${stats.total}</span>
            `;
            li.addEventListener('click', () => {
                this.activeCategory = cat.id;
                this.renderCategoryList(container);
                this.renderItems(document.getElementById('pitfallItems'));
                const c = this.getActiveCategory();
                if (c) {
                    document.getElementById('currentPitfallName').textContent = c.name;
                    document.getElementById('currentPitfallDesc').textContent = c.desc;
                }
            });
            container.appendChild(li);
        });
    }

    renderItems(container) {
        container.innerHTML = '';
        const cat = this.getActiveCategory();
        if (!cat) return;

        cat.items.forEach(item => {
            const div = document.createElement('div');
            div.className = `pitfall-item ${item.status}`;
            div.innerHTML = `
                <div class="pitfall-check" data-id="${item.id}">
                    <span class="pitfall-check-icon">${item.status === 'checked' ? '✓' : item.status === 'skipped' ? '—' : ''}</span>
                </div>
                <div class="pitfall-content">
                    <div class="pitfall-name">${item.name}</div>
                    <div class="pitfall-desc">${item.desc}</div>
                    ${item.tip ? `<div class="pitfall-tip">💡 ${item.tip}</div>` : ''}
                    <div class="pitfall-notes-row">
                        <input type="text" class="pitfall-notes-input" data-id="${item.id}" placeholder="备注..." value="${item.notes || ''}">
                    </div>
                </div>
            `;

            div.querySelector('.pitfall-check').addEventListener('click', () => {
                this.toggleItem(item.id);
                this.renderItems(container);
                this.renderCategoryList(document.getElementById('pitfallCategoryList'));
                this.renderProgress();
            });

            const notesInput = div.querySelector('.pitfall-notes-input');
            let notesTimer = null;
            notesInput.addEventListener('input', () => {
                clearTimeout(notesTimer);
                notesTimer = setTimeout(() => {
                    this.updateNotes(item.id, notesInput.value);
                }, 500);
            });

            container.appendChild(div);
        });
    }

    renderProgress(container) {
        if (!container) container = document.getElementById('pitfallProgress');
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
        this.renderCategoryList(document.getElementById('pitfallCategoryList'));
        this.renderItems(document.getElementById('pitfallItems'));
        this.renderProgress();
        const cat = this.getActiveCategory();
        if (cat) {
            document.getElementById('currentPitfallName').textContent = cat.name;
            document.getElementById('currentPitfallDesc').textContent = cat.desc;
        }
    }
}
