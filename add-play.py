from pathlib import Path
p=Path('pixel-editor')
core=(p/'core.js').read_text(encoding='utf-8')
insert="""function exportLevel(level){validate(level);const l=copy(level);l.contentHash=0;l.PixelImageData.contentHash=0;l.PixelImageData.Preview={instanceID:0};l.isValid=false;l.validationErrors=['Editor export: structural checks only; solvability not verified.'];return l;}
"""
core=core.replace('const api={copy,blank,counts,validate,flood,generate,integer};',insert+'const api={copy,blank,counts,validate,flood,generate,integer,exportLevel};')
(p/'core.js').write_text(core,encoding='utf-8')
app=(p/'app.js').read_text(encoding='utf-8')
old="let l=C.copy(state.level);l.contentHash=0;l.PixelImageData.contentHash=0;l.PixelImageData.Preview={instanceID:0};l.isValid=false;l.validationErrors=['Editor export: structural checks only; solvability not verified.'];"
app=app.replace(old,"let l=C.exportLevel(state.level);")
app=app.replace("if($('confirm-dialog').open||$('import-dialog').open||$('image-dialog').open)return;","if($('confirm-dialog').open||$('import-dialog').open||$('image-dialog').open||$('play-dialog').open||$('play-load-dialog').open)return;")
(p/'app.js').write_text(app,encoding='utf-8')
engine=r"""(function(root,factory){const api=factory(typeof module!=='undefined'?require('./core.js'):root.EditorCore);if(typeof module!=='undefined')module.exports=api;else root.PlayEngine=api;})(typeof window!=='undefined'?window:globalThis,function(C){
'use strict';
const DT=1/120,VERSION='perimeter-play-v1';
function canonical(l){const p=l.PixelImageData;return JSON.stringify({w:p.width,h:p.height,pw:p.physicalWidth,ph:p.physicalHeight,slots:l.SlotCount,belt:l.ConveyorLimit,pixels:p.pixels.map(v=>[v.x,v.y,v.material,v.areaX,v.areaY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]),queues:l.QueueGroup.shooterQueues.map(q=>q.shooters.map(s=>[s.id,s.material,s.ammo]))});}
function fingerprint(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function create(level,params={}){C.validate(level);if(!level.PixelImageData.pixels.length)throw Error('空图案不能试玩。');
 const loop=params.loopSeconds??18,rate=params.shotsPerSecond??30,flight=params.flightSeconds??.14;
 if(!Number.isFinite(loop)||loop<4||loop>60||!Number.isFinite(rate)||rate<1||rate>120||!Number.isFinite(flight)||flight<0||flight>1)throw Error('试玩速度参数无效。');
 const input=C.copy(level),p=input.PixelImageData,grid=new Int16Array(p.width*p.height).fill(-1);p.pixels.forEach(v=>grid[v.y*p.width+v.x]=v.material);
 return {version:VERSION,input,sourceCanonical:canonical(input),w:p.width,h:p.height,pw:p.physicalWidth,ph:p.physicalHeight,grid,left:p.pixels.length,initial:C.counts(input),pos:input.QueueGroup.shooterQueues.map(()=>0),waiting:[],active:[],bullets:[],claimed:new Set(),tick:0,status:'ready',reason:'',params:{loopSeconds:loop,shotsPerSecond:rate,flightSeconds:flight},stats:{launches:0,returns:0,shots:0,hits:0},shotsByColor:Array(34).fill(0),hitsByColor:Array(34).fill(0),events:[],eventsDropped:0,inputs:[]};
}
function log(g,type,data={}){g.events.push({tick:g.tick,time:+(g.tick*DT).toFixed(3),type,...data});if(g.events.length>2000){g.events.shift();g.eventsDropped++;}}
function path(g,progress){const m=.6,a=g.ph+2*m,b=g.pw+2*m,P=2*(a+b);let d=Math.max(0,Math.min(1,progress))*P;if(d<a)return {x:-m,y:-m+d,side:'left'};d-=a;if(d<b)return {x:-m+d,y:g.ph+m,side:'top'};d-=b;if(d<a)return {x:g.pw+m,y:g.ph+m-d,side:'right'};d-=a;return {x:g.pw+m-d,y:-m,side:'bottom'};}
function target(g,shooter){const p=path(g,shooter.progress);let index=-1;
 if(p.side==='left'||p.side==='right'){if(p.y<0||p.y>=g.ph)return -1;const row=Math.min(g.h-1,Math.floor(p.y/g.ph*g.h));if(p.side==='left'){for(let x=0;x<g.w;x++){const i=row*g.w+x;if(g.grid[i]>=0){index=i;break;}}}else for(let x=g.w-1;x>=0;x--){const i=row*g.w+x;if(g.grid[i]>=0){index=i;break;}}}
 else{if(p.x<0||p.x>=g.pw)return -1;const col=Math.min(g.w-1,Math.floor(p.x/g.pw*g.w));if(p.side==='bottom'){for(let y=0;y<g.h;y++){const i=y*g.w+col;if(g.grid[i]>=0){index=i;break;}}}else for(let y=g.h-1;y>=0;y--){const i=y*g.w+col;if(g.grid[i]>=0){index=i;break;}}}
 return index>=0&&g.grid[index]===shooter.material&&!g.claimed.has(index)?index:-1;
}
function entry(g){if(!['ready','running'].includes(g.status))return {ok:false,reason:'请开始或继续试玩。'};if(g.active.length>=g.input.ConveyorLimit)return {ok:false,reason:'传送带已达到容量上限。'};const gap=Math.min(.12,.75/(g.input.ConveyorLimit+1));if(g.active.some(s=>s.progress<gap))return {ok:false,reason:'传送带入口暂时占用，请等前一个射手离开入口。'};return {ok:true,gap};}
function launch(g,kind,index){const check=entry(g);if(!check.ok)return check;let s;
 if(kind==='queue'){const q=g.input.QueueGroup.shooterQueues[index];if(!q||!q.shooters[g.pos[index]])return {ok:false,reason:'这一列已经没有射手。'};s={...q.shooters[g.pos[index]++]};}
 else if(kind==='waiting'){if(!C.integer(index,0,g.waiting.length-1))return {ok:false,reason:'等待射手不存在。'};s=g.waiting.splice(index,1)[0];}
 else return {ok:false,reason:'无效操作。'};
 if(g.status==='ready')g.status='running';g.active.push({...s,progress:0,cooldown:0,blocked:0});g.stats.launches++;g.inputs.push({tick:g.tick,kind,index,id:s.id});log(g,'launch',{kind,index,id:s.id,ammo:s.ammo,material:s.material});return {ok:true};
}
function start(g){if(g.status==='ready'||g.status==='paused')g.status='running';}
function pause(g){if(g.status==='running')g.status='paused';}
function finish(g,status,reason){g.status=status;g.reason=reason;log(g,status,{reason});}
function step(g){if(g.status!=='running')return;g.tick++;
 for(const bullet of g.bullets)bullet.age+=DT;
 const impact=g.bullets.filter(b=>b.age+1e-9>=g.params.flightSeconds);g.bullets=g.bullets.filter(b=>b.age+1e-9<g.params.flightSeconds);
 for(const b of impact){g.claimed.delete(b.index);if(g.grid[b.index]===b.material){g.grid[b.index]=-1;g.left--;g.stats.hits++;g.hitsByColor[b.material]++;log(g,'hit',{id:b.id,x:b.index%g.w,y:Math.floor(b.index/g.w),material:b.material});}}
 if(!g.left){finish(g,'won','图案已清空。');return;}
 const gap=Math.min(.12,.75/(g.input.ConveyorLimit+1));g.active.sort((a,b)=>b.progress-a.progress);
 let front=Infinity;
 for(const s of g.active){s.progress=Math.min(1,s.progress+DT/g.params.loopSeconds,front-gap);front=s.progress;s.cooldown=Math.max(0,s.cooldown-DT);
 if(s.ammo>0&&s.cooldown<=1e-9){const i=target(g,s);if(i>=0){const from=path(g,s.progress);s.ammo--;s.cooldown=1/g.params.shotsPerSecond;g.stats.shots++;g.shotsByColor[s.material]++;g.claimed.add(i);g.bullets.push({index:i,material:s.material,id:s.id,age:0,from});log(g,'shot',{id:s.id,material:s.material,x:i%g.w,y:Math.floor(i/g.w),ammo:s.ammo});}}
 }
 const survivors=[];
 for(const s of g.active){if(s.ammo<=0){log(g,'depleted',{id:s.id});continue;}
 if(s.progress>=1-1e-9){if(g.waiting.length<g.input.SlotCount){g.waiting.push({id:s.id,material:s.material,ammo:s.ammo});g.stats.returns++;log(g,'return',{id:s.id,ammo:s.ammo});continue;}
 s.blocked+=DT;logBlockedOnce(g,s);if(s.blocked>=.5&&!g.bullets.length){survivors.push(s);g.active=survivors.concat(g.active.slice(g.active.indexOf(s)+1));finish(g,'failed','带有余弹的射手到达出口，等待槽无空位。');return;}}
 survivors.push(s);}
 g.active=survivors;
 const future=g.input.QueueGroup.shooterQueues.some((q,i)=>g.pos[i]<q.shooters.length);
 if(!future&&!g.waiting.length&&!g.active.length&&!g.bullets.length&&g.left)finish(g,'failed','射手弹药已耗尽，仍有目标未清除。');
}
function logBlockedOnce(g,s){if(!s.warned){s.warned=true;log(g,'exit-blocked',{id:s.id});}}
function audit(g){const remaining=Array(34).fill(0),ammo=Array(34).fill(0);g.grid.forEach(m=>{if(m>=0)remaining[m]++;});g.input.QueueGroup.shooterQueues.forEach((q,c)=>q.shooters.slice(g.pos[c]).forEach(s=>ammo[s.material]+=s.ammo));for(const s of [...g.waiting,...g.active])ammo[s.material]+=s.ammo;
 const targetConserved=remaining.every((n,m)=>n+g.hitsByColor[m]===g.initial.target[m]),ammoConserved=ammo.every((n,m)=>n+g.shotsByColor[m]===g.initial.ammo[m]),shotsAccounted=g.stats.shots===g.stats.hits+g.bullets.length,inputUnchanged=canonical(g.input)===g.sourceCanonical;
 return {targetConserved,ammoConserved,shotsAccounted,inputUnchanged,remainingPixels:remaining.reduce((a,b)=>a+b,0),remainingAmmo:ammo.reduce((a,b)=>a+b,0),allPassed:targetConserved&&ammoConserved&&shotsAccounted&&inputUnchanged};
}
function summary(g){return {version:VERSION,status:g.status,reason:g.reason,tick:g.tick,seconds:+(g.tick*DT).toFixed(3),params:g.params,contentFingerprint:fingerprint(g.sourceCanonical),stats:{...g.stats},remaining:g.left,beltCount:g.active.length,beltLimit:g.input.ConveyorLimit,waitingCount:g.waiting.length,waitingLimit:g.input.SlotCount,audit:audit(g)};}
return {DT,VERSION,create,canonical,fingerprint,path,target,entry,launch,start,pause,step,audit,summary};
});
"""
(p/'play-engine.js').write_text(engine,encoding='utf-8')
dialog="""<dialog id="play-dialog" class="play-dialog"><div class="play-header"><div><h2>核心玩法试玩</h2><p id="play-source"></p></div><button id="play-load-open">导入 JSON 试玩</button><button id="play-close" aria-label="关闭试玩">✕</button></div><div class="play-controls"><button id="play-start" class="primary">开始</button><button id="play-restart">重开</button><label>一圈<select id="play-loop"><option>12</option><option selected>18</option><option>24</option><option>36</option></select>秒</label><label>射速<select id="play-rate"><option>10</option><option selected>30</option><option>60</option></select>/秒</label><label>播放速度<select id="play-speed"><option value=".5">0.5×</option><option selected value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><small>圈时、射速修改后重开生效</small></div><div class="play-layout"><section><div class="play-hud"><span id="play-state">未开始</span><span id="play-targets"></span><span id="play-belt"></span><span id="play-shots"></span></div><canvas id="play-canvas" width="900" height="560" aria-label="可试玩的像素图案、传送带、射手与子弹"></canvas><div id="play-message" role="status">点击队首或等待射手，将它送上传送带。</div><h3>等待槽 <span id="play-wait-count"></span></h3><div id="play-waiting" class="play-waiting"></div><h3>射手队列 · 只可取各列队首</h3><div id="play-queues" class="play-queues"></div></section><aside class="play-inspector"><h3>JSON 核对</h3><div id="play-checks"></div><h3>逐色目标与弹药</h3><div id="play-color-audit"></div><button id="play-report">导出验证记录</button><details><summary>还原范围与近似规则</summary><p>已实现四侧前沿同色寻敌、队首取用、有限弹药、容量限制、余弹回槽、再次投放和清图获胜。子弹到达目标后消除，已预占的目标不重复发弹。</p><p>本地规则：从左下入口顺时针运行；一圈18秒、射速30/秒、弹道时间0.14秒，可调整前两项后重开。出口满槽时等待0.5秒，待在途子弹结算后判失败；等待槽恰好填满本身不立即失败。</p><p>方向、移速、射速、对齐容差、角落行为和失败时序未与原版逐帧核验。普通像素按一弹一目标处理，不支持机关或动态减难。本试玩不是官方客户端或可解性证明。</p><p>实时难度面板仍使用先前的简化调度模型，不等同本连续运动试玩。</p></details><h3>最近事件</h3><pre id="play-events"></pre></aside></div></dialog>
<dialog id="play-load-dialog"><h2>导入 JSON 试玩</h2><p>选择导出的 JSON，或粘贴内容。仅加载到试玩，不覆盖编辑原稿。</p><textarea id="play-json" aria-label="试玩关卡 JSON" placeholder="粘贴导出的关卡 JSON" style="width:100%;height:220px;padding:10px"></textarea><input id="play-file" type="file" accept=".json,.txt" hidden><p id="play-load-error" role="status"></p><div><button id="play-load-cancel">取消</button><button id="play-file-choose">选择 JSON 文件</button><button id="play-load-confirm" class="primary">读取并试玩</button></div></dialog>"""
index=(p/'index.html').read_text(encoding='utf-8')
index=index.replace('<button id="image-open">','<button id="play-open">试玩</button><button id="image-open">')
index=index.replace('<dialog id="confirm-dialog">',dialog+'<dialog id="confirm-dialog">')
index=index.replace('<script src="difficulty.js"></script>','<script src="play-engine.js"></script><script src="difficulty.js"></script>')
index=index.replace('<script src="image-ui.js"></script>','<script src="image-ui.js"></script><script src="play-ui.js"></script>')
(p/'index.html').write_text(index,encoding='utf-8')
bundle=(p/'bundle.py').read_text(encoding='utf-8').replace("'difficulty.js','difficulty-ui.js'","'play-engine.js','difficulty.js','difficulty-ui.js'").replace("'app.js','image-ui.js'","'app.js','image-ui.js','play-ui.js'")
(p/'bundle.py').write_text(bundle,encoding='utf-8')
print('play engine created')

