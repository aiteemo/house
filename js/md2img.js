// ========== Markdown 转图片 ==========
class Md2ImgManager {
    constructor() {
        this.markdown = MD2IMG_DEFAULT_MD;
        this.themeId = 'life';
        this.width = 750;
        this._libsReady = false;
        this._renderTimer = null;
        this._exporting = false;
        this.loadState();
    }

    loadState() {
        try {
            const saved = localStorage.getItem('md2img_v1');
            if (!saved) return;
            const d = JSON.parse(saved);
            if (typeof d.markdown === 'string') this.markdown = d.markdown;
            if (MD2IMG_THEMES.some(t => t.id === d.themeId)) this.themeId = d.themeId;
            if (MD2IMG_WIDTHS.some(w => w.id === d.width)) this.width = d.width;
        } catch (e) { /* ignore */ }
    }

    saveState() {
        localStorage.setItem('md2img_v1', JSON.stringify({
            markdown: this.markdown,
            themeId: this.themeId,
            width: this.width,
        }));
    }

    // ---------- CDN 按需加载 ----------
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

    loadCss(href) {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
    }

    async ensureLibs() {
        if (this._libsReady) return;
        this.loadCss('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css');
        this.loadCss('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css');
        await Promise.all([
            this.loadScript('https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js'),
        ]);
        if (window.mermaid) {
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: this.themeId === 'code' ? 'dark' : 'neutral',
                fontFamily: 'inherit',
            });
        }
        if (window.marked) {
            const esc = (s) => String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            // marked@12 仍使用旧签名：code(text, lang, escaped)
            marked.use({
                gfm: true,
                breaks: true,
                renderer: {
                    code(text, lang /*, escaped */) {
                        // 兼容将来对象签名
                        if (text && typeof text === 'object') {
                            lang = text.lang;
                            text = text.text;
                        }
                        const source = text == null ? '' : String(text);
                        const language = String(lang || '').trim();
                        if (language === 'mermaid') {
                            return `<pre><code class="language-mermaid">${esc(source)}</code></pre>\n`;
                        }
                        let body = esc(source);
                        if (window.hljs) {
                            try {
                                if (language && hljs.getLanguage(language)) {
                                    body = hljs.highlight(source, { language }).value;
                                } else {
                                    body = hljs.highlightAuto(source).value;
                                }
                            } catch (e) { /* keep escaped */ }
                        }
                        const cls = language ? ` class="hljs language-${esc(language)}"` : ' class="hljs"';
                        return `<pre><code${cls}>${body}</code></pre>\n`;
                    },
                },
            });
        }
        this._libsReady = true;
    }

    // ---------- 渲染 ----------
    async renderMarkdown(md) {
        await this.ensureLibs();
        let html = marked.parse(md || '');
        // 将 mermaid 代码块转为 mermaid 容器
        html = html.replace(
            /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
            (_, code) => `<div class="mermaid">${this.decodeHtml(code)}</div>`
        );
        return html;
    }

    decodeHtml(str) {
        const t = document.createElement('textarea');
        t.innerHTML = str;
        return t.value;
    }

    async updatePreview(root) {
        const capture = root.querySelector('#md2imgCapture');
        const status = root.querySelector('#md2imgStatus');
        if (!capture) return;
        if (status) status.textContent = '渲染中…';
        try {
            const html = await this.renderMarkdown(this.markdown);
            capture.innerHTML = html;
            capture.dataset.theme = this.themeId;
            capture.style.width = this.width + 'px';

            // 代码主题 class
            capture.querySelectorAll('pre code').forEach(el => {
                if (window.hljs && !el.classList.contains('hljs')) {
                    try { hljs.highlightElement(el); } catch (e) { /* ignore */ }
                }
            });

            if (window.mermaid) {
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'loose',
                    theme: this.themeId === 'code' ? 'dark' : 'neutral',
                    fontFamily: 'inherit',
                });
                const nodes = capture.querySelectorAll('.mermaid');
                if (nodes.length) {
                    await mermaid.run({ nodes });
                }
            }
            this.fitPreview(root);
            if (status) status.textContent = '就绪';
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '渲染失败：' + (e.message || e);
        }
    }

    fitPreview(root) {
        const viewport = root.querySelector('#md2imgViewport');
        const stage = root.querySelector('#md2imgStage');
        const capture = root.querySelector('#md2imgCapture');
        if (!viewport || !stage || !capture) return;
        const maxW = viewport.clientWidth - 24;
        const designW = this.width;
        const scale = maxW > 0 ? Math.min(1, maxW / designW) : 1;
        stage.style.width = designW * scale + 'px';
        stage.style.height = capture.offsetHeight * scale + 'px';
        capture.style.transform = `scale(${scale})`;
        capture.style.transformOrigin = 'top left';
    }

    schedulePreview(root) {
        clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(() => this.updatePreview(root), 280);
    }

    // ---------- 导出 ----------
    async downloadPng(root) {
        if (this._exporting) return;
        const capture = root.querySelector('#md2imgCapture');
        const btn = root.querySelector('#md2imgDownload');
        const status = root.querySelector('#md2imgStatus');
        if (!capture || !window.htmlToImage) {
            if (status) status.textContent = '导出库未加载';
            return;
        }
        this._exporting = true;
        if (btn) { btn.disabled = true; btn.textContent = '导出中…'; }
        if (status) status.textContent = '导出中…';

        // 截图时去掉缩放，用真实设计宽度
        const prevTransform = capture.style.transform;
        const stage = root.querySelector('#md2imgStage');
        const prevStageH = stage ? stage.style.height : '';
        const prevStageW = stage ? stage.style.width : '';
        capture.style.transform = 'none';
        if (stage) {
            stage.style.width = this.width + 'px';
            stage.style.height = 'auto';
        }

        try {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            // 给 mermaid/svg 一点稳定时间
            await new Promise(r => setTimeout(r, 80));

            const dataUrl = await htmlToImage.toPng(capture, {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: null,
            });
            const a = document.createElement('a');
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `md2img_${this.themeId}_${ts}.png`;
            a.href = dataUrl;
            a.click();
            if (status) status.textContent = '已下载';
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '导出失败：' + (e.message || e);
        } finally {
            capture.style.transform = prevTransform;
            if (stage) {
                stage.style.width = prevStageW;
                stage.style.height = prevStageH;
            }
            this.fitPreview(root);
            this._exporting = false;
            if (btn) { btn.disabled = false; btn.textContent = '下载 PNG'; }
        }
    }

    // ---------- UI ----------
    render(container) {
        const themes = MD2IMG_THEMES.map(t => `
            <button type="button" class="md2img-theme ${this.themeId === t.id ? 'active' : ''}" data-theme="${t.id}" title="${t.desc}">
                <span class="md2img-swatch">
                    ${t.swatch.map(c => `<i style="background:${c}"></i>`).join('')}
                </span>
                <span class="md2img-theme-name">${t.name}</span>
            </button>
        `).join('');

        const widths = MD2IMG_WIDTHS.map(w => `
            <button type="button" class="md2img-width-btn ${this.width === w.id ? 'active' : ''}" data-width="${w.id}">${w.label}</button>
        `).join('');

        container.innerHTML = `
            <div class="md2img-wrap">
                <div class="md2img-header">
                    <div>
                        <h2>Markdown 转图片</h2>
                        <p class="md2img-desc">编辑 Markdown，实时预览精美卡片，一键下载 PNG</p>
                    </div>
                    <div class="md2img-actions">
                        <span class="md2img-status" id="md2imgStatus">加载中…</span>
                        <button class="md2img-btn md2img-btn-primary" id="md2imgDownload">下载 PNG</button>
                    </div>
                </div>

                <div class="md2img-toolbar">
                    <div class="md2img-themes" id="md2imgThemes">${themes}</div>
                    <div class="md2img-widths" id="md2imgWidths">${widths}</div>
                </div>

                <div class="md2img-main">
                    <div class="md2img-editor-pane">
                        <div class="md2img-pane-label">Markdown</div>
                        <textarea class="md2img-editor" id="md2imgEditor" spellcheck="false">${this.escapeText(this.markdown)}</textarea>
                    </div>
                    <div class="md2img-preview-pane">
                        <div class="md2img-pane-label">预览</div>
                        <div class="md2img-viewport" id="md2imgViewport">
                            <div class="md2img-stage" id="md2imgStage">
                                <article class="md2img-card" id="md2imgCapture" data-theme="${this.themeId}" style="width:${this.width}px"></article>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container);
        this.updatePreview(container);
    }

    escapeText(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    bindEvents(container) {
        const editor = container.querySelector('#md2imgEditor');
        editor.addEventListener('input', e => {
            this.markdown = e.target.value;
            this.saveState();
            this.schedulePreview(container);
        });

        container.querySelectorAll('.md2img-theme').forEach(btn => {
            btn.addEventListener('click', () => {
                this.themeId = btn.dataset.theme;
                container.querySelectorAll('.md2img-theme').forEach(b => b.classList.toggle('active', b === btn));
                this.saveState();
                this.updatePreview(container);
            });
        });

        container.querySelectorAll('.md2img-width-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.width = parseInt(btn.dataset.width, 10);
                container.querySelectorAll('.md2img-width-btn').forEach(b => b.classList.toggle('active', b === btn));
                this.saveState();
                this.updatePreview(container);
            });
        });

        container.querySelector('#md2imgDownload').addEventListener('click', () => {
            this.downloadPng(container);
        });

        window.addEventListener('resize', this._onResize = () => this.fitPreview(container));
    }

    destroy() {
        if (this._onResize) window.removeEventListener('resize', this._onResize);
        clearTimeout(this._renderTimer);
    }
}
