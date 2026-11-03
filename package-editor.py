from pathlib import Path
p=Path("pixel-editor/core.js");s=p.read_text(encoding="utf-8")
s=s.replace("for(const s of col.shooters){n++;","for(const s of col.shooters){n++;if(Object.entries(s).some(([k,v])=>!['id','ammo','material'].includes(k)&&hasData(v)))throw Error('射手包含暂不支持的附加字段。');")
p.write_text(s,encoding="utf-8")
root=Path("pixel-editor")
html=(root/"index.html").read_text(encoding="utf-8")
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/"style.css").read_text(encoding="utf-8")+'</style>')
for name in ["data.js","core.js","app.js"]:
    html=html.replace('<script src="'+name+'"></script>','<script>'+(root/name).read_text(encoding="utf-8-sig").replace('</script','<\\/script')+'</script>')
(root/"像素关卡编辑器.html").write_text(html,encoding="utf-8")
(root/"使用说明.md").write_text("""# 像素关卡工坊

双击同目录下的 像素关卡编辑器.html，使用 Edge 或 Chrome 打开即可。无需安装、无需联网。
也可以打开 index.html，但应保留同目录的 data.js、core.js、app.js、style.css。

## 制作流程
1. 新建，输入宽高后点“应用”。左下角是坐标原点；缩小画布会提示裁剪。
2. 选择颜色，用画笔、矩形或填充绘图。橡皮移除像素；取色器拾取已有颜色。
3. 用框选工具划出区域，拖动选区移动；Delete删除，Esc取消。左右翻转只影响图案。
4. “按图案生成配平队列”按颜色拆分弹量并分散至各列，不保证可通关。
5. 拖动射手可跨列排序。点击射手，在属性区编辑颜色、弹药、所在列，再点“应用射手属性”。也有前移、后移、复制和删除按钮。
6. 设置等待槽、传送带容量、物理尺寸、难度标签，并点击“应用关卡设置”。
7. 检查供需差额，导出JSON保存作品。也可导出透明背景PNG。

## 保存与导入
草稿自动保存在当前浏览器。文件路径、浏览器或网页地址变化后，草稿可能不是同一份；请使用JSON备份。
导入支持本编辑器导出的JSON、已解码的普通像素原版关卡，以及浏览器支持时的gzip:压缩文本。
可选择文件或粘贴内容。浏览器若限制文件读取，使用粘贴内容导入。
新建、载入示例、清空、重生成队列均有确认；这些内容变更支持撤销。
快捷键：Ctrl+Z撤销，Ctrl+Shift+Z或Ctrl+Y重做，Ctrl+S导出。

## 第一版边界
只支持1×1普通像素与基础射手；有非空机关的原版关卡会拒绝导入，不会静默删除机关。
包含原版提取的34色材质色表，以及基础第1关的双色示例。
宽高4–160、2–5列、容量1–20，单体弹药1–9999，最多1000射手。
颜色配平不等于可解性验证。本版没有传送带模拟、试玩、求解器或难度预测。
导出沿用已确认的原版基础JSON字段结构，但contentHash清零、isValid=false；未验证可直接植入原游戏。
没有修改原APK，也不需要安装原游戏。

## 验证
数据测试：node test-core.cjs。
浏览器已验证：画笔、填充、矩形、撤销恢复、队列跨列拖动、属性应用、逐色差额、配平生成、JSON导出独立校验、粘贴导入、刷新恢复草稿。
文件选择器在自动化浏览器下遇到权限限制，未宣称文件选择导入链已通过；粘贴入口已通过。
""",encoding="utf-8")
print('Portable HTML written:',(root/"像素关卡编辑器.html").stat().st_size)

