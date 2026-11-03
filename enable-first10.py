from pathlib import Path
p=Path('pixel-editor/core.js');s=p.read_text(encoding='utf-8')
s=s.replace('function validate(l){','function validate(l,options={}){')
s=s.replace("'QueueGroup','PixelImageData','contentHash','isValid','validationErrors']);","'QueueGroup','PixelImageData','contentHash','isValid','validationErrors']);\n if(options.allowSurprise)top.add('SurpriseShooters');")
s=s.replace(" if(n>1000)throw Error('最多支持 1000 个射手。');",""" if(n>1000)throw Error('最多支持 1000 个射手。');
 if(options.allowSurprise&&l.SurpriseShooters!==undefined){const v=l.SurpriseShooters;if(!v||Array.isArray(v)||typeof v!=='object'||!Array.isArray(v.Shooters)||Object.keys(v).some(k=>k!=='Shooters'))throw Error('隐藏射手数据格式无效。');const seenIds=new Set();for(const id of v.Shooters){if(!integer(id,0,1e8)||!ids.has(id)||seenIds.has(id))throw Error('隐藏射手ID重复或找不到对应射手。');seenIds.add(id);}}
""")
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/play-engine.js');s=p.read_text(encoding='utf-8')
s=s.replace("queues:l.QueueGroup.shooterQueues.map(q=>q.shooters.map(s=>[s.id,s.material,s.ammo]))","queues:l.QueueGroup.shooterQueues.map(q=>q.shooters.map(s=>[s.id,s.material,s.ammo])),...(l.SurpriseShooters?.Shooters?.length?{surprise:l.SurpriseShooters.Shooters.slice().sort((a,b)=>a-b)}:{})")
s=s.replace('C.validate(level);','C.validate(level,{allowSurprise:true});')
s=s.replace("input,sourceCanonical:canonical(input)","input,hiddenIds:new Set(input.SurpriseShooters?.Shooters||[]),sourceCanonical:canonical(input)")
s=s.replace('function summary(g){',"""function hidden(g,id){if(!g.hiddenIds.has(id))return false;return g.input.QueueGroup.shooterQueues.some((q,c)=>q.shooters.slice(g.pos[c]+1).some(s=>s.id===id));}
function summary(g){""")
s=s.replace('launch,start,pause,step,audit,summary','launch,start,pause,step,audit,hidden,summary')
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/play-ui.js');s=p.read_text(encoding='utf-8')
s=s.replace('C.validate(level);','C.validate(level,{allowSurprise:true});').replace('C.validate(data);','C.validate(data,{allowSurprise:true});')
s=s.replace("remain.slice(1,4).map(s=>'<span class=\"play-next\">","remain.slice(1,4).map(s=>P.hidden(g,s.id)?'<span class=\"play-next\"><i class=\"dot\" style=\"background:#899285\"></i>#'+s.id+' · ? 色 · ? 弹</span>':'<span class=\"play-next\">")
# Permit opening the built-in collection from an empty editor without changing the editor.
s=s.replace("function openCurrent(){try{const text=","function openCurrent(){try{if(!state.level.PixelImageData.pixels.length&&window.PIXEL_FLOW_FIRST10){loadBuiltin(1);if(!dialog.open)dialog.showModal();beginFrames();return;}const text=")
add="""
function loadBuiltin(n){const entry=window.PIXEL_FLOW_FIRST10?.levels.find(l=>l.number===n);if(!entry)return;load(C.copy(entry.data),'Pixel Flow! 0.37.1 · 原版第'+n+'关（基础集合）');beginFrames();}
$('play-builtin-select').innerHTML=window.PIXEL_FLOW_FIRST10.levels.map(l=>'<option value="'+l.number+'">原版第 '+l.number+' 关</option>').join('');
$('play-builtin-load').onclick=()=>loadBuiltin(+$('play-builtin-select').value);
"""
s=s.replace("\n$('play-open').onclick=openCurrent;",add+"\n$('play-open').onclick=openCurrent;")
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/index.html');s=p.read_text(encoding='utf-8')
s=s.replace('<button id="play-load-open">','<label>原版关卡<select id="play-builtin-select" aria-label="原版关卡"></select></label><button id="play-builtin-load">载入原版关卡</button><button id="play-load-open">')
s=s.replace('<script src="core.js?v=play1"></script>','<script src="levels-first10.js?v=first10"></script><script src="core.js?v=first10"></script>')
s=s.replace('src="play-engine.js?v=play1"','src="play-engine.js?v=first10"').replace('src="play-ui.js?v=play1"','src="play-ui.js?v=first10"')
s=s.replace('不支持机关或动态减难。','支持前10关的隐藏射手：后排显示问号，到队首揭示；其他机关和动态减难暂不支持。')
p.write_text(s,encoding='utf-8')

