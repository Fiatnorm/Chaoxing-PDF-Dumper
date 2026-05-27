// ==UserScript==
// @name         Chaoxing Download Test
// @namespace    https://chaoxing.com/
// @version      0.1.0
// @description  Test request for Chaoxing ananas status endpoint.
// @match        https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/*
// @grant        GM_xmlhttpRequest
// @connect      mooc1.chaoxing.com
// ==/UserScript==

(function () {
    'use strict';

    const STATUS_URL = 'https://mooc1.chaoxing.com/ananas/status/7164a2d7964e1e45db0a07b3c8df25b5';

    function buildUrl() {
        const url = new URL(STATUS_URL);
        url.searchParams.set('flag', 'normal');
        url.searchParams.set('_dc', String(Date.now()));
        return url.toString();
    }

    function setButtonState(button, text, disabled) {
        button.textContent = text;
        button.disabled = disabled;
        button.style.opacity = disabled ? '0.7' : '1';
        button.style.cursor = disabled ? 'wait' : 'pointer';
    }

    function createButton() {
        const button = document.createElement('button');
        button.textContent = '下载测试';
        button.type = 'button';
        Object.assign(button.style, {
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            zIndex: '999999',
            padding: '10px 16px',
            border: '0',
            borderRadius: '6px',
            background: '#1677ff',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
            cursor: 'pointer',
        });

        button.addEventListener('click', () => {
            const requestUrl = buildUrl();
            setButtonState(button, '请求中...', true);

            GM_xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                headers: {
                    Referer: 'https://mooc1.chaoxing.com/ananas/modules/pdf/index.html?v=2026-0312-1153',
                },
                withCredentials: true,
                anonymous: false,
                onload(response) {
                    setButtonState(button, '下载测试', false);

                    console.group('[Chaoxing Download Test]');
                    console.log('URL:', requestUrl);
                    console.log('Request headers:', {
                        Referer: 'https://mooc1.chaoxing.com/ananas/modules/pdf/index.html?v=2026-0312-1153',
                    });
                    console.log('withCredentials:', true);
                    console.log('anonymous:', false);
                    console.log('Status:', response.status);
                    console.log('Response headers:', response.responseHeaders);
                    console.log('Response text:', response.responseText);

                    try {
                        const result = JSON.parse(response.responseText);
                        console.log('JSON:', result);
                    } catch (error) {
                        console.log('JSON parse error:', error);
                    }

                    console.groupEnd();
                    alert(`请求完成：HTTP ${response.status}，响应内容已输出到控制台。`);
                },
                onerror() {
                    setButtonState(button, '下载测试', false);
                    alert('请求失败，请打开控制台查看油猴或浏览器网络错误。');
                },
                ontimeout() {
                    setButtonState(button, '下载测试', false);
                    alert('请求超时。');
                },
            });
        });

        document.body.appendChild(button);
    }

    if (document.body) {
        createButton();
    } else {
        window.addEventListener('DOMContentLoaded', createButton, { once: true });
    }
})();
