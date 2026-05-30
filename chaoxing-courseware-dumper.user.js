// ==UserScript==
// @name         Chaoxing PDF Dumper
// @namespace    https://chaoxing.com/
// @version      0.6.0
// @description  Find and batch download PDF files from the current Chaoxing course page.
// @icon         https://app.chaoxing.com/res/images/apk/logo.png
// @match        https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/*
// @match        https://mooc1.chaoxing.com/mycourse/*
// @grant        GM_xmlhttpRequest
// @connect      mooc2-ans.chaoxing.com
// @connect      mooc1.chaoxing.com
// @connect      *.chaoxing.com
// @connect      *.ananas.chaoxing.com
// @connect      d0.ananas.chaoxing.com
// @connect      s3.ananas.chaoxing.com
// @connect      cs.ananas.chaoxing.com
// @connect      cldisk.com
// @connect      *.cldisk.com
// @connect      d0.cldisk.com
// @connect      s3.cldisk.com
// @connect      cs.cldisk.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STUDENTCOURSE_URL = 'https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/studentcourse';
    const CARDS_URL = 'https://mooc1.chaoxing.com/mooc-ans/knowledge/cards';
    const STATUS_URL_PREFIX = 'https://mooc1.chaoxing.com/ananas/status/';
    const PDF_REFERER = 'https://mooc1.chaoxing.com/ananas/modules/pdf/index.html?v=2026-0312-1153';
    const UI_ID = 'cxpdf-dumper-panel';
    const SCRIPT_NAME = 'Chaoxing PDF Dumper';
    const SCRIPT_VERSION = '0.6.0';
    const SCRIPT_ICON_URL = 'https://app.chaoxing.com/res/images/apk/logo.png';
    const VERSION_POLICY = {
        major: 'Breaking changes to supported pages, permissions, data shape, or default behavior.',
        minor: 'Backward-compatible features, UI additions, new export/display capabilities, or workflow improvements.',
        patch: 'Bug fixes, compatibility fixes, diagnostics, and low-risk maintenance.',
    };
    const LOG_PREFIX = '[Chaoxing PDF Dumper]';

    const state = {
        courseid: '',
        clazzid: '',
        open: false,
        scanning: false,
        downloading: false,
        chapters: [],
        results: [],
        resourceResults: [],
        statusResults: [],
        selectedChapterIds: new Set(),
        selectedFileIds: new Set(),
        logs: [],
        bodyScrollTop: 0,
        cancelDownloadRequested: false,
        activeDownloadTask: null,
        activeDownloadReject: null,
        lastHref: '',
        lastScanKey: '',
        scannedScanKey: '',
        pendingScanKey: '',
        scanToken: 0,
        renderPending: false,
        toast: '',
        toastTimer: null,
        locationWatcherStarted: false,
        locationSyncTimer: null,
        currentUrlHref: '',
        currentUrl: null,
    };

    function unique(values) {
        return Array.from(new Set(values));
    }

    function describeError(error) {
        if (!error) {
            return 'unknown error';
        }
        return error.message || error.error || String(error);
    }

    function createRequestError(message, details) {
        const error = new Error(message);
        Object.assign(error, details || {});
        return error;
    }

    function cleanText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function sanitizeFilename(name) {
        return cleanText(name)
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .slice(0, 160) || 'download.pdf';
    }

    function currentPageUrl() {
        const href = window.location.href;
        if (!state.currentUrl || state.currentUrlHref !== href) {
            state.currentUrlHref = href;
            state.currentUrl = new URL(href);
        }
        return state.currentUrl;
    }

    function currentCourseParams() {
        const pageUrl = currentPageUrl();
        const courseid = getSearchParamCaseInsensitive(pageUrl, 'courseid');
        const clazzid = getSearchParamCaseInsensitive(pageUrl, 'clazzid');

        if (!courseid || !clazzid) {
            throw new Error('当前 URL 缺少 courseid 或 clazzid。');
        }

        return { courseid, clazzid };
    }

    function shouldShowEntryButton(pageUrl = currentPageUrl()) {
        if (isMooc2CoursePage(pageUrl)) {
            return getSearchParamCaseInsensitive(pageUrl, 'pageHeader') === '1';
        }

        return isMooc1StudentStudyPage(pageUrl) && hasCurrentChapterParams(pageUrl);
    }

    function canScanCurrentPage(pageUrl = currentPageUrl()) {
        if (isMooc2CoursePage(pageUrl)) {
            return Boolean(
                getSearchParamCaseInsensitive(pageUrl, 'courseid')
                && getSearchParamCaseInsensitive(pageUrl, 'clazzid')
            );
        }

        return isMooc1StudentStudyPage(pageUrl) && hasCurrentChapterParams(pageUrl);
    }

    function currentScanKey(pageUrl = currentPageUrl()) {
        if (!canScanCurrentPage(pageUrl)) {
            return '';
        }

        if (isMooc1StudentStudyPage(pageUrl)) {
            return `chapter::${getSearchParamCaseInsensitive(pageUrl, 'courseid')}::${getSearchParamCaseInsensitive(pageUrl, 'clazzid')}::${getSearchParamCaseInsensitive(pageUrl, 'chapterId')}`;
        }

        return `course::${getSearchParamCaseInsensitive(pageUrl, 'courseid')}::${getSearchParamCaseInsensitive(pageUrl, 'clazzid')}`;
    }

    function isMooc2CoursePage(url) {
        return url.hostname === 'mooc2-ans.chaoxing.com' && url.pathname.startsWith('/mooc2-ans/mycourse/');
    }

    function isMooc1StudentStudyPage(url) {
        return url.hostname === 'mooc1.chaoxing.com' && url.pathname.startsWith('/mycourse/studentstudy');
    }

    function hasCurrentChapterParams(url) {
        return Boolean(
            getSearchParamCaseInsensitive(url, 'chapterId')
            && getSearchParamCaseInsensitive(url, 'courseid')
            && getSearchParamCaseInsensitive(url, 'clazzid')
        );
    }

    function currentChapterParams() {
        const pageUrl = currentPageUrl();
        const chapterId = getSearchParamCaseInsensitive(pageUrl, 'chapterId');
        const courseid = getSearchParamCaseInsensitive(pageUrl, 'courseid');
        const clazzid = getSearchParamCaseInsensitive(pageUrl, 'clazzid');

        if (!chapterId || !courseid || !clazzid) {
            throw new Error('当前 URL 缺少 chapterId、courseId 或 clazzid。');
        }

        return { chapterId, courseid, clazzid };
    }

    function getSearchParamCaseInsensitive(url, name) {
        const expectedName = name.toLowerCase();
        for (const [key, value] of url.searchParams.entries()) {
            if (key.toLowerCase() === expectedName) {
                return value;
            }
        }
        return null;
    }

    function buildUrl(baseUrl, params) {
        // Chaoxing interfaces rely on query parameters such as courseid/clazzid/knowledgeid.
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        return url.toString();
    }

    function requestText(url, referer) {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            try {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    headers: {
                        Referer: referer,
                    },
                    withCredentials: true,
                    anonymous: false,
                    timeout: 30000,
                    onload(response) {
                        if (response.status < 200 || response.status >= 300) {
                            reject(createRequestError(`HTTP ${response.status}: ${url}`, {
                                type: 'http',
                                status: response.status,
                                statusText: response.statusText || '',
                                url,
                                referer,
                                elapsedMs: Date.now() - startedAt,
                                responseHeaders: response.responseHeaders || '',
                                responseText: String(response.responseText || '').slice(0, 500),
                            }));
                            return;
                        }

                        resolve(response);
                    },
                    onerror(error) {
                        reject(createRequestError(`请求失败: ${url}`, {
                            type: 'network',
                            url,
                            referer,
                            elapsedMs: Date.now() - startedAt,
                            originalError: error,
                        }));
                    },
                    ontimeout() {
                        reject(createRequestError(`请求超时: ${url}`, {
                            type: 'timeout',
                            url,
                            referer,
                            elapsedMs: Date.now() - startedAt,
                        }));
                    },
                });
            } catch (error) {
                reject(createRequestError(`请求创建失败: ${url}`, {
                    type: 'request-init',
                    url,
                    referer,
                    elapsedMs: Date.now() - startedAt,
                    originalError: error,
                }));
            }
        });
    }

    function parseHtml(html) {
        try {
            return new DOMParser().parseFromString(String(html || ''), 'text/html');
        } catch (error) {
            logWarn('PARSE html failed', {
                error,
                htmlPreview: String(html || '').slice(0, 300),
            });
            const fallbackDoc = document.implementation.createHTMLDocument('chaoxing-empty');
            fallbackDoc.body.textContent = String(html || '');
            return fallbackDoc;
        }
    }

    function parseChapters(html) {
        const doc = parseHtml(html);
        // studentcourse renders chapter nodes as cur{knowledgeid}; fallback regexes cover older inline variants.
        const chapters = Array.from(doc.querySelectorAll('.chapter_item[id^="cur"]'))
            .map((item) => {
                const knowledgeid = (item.id || '').replace(/^cur/, '');
                const titleAttr = cleanText(item.getAttribute('title'));
                const titleNode = item.querySelector('.clicktitle');
                const titleText = cleanText(titleNode ? titleNode.textContent : item.textContent);
                const title = titleAttr || titleText || `chapter_${knowledgeid}`;

                return knowledgeid ? { knowledgeid, title } : null;
            })
            .filter(Boolean);

        if (chapters.length) {
            const seen = new Set();
            return chapters.filter((chapter) => {
                if (seen.has(chapter.knowledgeid)) {
                    return false;
                }
                seen.add(chapter.knowledgeid);
                return true;
            });
        }

        const fallbackIds = parseKnowledgeIds(html);
        return fallbackIds.map((knowledgeid) => ({
            knowledgeid,
            title: `chapter_${knowledgeid}`,
        }));
    }

    function parseKnowledgeIds(html) {
        const patterns = [
            /class="chapter_item"\s+id="cur(\d+)"/gi,
            /id="cur(\d+)".*?class="chapter_item"/gis,
            /knowledgeid=(\d+)/gi,
            /knowledgeId[=:]"?(\d+)/gi,
            /chapterId[=:]"?(\d+)/gi,
        ];
        const ids = new Set();

        patterns.forEach((pattern) => {
            for (const match of html.matchAll(pattern)) {
                if (match[1]) {
                    ids.add(match[1]);
                }
            }
        });

        return Array.from(ids);
    }

    function parseAttachmentData(value) {
        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            logWarn('PARSE iframe attachment data failed', {
                error,
                dataPreview: String(value).slice(0, 300),
            });
            return null;
        }
    }

    function parseAttachments(html) {
        const doc = parseHtml(html);
        const byObjectId = new Map();
        const addAttachment = (objectid, data) => {
            const id = cleanText(objectid);
            if (!id) {
                return;
            }

            const existing = byObjectId.get(id) || {};
            byObjectId.set(id, Object.assign({}, data || {}, existing, { objectid: id }));
        };

        Array.from(doc.querySelectorAll('iframe[data]')).forEach((iframe) => {
            const data = parseAttachmentData(iframe.getAttribute('data'));
            if (data && data.objectid) {
                addAttachment(data.objectid, data);
            }
        });

        // knowledge/cards may repeat objectid in iframe data, script JSON, and query strings; collect all then dedupe.
        const objectIdPattern = /"objectid"\s*:\s*"([^"]+)"/gi;
        for (const match of html.matchAll(objectIdPattern)) {
            addAttachment(match[1], { objectid: match[1] });
        }

        const singleQuotePattern = /'objectid'\s*:\s*'([^']+)'/gi;
        for (const match of html.matchAll(singleQuotePattern)) {
            addAttachment(match[1], { objectid: match[1] });
        }

        const queryPattern = /objectid=([0-9a-f]{32})/gi;
        for (const match of html.matchAll(queryPattern)) {
            addAttachment(match[1], { objectid: match[1] });
        }

        return Array.from(byObjectId.values());
    }

    function parseKnowledgeName(html) {
        const match = html.match(/"knowledgename"\s*:\s*"([^"]+)"/);
        if (!match) {
            return '';
        }

        try {
            return cleanText(JSON.parse(`"${match[1]}"`));
        } catch (error) {
            return cleanText(match[1]);
        }
    }

    function currentPageChapterTitle(chapterId) {
        const candidates = [
            document.querySelector('.catalog_name .clicktitle'),
            document.querySelector('.chapter-title'),
            document.querySelector('h1'),
            document.querySelector('title'),
        ];

        for (const node of candidates) {
            const title = cleanText(node && node.textContent);
            if (title) {
                return title;
            }
        }

        return `chapter_${chapterId}`;
    }

    function addLog(message) {
        const time = new Date().toLocaleTimeString();
        state.logs.unshift(`[${time}] ${message}`);
        state.logs = state.logs.slice(0, 6);
        requestRender();
    }

    function requestRender() {
        if (state.renderPending) {
            return;
        }

        state.renderPending = true;
        const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
        schedule(() => {
            state.renderPending = false;
            render();
        });
    }

    function showToast(message) {
        state.toast = message;
        if (state.toastTimer) {
            window.clearTimeout(state.toastTimer);
        }
        state.toastTimer = window.setTimeout(() => {
            state.toast = '';
            state.toastTimer = null;
            requestRender();
        }, 2600);
        requestRender();
    }

    function logInfo(event, data) {
        console.log(`${LOG_PREFIX} [INFO] ${event}`, data || '');
    }

    function logWarn(event, data) {
        console.warn(`${LOG_PREFIX} [WARN] ${event}`, data || '');
    }

    function logError(event, error, data) {
        console.error(`${LOG_PREFIX} [ERROR] ${event}`, { error, data });
    }

    function logGroup(event, data, rows) {
        console.groupCollapsed(`${LOG_PREFIX} ${event}`);
        if (data) {
            console.log('meta:', data);
        }
        if (rows && rows.length) {
            console.table(rows);
        }
        console.groupEnd();
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function injectStyle() {
        if (document.getElementById(`${UI_ID}-style`)) {
            return;
        }

        const style = document.createElement('style');
        style.id = `${UI_ID}-style`;
        style.textContent = `
            #${UI_ID} {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                color: #18202b;
                font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            #${UI_ID} .cxpdf-toggle {
                align-self: flex-end;
                min-width: 104px;
                min-height: 38px;
                border: 0;
                border-radius: 999px;
                background: #1769e0;
                color: #ffffff;
                font: 700 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                box-shadow: 0 10px 24px rgba(23, 105, 224, 0.28);
                cursor: pointer;
            }
            #${UI_ID} .cxpdf-panel {
                width: min(560px, calc(100vw - 40px));
                max-height: min(720px, calc(100vh - 92px));
                margin-bottom: 10px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #d8dde6;
                border-radius: 8px;
                background: #ffffff;
                box-shadow: 0 12px 32px rgba(15, 23, 42, 0.22);
            }
            #${UI_ID} .cxpdf-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 12px;
                border-bottom: 1px solid #e7ebf0;
                background: #f8fafc;
            }
            #${UI_ID} .cxpdf-title {
                font-weight: 700;
                color: #111827;
            }
            #${UI_ID} .cxpdf-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 10px 12px;
                border-bottom: 1px solid #edf0f4;
            }
            #${UI_ID} .cxpdf-actions .cxpdf-spacer {
                flex: 1 1 auto;
            }
            #${UI_ID} .cxpdf-select-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin: 0 12px 10px;
                padding: 9px 10px;
                border: 1px solid #d8dde6;
                border-radius: 7px;
                background: #ffffff;
            }
            #${UI_ID} .cxpdf-select-row.cxpdf-all-selected {
                border-color: #21a366;
                background: #eaf7ef;
                color: #17633a;
            }
            #${UI_ID} .cxpdf-select-row.cxpdf-some-selected {
                border-color: #89bdf5;
                background: #eef6ff;
            }
            #${UI_ID} .cxpdf-select-row.cxpdf-none-selected {
                border-color: #cbd5e1;
                background: #f8fafc;
                color: #64748b;
            }
            #${UI_ID} .cxpdf-select-label {
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 650;
                cursor: pointer;
            }
            #${UI_ID} input[type="checkbox"] {
                appearance: none !important;
                -webkit-appearance: none !important;
                position: relative !important;
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 18px !important;
                height: 18px !important;
                min-width: 18px !important;
                margin: 0 !important;
                border: 1px solid #94a3b8 !important;
                border-radius: 4px !important;
                background: #ffffff !important;
                flex: 0 0 auto;
                cursor: pointer;
                vertical-align: middle;
            }
            #${UI_ID} input[type="checkbox"]:checked {
                border-color: #1296db !important;
                background: #1296db !important;
            }
            #${UI_ID} input[type="checkbox"]:checked::after {
                content: "";
                position: absolute;
                left: 5px;
                top: 2px;
                width: 5px;
                height: 10px;
                border: solid #ffffff;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }
            #${UI_ID} input[type="checkbox"]:indeterminate {
                border-color: #1296db !important;
                background: #1296db !important;
            }
            #${UI_ID} input[type="checkbox"]:indeterminate::after {
                content: "";
                position: absolute;
                left: 4px;
                right: 4px;
                top: 8px;
                height: 2px;
                background: #ffffff;
            }
            #${UI_ID} input[type="checkbox"]:disabled {
                cursor: wait;
            }
            #${UI_ID} input.cxpdf-select-all-check,
            #${UI_ID} input.cxpdf-chapter-check {
                width: 22px !important;
                height: 22px !important;
                min-width: 22px !important;
                border-radius: 6px !important;
            }
            #${UI_ID} input.cxpdf-file-check-input {
                width: 14px !important;
                height: 14px !important;
                min-width: 14px !important;
                border-radius: 3px !important;
            }
            #${UI_ID} input.cxpdf-file-check-input:checked::after {
                left: 4px;
                top: 1px;
                width: 4px;
                height: 8px;
            }
            #${UI_ID} input.cxpdf-chapter-check:checked {
                border-color: #16a34a !important;
                background: #22c55e !important;
            }
            #${UI_ID} input.cxpdf-chapter-check:indeterminate {
                border-color: #2563eb !important;
                background: #3b82f6 !important;
            }
            #${UI_ID} input.cxpdf-chapter-check.cxpdf-no-pdf {
                border-color: #ef4444 !important;
                background: #fee2e2 !important;
                cursor: not-allowed;
            }
            #${UI_ID} input.cxpdf-chapter-check.cxpdf-no-pdf::after {
                content: "";
                position: absolute;
                left: 5px;
                top: 5px;
                width: 10px;
                height: 10px;
                background:
                    linear-gradient(45deg, transparent 43%, #dc2626 43%, #dc2626 57%, transparent 57%),
                    linear-gradient(-45deg, transparent 43%, #dc2626 43%, #dc2626 57%, transparent 57%);
                transform: none;
                border: 0;
            }
            #${UI_ID} button {
                min-height: 30px;
                padding: 0 10px;
                border: 1px solid #c7d2e1;
                border-radius: 6px;
                background: #ffffff;
                color: #1f2937;
                font: inherit;
                cursor: pointer;
            }
            #${UI_ID} button.cxpdf-primary {
                border-color: #1769e0;
                background: #1769e0;
                color: #ffffff;
            }
            #${UI_ID} button.cxpdf-danger {
                border-color: #dc2626;
                background: #dc2626;
                color: #ffffff;
            }
            #${UI_ID} button:disabled {
                opacity: 0.55;
                cursor: wait;
            }
            #${UI_ID} .cxpdf-meta {
                padding: 0 12px 10px;
                color: #4b5563;
            }
            #${UI_ID} .cxpdf-log {
                padding: 8px 12px;
                border-top: 1px solid #edf0f4;
                background: #fbfcfd;
                color: #5b6472;
                font-size: 12px;
            }
            #${UI_ID} .cxpdf-toast {
                align-self: stretch;
                max-width: min(420px, calc(100vw - 40px));
                margin: 0 0 8px auto;
                padding: 8px 10px;
                border: 1px solid #bfdbfe;
                border-radius: 7px;
                background: #eff6ff;
                color: #1d4ed8;
                box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
                font-weight: 650;
            }
            #${UI_ID} .cxpdf-body {
                overflow: auto;
                padding: 0 12px 12px;
            }
            #${UI_ID} .cxpdf-empty {
                padding: 18px 0;
                color: #6b7280;
            }
            #${UI_ID} .cxpdf-chapter {
                margin-top: 10px;
                border: 1px solid #e1e7ef;
                border-radius: 8px;
                overflow: hidden;
                background: #ffffff;
            }
            #${UI_ID} .cxpdf-chapter.cxpdf-chapter-selected {
                border-color: #7bc99b;
            }
            #${UI_ID} .cxpdf-chapter.cxpdf-chapter-unselected {
                border-color: #d8dee8;
                background: #f8fafc;
            }
            #${UI_ID} .cxpdf-chapter.cxpdf-chapter-partial {
                border-color: #93c5fd;
            }
            #${UI_ID} .cxpdf-chapter.cxpdf-chapter-empty {
                border-color: #fecaca;
                background: #fff7f7;
            }
            #${UI_ID} .cxpdf-chapter-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 8px 10px;
                background: #f6f8fb;
                font-weight: 650;
            }
            #${UI_ID} .cxpdf-chapter-selected .cxpdf-chapter-head {
                background: #eaf7ef;
                color: #14532d;
            }
            #${UI_ID} .cxpdf-chapter-unselected .cxpdf-chapter-head {
                background: #eef2f7;
                color: #475569;
            }
            #${UI_ID} .cxpdf-chapter-partial .cxpdf-chapter-head {
                background: #eff6ff;
                color: #1d4ed8;
            }
            #${UI_ID} .cxpdf-chapter-empty .cxpdf-chapter-head {
                background: #fef2f2;
                color: #b91c1c;
            }
            #${UI_ID} .cxpdf-chapter-choice {
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #${UI_ID} .cxpdf-chapter-choice input {
                flex: 0 0 auto;
            }
            #${UI_ID} .cxpdf-chapter-title {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #${UI_ID} .cxpdf-count {
                flex: 0 0 auto;
                color: #4b5563;
                font-weight: 500;
            }
            #${UI_ID} .cxpdf-selected-badge {
                flex: 0 0 auto;
                min-width: 46px;
                padding: 2px 6px;
                border-radius: 999px;
                background: #dcfce7;
                color: #166534;
                font-size: 12px;
                text-align: center;
            }
            #${UI_ID} .cxpdf-chapter-unselected .cxpdf-selected-badge {
                background: #e2e8f0;
                color: #64748b;
            }
            #${UI_ID} .cxpdf-chapter-partial .cxpdf-selected-badge {
                background: #dbeafe;
                color: #1d4ed8;
            }
            #${UI_ID} .cxpdf-chapter-empty .cxpdf-selected-badge {
                background: #fee2e2;
                color: #b91c1c;
            }
            #${UI_ID} .cxpdf-file {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr) auto;
                gap: 8px;
                align-items: center;
                padding: 8px 10px;
                border-top: 1px solid #edf0f4;
            }
            #${UI_ID} .cxpdf-file-check {
                display: flex;
                align-items: center;
            }
            #${UI_ID} .cxpdf-file-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #${UI_ID} .cxpdf-resource-kind {
                display: inline-block;
                margin-left: 6px;
                padding: 1px 5px;
                border-radius: 999px;
                background: #f1f5f9;
                color: #475569;
                font-size: 11px;
            }
            #${UI_ID} .cxpdf-file-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #${UI_ID} .cxpdf-small {
                color: #64748b;
                font-size: 12px;
            }
            @media (max-width: 560px) {
                #${UI_ID} {
                    right: 10px;
                    bottom: 10px;
                }
                #${UI_ID} .cxpdf-panel {
                    width: calc(100vw - 20px);
                }
                #${UI_ID} .cxpdf-file {
                    grid-template-columns: auto minmax(0, 1fr) auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureUi() {
        injectStyle();

        let panel = document.getElementById(UI_ID);
        if (panel) {
            return panel;
        }

        panel = createElement('section');
        panel.id = UI_ID;
        document.body.appendChild(panel);
        return panel;
    }

    function resultGroups() {
        return buildRenderModel().groups;
    }

    function buildRenderModel() {
        const groups = new Map();

        state.chapters.forEach((chapter) => {
            groups.set(chapter.knowledgeid, {
                chapter,
                items: [],
            });
        });

        const displayItems = shouldDisplayNonPdfResources()
            ? state.resourceResults
            : state.results;

        displayItems.forEach((item) => {
            if (!groups.has(item.knowledgeid)) {
                groups.set(item.knowledgeid, {
                    chapter: {
                        knowledgeid: item.knowledgeid,
                        title: item.chapter_title || `chapter_${item.knowledgeid}`,
                    },
                    items: [],
                });
            }
            groups.get(item.knowledgeid).items.push(item);
        });

        const groupList = Array.from(groups.values()).map((group) => {
            const pdfItems = group.items.filter((item) => item.isPdf);
            const selectedPdfItems = pdfItems.filter((item) => state.selectedFileIds.has(item.objectid));
            return Object.assign(group, {
                pdfItems,
                selectedPdfItems,
                hasPdf: pdfItems.length > 0,
                selected: pdfItems.length > 0 && selectedPdfItems.length === pdfItems.length,
                partiallySelected: selectedPdfItems.length > 0 && selectedPdfItems.length < pdfItems.length,
            });
        });

        const selectedFileCount = state.selectedFileIds.size
            ? state.results.reduce((count, item) => (
                state.selectedFileIds.has(item.objectid) ? count + 1 : count
            ), 0)
            : 0;
        const pdfChapterCount = groupList.reduce((count, group) => (
            group.hasPdf ? count + 1 : count
        ), 0);

        return {
            groups: groupList,
            fileCount: state.results.length,
            chapterCount: groupList.length,
            pdfChapterCount,
            selectedFileCount,
        };
    }

    function selectedResults() {
        if (!state.selectedFileIds.size) {
            return [];
        }

        return state.results.filter((item) => state.selectedFileIds.has(item.objectid));
    }

    function copyableResults() {
        return state.statusResults;
    }

    function outputResults() {
        return state.resourceResults.map((item) => item.output_json);
    }

    function shouldDisplayNonPdfResources() {
        return isMooc1StudentStudyPage(currentPageUrl());
    }

    function shouldAutoScanCurrentChapter(scanKey) {
        return Boolean(
            state.open
            && scanKey
            && isMooc1StudentStudyPage(currentPageUrl())
        );
    }

    function resourceKind(item) {
        if (item.isPdf) {
            return 'PDF';
        }
        return item.type || item.suffix || item.status || '资源';
    }

    function setAllChaptersSelected(selected) {
        if (selected) {
            state.selectedFileIds = new Set(state.results.map((item) => item.objectid).filter(Boolean));
            state.selectedChapterIds = new Set(
                resultGroups()
                    .filter((group) => group.items.length)
                    .map((group) => group.chapter.knowledgeid)
            );
        } else {
            state.selectedFileIds = new Set();
            state.selectedChapterIds = new Set();
        }
        render();
    }

    function syncSelectedChapters(groups) {
        // Chapter checkboxes mirror selected PDF files; non-PDF resources stay visible but do not affect selection.
        state.selectedChapterIds = new Set(
            groups
                .filter((group) => (group.pdfItems || group.items).some((item) => item.isPdf && state.selectedFileIds.has(item.objectid)))
                .map((group) => group.chapter.knowledgeid)
        );
    }

    function clearScanDataForLocation(scanKey) {
        state.lastScanKey = scanKey || '';
        state.scannedScanKey = '';
        state.pendingScanKey = '';
        state.courseid = '';
        state.clazzid = '';
        state.chapters = [];
        state.results = [];
        state.resourceResults = [];
        state.statusResults = [];
        state.selectedChapterIds = new Set();
        state.selectedFileIds = new Set();
        state.logs = [];
        state.bodyScrollTop = 0;
    }

    function render() {
        const previousBody = document.querySelector(`#${UI_ID} .cxpdf-body`);
        if (previousBody) {
            state.bodyScrollTop = previousBody.scrollTop;
        }

        if (!shouldShowEntryButton()) {
            const existingPanel = document.getElementById(UI_ID);
            if (existingPanel) {
                existingPanel.remove();
            }
            return;
        }

        const panel = ensureUi();
        const model = buildRenderModel();
        const groups = model.groups;
        syncSelectedChapters(groups);
        const selectedChapterCount = state.selectedChapterIds.size;
        const fileCount = model.fileCount;
        const chapterCount = model.chapterCount;
        const pdfChapterCount = model.pdfChapterCount;
        const selectedFileCount = model.selectedFileCount;
        const canDownload = selectedFileCount > 0 && !state.scanning && !state.downloading;
        const allSelected = fileCount > 0 && selectedFileCount === fileCount;
        const someSelected = selectedFileCount > 0 && selectedFileCount < fileCount;

        panel.replaceChildren();

        if (state.toast) {
            panel.appendChild(createElement('div', 'cxpdf-toast', state.toast));
        }

        if (state.open) {
            const content = createElement('div', 'cxpdf-panel');
            const header = createElement('div', 'cxpdf-header');
            header.appendChild(createElement('div', 'cxpdf-title', 'Chaoxing PDF Dumper'));
            const status = createElement(
                'div',
                'cxpdf-small',
                state.scanning ? '扫描中' : state.downloading ? '下载中' : '就绪'
            );
            header.appendChild(status);
            content.appendChild(header);

            const actions = createElement('div', 'cxpdf-actions');
            const scanButton = createElement('button', 'cxpdf-primary', state.scanning ? '扫描中...' : '重新扫描');
            scanButton.disabled = state.scanning || state.downloading;
            scanButton.title = scanButton.disabled ? '当前任务完成后可重新扫描' : '重新扫描当前页面课件';
            scanButton.addEventListener('click', () => {
                showToast('已触发重新扫描');
                scanCourse();
            });
            actions.appendChild(scanButton);

            const downloadButton = createElement(
                'button',
                state.downloading ? 'cxpdf-danger' : 'cxpdf-primary',
                state.downloading ? '取消下载' : `下载勾选 (${selectedFileCount})`
            );
            downloadButton.disabled = !state.downloading && !canDownload;
            downloadButton.title = state.downloading
                ? '取消当前批量下载'
                : canDownload ? '开始下载已勾选 PDF' : '请先勾选可下载的 PDF';
            downloadButton.addEventListener('click', () => {
                if (state.downloading) {
                    showToast('已触发取消下载');
                    cancelDownload();
                } else {
                    showToast(`已触发批量下载：${selectedFileCount} 个 PDF`);
                    downloadAll();
                }
            });
            actions.appendChild(downloadButton);

            const copyButton = createElement('button', '', '复制 JSON');
            copyButton.disabled = !state.statusResults.length;
            copyButton.title = state.statusResults.length
                ? '复制已获取的 ananas/status 接口原始 JSON，扫描中也可复制'
                : '获取到接口 JSON 后可复制';
            copyButton.addEventListener('click', () => {
                const copyCount = copyableResults().length;
                showToast(`已触发复制 JSON：${copyCount} 条接口返回`);
                copyResults();
            });
            actions.appendChild(copyButton);

            content.appendChild(actions);

            const meta = createElement(
                'div',
                'cxpdf-meta',
                `courseid=${state.courseid || '-'}，clazzid=${state.clazzid || '-'}，章节 ${chapterCount}/${state.chapters.length || 0}，已选 ${selectedChapterCount} 章 / ${selectedFileCount} 个 PDF，共 ${fileCount} 个 PDF`
            );
            content.appendChild(meta);

            const selectRow = createElement(
                'div',
                `cxpdf-select-row${allSelected ? ' cxpdf-all-selected' : someSelected ? ' cxpdf-some-selected' : ' cxpdf-none-selected'}`
            );
            const selectLabel = createElement('label', 'cxpdf-select-label');
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.className = 'cxpdf-select-all-check';
            selectAllCheckbox.checked = allSelected;
            selectAllCheckbox.indeterminate = someSelected;
            selectAllCheckbox.disabled = !fileCount || state.downloading;
            selectAllCheckbox.title = selectAllCheckbox.disabled ? '当前不能切换章节选择' : '切换全部章节选择';
            selectAllCheckbox.addEventListener('change', () => {
                showToast(selectAllCheckbox.checked ? '已触发全选章节' : '已触发取消全选章节');
                setAllChaptersSelected(selectAllCheckbox.checked);
            });
            selectLabel.appendChild(selectAllCheckbox);
            selectLabel.appendChild(createElement('span', '', allSelected ? '已全选章节' : someSelected ? '已选择部分章节' : '未选择章节'));
            selectRow.appendChild(selectLabel);
            selectRow.appendChild(createElement('div', 'cxpdf-small', `${selectedChapterCount}/${pdfChapterCount} 章`));
            content.appendChild(selectRow);

            const body = createElement('div', 'cxpdf-body');
            body.addEventListener('scroll', () => {
                state.bodyScrollTop = body.scrollTop;
            });

            if (!groups.length) {
                body.appendChild(createElement('div', 'cxpdf-empty', state.scanning ? '正在识别章节和 PDF...' : '暂无 PDF 结果'));
            } else {
                groups.forEach((group) => {
                    const pdfItems = group.pdfItems;
                    const chapterStateClass = !group.hasPdf
                        ? 'cxpdf-chapter-empty'
                        : group.partiallySelected ? 'cxpdf-chapter-partial'
                            : group.selectedPdfItems.length ? 'cxpdf-chapter-selected' : 'cxpdf-chapter-unselected';
                    const chapter = createElement('div', `cxpdf-chapter ${chapterStateClass}`);
                    const head = createElement('div', 'cxpdf-chapter-head');
                    const choice = createElement('label', 'cxpdf-chapter-choice');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = `cxpdf-chapter-check${group.hasPdf ? '' : ' cxpdf-no-pdf'}`;
                    checkbox.checked = group.selected;
                    checkbox.indeterminate = group.partiallySelected;
                    checkbox.disabled = !group.hasPdf || state.downloading;
                    checkbox.title = !group.hasPdf ? '当前章节未检测到 PDF' : checkbox.disabled ? '批量下载进行中' : '切换当前章节选择';
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            pdfItems.forEach((item) => state.selectedFileIds.add(item.objectid));
                        } else {
                            pdfItems.forEach((item) => state.selectedFileIds.delete(item.objectid));
                        }
                        syncSelectedChapters(groups);
                        showToast(checkbox.checked ? `已选择章节：${group.chapter.title}` : `已取消章节：${group.chapter.title}`);
                        render();
                    });
                    choice.appendChild(checkbox);
                    choice.appendChild(createElement('span', 'cxpdf-selected-badge', !group.hasPdf ? '无PDF' : group.selected ? '已选' : group.partiallySelected ? '部分' : '未选'));
                    choice.appendChild(createElement('span', 'cxpdf-chapter-title', group.chapter.title));
                    head.appendChild(choice);
                    const countText = shouldDisplayNonPdfResources()
                        ? `${pdfItems.length} 个 PDF / ${group.items.length} 个资源`
                        : group.hasPdf ? `${pdfItems.length} 个 PDF` : '无 PDF';
                    head.appendChild(createElement('div', 'cxpdf-count', countText));
                    chapter.appendChild(head);

                    group.items.forEach((item) => {
                        const row = createElement('div', 'cxpdf-file');
                        const fileChoice = createElement('label', 'cxpdf-file-check');
                        if (item.isPdf) {
                            const fileCheckbox = document.createElement('input');
                            fileCheckbox.type = 'checkbox';
                            fileCheckbox.className = 'cxpdf-file-check-input';
                            fileCheckbox.checked = state.selectedFileIds.has(item.objectid);
                            fileCheckbox.disabled = state.downloading;
                            fileCheckbox.title = fileCheckbox.disabled ? '批量下载进行中' : '切换当前文件选择';
                            fileCheckbox.addEventListener('change', () => {
                                if (fileCheckbox.checked) {
                                    state.selectedFileIds.add(item.objectid);
                                } else {
                                    state.selectedFileIds.delete(item.objectid);
                                }
                                syncSelectedChapters(groups);
                                showToast(fileCheckbox.checked ? `已选择文件：${item.filename || item.objectid}` : `已取消文件：${item.filename || item.objectid}`);
                                render();
                            });
                            fileChoice.appendChild(fileCheckbox);
                        }
                        row.appendChild(fileChoice);

                        const file = createElement('div');
                        const fileName = createElement('div', 'cxpdf-file-name', item.filename || item.objectid);
                        if (!item.isPdf) {
                            fileName.appendChild(createElement('span', 'cxpdf-resource-kind', resourceKind(item)));
                        }
                        file.appendChild(fileName);
                        file.appendChild(createElement('div', 'cxpdf-small', item.objectid));
                        row.appendChild(file);

                        const actions = createElement('div', 'cxpdf-file-actions');
                        const copyJsonButton = createElement('button', '', '复制 JSON');
                        copyJsonButton.disabled = !item.raw_json;
                        copyJsonButton.title = '复制当前资源的接口原始 JSON';
                        copyJsonButton.addEventListener('click', () => {
                            showToast(`已触发复制 JSON：${item.filename || item.objectid}`);
                            copyJsonPayload(item.raw_json, '接口 JSON 已复制到剪贴板');
                        });
                        actions.appendChild(copyJsonButton);

                        if (item.isPdf) {
                            const button = createElement('button', '', '下载');
                            button.disabled = state.downloading;
                            button.title = state.downloading ? '批量下载进行中' : '下载当前文件';
                            button.addEventListener('click', () => {
                                showToast(`已触发单文件下载：${item.filename || item.objectid}`);
                                downloadItem(item);
                            });
                            actions.appendChild(button);
                        }
                        row.appendChild(actions);
                        chapter.appendChild(row);
                    });

                    body.appendChild(chapter);
                });
            }

            content.appendChild(body);

            const log = createElement('div', 'cxpdf-log');
            log.textContent = state.logs.join('  |  ') || '打开控制台可查看完整接口输出。';
            content.appendChild(log);
            panel.appendChild(content);
            body.scrollTop = state.bodyScrollTop;

            const restoreScroll = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
            restoreScroll(() => {
                body.scrollTop = state.bodyScrollTop;
            });
        }

        const toggleButton = createElement('button', 'cxpdf-toggle', state.open ? '收起' : '课件下载');
        toggleButton.title = state.open ? '收起下载面板' : '打开下载面板';
        toggleButton.addEventListener('click', () => {
            state.open = !state.open;
            showToast(state.open ? '已打开课件下载面板' : '已收起课件下载面板');
            if (state.open && canScanCurrentPage() && currentScanKey() !== state.scannedScanKey) {
                scanCourse();
            } else {
                render();
            }
        });
        panel.appendChild(toggleButton);
    }

    async function fetchChapters(courseid, clazzid) {
        const requestUrl = buildUrl(STUDENTCOURSE_URL, { courseid, clazzid });
        const response = await requestText(requestUrl, window.location.href);
        const chapters = parseChapters(response.responseText);

        logGroup('SCAN studentcourse', {
            url: requestUrl,
            status: response.status,
            chapterCount: chapters.length,
        }, chapters.map((chapter, index) => ({
            index: index + 1,
            knowledgeid: chapter.knowledgeid,
            title: chapter.title,
        })));

        if (!chapters.length) {
            throw new Error('未从 studentcourse 返回内容中解析到章节。');
        }

        return chapters;
    }

    function buildChapterCardsRequest(courseid, clazzid, chapter) {
        const requestUrl = buildUrl(CARDS_URL, {
            clazzid,
            courseid,
            knowledgeid: chapter.knowledgeid,
        });
        // Cards requests need the matching studentstudy page as Referer.
        const referer = buildUrl('https://mooc1.chaoxing.com/mycourse/studentstudy', {
            chapterId: chapter.knowledgeid,
            courseId: courseid,
            clazzid,
        });

        return { requestUrl, referer };
    }

    async function fetchChapterCards(courseid, clazzid, chapter, options) {
        const config = Object.assign({
            event: 'SCAN cards',
            includeParsedTitle: false,
        }, options || {});
        const { requestUrl, referer } = buildChapterCardsRequest(courseid, clazzid, chapter);
        const response = await requestText(requestUrl, referer);
        const attachments = parseAttachments(response.responseText);
        const parsedTitle = config.includeParsedTitle ? parseKnowledgeName(response.responseText) : '';

        logGroup(config.event, {
            knowledgeid: chapter.knowledgeid,
            chapterTitle: parsedTitle || chapter.title,
            url: requestUrl,
            referer,
            status: response.status,
            attachmentCount: attachments.length,
        }, attachments.map((attachment, index) => ({
            index: index + 1,
            objectid: attachment.objectid || '',
            name: attachment.name || '',
            type: attachment.type || '',
            size: attachment.hsize || attachment.size || '',
        })));

        return {
            attachments,
            title: parsedTitle || chapter.title,
        };
    }

    async function fetchAttachments(courseid, clazzid, chapter) {
        const result = await fetchChapterCards(courseid, clazzid, chapter);
        return result.attachments;
    }

    async function fetchCurrentChapterAttachments(courseid, clazzid, chapter) {
        return fetchChapterCards(courseid, clazzid, chapter, {
            event: 'SCAN current chapter cards',
            includeParsedTitle: true,
        });
    }

    async function fetchStatus(objectid) {
        // ananas/status returns the usable pdf/download/http URLs for one attachment objectid.
        const requestUrl = buildUrl(`${STATUS_URL_PREFIX}${objectid}`, {
            flag: 'normal',
            _dc: String(Date.now()),
        });
        const response = await requestText(requestUrl, PDF_REFERER);
        let content;

        try {
            content = JSON.parse(response.responseText);
        } catch (error) {
            logWarn('PARSE status json failed', {
                objectid,
                url: requestUrl,
                error,
                responseText: String(response.responseText || '').slice(0, 500),
            });
            content = { text: response.responseText };
        }

        const rawJson = content;
        const statusObject = content && typeof content === 'object' && !Array.isArray(content)
            ? content
            : {};

        return {
            objectid,
            status_code: response.status,
            status_url: requestUrl,
            raw_json: rawJson,
            filename: statusObject.filename,
            download: statusObject.download,
            pdf: statusObject.pdf,
            http: statusObject.http,
            status: statusObject.status,
            type: statusObject.type,
            suffix: statusObject.suffix,
        };
    }

    function resetScanState(scanKey) {
        state.scanning = true;
        state.scanToken += 1;
        state.lastScanKey = scanKey;
        state.scannedScanKey = scanKey;
        state.pendingScanKey = '';
        state.downloading = false;
        state.cancelDownloadRequested = false;
        state.activeDownloadTask = null;
        state.activeDownloadReject = null;
        state.results = [];
        state.resourceResults = [];
        state.statusResults = [];
        state.chapters = [];
        state.selectedChapterIds = new Set();
        state.selectedFileIds = new Set();
        state.logs = [];
        state.bodyScrollTop = 0;
        render();
        return state.scanToken;
    }

    function isActiveScan(scanToken) {
        return scanToken === state.scanToken && state.scanning;
    }

    function interruptActiveScan(scanKey) {
        if (!state.scanning) {
            return;
        }

        state.scanToken += 1;
        state.scanning = false;
        state.pendingScanKey = scanKey || '';
        addLog('页面已切换，停止旧扫描');
        logWarn('SCAN interrupted by location change', {
            nextScanKey: scanKey,
            href: window.location.href,
        });
    }

    function finishScan(scanToken) {
        if (scanToken !== state.scanToken) {
            return;
        }

        state.scanning = false;
        render();

        const scanKey = currentScanKey();
        if (state.pendingScanKey && state.pendingScanKey === scanKey) {
            state.pendingScanKey = '';
            if (shouldAutoScanCurrentChapter(scanKey)) {
                window.setTimeout(scanCourse, 0);
            }
        }
    }

    function appendPdfResult(chapter, attachment, statusResult, eventName) {
        statusResult.knowledgeid = chapter.knowledgeid;
        statusResult.chapter_title = chapter.title;
        statusResult.attachment_name = attachment.name;
        statusResult.filename = statusResult.filename || attachment.name || `${attachment.objectid}.pdf`;
        statusResult.isPdf = true;
        state.results.push(statusResult);
        state.selectedFileIds.add(statusResult.objectid);
        logInfo(eventName, {
            knowledgeid: chapter.knowledgeid,
            chapterTitle: chapter.title,
            objectid: statusResult.objectid,
            filename: statusResult.filename,
            hasDownload: Boolean(statusResult.download),
            hasPdf: Boolean(statusResult.pdf),
            hasHttp: Boolean(statusResult.http),
        });
        requestRender();
    }

    function buildOutputJson(chapter, attachment, statusResult) {
        const rawJson = statusResult.raw_json;
        const base = rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson)
            ? Object.assign({}, rawJson)
            : { content: rawJson };
        return Object.assign(base, {
            objectid: statusResult.objectid,
            knowledgeid: chapter.knowledgeid,
            chapter_title: chapter.title,
            attachment_name: attachment.name || '',
            status_url: statusResult.status_url,
            status_code: statusResult.status_code,
        });
    }

    function scanResultRows() {
        return state.results.map((item, index) => ({
            index: index + 1,
            knowledgeid: item.knowledgeid,
            chapterTitle: item.chapter_title,
            objectid: item.objectid,
            filename: item.filename,
            status: item.status,
            statusCode: item.status_code,
        }));
    }

    function logOutputJson() {
        console.log(`${LOG_PREFIX} [RESULT_JSON]`, JSON.stringify(outputResults(), null, 2));
    }

    function appendStatusResult(chapter, attachment, statusResult) {
        const item = Object.assign({}, statusResult, {
            knowledgeid: chapter.knowledgeid,
            chapter_title: chapter.title,
            attachment_name: attachment.name,
            filename: statusResult.filename || attachment.name || `${attachment.objectid}`,
            isPdf: Boolean(statusResult.pdf),
            output_json: buildOutputJson(chapter, attachment, statusResult),
        });
        state.statusResults.push(statusResult.raw_json);
        state.resourceResults.push(item);
        requestRender();
    }

    async function collectChapterPdfResults(chapter, attachments, seenObjectIds, eventName, scanToken) {
        for (const attachment of attachments) {
            if (scanToken && !isActiveScan(scanToken)) {
                return false;
            }

            if (!attachment || !attachment.objectid || seenObjectIds.has(attachment.objectid)) {
                continue;
            }

            seenObjectIds.add(attachment.objectid);

            try {
                // Status resolves the real pdf/download/http addresses for an objectid.
                const statusResult = await fetchStatus(attachment.objectid);
                if (scanToken && !isActiveScan(scanToken)) {
                    return false;
                }
                appendStatusResult(chapter, attachment, statusResult);
                if (!statusResult.pdf) {
                    logWarn('SCAN status has no pdf field', {
                        knowledgeid: chapter.knowledgeid,
                        chapterTitle: chapter.title,
                        objectid: statusResult.objectid,
                        status: statusResult.status,
                        statusJson: statusResult.raw_json,
                    });
                    continue;
                }

                appendPdfResult(chapter, attachment, statusResult, eventName);
            } catch (error) {
                logError('SCAN status failed', error, {
                    knowledgeid: chapter.knowledgeid,
                    chapterTitle: chapter.title,
                    objectid: attachment.objectid,
                });
                addLog(`跳过异常附件：${attachment.name || attachment.objectid}`);
            }
        }
        return true;
    }

    async function scanCourse() {
        if (isMooc1StudentStudyPage(currentPageUrl())) {
            return scanCurrentChapter();
        }

        if (state.scanning) {
            return;
        }

        const scanKey = currentScanKey();
        if (!scanKey) {
            return;
        }

        const scanToken = resetScanState(scanKey);
        let timerStarted = false;
        let timerEnded = false;

        try {
            const { courseid, clazzid } = currentCourseParams();
            state.courseid = courseid;
            state.clazzid = clazzid;
            addLog('开始读取课程目录');
            logInfo('SCAN start', { courseid, clazzid, href: window.location.href });

            const chapters = await fetchChapters(courseid, clazzid);
            if (!isActiveScan(scanToken)) {
                return;
            }
            state.chapters = chapters;
            state.selectedChapterIds = new Set(chapters.map((chapter) => chapter.knowledgeid));
            addLog(`识别到 ${chapters.length} 个章节`);

            const seenObjectIds = new Set();
            console.time('[Chaoxing PDF Dumper] elapsed');
            timerStarted = true;

            for (const chapter of chapters) {
                if (!isActiveScan(scanToken)) {
                    return;
                }

                addLog(`扫描章节：${chapter.title}`);
                try {
                    const attachments = await fetchAttachments(courseid, clazzid, chapter);
                    if (!isActiveScan(scanToken)) {
                        return;
                    }
                    const completed = await collectChapterPdfResults(chapter, attachments, seenObjectIds, 'SCAN pdf status', scanToken);
                    if (!completed) {
                        return;
                    }
                } catch (error) {
                    logError('SCAN chapter failed', error, {
                        knowledgeid: chapter.knowledgeid,
                        chapterTitle: chapter.title,
                    });
                    addLog(`跳过异常章节：${chapter.title}`);
                }
            }

            console.timeEnd('[Chaoxing PDF Dumper] elapsed');
            timerEnded = true;
            logGroup('SCAN complete', {
                courseid,
                clazzid,
                chapterCount: chapters.length,
                pdfCount: state.results.length,
            }, scanResultRows());
            logOutputJson();
            addLog(`扫描完成，找到 ${state.results.length} 个 PDF`);
        } catch (error) {
            logError('SCAN failed', error, { courseid: state.courseid, clazzid: state.clazzid });
            addLog(`失败：${describeError(error)}`);
        } finally {
            if (timerStarted && !timerEnded) {
                try {
                    console.timeEnd('[Chaoxing PDF Dumper] elapsed');
                } catch (error) {
                    // Ignore missing timer differences between browsers.
                }
            }
            finishScan(scanToken);
        }
    }

    async function scanCurrentChapter() {
        if (state.scanning) {
            return;
        }

        const scanKey = currentScanKey();
        if (!scanKey) {
            return;
        }

        const scanToken = resetScanState(scanKey);

        try {
            const { chapterId, courseid, clazzid } = currentChapterParams();
            state.courseid = courseid;
            state.clazzid = clazzid;
            addLog('开始读取当前章节课件');
            logInfo('SCAN current chapter start', { courseid, clazzid, chapterId, href: window.location.href });

            const chapter = {
                knowledgeid: chapterId,
                title: currentPageChapterTitle(chapterId),
            };
            const { attachments, title } = await fetchCurrentChapterAttachments(courseid, clazzid, chapter);
            if (!isActiveScan(scanToken)) {
                return;
            }
            chapter.title = title;
            state.chapters = [chapter];
            state.selectedChapterIds = new Set([chapter.knowledgeid]);

            const seenObjectIds = new Set();
            const completed = await collectChapterPdfResults(chapter, attachments, seenObjectIds, 'SCAN current chapter pdf status', scanToken);
            if (!completed) {
                return;
            }

            logGroup('SCAN current chapter complete', {
                courseid,
                clazzid,
                chapterId,
                chapterTitle: chapter.title,
                pdfCount: state.results.length,
            }, scanResultRows());
            logOutputJson();
            addLog(`当前章节扫描完成，找到 ${state.results.length} 个 PDF`);
        } catch (error) {
            logError('SCAN current chapter failed', error, { courseid: state.courseid, clazzid: state.clazzid });
            addLog(`失败：${describeError(error)}`);
        } finally {
            finishScan(scanToken);
        }
    }

    function revokeObjectUrlLater(objectUrl) {
        // Blob URLs hold memory until revoked; delay slightly so the browser can start the download.
        window.setTimeout(() => {
            try {
                URL.revokeObjectURL(objectUrl);
            } catch (error) {
                logWarn('DOWNLOAD revoke object URL failed', error);
            }
        }, 30000);
    }

    function responseHeaderValue(headers, name) {
        const expected = name.toLowerCase();
        const lines = String(headers || '').split(/\r?\n/);
        for (const line of lines) {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex <= 0) {
                continue;
            }

            const key = line.slice(0, separatorIndex).trim().toLowerCase();
            if (key === expected) {
                return line.slice(separatorIndex + 1).trim();
            }
        }
        return '';
    }

    function downloadWithBlob(url, name) {
        return new Promise((resolve, reject) => {
            let settled = false;
            let task = null;

            const clearActiveTask = () => {
                if (state.activeDownloadTask === task) {
                    state.activeDownloadTask = null;
                    state.activeDownloadReject = null;
                }
            };
            const resolveOnce = () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearActiveTask();
                resolve();
            };
            const rejectOnce = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearActiveTask();
                reject(error);
            };

            try {
                task = GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    headers: {
                        Referer: PDF_REFERER,
                    },
                    responseType: 'blob',
                    withCredentials: true,
                    anonymous: false,
                    timeout: 120000,
                    onload(response) {
                        if (response.status < 200 || response.status >= 300) {
                            rejectOnce(createRequestError(`HTTP ${response.status}: ${url}`, {
                                type: 'http',
                                status: response.status,
                                statusText: response.statusText || '',
                                url,
                                name,
                                responseHeaders: response.responseHeaders || '',
                            }));
                            return;
                        }

                        let objectUrl = '';
                        try {
                            // Blob download lets the script keep the server-returned filename instead of relying on URL hints.
                            const blob = response.response instanceof Blob
                                ? response.response
                                : new Blob([response.response], { type: 'application/pdf' });
                            const contentLength = Number(responseHeaderValue(response.responseHeaders, 'content-length')) || 0;
                            if (!blob.size) {
                                rejectOnce(createRequestError(`下载内容为空: ${name}`, {
                                    type: 'empty-blob',
                                    status: response.status,
                                    url,
                                    name,
                                    contentLength,
                                    responseHeaders: response.responseHeaders || '',
                                }));
                                return;
                            }
                            objectUrl = URL.createObjectURL(blob);
                            const anchor = document.createElement('a');
                            anchor.href = objectUrl;
                            anchor.download = name;
                            anchor.style.display = 'none';
                            document.body.appendChild(anchor);
                            anchor.click();
                            anchor.remove();
                            revokeObjectUrlLater(objectUrl);
                            resolveOnce();
                        } catch (error) {
                            if (objectUrl) {
                                try {
                                    URL.revokeObjectURL(objectUrl);
                                } catch (revokeError) {
                                    logWarn('DOWNLOAD revoke object URL failed', revokeError);
                                }
                            }
                            rejectOnce(error);
                        }
                    },
                    onerror(error) {
                        rejectOnce(createRequestError(`下载失败: ${name}`, {
                            type: 'network',
                            url,
                            name,
                            originalError: error,
                        }));
                    },
                    ontimeout() {
                        rejectOnce(createRequestError(`下载超时: ${name}`, {
                            type: 'timeout',
                            url,
                            name,
                        }));
                    },
                    onabort() {
                        rejectOnce(createRequestError(`下载已取消: ${name}`, {
                            type: 'abort',
                            url,
                            name,
                        }));
                    },
                });
            } catch (error) {
                rejectOnce(createRequestError(`下载请求创建失败: ${name}`, {
                    type: 'request-init',
                    url,
                    name,
                    originalError: error,
                }));
            }

            state.activeDownloadTask = task || null;
            state.activeDownloadReject = () => rejectOnce(createRequestError(`下载已取消: ${name}`, {
                type: 'abort',
                url,
                name,
            }));
        });
    }

    function cancelDownload() {
        state.cancelDownloadRequested = true;
        addLog('正在取消批量下载...');
        logWarn('DOWNLOAD cancel requested', {
            activeTaskAbortable: Boolean(state.activeDownloadTask && typeof state.activeDownloadTask.abort === 'function'),
        });

        if (state.activeDownloadTask && typeof state.activeDownloadTask.abort === 'function') {
            try {
                // Tampermonkey returns an abortable task; reject locally in case abort has no callback.
                state.activeDownloadTask.abort();
            } catch (error) {
                logWarn('DOWNLOAD active abort failed', error);
            }
        }
        if (typeof state.activeDownloadReject === 'function') {
            state.activeDownloadReject();
        }
        state.activeDownloadTask = null;
        state.activeDownloadReject = null;
        render();
    }

    function downloadCandidates(item) {
        return unique([item.download, item.pdf, item.http].filter(Boolean));
    }

    function downloadWithDirectLink(url, name) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    function bestDownloadUrl(item) {
        return downloadCandidates(item)[0];
    }

    function ensurePdfExtension(name) {
        return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
    }

    function buildDownloadName(item) {
        const filename = sanitizeFilename(
            item.filename || item.attachment_name || item.chapter_title || item.knowledgeid || 'download'
        );
        return ensurePdfExtension(filename);
    }

    async function downloadItem(item) {
        const candidates = downloadCandidates(item);
        if (!candidates.length) {
            addLog(`缺少下载地址：${item.filename || item.objectid}`);
            return;
        }

        const name = buildDownloadName(item);
        addLog(`开始下载：${name}`);
        logInfo('DOWNLOAD single start', {
            objectid: item.objectid,
            filename: item.filename,
            candidateCount: candidates.length,
        });
        try {
            await downloadWithFallback(candidates, name);
            logInfo('DOWNLOAD single submitted', { name });
            addLog(`已提交下载：${name}`);
        } catch (error) {
            logError('DOWNLOAD single failed', error, {
                objectid: item.objectid,
                filename: item.filename,
                name,
            });
            addLog(`下载失败：${describeError(error)}`);
        }
    }

    async function downloadWithFallback(candidates, name) {
        let lastError = null;

        for (const url of candidates) {
            if (state.cancelDownloadRequested) {
                throw createRequestError(`下载已取消: ${name}`, { type: 'abort', name });
            }

            try {
                logInfo('DOWNLOAD candidate start', { name, url });
                await downloadWithBlob(url, name);
                logInfo('DOWNLOAD candidate submitted', { name, url });
                return;
            } catch (error) {
                if (state.cancelDownloadRequested || error.type === 'abort') {
                    throw error;
                }
                lastError = error;
                logWarn('DOWNLOAD candidate failed', { name, url, error });
            }
        }

        if (candidates.length && lastError && lastError.type === 'empty-blob') {
            const directUrl = candidates[candidates.length - 1];
            logWarn('DOWNLOAD blob empty, using direct link fallback', {
                name,
                url: directUrl,
                error: lastError,
            });
            downloadWithDirectLink(directUrl, name);
            return;
        }

        throw lastError || new Error(`下载失败: ${name}`);
    }

    async function downloadAll() {
        const items = selectedResults();

        if (!items.length || state.downloading) {
            return;
        }

        state.downloading = true;
        state.cancelDownloadRequested = false;
        render();

        try {
            logGroup('DOWNLOAD batch start', {
                total: items.length,
                selectedChapters: state.selectedChapterIds.size,
            }, items.map((item, index) => ({
                index: index + 1,
                knowledgeid: item.knowledgeid,
                chapterTitle: item.chapter_title,
                objectid: item.objectid,
                filename: item.filename,
                candidateCount: downloadCandidates(item).length,
            })));

            let submittedCount = 0;
            for (let index = 0; index < items.length; index += 1) {
                if (state.cancelDownloadRequested) {
                    logWarn('DOWNLOAD batch cancelled before item', {
                        nextIndex: index + 1,
                        submittedCount,
                        total: items.length,
                    });
                    addLog(`批量下载已取消，已提交 ${submittedCount}/${items.length} 个任务`);
                    return;
                }

                const item = items[index];
                const candidates = downloadCandidates(item);
                if (!candidates.length) {
                    addLog(`跳过缺少地址的文件：${item.filename || item.objectid}`);
                    continue;
                }

                const name = buildDownloadName(item);
                addLog(`下载 ${index + 1}/${items.length}：${name}`);
                await downloadWithFallback(candidates, name);
                submittedCount += 1;
                await new Promise((resolve) => setTimeout(resolve, 300));
            }

            logInfo('DOWNLOAD batch complete', {
                submittedCount,
                total: items.length,
            });
            addLog(`批量下载已提交 ${submittedCount} 个任务`);
        } catch (error) {
            if (state.cancelDownloadRequested) {
                logWarn('DOWNLOAD batch cancelled during active item', error);
                addLog('批量下载已取消');
            } else {
                logError('DOWNLOAD batch failed', error, { selectedCount: items.length });
                addLog(`下载失败：${describeError(error)}`);
            }
        } finally {
            state.downloading = false;
            state.cancelDownloadRequested = false;
            state.activeDownloadTask = null;
            state.activeDownloadReject = null;
            render();
        }
    }

    async function copyJsonPayload(data, successMessage) {
        let text = '';
        try {
            text = JSON.stringify(data, null, 2);
        } catch (error) {
            logWarn('COPY stringify failed', error);
            text = String(data);
        }
        if (text === undefined) {
            text = String(data);
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                throw new Error('clipboard api unavailable');
            }
            addLog(successMessage || '接口 JSON 已复制到剪贴板');
        } catch (error) {
            let textarea = null;
            try {
                textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                if (!document.execCommand('copy')) {
                    throw new Error('execCommand copy returned false');
                }
                addLog(successMessage || '接口 JSON 已复制到剪贴板');
            } catch (fallbackError) {
                console.log('[Chaoxing PDF Dumper] copy fallback:', text);
                logWarn('COPY failed', { error, fallbackError });
                addLog('复制失败，JSON 已输出到控制台');
            } finally {
                if (textarea && textarea.parentNode) {
                    textarea.remove();
                }
            }
        }
    }

    async function copyResults() {
        return copyJsonPayload(copyableResults(), '接口 JSON 已复制到剪贴板');
    }

    function syncLocationState() {
        if (state.lastHref === window.location.href) {
            return;
        }

        state.lastHref = window.location.href;
        const pageUrl = currentPageUrl();
        const scanKey = currentScanKey(pageUrl);
        const scanChanged = scanKey && scanKey !== state.lastScanKey;
        const shouldAutoScan = scanChanged && shouldAutoScanCurrentChapter(scanKey);
        if (scanChanged && state.scanning) {
            interruptActiveScan(scanKey);
            clearScanDataForLocation(scanKey);
        } else if (scanChanged) {
            clearScanDataForLocation(scanKey);
        }

        if (!shouldShowEntryButton(pageUrl)) {
            state.open = false;
            const existingPanel = document.getElementById(UI_ID);
            if (existingPanel) {
                existingPanel.remove();
            }
        } else {
            render();
        }

        if (shouldAutoScan && !state.scanning) {
            scanCourse();
        }
    }

    function watchLocationChanges() {
        if (state.locationWatcherStarted) {
            return;
        }
        state.locationWatcherStarted = true;

        const notify = () => {
            // SPA navigation can fire several history events; debounce to one scan decision.
            if (state.locationSyncTimer) {
                window.clearTimeout(state.locationSyncTimer);
            }
            state.locationSyncTimer = window.setTimeout(() => {
                state.locationSyncTimer = null;
                syncLocationState();
            }, 60);
        };

        ['pushState', 'replaceState'].forEach((method) => {
            const original = history[method];
            if (original && original.__cxpdfDumperPatched) {
                return;
            }
            history[method] = function (...args) {
                const result = original.apply(this, args);
                notify();
                return result;
            };
            history[method].__cxpdfDumperPatched = true;
            history[method].__cxpdfDumperOriginal = original;
        });

        window.addEventListener('popstate', notify);
        window.setInterval(syncLocationState, 500);
    }

    function start() {
        window.ChaoxingPdfDumper = {
            name: SCRIPT_NAME,
            version: SCRIPT_VERSION,
            iconUrl: SCRIPT_ICON_URL,
            versionPolicy: Object.assign({}, VERSION_POLICY),
            scan: scanCourse,
            scanCurrentChapter,
            open() {
                state.open = true;
                render();
                if (canScanCurrentPage() && currentScanKey() !== state.scannedScanKey) {
                    return scanCourse();
                }
                return Promise.resolve();
            },
            close() {
                state.open = false;
                render();
            },
            getResults() {
                return state.results.slice();
            },
            getStatusResults() {
                return state.statusResults.slice();
            },
            getOutputResults() {
                return outputResults();
            },
            getVersion() {
                return SCRIPT_VERSION;
            },
        };

        state.lastHref = '';
        watchLocationChanges();
        syncLocationState();
    }

    if (document.body) {
        start();
    } else {
        window.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();
