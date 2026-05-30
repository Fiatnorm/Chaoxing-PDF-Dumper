# Chaoxing Courseware Dumper

Chaoxing Courseware Dumper 是一个用于超星学习通 / Chaoxing 页面中识别并下载课程 PDF 课件的 userscript。

脚本运行在 Tampermonkey、Violentmonkey 等浏览器 userscript 管理器中，主要用于从课程页面扫描课件资源，支持 PDF 识别、批量下载、当前章节扫描和复制接口 JSON。由于不同学校、不同超星部署和页面结构可能存在差异，本脚本不保证适用于所有学校或所有超星页面。

## 功能特性

- 课程页自动识别。
- 当前章节页自动识别。
- 右下角悬浮下载面板。
- 扫描课程章节。
- 扫描并识别 PDF 课件。
- 显示非 PDF 资源状态。
- 支持章节选择。
- 支持文件选择。
- 支持单文件下载。
- 支持批量下载。
- 支持取消批量下载。
- 支持复制单条或全部接口 JSON。
- 输出控制台调试日志和结构化表格。
- 监听 SPA 页面切换，避免重复创建面板。

## 安装方式

1. 安装 Tampermonkey 或 Violentmonkey。
2. 在 userscript 管理器中新建脚本。
3. 粘贴 `chaoxing-courseware-dumper.user.js` 的完整内容。
4. 保存脚本。
5. 打开匹配的超星课程页面。

## 使用方法

1. 登录超星学习通 / Chaoxing。
2. 进入课程页面或当前章节页面。
3. 点击右下角“课件下载”按钮。
4. 等待脚本扫描章节和资源。
5. 勾选需要下载的章节或文件。
6. 点击“下载勾选”开始批量下载，或点击单个文件的“下载”按钮。
7. 如需调试，可打开浏览器控制台查看结构化日志和 JSON 输出。

## 支持页面

当前脚本 metadata 匹配以下页面范围：

- `https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/*`
- `https://mooc1.chaoxing.com/mycourse/*`

## 权限说明

- `GM_xmlhttpRequest`：用于在 userscript 环境中请求课程页面、课件状态接口和下载资源。
- `@connect mooc*.chaoxing.com`：用于请求课程目录和章节卡片页面。
- `@connect *.ananas.chaoxing.com`：用于请求 `ananas/status` 状态接口和部分资源地址。
- `@connect *.cldisk.com`：用于请求实际课件下载资源。

这些权限用于在已登录浏览器上下文中读取课程资源信息和提交下载，不用于收集或外传用户数据。

## 调试接口

脚本会暴露以下调试接口：

```js
window.ChaoxingPdfDumper.scan()
window.ChaoxingPdfDumper.scanCurrentChapter()
window.ChaoxingPdfDumper.open()
window.ChaoxingPdfDumper.close()
window.ChaoxingPdfDumper.getResults()
window.ChaoxingPdfDumper.getStatusResults()
window.ChaoxingPdfDumper.getOutputResults()
```

## 注意事项

- 页面结构变化可能导致解析失败。
- 不同学校、不同超星部署可能表现不同。
- 下载大量文件时，浏览器可能弹出多文件下载确认。
- 资源是否可下载取决于账号权限与课程资源状态。
- 请合理使用，不要高频请求。

## 免责声明

- 本项目仅用于学习、研究和个人资料备份。
- 请遵守所在学校、平台和课程的相关规定。
- 不得用于绕过权限、传播受版权保护内容或其他违规用途。
- 使用者需自行承担使用风险。

## 开发说明

- 本项目为单文件 userscript。
- 不需要构建。
- 不需要 `npm install`。
- 修改后可直接复制到 userscript 管理器中测试。
- 如需做基础语法检查，可运行 `npm test`。

## 开源协议

本项目基于 MIT License 开源，详见 [LICENSE](LICENSE)。

## 手动测试清单

- [ ] 课程页能显示“课件下载”按钮。
- [ ] 当前章节页能显示“课件下载”按钮。
- [ ] 能扫描课程章节。
- [ ] 能扫描当前章节。
- [ ] 能识别 PDF。
- [ ] 能显示非 PDF 资源。
- [ ] 能单文件下载。
- [ ] 能批量下载。
- [ ] 能取消批量下载。
- [ ] 能复制 JSON。
- [ ] URL 切换后不会重复创建面板。
- [ ] 控制台日志正常。
