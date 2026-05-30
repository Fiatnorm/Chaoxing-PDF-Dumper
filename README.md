# Chaoxing PDF Dumper

[Chaoxing PDF Dumper](https://github.com/Fiatnorm/Chaoxing-PDF-Dumper) 是一个用于超星学习通 / Chaoxing 课程页面的 userscript。

它会在课程页或章节页右下角显示“课件下载”按钮，打开后可以扫描课件资源、识别 PDF、勾选需要的文件并下载。脚本直接运行在 Tampermonkey、ScriptCat 等 userscript 管理器中，不需要构建，也不需要后端服务。

## 界面预览

课程页批量扫描：

![课程页下载面板](https://raw.githubusercontent.com/Fiatnorm/Chaoxing-PDF-Dumper/main/docs/images/panel-course.png)

当前章节扫描：

![当前章节下载面板](https://raw.githubusercontent.com/Fiatnorm/Chaoxing-PDF-Dumper/main/docs/images/panel-chapter.png)

## 主要功能

- 自动识别超星课程页和当前章节页。
- 扫描课程章节中的课件资源。
- 自动识别 PDF，并显示非 PDF 资源状态。
- 支持按章节、按文件勾选。
- 支持单个 PDF 下载。
- 支持勾选文件批量下载。
- 支持取消批量下载。
- 支持复制单条或全部接口 JSON，方便排查问题。

## 安装方法

推荐从脚本发布页安装：

- [Greasy Fork](https://greasyfork.org/zh-CN/scripts/580378-chaoxing-pdf-dumper)
- [ScriptCat](https://scriptcat.org/zh-CN/script-show-page/6451)

也可以手动安装：

1. 安装 Tampermonkey 或 ScriptCat。
2. 在 userscript 管理器中新建脚本。
3. 复制 `chaoxing-courseware-dumper.user.js` 的完整内容并粘贴进去。
4. 保存脚本。
5. 打开匹配的超星课程页或章节页。

也可以在仓库页面打开 `chaoxing-courseware-dumper.user.js`，复制完整源码后安装到 userscript 管理器中。

## 使用方法

1. 登录超星学习通 / Chaoxing。
2. 进入课程页，或进入某个具体章节页。
3. 点击右下角的“课件下载”按钮。
4. 等待脚本扫描章节和资源。
5. 勾选需要下载的章节或文件。
6. 点击“下载勾选”进行批量下载，或点击单个文件右侧的“下载”。
7. 批量下载过程中如需停止，可点击取消下载。
8. 如需排查资源信息，可点击“复制 JSON”。

## 支持页面

脚本当前匹配以下页面：

- `https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/*`
- `https://mooc1.chaoxing.com/mycourse/*`

如果学校或平台页面结构不同，脚本可能无法识别全部资源。

## 注意事项

- 资源是否可下载取决于账号权限、课程设置和资源状态。
- 浏览器可能会对大量文件下载弹出确认提示。
- 请合理使用，不要高频请求。
- 本项目不包含绕过权限、破解、自动刷课或数据外传逻辑。
- 本项目仅用于学习、研究和个人资料备份，请遵守学校、平台和课程的相关规定。

## 技术说明

技术细节、权限说明、调试接口、版本规则和测试清单已移到 [docs/TECHNICAL.md](docs/TECHNICAL.md)。

## 更新日志

版本变化见 [CHANGELOG.md](CHANGELOG.md)。

## 开源协议

本项目基于 MIT License 开源，详见 [LICENSE](LICENSE)。
