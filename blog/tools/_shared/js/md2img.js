// ========== Markdown 转图片 ==========
class Md2ImgManager {
    constructor() {
        this.markdown = MD2IMG_DEFAULT_MD;
        this.themeId = 'life';
        this.width = 750;
        this._libsReady = false;
        this._libsPromise = null;
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

    // ---------- CDN 按需加载（多源回退；可选库失败不拖垮正文） ----------
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.dataset.md2imgLoaded === '1') {
                    resolve();
                    return;
                }
                // 上次失败留下的空壳，去掉后重试
                existing.remove();
            }
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => {
                s.dataset.md2imgLoaded = '1';
                resolve();
            };
            s.onerror = () => {
                s.remove();
                reject(new Error('load failed: ' + src));
            };
            document.head.appendChild(s);
        });
    }

    async loadScriptFallback(urls) {
        let lastErr = null;
        for (const src of urls) {
            try {
                await this.loadScript(src);
                return src;
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error('load failed');
    }

    loadCss(href) {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
    }

    loadCssFallback(urls) {
        // CSS 用首个可用链接即可；加载失败不影响正文
        for (const href of urls) {
            this.loadCss(href);
            break;
        }
    }

    async ensureLibs() {
        if (this._libsReady) return;
        if (this._libsPromise) return this._libsPromise;
        this._libsPromise = this._ensureLibsInner().finally(() => {
            this._libsPromise = null;
        });
        return this._libsPromise;
    }

    async _ensureLibsInner() {
        this.loadCssFallback([
            'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github.min.css',
            'https://cdn.bootcdn.net/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
            'https://fastly.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github.min.css',
        ]);
        this.loadCssFallback([
            'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github-dark.min.css',
            'https://cdn.bootcdn.net/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
            'https://fastly.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github-dark.min.css',
        ]);

        // marked 必需：正文渲染
        await this.loadScriptFallback([
            'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
            'https://cdn.bootcdn.net/ajax/libs/marked/12.0.2/marked.min.js',
            'https://fastly.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
            'https://unpkg.com/marked@12.0.2/marked.min.js',
        ]);
        if (!window.marked) throw new Error('Markdown 引擎加载失败，请检查网络后刷新');

        // 以下可选：失败只降级，不阻断预览
        // 注意：highlight.js 包根路径 highlight.min.js 在 jsDelivr 已 404，须用 @highlightjs/cdn-assets
        await Promise.allSettled([
            this.loadScriptFallback([
                'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js',
                'https://cdn.bootcdn.net/ajax/libs/highlight.js/11.9.0/highlight.min.js',
                'https://fastly.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js',
                'https://unpkg.com/@highlightjs/cdn-assets@11.9.0/highlight.min.js',
            ]),
            this.loadScriptFallback([
                'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
                'https://cdn.bootcdn.net/ajax/libs/mermaid/10.9.1/mermaid.min.js',
                'https://fastly.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
                'https://unpkg.com/mermaid@10.9.1/dist/mermaid.min.js',
            ]),
            this.loadScriptFallback([
                'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
                'https://fastly.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
                'https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js',
            ]),
        ]);

        if (window.mermaid) {
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: this.themeId === 'code' ? 'dark' : 'neutral',
                fontFamily: 'inherit',
            });
        }
        if (window.marked && !marked.__md2imgConfigured) {
            const esc = (s) => String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            // marked@12 仍使用旧签名：code(text, lang, escaped)
            const toProxy = (href) => this.toSameOriginImageUrl(href);
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
                    image(href, title, text) {
                        if (href && typeof href === 'object') {
                            title = href.title;
                            text = href.text;
                            href = href.href;
                        }
                        const src = esc(toProxy(href || ''));
                        const alt = esc(text || '');
                        const titleAttr = title ? ` title="${esc(title)}"` : '';
                        const cap = text
                            ? `<figcaption>${esc(text)}</figcaption>`
                            : '';
                        // no-referrer：OpenAI 等 CDN 常拦带 Referer 的热链
                        return `<figure class="md2img-figure"><img src="${src}" alt="${alt}"${titleAttr} loading="eager" decoding="async" referrerpolicy="no-referrer">${cap}</figure>\n`;
                    },
                },
            });
            marked.__md2imgConfigured = true;
        }
        this._libsReady = true;
    }

    // ---------- 图片识别 / 内联 ----------
    isImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('data:image/')) return true;
        try {
            const u = new URL(url, location.href);
            if (/\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(u.pathname)) return true;
            if (/(^|\.)images\.openai\.com$/i.test(u.hostname)) return true;
            if (u.searchParams.get('purpose') === 'inline') return true;
            if (/\/(oaidalleurl|dalle|generated[-_]images?)\b/i.test(u.pathname)) return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    // ChatGPT 等常把图写成 [标题](图片url)，先提升为 ![标题](url)
    promoteImageLinks(md) {
        return String(md || '').replace(
            /(^|[^!])\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
            (m, prefix, text, url) => {
                if (!this.isImageUrl(url)) return m;
                return `${prefix}![${text}](${url})`;
            }
        );
    }

    // images.openai.com 不给跨域头，浏览器不能把像素画进 PNG。改走本站 /openai-img/ 反代。
    toSameOriginImageUrl(url) {
        if (!url || url.startsWith('data:') || url.startsWith('/openai-img/')) return url;
        try {
            const u = new URL(url, location.href);
            if (!/(^|\.)images\.openai\.com$/i.test(u.hostname)) return url;
            return '/openai-img' + u.pathname + u.search;
        } catch (e) {
            return url;
        }
    }

    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(r.error || new Error('read failed'));
            r.readAsDataURL(blob);
        });
    }

    waitImageSettled(img) {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
        if (img.complete && img.naturalWidth === 0) return Promise.resolve(false);
        return new Promise((resolve) => {
            const done = (ok) => resolve(ok);
            img.addEventListener('load', () => done(true), { once: true });
            img.addEventListener('error', () => done(false), { once: true });
        });
    }

    // 预览：只等自然加载，绝不改 crossOrigin（改了会强制重载并因 CORS 变破图）
    async waitImagesForPreview(capture) {
        const imgs = Array.from(capture.querySelectorAll('img'));
        if (!imgs.length) return { total: 0, failed: 0, external: 0 };
        const results = await Promise.all(imgs.map(async (img) => {
            img.setAttribute('referrerpolicy', 'no-referrer');
            const ok = await this.waitImageSettled(img);
            if (img.decode) await img.decode().catch(() => {});
            return ok;
        }));
        const failed = results.filter((ok) => !ok).length;
        const external = imgs.filter((img) => {
            const s = img.getAttribute('src') || '';
            return s && !s.startsWith('data:');
        }).length;
        return { total: imgs.length, failed, external };
    }

    placeholderDataUrl(text) {
        const c = document.createElement('canvas');
        c.width = 1200;
        c.height = 280;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#f6f1e8';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = '#e4d8c8';
        ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
        ctx.fillStyle = '#6b5344';
        ctx.font = '600 32px sans-serif';
        ctx.fillText('外链图片无法写入导出文件', 48, 120);
        ctx.fillStyle = '#8a7764';
        ctx.font = '22px sans-serif';
        const line = String(text || '图片').replace(/\s+/g, ' ').slice(0, 42);
        ctx.fillText(line, 48, 172);
        return c.toDataURL('image/png');
    }

    // 导出：尽量 fetch 内联为 data URI。失败则换成占位图，避免 html-to-image 再去拉跨域地址导致整单失败。
    async inlineImageEl(img) {
        const raw = img.getAttribute('src') || '';
        const src = this.toSameOriginImageUrl(raw);
        if (src !== raw) img.setAttribute('src', src);
        if (!src || src.startsWith('data:')) return true;
        try {
            const res = await fetch(src, {
                mode: 'cors',
                credentials: 'omit',
                cache: 'force-cache',
                referrerPolicy: 'no-referrer',
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const blob = await res.blob();
            img.src = await this.blobToDataUrl(blob);
            img.removeAttribute('crossorigin');
            return true;
        } catch (e) {
            img.dataset.md2imgCors = 'fail';
            img.removeAttribute('crossorigin');
            img.src = this.placeholderDataUrl(img.getAttribute('alt') || '');
            return false;
        }
    }

    async prepareImagesForExport(capture) {
        const imgs = Array.from(capture.querySelectorAll('img'));
        if (!imgs.length) return { total: 0, failed: 0 };
        const results = [];
        for (const img of imgs) {
            results.push(await this.inlineImageEl(img));
            await this.waitImageSettled(img);
        }
        const failed = results.filter((ok) => !ok).length;
        return { total: imgs.length, failed };
    }

    formatExportError(e) {
        if (e instanceof Event) return '外链图片不允许跨域写入导出文件';
        return (e && e.message) || String(e);
    }

    insertMarkdownAtCursor(editor, snippet) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = this.markdown.slice(0, start);
        const after = this.markdown.slice(end);
        const needsNlBefore = before && !/\n$/.test(before) ? '\n\n' : (before && !/\n\n$/.test(before) ? '\n' : '');
        const needsNlAfter = after && !/^\n/.test(after) ? '\n\n' : '';
        const block = `${needsNlBefore}${snippet}${needsNlAfter}`;
        this.markdown = before + block + after;
        editor.value = this.markdown;
        const caret = (before + block).length;
        editor.setSelectionRange(caret, caret);
        editor.focus();
    }

    async insertImageFile(file, editor, root) {
        if (!file || !file.type.startsWith('image/')) return;
        const dataUrl = await this.blobToDataUrl(file);
        const alt = (file.name || '图片').replace(/\.[^.]+$/, '').replace(/[[\]]/g, '');
        this.insertMarkdownAtCursor(editor, `![${alt}](${dataUrl})`);
        this.saveState();
        this.schedulePreview(root);
    }

    // ---------- 渲染 ----------
    async renderMarkdown(md) {
        await this.ensureLibs();
        if (!window.marked) throw new Error('Markdown 引擎未就绪');
        const source = this.promoteImageLinks(md || '');
        let html = marked.parse(source);
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

            const imgStat = await this.waitImagesForPreview(capture);
            this.fitPreview(root);
            if (status) {
                if (imgStat.failed) {
                    status.textContent = `就绪（${imgStat.failed} 张图加载失败，可插本地图）`;
                } else if (imgStat.external) {
                    status.textContent = '就绪（外链图预览可用；导出若空白请改插本地图）';
                } else {
                    status.textContent = '就绪';
                }
            }
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

        const liveImgs = Array.from(capture.querySelectorAll('img'));
        const savedSrc = liveImgs.map((img) => img.getAttribute('src'));

        try {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            // 就地截当前可见卡片。离屏副本在 html-to-image 里会导出成空白图。
            const imgStat = await this.prepareImagesForExport(capture);
            await new Promise(r => setTimeout(r, 80));

            const dataUrl = await htmlToImage.toPng(capture, {
                pixelRatio: 2,
                cacheBust: false,
                skipFonts: true,
                backgroundColor: '#ffffff',
                width: capture.scrollWidth,
                height: capture.scrollHeight,
            });
            const a = document.createElement('a');
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `md2img_${this.themeId}_${ts}.png`;
            a.href = dataUrl;
            a.click();
            if (status) {
                status.textContent = imgStat.failed
                    ? `已下载（${imgStat.failed} 张外链图无法写入，请改插本地图片）`
                    : '已下载';
            }
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '导出失败：' + this.formatExportError(e);
        } finally {
            liveImgs.forEach((img, i) => {
                if (savedSrc[i] != null) img.setAttribute('src', savedSrc[i]);
            });
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
                        <div class="md2img-pane-label">
                            <span>Markdown</span>
                            <button type="button" class="md2img-btn md2img-btn-ghost" id="md2imgInsertImg" title="插入本地图片，或直接粘贴截图">插入图片</button>
                            <input type="file" id="md2imgFile" accept="image/*" hidden>
                        </div>
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
        const fileInput = container.querySelector('#md2imgFile');
        editor.addEventListener('input', e => {
            this.markdown = e.target.value;
            this.saveState();
            this.schedulePreview(container);
        });

        editor.addEventListener('paste', (e) => {
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (const item of items) {
                if (item.type && item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) this.insertImageFile(file, editor, container);
                    return;
                }
            }
        });

        const insertBtn = container.querySelector('#md2imgInsertImg');
        if (insertBtn && fileInput) {
            insertBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => {
                const file = fileInput.files && fileInput.files[0];
                if (file) this.insertImageFile(file, editor, container);
                fileInput.value = '';
            });
        }

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
