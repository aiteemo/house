// ========== 装修垃圾清运维权指南 ==========
class WasteGuideManager {
    constructor() {
        this._libsReady = false;
        this._exporting = false;
        this._contentHtml = null;
        this.captureWidth = 750; // 移动端分享友好宽度
        this.sourceUrl = encodeURI('docs/装修垃圾清运相关/装修垃圾清运维权指南.html');
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
            s.onerror = () => reject(new Error('load failed: ' + src));
            document.head.appendChild(s);
        });
    }

    async ensureLibs() {
        if (this._libsReady) return;
        await this.loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
        this._libsReady = true;
    }

    async loadContent() {
        if (this._contentHtml) return this._contentHtml;
        const res = await fetch(this.sourceUrl);
        if (!res.ok) throw new Error('无法加载指南页面（请用本地服务器打开，勿用 file://）');
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const container = doc.querySelector('.container');
        if (!container) throw new Error('指南内容解析失败');
        this._contentHtml = container.innerHTML;
        return this._contentHtml;
    }

    async render(container) {
        container.innerHTML = `
            <div class="waste-guide-wrap">
                <div class="waste-guide-toolbar">
                    <div class="waste-guide-toolbar-left">
                        <h2>装修垃圾清运维权指南</h2>
                        <p class="waste-guide-desc">演示脱敏 · 垄断/加价/威胁场景的法规对照与维权步骤</p>
                    </div>
                    <div class="waste-guide-toolbar-right">
                        <span class="waste-guide-status" id="wgStatus">加载中…</span>
                        <select class="waste-guide-width" id="wgWidth" title="截图宽度">
                            <option value="390">手机 390</option>
                            <option value="750" selected>朋友圈 750</option>
                            <option value="1080">高清 1080</option>
                        </select>
                        <button type="button" class="waste-guide-btn waste-guide-btn-primary" id="wgDownload">下载长图</button>
                        <a class="waste-guide-btn" id="wgOpenRaw" href="${this.sourceUrl}" target="_blank" rel="noopener">原页打开</a>
                    </div>
                </div>
                <div class="waste-guide-viewport" id="wgViewport">
                    <div class="waste-guide-stage" id="wgStage">
                        <article class="waste-guide" id="wgCapture" style="width:${this.captureWidth}px">
                            <div class="waste-guide-loading">正在加载指南内容…</div>
                        </article>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container);
        await this.fillContent(container);
        this.fitPreview(container);
    }

    async fillContent(container) {
        const capture = container.querySelector('#wgCapture');
        const status = container.querySelector('#wgStatus');
        try {
            const html = await this.loadContent();
            capture.innerHTML = html;
            if (status) status.textContent = '就绪';
        } catch (e) {
            console.error(e);
            capture.innerHTML = `<div class="waste-guide-error">${e.message || e}<br><br>也可点击「原页打开」查看完整文档。</div>`;
            if (status) status.textContent = '加载失败';
        }
    }

    fitPreview(root) {
        const viewport = root.querySelector('#wgViewport');
        const stage = root.querySelector('#wgStage');
        const capture = root.querySelector('#wgCapture');
        if (!viewport || !stage || !capture) return;
        const maxW = viewport.clientWidth - 24;
        const designW = this.captureWidth;
        const scale = maxW > 0 ? Math.min(1, maxW / designW) : 1;
        stage.style.width = designW * scale + 'px';
        stage.style.height = capture.offsetHeight * scale + 'px';
        capture.style.transform = `scale(${scale})`;
        capture.style.transformOrigin = 'top left';
    }

    bindEvents(container) {
        const widthSel = container.querySelector('#wgWidth');
        widthSel.value = String(this.captureWidth);
        widthSel.addEventListener('change', () => {
            this.captureWidth = parseInt(widthSel.value, 10) || 750;
            const capture = container.querySelector('#wgCapture');
            if (capture) capture.style.width = this.captureWidth + 'px';
            this.fitPreview(container);
        });

        container.querySelector('#wgDownload').addEventListener('click', () => {
            this.downloadPng(container);
        });

        window.addEventListener('resize', this._onResize = () => this.fitPreview(container));
    }

    destroy() {
        if (this._onResize) window.removeEventListener('resize', this._onResize);
    }

    async downloadPng(root) {
        if (this._exporting) return;
        const capture = root.querySelector('#wgCapture');
        const btn = root.querySelector('#wgDownload');
        const status = root.querySelector('#wgStatus');
        const stage = root.querySelector('#wgStage');
        if (!capture) return;

        this._exporting = true;
        if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
        if (status) status.textContent = '生成长图中…';

        const prevTransform = capture.style.transform;
        const prevStageW = stage ? stage.style.width : '';
        const prevStageH = stage ? stage.style.height : '';
        capture.style.transform = 'none';
        if (stage) {
            stage.style.width = this.captureWidth + 'px';
            stage.style.height = 'auto';
        }

        try {
            await this.ensureLibs();
            if (!window.htmlToImage) throw new Error('截图库未加载');
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            await new Promise(r => setTimeout(r, 60));

            // 长图：用较低像素比减轻移动端内存压力；桌面仍用 2
            const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
                || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
            const pixelRatio = isMobile ? 1.5 : 2;

            const dataUrl = await htmlToImage.toPng(capture, {
                pixelRatio,
                cacheBust: true,
                backgroundColor: '#ffffff',
                // 过滤可能干扰截图的伪元素动画等
                filter: (node) => !(node.classList && node.classList.contains('waste-guide-toolbar')),
            });

            const filename = `装修垃圾清运维权指南_${this.captureWidth}.png`;
            await this.downloadToLocal(dataUrl, filename, status);
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '导出失败：' + (e.message || e) + '（内容过长时可改用手机 390 宽度）';
        } finally {
            capture.style.transform = prevTransform;
            if (stage) {
                stage.style.width = prevStageW;
                stage.style.height = prevStageH;
            }
            this.fitPreview(root);
            this._exporting = false;
            if (btn) { btn.disabled = false; btn.textContent = '下载长图'; }
        }
    }

    /** 始终优先下载到本地；大图用 Blob 更稳 */
    async downloadToLocal(dataUrl, filename, statusEl) {
        const blob = await (await fetch(dataUrl)).blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();

        // 稍后再释放，避免部分浏览器下载未开始就 revoke
        setTimeout(() => URL.revokeObjectURL(url), 4000);

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIOS) {
            // Safari 常忽略 a.download：弹出预览，方便长按「存储图像」
            this.showSavePreview(dataUrl, filename, statusEl);
            if (statusEl) statusEl.textContent = '请长按图片 → 存储图像';
        } else if (statusEl) {
            statusEl.textContent = '已开始下载到本地';
        }
    }

    showSavePreview(dataUrl, filename, statusEl) {
        let overlay = document.getElementById('wgSaveOverlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'wgSaveOverlay';
        overlay.className = 'waste-guide-save-overlay';
        overlay.innerHTML = `
            <div class="waste-guide-save-panel">
                <div class="waste-guide-save-head">
                    <strong>保存到手机</strong>
                    <button type="button" class="waste-guide-btn" id="wgSaveClose">关闭</button>
                </div>
                <p class="waste-guide-save-tip">长按下方图片 → 选择「存储图像 / 添加到照片」</p>
                <div class="waste-guide-save-img-wrap">
                    <img src="${dataUrl}" alt="${filename}">
                </div>
                <div class="waste-guide-save-actions">
                    <button type="button" class="waste-guide-btn waste-guide-btn-primary" id="wgSaveShare">系统分享</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#wgSaveClose').addEventListener('click', () => {
            overlay.remove();
            if (statusEl) statusEl.textContent = '就绪';
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (statusEl) statusEl.textContent = '就绪';
            }
        });

        const shareBtn = overlay.querySelector('#wgSaveShare');
        shareBtn.addEventListener('click', async () => {
            try {
                if (!navigator.share) {
                    alert('当前浏览器不支持系统分享，请长按图片保存');
                    return;
                }
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: filename });
                } else {
                    await navigator.share({ title: filename, url: dataUrl });
                }
            } catch (e) {
                if (e && e.name !== 'AbortError') {
                    alert('分享失败，请长按图片保存到相册');
                }
            }
        });
    }
}
