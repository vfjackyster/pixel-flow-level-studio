from pathlib import Path
import json,hashlib,zipfile,gzip,base64,runpy
root=Path.cwd(); ed=root/'pixel-editor'; levels=ed/'原版前10关'
manifest=json.loads((levels/'来源与核查.json').read_text(encoding='utf-8'))
src=Path('C:/Users/Admin/AppData/Local/Temp/rea-extracted-c32f2da8-4c2d-4d9a-ab63-2a218f53a32f')
verified=0
for rec in manifest['levels']:
    data=(levels/rec['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest()==rec['outputSha256']
    native=src/rec['sourcePath']
    if native.exists():
        raw=native.read_bytes()
        assert hashlib.sha256(raw).hexdigest()==rec['encodedSha256']
        decoded=gzip.decompress(base64.b64decode(raw.decode('utf-8-sig').strip()[5:]))
        assert json.loads(decoded)==json.loads(data)
        verified+=1
runpy.run_path(str(ed/'bundle.py'),run_name='__main__')
note='''## 原版前10关
试玩窗口现已内置 Pixel Flow! 0.37.1 完整基础集合的第1至10关，也可导入“原版前10关”目录中的01.json至10.json。
原始图案、颜色、队列、弹药、隐藏标记和元数据均保留；来源与核查.json记录逐文件散列。
第8至10关含隐藏射手，后排显示问号，进入队首后揭示。这是本地机制还原，尚未与原客户端逐帧核对。
编辑器仍拒绝含隐藏机关的关卡编辑，避免编辑或重生成队列时丢失原始字段；这类关卡可以直接试玩。
本地速度、射击与失败时序仍为近似规则，测试通过不等于原版体验完全一致。
'''
for name in ['使用说明.md','试玩还原说明.md']:
    target=ed/name; text=target.read_text(encoding='utf-8')
    if '## 原版前10关' not in text:
        target.write_text(text.rstrip()+'\n\n'+note,encoding='utf-8')
start='''使用方法：
1. 解压本压缩包。
2. 用 Edge 或 Chrome 打开“像素关卡编辑器.html”。
3. 点击“试玩”，选择“原版第1关”至“原版第10关”，点击“载入原版关卡”。
4. 也可在“导入 JSON 试玩”中选择原版前10关目录里的01.json至10.json；读取受限时可粘贴JSON内容。
来源与核查.json、试玩兼容核查.json是说明记录，不是可导入的关卡。
数据来自0.37.1完整基础集合的1至10号，不代表线上所有分组关序。
关卡对象未改动；试玩的运动、射击与失败时序仍为本地近似。
'''
archive=ed/'PixelFlow-0.37.1-前10关.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(levels.iterdir()):
        if f.is_file():z.write(f,'原版前10关/'+f.name)
    z.write(ed/'像素关卡编辑器.html','像素关卡编辑器.html')
    z.writestr('开始体验.txt',start)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if Path(n).stem.isdigit() and n.endswith('.json')])==10
    assert z.read('像素关卡编辑器.html')==(ed/'像素关卡编辑器.html').read_bytes()
print(json.dumps({'nativeLevelsRechecked':verified,'packagedLevels':10,'htmlEmbedded':True,'zipBytes':archive.stat().st_size},ensure_ascii=False))
