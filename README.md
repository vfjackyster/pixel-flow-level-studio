# Pixel Flow 关卡工坊与研究工程

本仓库保存网页关卡编辑器、图片生成关卡、实时难度评估、核心玩法试玩、Pixel Flow! 0.37.1 原版前10关及静态分析；同时保留早期 Bus Jam 风格合成关卡研究。

## 从这里开始

- 直接运行：用 Edge 或 Chrome 打开 `pixel-editor/像素关卡编辑器.html`，无需安装或联网。
- 体验原版关卡：点击“试玩”→选择原版第1至10关→“载入原版关卡”。也可在试玩中导入 `pixel-editor/原版前10关/01.json` 至 `10.json`。
- 接续开发与完整工作上下文：[docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)。
- 操作说明：[pixel-editor/使用说明.md](pixel-editor/使用说明.md)。
- 难度方法：[pixel-editor/难度评估说明.md](pixel-editor/难度评估说明.md)。
- 试玩规则和证据边界：[pixel-editor/试玩还原说明.md](pixel-editor/试玩还原说明.md)。
- 原游戏拆解：[PixelFlow-analysis/拆解报告.md](PixelFlow-analysis/拆解报告.md)，PDF 位于 `PixelFlow-analysis/output/pdf/`。

## 本地验证

需要 Node.js；在仓库根目录执行：

```powershell
node pixel-editor/test-core.cjs
node pixel-editor/test-difficulty.cjs
node pixel-editor/test-image.cjs
node pixel-editor/test-play.cjs
node pixel-editor/test-first10.cjs
node pixel-editor/replay-validation.cjs
```

前五组共61项测试；最后一项重放已有浏览器操作记录。它们验证本地规则和数据链，不证明规则与原游戏逐帧一致。
修改编辑器源文件后，执行 `python pixel-editor/bundle.py` 重新生成离线单文件页面。

## 数据与移植边界

原版关卡与本地试玩模型必须分开：颜色配平不等于可通关，模型失败率不等于真人胜率，静态代码不等于线上配置已启用。
仓库保留提取数据、映射表、截图和报告，未附带原始 XAPK、原生库、解包临时目录或个人浏览器草稿。分析和历史生成脚本包含原机器的绝对路径，复现提取前需要按上下文文档重新指定输入。

## 早期 Bus Jam 合成研究

以下保留本工作区原有说明；其中本机服务与自动恢复描述是历史环境记录，不代表新机器或当前会话已经启动服务。

# 关卡设计研究与验证基线

先读 [研究报告.md](研究报告.md)。交互报告地址为 http://127.0.0.1:7681/ （仅本机）。
这是 Bus Jam 风格的全信息合成模型，不是商业游戏完整还原；尚无真实玩家数据。

## 复现

已验证运行环境：Windows，Node.js v24.22.1，无第三方依赖。在本目录执行：

~~~powershell
node .\puzzle-lab.mjs
node .\generate.mjs
node .\verify.mjs
~~~

前两项重写 results 下对应文件；第三项重放所有代理轨迹、检查生成解法及报告数字并更新 manifest.json。
改变规则或配置前请另存实验版本。生成规格只支持本最小三列三色模型。

## 产物

- puzzle-lab.mjs：规则、BFS、DFS、A*、独立小域核验、五种人工代理。
- generate.mjs / generator-spec.json：约束筛选生成与证书。
- results/summary.json：全部数值口径与反例。
- results/levels.json：72个配置，规范化后69个家族。
- results/agent-traces.jsonl：14,400次合成运行。
- results/generated.json：8个关卡、证书和拒绝统计。
- research-report：交互报告源文件与构建；全文同研究报告.md。

报告预览由本地服务提供，重新登录 Windows 后自动恢复。未发布到公网。
可用报告目录导航；九步示例可前进、后退、重置；表格支持排序和分页。

真人验证、商业规则逐事件核验、隐藏/计时变体和预测模型拟合尚未开展，完整协议见报告。

