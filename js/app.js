// ========== 主应用 ==========
document.addEventListener('DOMContentLoaded', () => {
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
                entrance_hallway: 'other',
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

    // ========== 档位切换 ==========
    document.querySelectorAll('.tier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calculator.setTier(btn.dataset.tier);
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

    // ========== 初始默认档位 ==========
    window._currentTier = 'comfort';
});
