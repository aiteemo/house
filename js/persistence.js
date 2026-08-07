// ========== 持久化管理 ==========
// 解决 localStorage 换电脑丢失问题
// 方案：启动时自动加载 user-data.json（git 同步），操作时同时写 localStorage + 自动下载 JSON

const PersistenceManager = {
    STORAGE_KEYS: {
        requirements: 'renovation_requirements',
        memo: 'renovation_memo',
        companies: 'renovation_companies',
        pitfalls: 'renovation_pitfalls',
        questionnaire: 'renovation_questionnaire',
    },
    FILE_PATH: 'user-data.json',
    _loaded: false,
    _data: {},

    // 启动时调用：尝试从 user-data.json 加载，恢复到 localStorage
    async init() {
        // 先检查 localStorage 是否已有数据
        const hasLocal = Object.values(this.STORAGE_KEYS).some(k => localStorage.getItem(k));
        if (hasLocal) {
            this._syncFromLocalStorage();
            this._loaded = true;
            return;
        }

        // localStorage 为空，尝试加载 user-data.json
        try {
            const resp = await fetch(this.FILE_PATH + '?t=' + Date.now());
            if (resp.ok) {
                const data = await resp.json();
                this._data = data;
                // 写入 localStorage
                Object.entries(this.STORAGE_KEYS).forEach(([module, key]) => {
                    if (data[module]) {
                        localStorage.setItem(key, JSON.stringify(data[module]));
                    }
                });
                console.log('[持久化] 已从 user-data.json 恢复数据');
            }
        } catch (e) {
            // 文件不存在或无法读取，忽略
        }
        this._loaded = true;
    },

    // 从 localStorage 同步到内部数据
    _syncFromLocalStorage() {
        Object.entries(this.STORAGE_KEYS).forEach(([module, key]) => {
            const raw = localStorage.getItem(key);
            if (raw) {
                try { this._data[module] = JSON.parse(raw); } catch (e) {}
            }
        });
    },

    // 获取当前所有数据的快照
    snapshot() {
        this._syncFromLocalStorage();
        return JSON.parse(JSON.stringify(this._data));
    },

    // 导出为 JSON 文件（下载到本地）
    exportToFile() {
        const data = this.snapshot();
        data._exportedAt = new Date().toISOString();
        data._version = 1;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.FILE_PATH;
        a.click();
        URL.revokeObjectURL(url);
    },

    // 从 JSON 文件导入
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // 写入 localStorage
                    Object.entries(this.STORAGE_KEYS).forEach(([module, key]) => {
                        if (data[module]) {
                            localStorage.setItem(key, JSON.stringify(data[module]));
                        }
                    });
                    this._data = data;
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // 清除所有持久化数据
    clearAll() {
        Object.values(this.STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        this._data = {};
    }
};
