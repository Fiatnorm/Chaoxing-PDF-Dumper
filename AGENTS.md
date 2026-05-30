# AGENTS.md

## 项目定位

这是一个单文件 userscript 项目，核心文件是 `chaoxing-courseware-dumper.user.js`。脚本用于在超星学习通 / Chaoxing 课程页面中扫描课件资源，识别 PDF，并通过浏览器 userscript 环境下载课件。

脚本必须保持可直接安装到 Tampermonkey、Violentmonkey 等 userscript 管理器中运行。

## 维护原则

- 不改变现有功能。
- 不做负优化。
- 不引入外部依赖。
- 不引入构建流程。
- 不改成 TypeScript。
- 不破坏 userscript 直接安装能力。
- 不把串行批量下载改成并发下载。
- 不削弱容错逻辑。
- 不删除或削弱 metadata 中已有的关键 `@match`、`@connect`、`@grant`、`@run-at` 能力。

## 核心功能不可破坏清单

- 课程页识别。
- 当前章节页识别。
- 章节扫描。
- 附件 objectid 解析。
- `ananas/status` 接口请求。
- PDF 判断。
- 非 PDF 资源状态展示。
- 单文件下载。
- 批量下载。
- 取消下载。
- JSON 复制。
- UI 面板。
- SPA URL 监听。
- 控制台结构化日志。
- `window.ChaoxingPdfDumper` 调试接口。

## 代码结构说明

- 常量与 `state`：保存接口地址、UI 标识、运行状态、选择状态、扫描 token 和下载任务状态。
- URL 判断与参数解析：识别课程页、当前章节页，以及 `courseid`、`clazzid`、`chapterId`。
- 请求函数：通过 `GM_xmlhttpRequest` 请求课程目录、章节卡片、状态接口和下载资源。
- HTML / JSON 解析：解析 `studentcourse` 章节、`knowledge/cards` 附件 objectid 和 `ananas/status` 返回内容。
- 扫描流程：课程全量扫描和当前章节扫描，单个章节或附件失败时尽量继续后续流程。
- UI 渲染：创建悬浮入口、下载面板、章节选择、文件选择、日志和 toast。
- 下载流程：保持 Blob 下载优先，保留 `download` / `pdf` / `http` 候选地址 fallback，批量下载保持串行和间隔。
- 复制 JSON：复制单条或全部接口 JSON，保留 clipboard fallback。
- URL 监听：监听 SPA 的 `pushState`、`replaceState`、`popstate` 和定时同步。
- 启动入口：挂载 `window.ChaoxingPdfDumper` 并初始化页面状态。

## 修改规范

- 修改前先理解现有扫描、下载、复制和 UI 流程。
- 保留原有 UI 文案含义。
- 保留控制台日志，尤其是 `console.groupCollapsed`、`console.table` 和 `[RESULT_JSON]` 输出。
- 保留 objectid、下载地址、空 Blob、剪贴板和 URL 监听相关 fallback。
- 保留错误可观测性，不要静默吞掉异常。
- 新增逻辑必须有必要性。
- 优化必须能解释收益。
- 不允许只为减少行数而重构。
- 不要加入 class 大改架构，除非确有必要且能证明不会改变功能。

## 版本管理规范

项目使用语义化版本号：`MAJOR.MINOR.PATCH`。

- `MAJOR`：破坏性变化，例如改变默认行为、权限、支持页面范围、JSON 结构或下载策略。
- `MINOR`：向后兼容的新功能，例如新增导出、UI 功能、资源展示、设置项或工作流增强。
- `PATCH`：bug 修复、兼容性修复、诊断增强、小范围维护或文案修正。

每次发布或调整版本时，必须同步更新：

- userscript metadata 中的 `@version`。
- `chaoxing-courseware-dumper.user.js` 中的 `SCRIPT_VERSION`。
- `package.json` 中的 `version`。
- 如版本规则本身变化，同步更新脚本中的 `VERSION_POLICY` 和本节说明。

版本变更后至少运行 `npm test`，确认 userscript 语法检查通过。

## 测试要求

每次修改后至少进行以下手动测试：

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

可用 `npm test` 做基础语法检查，但它不能替代浏览器和真实超星页面中的手动验证。

## 安全与合规说明

- 不要加入绕过账号权限、破解、自动刷课等逻辑。
- 不要加入高频请求或攻击性行为。
- 不要加入数据外传。
- 不要收集用户隐私。
- 不要添加远程脚本加载。
- 不要将脚本改造成需要第三方服务或后端代理的结构。
