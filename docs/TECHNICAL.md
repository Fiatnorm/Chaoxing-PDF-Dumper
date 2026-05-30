# 技术说明

本文档记录 Chaoxing PDF Dumper 的技术细节。普通使用方法请看 [README.md](https://github.com/Fiatnorm/Chaoxing-PDF-Dumper/blob/main/README.md)。

## 项目结构

- `chaoxing-courseware-dumper.user.js`：核心 userscript，可直接安装到 Tampermonkey、ScriptCat 等 userscript 管理器。
- `README.md`：面向使用者的介绍和使用方法。
- `docs/TECHNICAL.md`：技术说明、维护说明和测试清单。
- `package.json`：仅提供基础语法检查脚本。

本项目不引入外部依赖，不需要构建流程，也不需要 TypeScript 编译。

## 脚本流程

1. 识别当前页面是否为课程页或当前章节页。
2. 从 URL 中解析 `courseid`、`clazzid`、`chapterId` 等参数。
3. 请求课程目录或当前章节卡片页面。
4. 解析章节与附件 `objectid`。
5. 请求 `ananas/status` 接口获取资源信息。
6. 判断资源是否为 PDF。
7. 在 UI 面板中展示章节、文件、非 PDF 资源和日志。
8. 下载时优先使用 Blob 下载，并保留 `download`、`pdf`、`http` 等候选地址 fallback。
9. 批量下载保持串行执行，并支持取消。

## 权限说明

- `GM_xmlhttpRequest`：用于在 userscript 环境中请求课程目录、章节卡片、状态接口和下载资源。
- `@connect mooc*.chaoxing.com`：用于请求课程目录和章节页面。
- `@connect *.ananas.chaoxing.com`：用于请求 `ananas/status` 状态接口和部分资源地址。
- `@connect *.cldisk.com`：用于请求实际课件下载资源。

这些权限只用于在已登录的浏览器上下文中读取课程资源信息和提交下载请求，不用于收集或外传用户数据。

## 调试接口

脚本会挂载调试对象：

```js
window.ChaoxingPdfDumper.scan()
window.ChaoxingPdfDumper.scanCurrentChapter()
window.ChaoxingPdfDumper.open()
window.ChaoxingPdfDumper.close()
window.ChaoxingPdfDumper.getResults()
window.ChaoxingPdfDumper.getStatusResults()
window.ChaoxingPdfDumper.getOutputResults()
```

控制台会保留结构化日志，包括 `console.groupCollapsed`、`console.table` 和 `[RESULT_JSON]` 输出。

## 版本规则

项目使用语义化版本号：`MAJOR.MINOR.PATCH`。

- `MAJOR`：破坏性变化，例如改变默认行为、权限、支持页面范围、JSON 结构或下载策略。
- `MINOR`：向后兼容的新功能，例如新增导出、UI 功能、资源展示、设置项或工作流增强。
- `PATCH`：bug 修复、兼容性修复、诊断增强、小范围维护或文案修正。

调整版本时需要同步更新：

- userscript metadata 中的 `@version`。
- `chaoxing-courseware-dumper.user.js` 中的 `SCRIPT_VERSION`。
- `package.json` 中的 `version`。
- 如果版本规则本身变化，同步更新脚本中的 `VERSION_POLICY` 和本文档。

版本变更后至少运行：

```sh
npm test
```

## 发布更新日志

通过 GitHub webhook 同步到 Greasy Fork 或 ScriptCat 时，代码可以自动更新，但发布页的“更新日志”不一定会自动带上完整说明。

建议每次发布遵循以下流程：

1. 先更新 `docs/CHANGELOG.md`，记录用户能看懂的变化。
2. 如果脚本行为发生变化，同步提升 userscript metadata 中的 `@version`、`SCRIPT_VERSION` 和 `package.json`。
3. 提交信息写短一些，可以作为发布页更新日志的备选摘要。
4. 在 Greasy Fork / ScriptCat 发布页中，将 `docs/CHANGELOG.md` 对应版本的 1 到 4 条要点复制到“更新日志”。
5. 文档、截图、注释等不影响脚本运行的改动，通常不需要提升 userscript 版本。

## 维护原则

- 保持 userscript 可直接安装运行。
- 不引入外部依赖。
- 不新增构建流程。
- 不把串行批量下载改成并发下载。
- 不削弱错误处理和 fallback。
- 不删除或削弱 metadata 中已有的关键 `@match`、`@connect`、`@grant`、`@run-at` 能力。
- 不为了减少行数而重构。
- 新增逻辑必须有明确收益。

## 手动测试清单

`npm test` 只能做基础语法检查，不能替代真实浏览器和超星页面中的手动验证。

- [ ] 安装或更新 userscript。
- [ ] 打开课程页，确认能显示“课件下载”按钮。
- [ ] 打开当前章节页，确认能显示“课件下载”按钮。
- [ ] 扫描课程页章节。
- [ ] 扫描当前章节。
- [ ] 勾选章节和文件。
- [ ] 单文件下载。
- [ ] 批量下载。
- [ ] 取消批量下载。
- [ ] 复制单条 JSON。
- [ ] 复制全部 JSON。
- [ ] SPA URL 切换后面板不会重复创建，旧结果不会污染新页面。
- [ ] 控制台日志正常输出。
