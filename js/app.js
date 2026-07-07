// ========== 主应用 ==========
document.addEventListener('DOMContentLoaded', async () => {
    // ========== 持久化初始化（优先于所有管理器） ==========
    await PersistenceManager.init();

    // 初始化需求管理器
    const reqManager = new RequirementsManager();

    // 初始化价格计算器
    const calculator = new PriceCalculator(reqManager);

    // 初始化决策分析器
    const decision = new DecisionAnalyzer(reqManager);

    // 初始化核心问题管理器
    const coreProblems = new CoreProblemsManager(reqManager);

    // 初始化沟通备忘管理器
    const memoManager = new MemoManager();

    // 初始化装修避坑管理器
    const pitfallsManager = new PitfallsManager();

    // 初始化装修风格助手
    const styleQuiz = new StyleQuizManager();

    // ========== 持久化工具提示浮窗 ==========
    const PROMPT_TEXT = `你是一个装修助手工具生成器。请根据以下需求帮我生成一个实用的装修小工具：

工具名称：[填写工具名称]
工具功能：[简要描述工具的核心功能]
使用场景：[描述用户在什么情况下会用到这个工具]
期望交互：[描述用户操作流程和界面交互]
数据来源：[工具需要哪些数据，数据从哪里获取]

请基于以上信息，生成一个可在浏览器中独立运行的 HTML 小工具。要求：
1. 界面简洁美观，符合现代设计审美
2. 交互流畅，操作逻辑清晰
3. 支持数据本地持久化存储
4. 代码结构清晰，可维护性强`;

    function createFloatingPrompt() {
        const float = document.createElement('div');
        float.className = 'floating-prompt';
        float.innerHTML = `
            <div class="floating-prompt-btn" id="floatingPromptBtn">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="2" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7 8h8M7 11h6M7 14h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="floating-prompt-panel" id="floatingPromptPanel">
                <div class="fp-header">
                    <span class="fp-title">工具生成提示词</span>
                    <button class="fp-close" id="fpClose">&times;</button>
                </div>
                <div class="fp-body">
                    <textarea class="fp-textarea" id="fpTextarea">${PROMPT_TEXT}</textarea>
                </div>
                <div class="fp-actions">
                    <button class="fp-btn fp-copy" id="fpCopy">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                            <path d="M10 4V2.5A1.5 1.5 0 008.5 1h-6A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" stroke="currentColor" stroke-width="1.3"/>
                        </svg>
                        复制
                    </button>
                    <button class="fp-btn fp-save" id="fpSave">保存修改</button>
                </div>
            </div>
        `;
        document.body.appendChild(float);

        const btn = float.querySelector('#floatingPromptBtn');
        const panel = float.querySelector('#floatingPromptPanel');
        const textarea = float.querySelector('#fpTextarea');
        const closeBtn = float.querySelector('#fpClose');
        const copyBtn = float.querySelector('#fpCopy');
        const saveBtn = float.querySelector('#fpSave');

        let isOpen = false;

        btn.addEventListener('click', () => {
            isOpen = !isOpen;
            panel.classList.toggle('show', isOpen);
        });

        closeBtn.addEventListener('click', () => {
            isOpen = false;
            panel.classList.remove('show');
        });

        copyBtn.addEventListener('click', () => {
            const text = textarea.value;
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> 已复制`;
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 4V2.5A1.5 1.5 0 008.5 1h-6A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" stroke="currentColor" stroke-width="1.3"/></svg> 复制`;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(() => {
                // fallback
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                copyBtn.textContent = '已复制';
                setTimeout(() => { copyBtn.textContent = '复制'; }, 2000);
            });
        });

        saveBtn.addEventListener('click', () => {
            localStorage.setItem('renovation_tool_prompt', textarea.value);
            saveBtn.textContent = '已保存 ✓';
            setTimeout(() => { saveBtn.textContent = '保存修改'; }, 2000);
        });

        // 恢复保存的提示词
        const savedPrompt = localStorage.getItem('renovation_tool_prompt');
        if (savedPrompt) textarea.value = savedPrompt;
    }

    createFloatingPrompt();

    // ========== 持久化导入导出按钮 ==========
    function createPersistenceBar() {
        const bar = document.createElement('div');
        bar.className = 'persistence-bar';
        bar.innerHTML = `
            <div class="persistence-inner">
                <span class="persistence-label">数据同步</span>
                <button class="persistence-btn" id="persistenceExport">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v8M3 5l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    导出数据
                </button>
                <button class="persistence-btn" id="persistenceImport">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 9V1M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    导入数据
                </button>
                <input type="file" id="persistenceFileInput" accept=".json" style="display:none">
                <span class="persistence-hint">导出后提交 git，换电脑拉取后导入即可恢复</span>
            </div>
        `;
        document.body.appendChild(bar);

        bar.querySelector('#persistenceExport').addEventListener('click', () => {
            PersistenceManager.exportToFile();
            const btn = bar.querySelector('#persistenceExport');
            btn.classList.add('done');
            btn.querySelector('svg').nextSibling.textContent = '已导出 ✓';
            setTimeout(() => {
                btn.classList.remove('done');
                btn.querySelector('svg').nextSibling.textContent = '导出数据';
            }, 2000);
        });

        bar.querySelector('#persistenceImport').addEventListener('click', () => {
            bar.querySelector('#persistenceFileInput').click();
        });

        bar.querySelector('#persistenceFileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                await PersistenceManager.importFromFile(file);
                // 重新加载页面以应用数据
                location.reload();
            } catch (err) {
                alert('导入失败：文件格式不正确');
            }
            e.target.value = '';
        });
    }

    createPersistenceBar();

    // 3D场景（延迟初始化）
    let sceneManager, roomBuilder, furnitureBuilder, lightingManager, airflowManager;
    let sceneInitialized = false;

    function initScene() {
        if (sceneInitialized) return;
        const container = document.getElementById('viewport');
        if (!container || container.clientWidth === 0) return;

        sceneManager = new SceneManager(container);
        roomBuilder = new RoomBuilder(sceneManager);

        roomBuilder.buildAll();

        // 初始化家具
        furnitureBuilder = new FurnitureBuilder(sceneManager);
        furnitureBuilder.buildAll();

        // 初始化灯光
        lightingManager = new LightingManager(sceneManager);
        lightingManager.buildAll();

        // 初始化气流
        airflowManager = new AirflowManager(sceneManager);
        airflowManager.buildAll();

        // 房间悬停提示
        const tooltip = document.getElementById('roomTooltip');
        sceneManager.onRoomHover = (roomId, mx, my) => {
            if (!roomId) {
                tooltip.style.display = 'none';
                return;
            }
            const room = ROOM_DATA.rooms.find(r => r.id === roomId);
            if (!room) return;
            document.getElementById('tooltipRoomName').textContent = room.name;
            document.getElementById('tooltipRoomArea').textContent = `${room.area}㎡ · ${room.desc}`;
            // 显示该房间关联的需求
            const roomReqs = [];
            reqManager.modules.forEach(m => {
                m.items.forEach(item => {
                    if (item.room === roomId && item.status === 'checked') {
                        roomReqs.push(item.name);
                    }
                });
            });
            document.getElementById('tooltipRoomReqs').textContent = roomReqs.length > 0 ?
                '已选需求：' + roomReqs.join('、') : '暂无关联需求';
            tooltip.style.display = 'block';
            tooltip.style.left = (mx + 16) + 'px';
            tooltip.style.top = (my - 10) + 'px';
        };

        sceneManager.onRoomClick = (roomId) => {
            // 点击房间切换到对应需求模块
            const roomModuleMap = {
                living_room: 'living_room',
                bedroom_a: 'bedroom',
                bedroom_b: 'bedroom',
                kitchen: 'kitchen',
                bathroom: 'bathroom',
                living_balcony: 'balcony_area',
                bedroom_a_balcony: 'bedroom',
                entrance: 'other',
                dining: 'living_room',
            };
            const moduleId = roomModuleMap[roomId];
            if (moduleId) {
                reqManager.viewMode = 'module';
                reqManager.activeModule = moduleId;
                document.querySelectorAll('.sidebar-toggle-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.sidebar-toggle-btn[data-view="module"]').classList.add('active');
                switchTab('requirements');
                renderSidebar();
                reqManager.renderReqList(document.getElementById('reqList'));
                const mod = reqManager.getActiveModule();
                if (mod) document.getElementById('currentModuleName').textContent = mod.name;
            }
        };

        sceneInitialized = true;

        // 触发resize
        setTimeout(() => sceneManager.onResize(), 100);
    }

    // ========== 标签切换 ==========
    function switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`panel-${tabName}`).classList.add('active');

        // 浮窗和持久化条只在 tools tab 显示
        const floatingPrompt = document.querySelector('.floating-prompt');
        const persistenceBar = document.querySelector('.persistence-bar');
        if (floatingPrompt) floatingPrompt.style.display = tabName === 'tools' ? '' : 'none';
        if (persistenceBar) persistenceBar.style.display = tabName === 'tools' ? '' : 'none';

        if (tabName === 'preview3d') {
            setTimeout(() => initScene(), 50);
        } else if (tabName === 'coreProblems') {
            coreProblems.renderAll();
        } else if (tabName === 'calculator') {
            calculator.renderAll();
        } else if (tabName === 'decision') {
            decision.renderAll();
        } else if (tabName === 'memo') {
            memoManager.renderAll();
        } else if (tabName === 'pitfalls') {
            pitfallsManager.renderAll();
        } else if (tabName === 'tools') {
            styleQuiz.state = 'home';
            styleQuiz.renderToolsHome();
        }
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // ========== 侧边栏视图切换 ==========
    function renderSidebar() {
        if (reqManager.viewMode === 'stage') {
            reqManager.renderStageList(document.getElementById('moduleList'));
            document.getElementById('btnAddModule').style.display = 'none';
        } else {
            reqManager.renderModuleList(document.getElementById('moduleList'));
            document.getElementById('btnAddModule').style.display = '';
        }
    }

    document.querySelectorAll('.sidebar-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            reqManager.viewMode = btn.dataset.view;
            renderSidebar();
            reqManager.renderReqList(document.getElementById('reqList'));
            const title = reqManager.viewMode === 'stage'
                ? STAGES.find(s => s.id === reqManager.activeStage)?.name || '阶段'
                : reqManager.getActiveModule()?.name || '模块';
            document.getElementById('currentModuleName').textContent = title;
        });
    });

    // ========== 需求清单初始化 ==========
    renderSidebar();
    reqManager.renderReqList(document.getElementById('reqList'));
    reqManager.onUpdate = () => {
        renderSidebar();
        reqManager.renderReqList(document.getElementById('reqList'));
    };

    // ========== 需求搜索 ==========
    const searchInput = document.getElementById('reqSearchInput');
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            reqManager.searchQuery = searchInput.value.trim();
            reqManager.renderReqList(document.getElementById('reqList'));
        }, 200);
    });

    // ========== 价格计算 Tab 切换 ==========
    document.querySelectorAll('.calc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            calculator.activeTab = tab.dataset.calcTab;
            const label = tab.dataset.calcTab === 'boloni' ? '博洛尼报价' : '预估总价';
            document.getElementById('totalLabel').textContent = label;
            calculator.renderAll();
        });
    });

    // ========== 3D视角切换 ==========
    document.querySelectorAll('.vp-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!sceneManager) return;
            document.querySelectorAll('.vp-btn[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sceneManager.setCameraView(btn.dataset.view);
        });
    });

    // ========== 3D开关 ==========
    document.getElementById('toggleWalls').addEventListener('click', function () {
        if (!sceneManager) return;
        const on = sceneManager.toggleWalls();
        this.classList.toggle('active', on);
    });

    document.getElementById('toggleLight').addEventListener('click', function () {
        if (!lightingManager) return;
        const on = lightingManager.toggle();
        this.classList.toggle('active', on);
    });

    document.getElementById('toggleAirflow').addEventListener('click', function () {
        if (!airflowManager) return;
        const on = airflowManager.toggle();
        this.classList.toggle('active', on);
    });

    document.getElementById('toggleLabels').addEventListener('click', function () {
        if (!sceneManager) return;
        const on = sceneManager.toggleLabels();
        this.classList.toggle('active', on);
    });

    document.getElementById('toggleFurniture').addEventListener('click', function () {
        if (!furnitureBuilder) return;
        const on = furnitureBuilder.toggle();
        this.classList.toggle('active', on);
    });

    // ========== 添加需求项弹窗 ==========
    document.getElementById('btnAddReq').addEventListener('click', () => {
        showAddModal();
    });

    function showAddModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <h3>添加自定义需求</h3>
                <label>需求名称</label>
                <input type="text" id="newReqName" placeholder="例如：智能窗帘">
                <label>需求描述</label>
                <textarea id="newReqDesc" placeholder="简要描述这个需求"></textarea>
                <label>参考价格（元）</label>
                <input type="number" id="newReqPrice" placeholder="0">
                <div class="modal-actions">
                    <button class="btn-secondary" id="cancelModal">取消</button>
                    <button class="btn-primary" id="confirmModal">添加</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        overlay.querySelector('#cancelModal').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#confirmModal').addEventListener('click', () => {
            const name = overlay.querySelector('#newReqName').value.trim();
            const desc = overlay.querySelector('#newReqDesc').value.trim();
            const price = parseInt(overlay.querySelector('#newReqPrice').value) || 0;
            if (name) {
                reqManager.addItem(reqManager.activeModule, name, desc || '自定义需求');
                // 更新价格
                const mod = reqManager.getActiveModule();
                const lastItem = mod.items[mod.items.length - 1];
                lastItem.price1 = Math.round(price * 0.8);
                lastItem.price2 = price;
                lastItem.price3 = Math.round(price * 1.3);
                lastItem.status = 'checked';
                reqManager.renderReqList(document.getElementById('reqList'));
                reqManager.renderModuleList(document.getElementById('moduleList'));
            }
            overlay.remove();
        });
    }

    // ========== 添加模块弹窗 ==========
    document.getElementById('btnAddModule').addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <h3>添加自定义模块</h3>
                <label>模块名称</label>
                <input type="text" id="newModName" placeholder="例如：智能家居">
                <label>图标（emoji）</label>
                <input type="text" id="newModIcon" placeholder="📱" maxlength="2">
                <div class="modal-actions">
                    <button class="btn-secondary" id="cancelModal">取消</button>
                    <button class="btn-primary" id="confirmModal">添加</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#cancelModal').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#confirmModal').addEventListener('click', () => {
            const name = overlay.querySelector('#newModName').value.trim();
            const icon = overlay.querySelector('#newModIcon').value.trim() || '📦';
            if (name) {
                const id = 'custom_mod_' + Date.now();
                reqManager.modules.push({ id, name, icon, items: [] });
                reqManager.activeModule = id;
                reqManager.renderModuleList(document.getElementById('moduleList'));
                reqManager.renderReqList(document.getElementById('reqList'));
                document.getElementById('currentModuleName').textContent = name;
            }
            overlay.remove();
        });
    });
});
