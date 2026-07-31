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
        else if (this.state === 'colorcard') this.renderColorCardTool(container);
        else if (this.state === 'wirecalc') this.renderWireCalc(container);
        else if (this.state === 'heating') this.renderHeating(container);
        else if (this.state === 'md2img') this.renderMd2Img(container);
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
                    <div class="tool-card" data-tool="colorcard">
                        <div class="tool-icon">
                            <svg viewBox="0 0 64 64" width="48" height="48">
                                <rect x="4" y="4" width="56" height="56" rx="14" fill="#3F3A3A" opacity="0.12"/>
                                <rect x="8" y="8" width="48" height="48" rx="11" fill="none" stroke="#3F3A3A" stroke-width="2"/>
                                <rect x="16" y="16" width="32" height="22" rx="4" fill="#3F3A3A"/>
                                <text x="32" y="31" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">#3F3A3A</text>
                                <rect x="16" y="42" width="32" height="8" rx="2" fill="#3F3A3A" opacity="0.2"/>
                                <rect x="20" y="44" width="16" height="2" rx="1" fill="#3F3A3A" opacity="0.3"/>
                                <rect x="20" y="47" width="10" height="1.5" rx="0.75" fill="#3F3A3A" opacity="0.2"/>
                            </svg>
                        </div>
                        <div class="tool-info">
                            <div class="tool-title">色卡生成</div>
                            <div class="tool-desc">输入色值，一键生成标准色卡 PNG，方便与商家沟通确认颜色</div>
                        </div>
                        <div class="tool-arrow">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="tool-card" data-tool="wirecalc">
                        <div class="tool-icon">
                            <svg viewBox="0 0 64 64" width="48" height="48">
                                <rect x="4" y="4" width="56" height="56" rx="14" fill="#fb923c" opacity="0.12"/>
                                <rect x="8" y="8" width="48" height="48" rx="11" fill="none" stroke="#fb923c" stroke-width="2"/>
                                <path d="M20 32 L28 32 L32 20 L36 44 L40 28 L44 32 L52 32" stroke="#fb923c" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="20" cy="32" r="2" fill="#fb923c"/>
                                <circle cx="52" cy="32" r="2" fill="#fb923c"/>
                                <text x="32" y="52" text-anchor="middle" font-size="8" fill="#fb923c" font-weight="bold">㎡</text>
                            </svg>
                        </div>
                        <div class="tool-info">
                            <div class="tool-title">电线选型计算器</div>
                            <div class="tool-desc">勾选家中电器，自动计算各回路推荐电线规格，避免盲目用粗线浪费预算</div>
                        </div>
                        <div class="tool-arrow">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="tool-card" data-tool="heating">
                        <div class="tool-icon">
                            <svg viewBox="0 0 64 64" width="48" height="48">
                                <rect x="4" y="4" width="56" height="56" rx="14" fill="#f87171" opacity="0.12"/>
                                <rect x="8" y="8" width="48" height="48" rx="11" fill="none" stroke="#f87171" stroke-width="2"/>
                                <path d="M32 18 C26 18 22 24 22 30 C22 36 26 40 26 44 L38 44 C38 40 42 36 42 30 C42 24 38 18 32 18Z" fill="none" stroke="#f87171" stroke-width="2"/>
                                <path d="M28 30 Q32 24 36 30" stroke="#f87171" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                                <line x1="32" y1="44" x2="32" y2="50" stroke="#f87171" stroke-width="2" stroke-linecap="round"/>
                                <line x1="26" y1="50" x2="38" y2="50" stroke="#f87171" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="tool-info">
                            <div class="tool-title">供暖助手</div>
                            <div class="tool-desc">北京市集中供热费用计算器，一键计算供暖季费用及停供费用</div>
                        </div>
                        <div class="tool-arrow">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="tool-card" data-tool="md2img">
                        <div class="tool-icon">
                            <svg viewBox="0 0 64 64" width="48" height="48">
                                <rect x="4" y="4" width="56" height="56" rx="14" fill="#34d399" opacity="0.12"/>
                                <rect x="8" y="8" width="48" height="48" rx="11" fill="none" stroke="#34d399" stroke-width="2"/>
                                <rect x="18" y="16" width="28" height="32" rx="4" fill="none" stroke="#34d399" stroke-width="2"/>
                                <line x1="24" y1="24" x2="40" y2="24" stroke="#34d399" stroke-width="2" stroke-linecap="round"/>
                                <line x1="24" y1="30" x2="36" y2="30" stroke="#34d399" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
                                <line x1="24" y1="36" x2="38" y2="36" stroke="#34d399" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
                                <path d="M34 42 L40 42 L40 48" stroke="#34d399" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="tool-info">
                            <div class="tool-title">Markdown 转图片</div>
                            <div class="tool-desc">编辑 Markdown，选择风格卡片，实时预览并下载精美 PNG</div>
                        </div>
                        <div class="tool-arrow">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const tool = card.dataset.tool;
                if (tool === 'colorcard') {
                    this.state = 'colorcard';
                    this.renderAll();
                } else if (tool === 'wirecalc') {
                    this.state = 'wirecalc';
                    this.renderAll();
                } else if (tool === 'heating') {
                    this.state = 'heating';
                    this.renderAll();
                } else if (tool === 'md2img') {
                    this.state = 'md2img';
                    this.renderAll();
                } else {
                    this.state = 'intro';
                    this.renderAll();
                }
            });
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

    // ========== 色卡生成工具 ==========
    renderColorCardTool(container) {
        container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-back" id="ccBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div class="cc-tool">
                    <h2 class="cc-tool-title">色卡生成器</h2>
                    <p class="cc-tool-subtitle">输入色值，生成标准色卡 PNG，方便与商家沟通确认颜色</p>
                    <div class="cc-tool-body">
                        <div class="cc-tool-preview">
                            <canvas id="ccToolCanvas" width="540" height="960"></canvas>
                        </div>
                        <div class="cc-tool-controls">
                            <div class="cc-field">
                                <label>色值格式</label>
                                <div class="cc-format-tabs">
                                    <button class="cc-format-tab active" data-fmt="hex">HEX</button>
                                    <button class="cc-format-tab" data-fmt="rgb">RGB</button>
                                    <button class="cc-format-tab" data-fmt="hsl">HSL</button>
                                    <button class="cc-format-tab" data-fmt="ral">RAL</button>
                                </div>
                            </div>
                            <div class="cc-field cc-hex-field">
                                <label>HEX 色值</label>
                                <div class="cc-input-row">
                                    <input type="color" id="ccToolPicker" value="#3F3A3A" class="cc-color-picker">
                                    <input type="text" id="ccToolHex" value="#3F3A3A" class="cc-input" maxlength="7" placeholder="#000000">
                                </div>
                            </div>
                            <div class="cc-field cc-rgb-field" style="display:none">
                                <label>RGB 色值</label>
                                <div class="cc-rgb-row">
                                    <input type="number" id="ccToolR" value="63" min="0" max="255" class="cc-input cc-input-sm" placeholder="R">
                                    <input type="number" id="ccToolG" value="58" min="0" max="255" class="cc-input cc-input-sm" placeholder="G">
                                    <input type="number" id="ccToolB" value="58" min="0" max="255" class="cc-input cc-input-sm" placeholder="B">
                                </div>
                            </div>
                            <div class="cc-field cc-hsl-field" style="display:none">
                                <label>HSL 色值</label>
                                <div class="cc-rgb-row">
                                    <input type="number" id="ccToolH" value="0" min="0" max="360" class="cc-input cc-input-sm" placeholder="H">
                                    <input type="number" id="ccToolS" value="4" min="0" max="100" class="cc-input cc-input-sm" placeholder="S%">
                                    <input type="number" id="ccToolL" value="24" min="0" max="100" class="cc-input cc-input-sm" placeholder="L%">
                                </div>
                            </div>
                            <div class="cc-field cc-ral-field" style="display:none">
                                <label>RAL 编号</label>
                                <input type="text" id="ccToolRal" value="8019" class="cc-input" placeholder="如 8019">
                                <div class="cc-ral-presets">
                                    <button class="cc-ral-chip" data-ral="8019" data-hex="#3F3A3A" data-name="灰棕色 Grey brown">8019 灰棕</button>
                                    <button class="cc-ral-chip" data-ral="9003" data-hex="#FFFFFF" data-name="信号白 Signal white">9003 白</button>
                                    <button class="cc-ral-chip" data-ral="7035" data-hex="#B5B8B5" data-name="浅灰 Light grey">7035 浅灰</button>
                                    <button class="cc-ral-chip" data-ral="9005" data-hex="#0E0E10" data-name="纯黑 Jet black">9005 黑</button>
                                    <button class="cc-ral-chip" data-ral="1013" data-hex="#E8D5B7" data-name="象牙白 Oyster white">1013 象牙</button>
                                    <button class="cc-ral-chip" data-ral="5014" data-hex="#6B7D9E" data-name="鸽蓝 Pigeon blue">5014 鸽蓝</button>
                                </div>
                            </div>
                            <div class="cc-field">
                                <label>颜色名称</label>
                                <input type="text" id="ccToolName" value="RAL 8019" class="cc-input" placeholder="如 RAL 8019">
                            </div>
                            <div class="cc-field">
                                <label>中英文说明</label>
                                <input type="text" id="ccToolDesc" value="灰棕色 (Grey brown)" class="cc-input" placeholder="如 灰棕色 (Grey brown)">
                            </div>
                            <button class="cc-download-btn" id="ccToolDownload">⬇ 下载色卡 PNG</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const self = this;
        const canvas = container.querySelector('#ccToolCanvas');
        const ctx = canvas.getContext('2d');
        const picker = container.querySelector('#ccToolPicker');
        const hexInput = container.querySelector('#ccToolHex');
        const nameInput = container.querySelector('#ccToolName');
        const descInput = container.querySelector('#ccToolDesc');
        const formatTabs = container.querySelectorAll('.cc-format-tab');

        // 当前格式
        let currentFormat = 'hex';

        function hexToRgb(hex) {
            const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
        }

        function rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
        }

        function rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) { h = s = 0; } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
        }

        function hslToRgb(h, s, l) {
            h /= 360; s /= 100; l /= 100;
            let r, g, b;
            if (s === 0) { r = g = b = l; } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1; if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
        }

        function getCurrentHex() {
            if (currentFormat === 'hex') return hexInput.value;
            if (currentFormat === 'rgb') {
                const r = parseInt(container.querySelector('#ccToolR').value) || 0;
                const g = parseInt(container.querySelector('#ccToolG').value) || 0;
                const b = parseInt(container.querySelector('#ccToolB').value) || 0;
                return rgbToHex(r, g, b);
            }
            if (currentFormat === 'hsl') {
                const h = parseInt(container.querySelector('#ccToolH').value) || 0;
                const s = parseInt(container.querySelector('#ccToolS').value) || 0;
                const l = parseInt(container.querySelector('#ccToolL').value) || 0;
                const rgb = hslToRgb(h, s, l);
                return rgbToHex(rgb.r, rgb.g, rgb.b);
            }
            return hexInput.value;
        }

        function renderCard() {
            const hex = getCurrentHex();
            const name = nameInput.value || '颜色';
            const desc = descInput.value || '';
            const W = canvas.width, H = canvas.height;

            ctx.fillStyle = hex;
            ctx.fillRect(0, 0, W, H);

            const infoH = 200;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, H - infoH, W, infoH);

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, H - infoH);
            ctx.lineTo(W, H - infoH);
            ctx.stroke();

            const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
            const hexUp = hex.toUpperCase();

            ctx.fillStyle = '#222222';
            ctx.font = 'bold 36px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(hexUp, W / 2, H - infoH + 42);

            ctx.fillStyle = '#333333';
            ctx.font = '600 22px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillText(name, W / 2, H - infoH + 75);

            ctx.fillStyle = '#888888';
            ctx.font = '16px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillText(desc, W / 2, H - infoH + 105);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillText(`RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`, W / 2, H - infoH + 135);

            // 色值方块
            const swatchSize = 56;
            const sx = W - 40 - swatchSize;
            const sy = H - infoH + (infoH - swatchSize) / 2;
            ctx.fillStyle = hex;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(sx, sy, swatchSize, swatchSize, 8);
            } else {
                const r2 = 8;
                ctx.moveTo(sx + r2, sy);
                ctx.lineTo(sx + swatchSize - r2, sy);
                ctx.quadraticCurveTo(sx + swatchSize, sy, sx + swatchSize, sy + r2);
                ctx.lineTo(sx + swatchSize, sy + swatchSize - r2);
                ctx.quadraticCurveTo(sx + swatchSize, sy + swatchSize, sx + swatchSize - r2, sy + swatchSize);
                ctx.lineTo(sx + r2, sy + swatchSize);
                ctx.quadraticCurveTo(sx, sy + swatchSize, sx, sy + swatchSize - r2);
                ctx.lineTo(sx, sy + r2);
                ctx.quadraticCurveTo(sx, sy, sx + r2, sy);
            }
            ctx.fill();
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 同步 picker
            picker.value = hex;
        }

        // 格式切换
        formatTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                formatTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFormat = tab.dataset.fmt;
                container.querySelector('.cc-hex-field').style.display = currentFormat === 'hex' ? '' : 'none';
                container.querySelector('.cc-rgb-field').style.display = currentFormat === 'rgb' ? '' : 'none';
                container.querySelector('.cc-hsl-field').style.display = currentFormat === 'hsl' ? '' : 'none';
                container.querySelector('.cc-ral-field').style.display = currentFormat === 'ral' ? '' : 'none';
            });
        });

        // HEX 输入
        picker.addEventListener('input', () => { hexInput.value = picker.value; renderCard(); });
        hexInput.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) { picker.value = hexInput.value; renderCard(); }
        });

        // RGB 输入
        ['ccToolR', 'ccToolG', 'ccToolB'].forEach(id => {
            container.querySelector('#' + id).addEventListener('input', renderCard);
        });

        // HSL 输入
        ['ccToolH', 'ccToolS', 'ccToolL'].forEach(id => {
            container.querySelector('#' + id).addEventListener('input', renderCard);
        });

        // RAL 输入
        container.querySelector('#ccToolRal').addEventListener('input', () => {
            const v = container.querySelector('#ccToolRal').value;
            const chip = container.querySelector(`.cc-ral-chip[data-ral="${v}"]`);
            if (chip) {
                hexInput.value = chip.dataset.hex;
                picker.value = chip.dataset.hex;
                nameInput.value = 'RAL ' + chip.dataset.ral;
                descInput.value = chip.dataset.name;
                renderCard();
            }
        });

        // RAL 预设
        container.querySelectorAll('.cc-ral-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelector('#ccToolRal').value = chip.dataset.ral;
                hexInput.value = chip.dataset.hex;
                picker.value = chip.dataset.hex;
                nameInput.value = 'RAL ' + chip.dataset.ral;
                descInput.value = chip.dataset.name;
                renderCard();
            });
        });

        // 名称/说明
        nameInput.addEventListener('input', renderCard);
        descInput.addEventListener('input', renderCard);

        // 返回
        container.querySelector('#ccBack').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });

        // 下载
        container.querySelector('#ccToolDownload').addEventListener('click', () => {
            renderCard();
            const link = document.createElement('a');
            const name = nameInput.value.replace(/\s+/g, '_') || 'color';
            link.download = `色卡_${name}_${getCurrentHex()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });

        renderCard();
    }

    // ========== 供暖助手 ==========
    renderHeating(container) {
        if (!this._heating) {
            this._heating = new HeatingAssistantManager();
        }
        container.innerHTML = `
            <div class="quiz-container" style="max-width:900px;">
                <div class="quiz-back" id="heatingBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div id="heatingContent"></div>
            </div>
        `;
        this._heating.render(container.querySelector('#heatingContent'));
        container.querySelector('#heatingBack').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });
    }

    // ========== Markdown 转图片 ==========
    renderMd2Img(container) {
        if (this._md2img && typeof this._md2img.destroy === 'function') {
            this._md2img.destroy();
        }
        if (!this._md2img) {
            this._md2img = new Md2ImgManager();
        }
        container.innerHTML = `
            <div class="quiz-container" style="max-width:1200px;">
                <div class="quiz-back" id="md2imgBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div id="md2imgContent"></div>
            </div>
        `;
        this._md2img.render(container.querySelector('#md2imgContent'));
        container.querySelector('#md2imgBack').addEventListener('click', () => {
            if (this._md2img && typeof this._md2img.destroy === 'function') {
                this._md2img.destroy();
            }
            this.state = 'home';
            this.renderToolsHome();
        });
    }

    // ========== 电线选型计算器 ==========
    renderWireCalc(container) {
        if (!this._wireCalc) {
            this._wireCalc = new WireCalculatorManager();
        }
        container.innerHTML = `
            <div class="quiz-container" style="max-width:1100px;">
                <div class="quiz-back" id="wireCalcBack">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回工具箱
                </div>
                <div id="wireCalcContent"></div>
            </div>
        `;

        this._wireCalc.render(container.querySelector('#wireCalcContent'));

        container.querySelector('#wireCalcBack').addEventListener('click', () => {
            this.state = 'home';
            this.renderToolsHome();
        });
    }
}
