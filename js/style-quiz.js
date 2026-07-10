// ========== 装修风格助手 - 答题逻辑与界面 ==========

class StyleQuizManager {
    constructor() {
        this.currentQuestion = 0;
        this.answers = {};
        this.modes = {};       // { qId: 'single' | 'multi' }
        this.state = 'intro';  // intro | quiz | result
        this.loadState();
    }

    // ========== 持久化 ==========
    saveState() {
        const data = {
            currentQuestion: this.currentQuestion,
            answers: this.answers,
            modes: this.modes,
            state: this.state
        };
        localStorage.setItem('style_quiz_state', JSON.stringify(data));
    }

    loadState() {
        const raw = localStorage.getItem('style_quiz_state');
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            this.currentQuestion = data.currentQuestion || 0;
            this.answers = data.answers || {};
            this.modes = data.modes || {};
            if (data.state && data.state !== 'home') {
                this.state = data.state;
            }
        } catch {}
    }

    clearState() {
        localStorage.removeItem('style_quiz_state');
    }

    // ========== 多选判断 ==========
    isMultiSelect(qId) {
        return this.modes[qId] === 'multi';
    }

    // 获取某题的已选项数组
    getSelected(qId) {
        const val = this.answers[qId];
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    }

    // 切换单选/多选模式
    toggleMode(q) {
        const cur = this.modes[q.id];
        if (cur === 'multi') {
            // multi → single: 只保留第一个选中项
            this.modes[q.id] = 'single';
            const sel = this.getSelected(q.id);
            this.answers[q.id] = sel.length > 0 ? sel[0] : '';
        } else {
            // single → multi: 把当前选项转为数组
            this.modes[q.id] = 'multi';
            const cur = this.answers[q.id];
            this.answers[q.id] = cur ? [cur] : [];
        }
        this.saveState();
    }

    // ========== 渲染入口 ==========
    renderAll() {
        const container = document.getElementById('panel-tools');
        if (!container) return;
        if (this.state === 'intro') this.renderIntro(container);
        else if (this.state === 'quiz') this.renderQuiz(container);
        else if (this.state === 'result') this.renderResult(container);
    }

    // ========== 工具首页：APP桌面风格 ==========
    renderToolsHome() {
        const container = document.getElementById('panel-tools');
        container.innerHTML = `
            <div class="tools-home">
                <div class="tools-grid">
                    <div class="tool-card" data-tool="style-quiz">
                        <div class="tool-icon">
                            <svg viewBox="0 0 64 64" width="48" height="48">
                                <defs>
                                    <linearGradient id="grad-palette" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:#6c8cff;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:1" />
                                    </linearGradient>
                                </defs>
                                <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#grad-palette)" opacity="0.15"/>
                                <rect x="8" y="8" width="48" height="48" rx="11" fill="none" stroke="url(#grad-palette)" stroke-width="2"/>
                                <circle cx="24" cy="26" r="5" fill="#6c8cff"/>
                                <circle cx="40" cy="22" r="4" fill="#a78bfa"/>
                                <circle cx="32" cy="38" r="6" fill="#818cf8" opacity="0.8"/>
                                <path d="M20 44 Q32 36 44 44" stroke="#6c8cff" stroke-width="2" fill="none" stroke-linecap="round"/>
                                <rect x="22" y="14" width="20" height="3" rx="1.5" fill="url(#grad-palette)" opacity="0.5"/>
                            </svg>
                        </div>
                        <div class="tool-info">
                            <div class="tool-title">装修风格助手</div>
                            <div class="tool-desc">通过几个答题环节，快速精准的帮你推荐最适合你家的装修风格</div>
                        </div>
                        <div class="tool-arrow">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="tools-coming-soon">
                    <div class="tools-soon-title">更多工具开发中...</div>
                    <div class="tools-soon-desc">持续为你的装修之旅提供实用工具</div>
                </div>
            </div>
        `;
        container.querySelector('.tool-card').addEventListener('click', () => {
            this.state = 'intro';
            this.renderAll();
        });
    }

    // ========== 介绍页 ==========
    renderIntro(container) {
        container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-back" id="quizBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div class="quiz-intro">
                    <div class="quiz-intro-icon">
                        <svg viewBox="0 0 80 80" width="80" height="80">
                            <defs>
                                <linearGradient id="grad-intro" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#6c8cff"/>
                                    <stop offset="100%" style="stop-color:#a78bfa"/>
                                </linearGradient>
                            </defs>
                            <circle cx="40" cy="40" r="36" fill="url(#grad-intro)" opacity="0.12"/>
                            <circle cx="40" cy="40" r="28" fill="none" stroke="url(#grad-intro)" stroke-width="2"/>
                            <text x="40" y="46" text-anchor="middle" font-size="28" fill="#6c8cff">?</text>
                        </svg>
                    </div>
                    <h1 class="quiz-intro-title">装修风格助手</h1>
                    <p class="quiz-intro-desc">通过 ${STYLE_QUIZ_QUESTIONS.length} 个维度的问题，从家庭构成、空间条件、色彩偏好、预算范围等角度，为你精准匹配最适合的装修风格。</p>
                    <div class="quiz-intro-tags">
                        <span class="quiz-tag">👤 人群分析</span>
                        <span class="quiz-tag">🏠 空间条件</span>
                        <span class="quiz-tag">🎨 审美偏好</span>
                        <span class="quiz-tag">💰 预算匹配</span>
                    </div>
                    <button class="quiz-start-btn" id="quizStartBtn">开始测试</button>
                </div>
            </div>
        `;
        container.querySelector('#quizBack').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });
        container.querySelector('#quizStartBtn').addEventListener('click', () => {
            this.currentQuestion = 0;
            this.answers = {};
            this.modes = {};
            this.state = 'quiz';
            this.saveState();
            this.renderAll();
        });
    }

    // ========== 答题页 ==========
    renderQuiz(container) {
        const q = STYLE_QUIZ_QUESTIONS[this.currentQuestion];
        const total = STYLE_QUIZ_QUESTIONS.length;
        const progress = ((this.currentQuestion) / total) * 100;
        const multi = this.isMultiSelect(q.id);
        const selected = this.getSelected(q.id);
        const allIds = q.options.map(o => o.id);
        const allSelected = multi && allIds.length > 0 && allIds.every(id => selected.includes(id));
        const hasAnswer = multi ? selected.length > 0 : !!this.answers[q.id];

        container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-back" id="quizBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div class="quiz-progress">
                    <div class="quiz-progress-bar">
                        <div class="quiz-progress-fill" style="width:${progress}%"></div>
                    </div>
                    <div class="quiz-progress-text">${this.currentQuestion} / ${total}</div>
                </div>
                <div class="quiz-question">
                    <div class="quiz-q-header">
                        <h2 class="quiz-q-title">${q.title}</h2>
                        <div class="quiz-q-actions">
                            <button class="quiz-mode-btn ${multi ? 'active' : ''}" id="quizModeToggle">${multi ? '多选' : '单选'}</button>
                            ${multi ? `<button class="quiz-select-all ${allSelected ? 'active' : ''}" id="quizSelectAll">${allSelected ? '取消全选' : '全选'}</button>` : ''}
                        </div>
                    </div>
                    <p class="quiz-q-subtitle">${q.subtitle}</p>
                    <div class="quiz-options">
                        ${q.options.map(opt => {
                            const isChecked = selected.includes(opt.id);
                            return `
                            <div class="quiz-option ${multi ? 'multi' : ''} ${isChecked ? 'selected' : ''}" data-option="${opt.id}">
                                <div class="quiz-option-radio">
                                    <div class="quiz-option-dot"></div>
                                </div>
                                <div class="quiz-option-text">${opt.text}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="quiz-nav">
                    <button class="quiz-nav-btn quiz-prev" ${this.currentQuestion === 0 ? 'disabled' : ''} id="quizPrev">上一题</button>
                    <button class="quiz-nav-btn quiz-next" id="quizNext" ${!hasAnswer ? 'disabled' : ''}>
                        ${this.currentQuestion === total - 1 ? '查看结果' : '下一题'}
                    </button>
                </div>
            </div>
        `;

        container.querySelector('#quizBack').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });

        // 模式切换按钮
        container.querySelector('#quizModeToggle').addEventListener('click', () => {
            this.toggleMode(q);
            this.renderQuiz(container);
        });

        // 全选按钮
        if (multi) {
            container.querySelector('#quizSelectAll').addEventListener('click', () => {
                if (allSelected) {
                    this.answers[q.id] = [];
                } else {
                    this.answers[q.id] = [...allIds];
                }
                this.saveState();
                this.renderQuiz(container);
            });
        }

        // 选项点击
        container.querySelectorAll('.quiz-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const optId = opt.dataset.option;
                if (this.isMultiSelect(q.id)) {
                    const cur = this.getSelected(q.id);
                    if (cur.includes(optId)) {
                        this.answers[q.id] = cur.filter(id => id !== optId);
                    } else {
                        this.answers[q.id] = [...cur, optId];
                    }
                } else {
                    this.answers[q.id] = optId;
                }
                this.saveState();
                this.renderQuiz(container);
            });
        });

        container.querySelector('#quizPrev').addEventListener('click', () => {
            if (this.currentQuestion > 0) {
                this.currentQuestion--;
                this.saveState();
                this.renderQuiz(container);
            }
        });

        container.querySelector('#quizNext').addEventListener('click', () => {
            const multiNow = this.isMultiSelect(q.id);
            const ansNow = multiNow ? this.getSelected(q.id).length > 0 : !!this.answers[q.id];
            if (!ansNow) return;
            if (this.currentQuestion < total - 1) {
                this.currentQuestion++;
                this.saveState();
                this.renderQuiz(container);
            } else {
                this.calculateResult();
                this.state = 'result';
                this.saveState();
                this.renderAll();
            }
        });
    }

    // ========== 计分逻辑 ==========
    calculateResult() {
        const scores = {};
        const blacklisted = {};

        Object.keys(STYLE_LIST).forEach(key => {
            scores[key] = 0;
        });

        const applyOption = (option) => {
            if (!option) return;
            if (option.bonus) {
                Object.entries(option.bonus).forEach(([style, pts]) => {
                    scores[style] = (scores[style] || 0) + pts;
                });
            }
            if (option.penalty) {
                Object.entries(option.penalty).forEach(([style, pts]) => {
                    scores[style] = (scores[style] || 0) + pts;
                });
            }
            if (option.blacklist) {
                option.blacklist.forEach(b => {
                    if (!blacklisted[b.style]) blacklisted[b.style] = [];
                    blacklisted[b.style].push(b.reason);
                });
            }
        };

        STYLE_QUIZ_QUESTIONS.forEach(q => {
            if (this.isMultiSelect(q.id)) {
                const selected = this.getSelected(q.id);
                selected.forEach(optId => {
                    applyOption(q.options.find(o => o.id === optId));
                });
            } else {
                const selectedId = this.answers[q.id];
                if (!selectedId) return;
                applyOption(q.options.find(o => o.id === selectedId));
            }
        });

        const ranked = Object.entries(scores)
            .map(([key, score]) => ({
                key,
                name: STYLE_LIST[key].name,
                color: STYLE_LIST[key].color,
                score,
                blacklisted: blacklisted[key] || [],
                isBlacklisted: (blacklisted[key] || []).length > 0
            }))
            .sort((a, b) => b.score - a.score);

        this.result = { ranked, blacklisted };
    }

    // ========== 结果页 ==========
    renderResult(container) {
        if (!this.result) {
            this.state = 'home';
            this.renderToolsHome();
            return;
        }

        const { ranked } = this.result;
        const top3 = ranked.filter(r => !r.isBlacklisted).slice(0, 3);
        const blacklistedStyles = ranked.filter(r => r.isBlacklisted);
        const maxScore = Math.max(...ranked.map(r => Math.abs(r.score)), 1);

        container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-back" id="quizBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div class="quiz-result">
                    <h2 class="quiz-result-title">测试结果</h2>
                    <p class="quiz-result-subtitle">根据你的回答，为你推荐以下装修风格</p>

                    <div class="quiz-result-top3">
                        ${top3.map((item, i) => `
                            <div class="quiz-rank-card ${i === 0 ? 'best' : ''}">
                                <div class="quiz-rank-badge">${i === 0 ? '最佳推荐' : i === 1 ? '推荐' : '适合'}</div>
                                <div class="quiz-rank-name" style="color:${item.color}">${item.name}</div>
                                <div class="quiz-rank-score">${item.score} 分</div>
                            </div>
                        `).join('')}
                    </div>

                    ${blacklistedStyles.length > 0 ? `
                        <div class="quiz-blacklist-section">
                            <h3 class="quiz-blacklist-title">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <circle cx="9" cy="9" r="8" stroke="#f87171" stroke-width="1.5"/>
                                    <path d="M6 6l6 6M12 6l-6 6" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                不推荐的风格
                            </h3>
                            <div class="quiz-blacklist-items">
                                ${blacklistedStyles.map(item => `
                                    <div class="quiz-blacklist-item">
                                        <div class="quiz-blacklist-name">${item.name}</div>
                                        <div class="quiz-blacklist-reasons">
                                            ${item.blacklisted.map(r => `<div class="quiz-blacklist-reason">${r}</div>`).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="quiz-full-rank">
                        <h3 class="quiz-full-rank-title">全部风格得分</h3>
                        <div class="quiz-rank-bars">
                            ${ranked.map(item => `
                                <div class="quiz-rank-bar-row ${item.isBlacklisted ? 'blacklisted' : ''}">
                                    <div class="quiz-rank-bar-name">${item.name}</div>
                                    <div class="quiz-rank-bar-track">
                                        <div class="quiz-rank-bar-fill" style="width:${Math.max(0, (item.score / maxScore) * 100)}%;background:${item.isBlacklisted ? '#f87171' : item.color}"></div>
                                    </div>
                                    <div class="quiz-rank-bar-score ${item.isBlacklisted ? 'bl' : ''}">${item.score}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="quiz-result-actions">
                        <button class="quiz-action-btn primary" id="quizRestart">重新测试</button>
                        <button class="quiz-action-btn secondary" id="quizBackHome">返回工具箱</button>
                    </div>
                </div>
            </div>
        `;

        container.querySelector('#quizBack').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });
        container.querySelector('#quizRestart').addEventListener('click', () => {
            this.currentQuestion = 0;
            this.answers = {};
            this.modes = {};
            this.result = null;
            this.state = 'intro';
            this.clearState();
            this.renderAll();
        });
        container.querySelector('#quizBackHome').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });
    }
}
