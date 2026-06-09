// ========== 核心问题管理 ==========
class CoreProblemsManager {
    constructor(reqManager) {
        this.req = reqManager;
    }

    getProblemStatus(problem) {
        const tier = window._currentTier || 'comfort';
        let resolved = 0;
        let totalCost = 0;
        const linked = [];

        problem.linkedItems.forEach(itemId => {
            const item = this.req.findItem(itemId);
            if (!item) return;
            const solution = this.req.getSelectedSolution(item);
            const price = solution ? solution.price : getItemPrice(item, tier);
            linked.push({
                id: item.id,
                name: item.name,
                checked: item.status === 'checked',
                price,
            });
            if (item.status === 'checked') {
                resolved++;
                totalCost += price;
            }
        });

        return {
            total: linked.length,
            resolved,
            ratio: linked.length > 0 ? resolved / linked.length : 0,
            totalCost,
            linked,
        };
    }

    renderList(container) {
        container.innerHTML = '';

        const severityLabels = { high: '高', medium: '中', low: '低' };
        const severityColors = { high: 'var(--red)', medium: 'var(--orange)', low: 'var(--text-dim)' };

        CORE_PROBLEMS.forEach(problem => {
            const status = this.getProblemStatus(problem);
            const pct = Math.round(status.ratio * 100);

            const card = document.createElement('div');
            card.className = 'core-card';
            card.innerHTML = `
                <div class="core-card-header">
                    <div class="core-card-title">
                        <span class="core-severity" style="color:${severityColors[problem.severity]}">[${severityLabels[problem.severity]}]</span>
                        ${problem.name}
                    </div>
                    <div class="core-progress">
                        <div class="core-progress-bar">
                            <div class="core-progress-fill" style="width:${pct}%"></div>
                        </div>
                        <span class="core-progress-text">${status.resolved}/${status.total}</span>
                    </div>
                </div>
                <div class="core-card-desc">${problem.desc}</div>
                <div class="core-card-linked">
                    ${status.linked.map(l => `
                        <div class="core-linked-item ${l.checked ? 'checked' : ''}" data-id="${l.id}">
                            <span class="core-linked-check">${l.checked ? '✓' : '○'}</span>
                            <span class="core-linked-name">${l.name}</span>
                            <span class="core-linked-price">${l.price > 0 ? formatPriceShort(l.price) : ''}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="core-card-cost">
                    已选方案解决成本：<strong>${formatPriceShort(status.totalCost)}</strong>
                </div>
            `;

            // Click linked item → toggle and re-render
            card.querySelectorAll('.core-linked-item').forEach(el => {
                el.addEventListener('click', () => {
                    const itemId = el.dataset.id;
                    this.req.cycleStatus(itemId);
                    this.renderList(container);
                    this.renderSummary(document.getElementById('coreSummary'));
                });
            });

            container.appendChild(card);
        });
    }

    renderSummary(container) {
        let totalProblems = CORE_PROBLEMS.length;
        let fullyResolved = 0;
        let totalCost = 0;
        let highUnresolved = 0;

        CORE_PROBLEMS.forEach(problem => {
            const status = this.getProblemStatus(problem);
            totalCost += status.totalCost;
            if (status.ratio >= 1) fullyResolved++;
            if (problem.severity === 'high' && status.ratio < 1) highUnresolved++;
        });

        container.innerHTML = `
            <div class="core-summary-card">
                <h3>问题解决概览</h3>
                <div class="core-summary-stats">
                    <div class="core-stat">
                        <div class="core-stat-num">${fullyResolved}/${totalProblems}</div>
                        <div class="core-stat-label">已解决</div>
                    </div>
                    <div class="core-stat">
                        <div class="core-stat-num" style="color:${highUnresolved > 0 ? 'var(--red)' : 'var(--green)'}">${highUnresolved}</div>
                        <div class="core-stat-label">高优未解决</div>
                    </div>
                    <div class="core-stat">
                        <div class="core-stat-num">${formatPriceShort(totalCost)}</div>
                        <div class="core-stat-label">问题解决总成本</div>
                    </div>
                </div>
            </div>
            <div class="core-summary-card">
                <h3>按问题归因成本</h3>
                ${CORE_PROBLEMS.map(p => {
                    const s = this.getProblemStatus(p);
                    const pct = totalCost > 0 ? Math.round(s.totalCost / totalCost * 100) : 0;
                    return `<div class="core-cost-row">
                        <span class="core-cost-name">${p.name}</span>
                        <span class="core-cost-bar"><span style="width:${pct}%"></span></span>
                        <span class="core-cost-price">${formatPriceShort(s.totalCost)}</span>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    renderAll() {
        this.renderList(document.getElementById('coreList'));
        this.renderSummary(document.getElementById('coreSummary'));
    }
}
