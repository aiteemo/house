// ========== 装修需求问卷小工具 ==========
class ReqQuestionnaireManager {
    constructor() {
        this.STORAGE_KEY = 'aiteemo_questionnaire_demo_v1';
        this.data = this.cloneDefaults();
        this._saveTimer = null;
        this._root = null;
        this._libsReady = false;
        this.loadState();
    }

    cloneDefaults() {
        return JSON.parse(JSON.stringify(REQ_QUESTIONNAIRE_DEFAULTS));
    }

    loadState() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === 'object') {
                this.data = Object.assign(this.cloneDefaults(), saved);
            }
        } catch (e) { /* ignore */ }
    }

    saveState() {
        const payload = Object.assign({}, this.data, {
            _updatedAt: new Date().toISOString(),
        });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
        if (typeof PersistenceManager !== 'undefined') {
            PersistenceManager._data = PersistenceManager._data || {};
            PersistenceManager._data.questionnaire = payload;
        }
    }

    scheduleSave() {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.saveState(), 200);
    }

    resetToDefault() {
        if (!confirm('确定恢复为默认填写内容？当前修改将丢失。')) return;
        this.data = this.cloneDefaults();
        this.saveState();
        if (this._root) this.render(this._root);
    }

    isMulti(key) {
        return REQ_QUESTIONNAIRE_MULTI_KEYS.has(key);
    }

    // ========== 渲染 ==========
    render(container) {
        this._root = container;
        container.innerHTML = `
            <div class="rq-wrap">
                <div class="rq-toolbar">
                    <div class="rq-toolbar-left">
                        <h2>装修需求问卷</h2>
                        <p class="rq-desc">演示脱敏 · 约 88㎡ · 两室一厅一卫 · 1层 · 填写后自动本地保存</p>
                    </div>
                    <div class="rq-toolbar-right">
                        <span class="rq-status" id="rqStatus">已保存</span>
                        <button type="button" class="rq-btn" id="rqReset">恢复默认</button>
                        <button type="button" class="rq-btn rq-btn-primary" id="rqDownload">下载图片</button>
                    </div>
                </div>
                <div class="rq-scroll">
                    <div class="rq-page" id="rqCap">
                        ${this.buildFormHtml()}
                        <div class="rq-ft"><p>填写内容已自动保存到本机浏览器 · 可下载图片发给设计师</p></div>
                    </div>
                </div>
            </div>
        `;
        this.bindEvents(container);
        this.updateStatus('已保存');
    }

    buildFormHtml() {
        return `
            <h1 class="rq-title">装修需求问卷</h1>
            <p class="rq-sub">演示脱敏 · 约 88㎡ · 两室一厅一卫 · 1层</p>

            <div class="rq-sec">
                <div class="rq-sec-t">一、房屋资料</div>
                ${this.singleField('house_type', '房型类别')}
                ${this.singleField('house_status', '房屋现在的状态')}
                ${this.textField('community', '小区名称')}
                ${this.textField('area', '房屋面积')}
                ${this.singleField('usage', '房子使用倾向')}
                ${this.singleField('live_years', '本次装修居住时间')}
                ${this.singleField('design_budget', '设计费预算')}
                ${this.textField('reno_budget', '装修预算（含家电软装、到入住状态）')}
                ${this.textField('start_time', '期望开工时间')}
                ${this.textField('move_in', '希望入住时间')}
                ${this.textField('residents', '常住人员')}
                ${this.textField('guests', '偶住人员/偶住频率')}
                ${this.multiField('styles', '喜欢的装修风格（可多选，最好提供图片）')}
                ${this.textField('style_note', '', 2)}
            </div>

            <div class="rq-sec">
                <div class="rq-sec-t">二、人员生活习惯</div>
                <div class="rq-g"><div class="rq-g-t">先生</div>
                    ${this.textField('husband_job', '职业')}
                    ${this.textField('husband_height', '身高')}
                    ${this.textField('husband_hobby', '喜好')}
                    ${this.textField('husband_schedule', '作息时间')}
                    ${this.textField('husband_habit', '生活习惯', 2)}
                </div>
                <div class="rq-g"><div class="rq-g-t">女士</div>
                    ${this.textField('wife_job', '职业')}
                    ${this.textField('wife_height', '身高')}
                    ${this.textField('wife_hobby', '喜好')}
                    ${this.textField('wife_schedule', '作息时间')}
                    ${this.textField('wife_habit', '生活习惯', 2)}
                </div>
            </div>

            <div class="rq-sec">
                <div class="rq-sec-t">三、分区空间详细需求</div>
                <div class="rq-g"><div class="rq-g-t">● 玄关</div>
                    ${this.textField('entry_shoes', '当季常用鞋子多少')}
                    ${this.textField('entry_other', '其他需求', 2)}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 客厅</div>
                    ${this.textField('living_guest', '来客频率及类型')}
                    ${this.multiField('living_tea', '泡茶喝咖啡习惯')}
                    ${this.textField('living_other', '其他', 3)}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 餐厅</div>
                    ${this.textField('dining_people', '用餐人数')}
                    ${this.singleField('dining_open', '能否接受餐厨开放结合')}
                    ${this.multiField('dining_appliances', '希望放置的电器清单')}
                    ${this.textField('dining_storage', '餐厅收纳及其他', 1, '请填写')}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 厨房</div>
                    ${this.multiField('kitchen_devices', '厨房使用哪些设备/家具')}
                    ${this.textField('kitchen_devices_other', '', 1, '其他设备')}
                    ${this.textField('kitchen_other', '其他收纳和需求', 2)}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 主卧</div>
                    ${this.singleField('master_closet', '是否需要独立衣帽间')}
                    ${this.textField('master_clothes', '衣服的收纳情况')}
                    ${this.textField('master_other', '其他')}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 卫生间</div>
                    ${this.multiField('bath_devices', '卫生间使用哪些设备')}
                    ${this.singleField('bath_dry_wet', '是否需要干湿分离')}
                    ${this.singleField('bath_makeup', '在这里化妆吗')}
                    <div class="rq-hint">若卫生间无窗，需强化排风与照明。干湿分离后可预留：宠物清洁区、洗衣烘干、扫地机器人基站（上下水+插座）。尺寸按实际设备复核（演示说明）。</div>
                </div>
                <div class="rq-g"><div class="rq-g-t">● 次卧</div>
                    ${this.textField('second_bedroom', '功能规划', 2)}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 其他空间</div>
                    ${this.textField('balcony', '阳台')}
                    ${this.textField('utility', '工具间/家政空间', 3)}
                </div>
            </div>

            <div class="rq-sec">
                <div class="rq-sec-t">四、生活个性化需求</div>
                <div class="rq-g"><div class="rq-g-t">● 收纳习惯</div>
                    ${this.textField('luggage', '家里有几个行李箱')}
                    ${this.textField('collections', '有多少藏书/手办/艺术品需要收纳')}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 饮食习惯</div>
                    ${this.singleField('cook_often', '是否经常做饭', '目前不经常做，但希望以后经常做，工作日早餐及周末。')}
                    ${this.singleField('eat_tv', '是否有吃饭看电视的习惯')}
                    ${this.textField('kitchen_req', '对厨房要求', 2)}
                    ${this.singleField('diet', '饮食偏好', '不会太多爆炒。')}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 生活习惯</div>
                    ${this.singleField('change_clothes', '回家是否立刻更换家居服')}
                    ${this.singleField('like_tv', '是否喜欢看电视')}
                    ${this.textField('pets', '养宠物情况及需求', 2)}
                    ${this.singleField('work_space', '是否需要独立工作空间')}
                    ${this.textField('fitness', '使用哪些健身运动器械')}
                    ${this.singleField('fengshui', '对风水的要求', '格局方正尽量不动，可进行拆改挪墙。')}
                </div>
                <div class="rq-g"><div class="rq-g-t">● 家用设备</div>
                    ${this.multiField('hvac', '对暖通等设备的需求')}
                    ${this.textField('hvac_note', '', 2)}
                    ${this.multiField('smart_home', '对智能家居的需求')}
                    ${this.textField('smart_note', '')}
                    ${this.textField('entertainment', '有哪些必要的娱乐、游戏设备')}
                    ${this.singleField('instruments', '是否需要放置钢琴或其他乐器')}
                    ${this.singleField('keep_furniture', '是否有原有保留家具打算用在新房')}
                    ${this.textField('keep_furniture_note', '')}
                </div>
            </div>

            <div class="rq-sec">
                <div class="rq-sec-t">补充：户型硬伤与特殊考量</div>
                ${this.textField('hard_issues', '户型硬伤', 3)}
                ${this.textField('floor1_issues', '一层特殊问题', 4)}
                ${this.textField('door_window', '门窗更换')}
                ${this.textField('structure', '结构拆改')}
                ${this.textField('supervisor', '监理安排')}
            </div>
        `;
    }

    textField(key, label, rows = 1, placeholder = '') {
        const val = this.escape(this.data[key] || '');
        const labelHtml = label ? `<div class="rq-f-l">${this.escape(label)}</div>` : '';
        const style = label ? '' : ' style="margin-top:6px;"';
        return `<div class="rq-f"${style}>${labelHtml}<textarea class="rq-f-i" data-rq-text="${key}" rows="${rows}" placeholder="${this.escape(placeholder)}">${val}</textarea></div>`;
    }

    singleField(key, label, hint = '') {
        const opts = REQ_QUESTIONNAIRE_OPTIONS[key] || [];
        const cur = this.data[key] || '';
        const chips = opts.map(o => {
            const active = o === cur ? ' a' : '';
            const mark = o === cur ? '✓' : '';
            return `<div class="rq-o${active}" data-rq-single="${key}" data-value="${this.escape(o)}"><span class="rq-d">${mark}</span> ${this.escape(o)}</div>`;
        }).join('');
        const hintHtml = hint ? `<div class="rq-hint">${this.escape(hint)}</div>` : '';
        return `<div class="rq-f"><div class="rq-f-l">${this.escape(label)}</div><div class="rq-opts">${chips}</div>${hintHtml}</div>`;
    }

    multiField(key, label) {
        const opts = REQ_QUESTIONNAIRE_OPTIONS[key] || [];
        const cur = Array.isArray(this.data[key]) ? this.data[key] : [];
        const chips = opts.map(o => {
            const active = cur.includes(o) ? ' a' : '';
            const mark = cur.includes(o) ? '✓' : '';
            return `<div class="rq-oi${active}" data-rq-multi="${key}" data-value="${this.escape(o)}"><span class="rq-d">${mark}</span> ${this.escape(o)}</div>`;
        }).join('');
        return `<div class="rq-f"><div class="rq-f-l">${this.escape(label)}</div><div class="rq-om">${chips}</div></div>`;
    }

    escape(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    updateStatus(text) {
        const el = this._root && this._root.querySelector('#rqStatus');
        if (el) el.textContent = text;
    }

    bindEvents(container) {
        container.querySelector('#rqReset').addEventListener('click', () => this.resetToDefault());
        container.querySelector('#rqDownload').addEventListener('click', () => this.downloadImage());

        container.querySelectorAll('[data-rq-text]').forEach(ta => {
            const persist = () => {
                this.data[ta.dataset.rqText] = ta.value;
                this.updateStatus('保存中…');
                this.scheduleSave();
                clearTimeout(this._statusTimer);
                this._statusTimer = setTimeout(() => this.updateStatus('已保存'), 400);
            };
            ta.addEventListener('input', persist);
            ta.addEventListener('change', () => {
                clearTimeout(this._saveTimer);
                this.data[ta.dataset.rqText] = ta.value;
                this.saveState();
                this.updateStatus('已保存');
            });
        });

        container.querySelectorAll('[data-rq-single]').forEach(el => {
            el.addEventListener('click', () => {
                const key = el.dataset.rqSingle;
                const value = el.dataset.value;
                this.data[key] = value;
                const group = el.parentElement;
                group.querySelectorAll('.rq-o').forEach(o => {
                    o.classList.remove('a');
                    o.querySelector('.rq-d').textContent = '';
                });
                el.classList.add('a');
                el.querySelector('.rq-d').textContent = '✓';
                this.saveState();
                this.updateStatus('已保存');
            });
        });

        container.querySelectorAll('[data-rq-multi]').forEach(el => {
            el.addEventListener('click', () => {
                const key = el.dataset.rqMulti;
                const value = el.dataset.value;
                let arr = Array.isArray(this.data[key]) ? this.data[key].slice() : [];
                const idx = arr.indexOf(value);
                if (idx >= 0) arr.splice(idx, 1);
                else arr.push(value);
                this.data[key] = arr;
                el.classList.toggle('a');
                el.querySelector('.rq-d').textContent = el.classList.contains('a') ? '✓' : '';
                this.saveState();
                this.updateStatus('已保存');
            });
        });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('加载失败: ' + src));
            document.head.appendChild(s);
        });
    }

    async ensureLibs() {
        if (this._libsReady || typeof html2canvas !== 'undefined') {
            this._libsReady = true;
            return;
        }
        await this.loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
        this._libsReady = true;
    }

    async downloadImage() {
        const btn = this._root.querySelector('#rqDownload');
        const cap = this._root.querySelector('#rqCap');
        if (!btn || !cap) return;
        const prev = btn.textContent;
        btn.disabled = true;
        btn.textContent = '生成中…';
        this.updateStatus('生成图片中…');
        try {
            await this.ensureLibs();
            const canvas = await html2canvas(cap, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const a = document.createElement('a');
            a.download = '装修需求问卷_演示脱敏.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
            this.updateStatus('已保存');
        } catch (e) {
            console.error(e);
            alert('下载失败：' + (e.message || e));
            this.updateStatus('下载失败');
        } finally {
            btn.disabled = false;
            btn.textContent = prev;
        }
    }
}
