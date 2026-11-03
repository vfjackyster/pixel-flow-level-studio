from pathlib import Path
import json,gzip,base64,hashlib,zipfile
root=Path('C:/Users/Admin/Documents/ChatGPT/关卡学习之旅')
funnel='3db5681ee587345ad9a3cf8400a692d1'
src=Path('C:/Users/Admin/AppData/Local/Temp/rea-extracted-c32f2da8-4c2d-4d9a-ab63-2a218f53a32f/assets/Levels')/funnel
out=root/'pixel-editor/原版前10关';out.mkdir(exist_ok=True)
records=[];levels=[]
for n in range(1,11):
 b=(src/(str(n)+'.json')).read_bytes()
 decoded=gzip.decompress(base64.b64decode(b.decode('utf-8-sig').strip()[5:]))
 level=json.loads(decoded)
 target=out/(f'{n:02d}.json');target.write_text(json.dumps(level,ensure_ascii=False,indent=2),encoding='utf-8')
 assert json.loads(target.read_text(encoding='utf-8'))==level
 counts={};ammo={}
 for p in level['PixelImageData']['pixels']:counts[p['material']]=counts.get(p['material'],0)+1
 for q in level['QueueGroup']['shooterQueues']:
  for s in q['shooters']:ammo[s['material']]=ammo.get(s['material'],0)+s['ammo']
 rec={'number':n,'file':target.name,'sourcePath':f'assets/Levels/{funnel}/{n}.json','encodedSha256':hashlib.sha256(b).hexdigest(),'decodedUtf8Sha256':hashlib.sha256(decoded).hexdigest(),'outputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'semanticEquality':True,'width':level['PixelImageData']['width'],'height':level['PixelImageData']['height'],'pixels':len(level['PixelImageData']['pixels']),'shooters':sum(len(q['shooters']) for q in level['QueueGroup']['shooterQueues']),'hiddenShooterIds':level.get('SurpriseShooters',{}).get('Shooters',[]),'colorBalanced':counts==ammo}
 records.append(rec);levels.append({'number':n,'data':level})
manifest={'app':'Pixel Flow!','version':'0.37.1','baseApkSha256':'35f62418a54c81ef6b596587af98f1d0cee4627315b45b043656838e62efe4ba','funnelId':funnel,'sourceEvidence':'ev_14d4e3d3d58091c95252c86c83dec964d2cedbd67f86848f39d10e98cf843d6a','scope':'2700关完整基础集合的1–10号，不代表所有线上分组都使用相同关序。','transformation':'只解码gzip/base64并格式化JSON；不修改字段、图案、颜色、队列、弹药、机关或元数据。','levels':records}
(out/'来源与核查.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'使用说明.txt').write_text('Pixel Flow! 0.37.1 基础集合前10关\n\n01.json至10.json是逐关独立的原始关卡对象，可以在新版编辑器的「试玩」→「导入JSON试玩」中导入。\n也可直接在试玩窗口选择「原版第1关」至「原版第10关」并点击载入。\n第8–10关含隐藏射手；试玩补充了队首揭示，后排显示问号，未删改原始字段。\n本地移速、射速和失败时序仍是近似还原，不代表原版逐帧效果。\n来源与核查.json是索引与散列记录，不是关卡，请不要把它当成关卡导入。\n',encoding='utf-8')
(root/'pixel-editor/levels-first10.js').write_text('window.PIXEL_FLOW_FIRST10='+json.dumps({'version':'0.37.1','funnelId':funnel,'levels':levels},ensure_ascii=False)+';',encoding='utf-8')
with zipfile.ZipFile(root/'pixel-editor/PixelFlow-0.37.1-前10关.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(out.iterdir()):z.write(f,'PixelFlow-前10关/'+f.name)
print(json.dumps([{'n':r['number'],'pixels':r['pixels'],'shooters':r['shooters'],'hidden':len(r['hiddenShooterIds']),'balanced':r['colorBalanced']} for r in records],ensure_ascii=False))

