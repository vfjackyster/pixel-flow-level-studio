from pathlib import Path
p=Path("pixel-editor")
model=r"""(function(root,factory){const api=factory();if(typeof module!=='undefined')module.exports=api;else root.DifficultyModel=api;api.workerSource='const M=('+factory.toString()+')();self.onmessage=e=>{try{self.postMessage({id:e.data.id,result:M.evaluate(e.data.level,e.data.options)});}catch(err){self.postMessage({id:e.data.id,error:err.message});}};';})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const VERSION='schedule-v1';
function build(l){const p=l.PixelImageData;let grid=new Int16Array(p.width*p.height).fill(-1);for(const v of p.pixels)grid[v.y*p.width+v.x]=v.material;return {w:p.width,h:p.height,grid,left:p.pixels.length,pos:l.QueueGroup.shooterQueues.map(()=>0),buffer:[]};}
function frontier(s){let ids=new Set(),g=s.grid;for(let y=0;y<s.h;y++){let first=-1,last=-1;for(let x=0;x<s.w;x++){let i=y*s.w+x;if(g[i]>=0){if(first<0)first=i;last=i;}}if(first>=0){ids.add(first);ids.add(last);}}for(let x=0;x<s.w;x++){let first=-1,last=-1;for(let y=0;y<s.h;y++){let i=y*s.w+x;if(g[i]>=0){if(first<0)first=i;last=i;}}if(first>=0){ids.add(first);ids.add(last);}}return Array.from(ids).sort((a,b)=>a-b);}
function clone(s){return {...s,grid:s.grid.slice(),pos:s.pos.slice(),buffer:s.buffer.map(x=>({...x}))};}
function fire(s,m,ammo){let removed=0;while(ammo>0){let targets=frontier(s).filter(i=>s.grid[i]===m);if(!targets.length)break;let n=Math.min(ammo,targets.length);for(let k=0;k<n;k++)s.grid[targets[k]]=-1;s.left-=n;removed+=n;ammo-=n;}return {removed,ammo};}
function actions(s,l){let exposed=new Set(frontier(s).map(i=>s.grid[i])),a=[];l.QueueGroup.shooterQueues.forEach((q,c)=>{let t=q.shooters[s.pos[c]];if(t)a.push({kind:'queue',index:c,material:t.material,ammo:t.ammo,id:t.id});});s.buffer.forEach((t,i)=>{if(exposed.has(t.material))a.push({kind:'buffer',index:i,...t});});return a;}
function step(s,l,a){if(a.kind==='queue')s.pos[a.index]++;else s.buffer.splice(a.index,1);let hit=fire(s,a.material,a.ammo);if(hit.ammo>0)s.buffer.push({id:a.id,material:a.material,ammo:hit.ammo});return {removed:hit.removed,win:s.left===0,fail:s.left!==0&&s.buffer.length>l.SlotCount};}
function rng(seed){let t=seed>>>0;return ()=>{t+=0x6D2B79F5;let n=t;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};}
function trajectory(l,policy,seed,options={}){let s=build(l),random=rng(seed),trace=[],peak=0,steps=0;const limit=l.PixelImageData.pixels.length+l.QueueGroup.shooterQueues.reduce((n,q)=>n+q.shooters.length,0)+1;
 while(s.left>0){if(options.tick)options.tick();let a=actions(s,l);if(!a.length)return {win:false,reason:'stalled',peak,trace,left:s.left};
 let candidates=a;
 if(policy==='greedy'){let best=-1,remaining=Infinity;candidates=[];for(const v of a){if(options.tick)options.tick();let hit=fire(clone(s),v.material,v.ammo);if(hit.removed>best||(hit.removed===best&&hit.ammo<remaining)){best=hit.removed;remaining=hit.ammo;candidates=[v];}else if(hit.removed===best&&hit.ammo===remaining)candidates.push(v);}}
 const selected=candidates[Math.floor(random()*candidates.length)],r=step(s,l,selected);peak=Math.max(peak,s.buffer.length);trace.push({kind:selected.kind,index:selected.index,id:selected.id});steps++;if(r.win)return {win:true,peak,trace,left:0};if(r.fail)return {win:false,reason:'overflow',peak,trace,left:s.left};if(steps>limit)throw Error('模型步数不变量被破坏。');
 }return {win:true,peak,trace,left:0};}
function wilson(k,n){if(!n)return null;const z=1.95996398454,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
function diagnostics(l){let s=build(l),front=frontier(s),colors=new Set(front.map(i=>s.grid[i])),heads=l.QueueGroup.shooterQueues.map(q=>q.shooters[0]).filter(Boolean),useful=heads.filter(t=>colors.has(t.material)).length;
 let depth=0;while(s.left){const f=frontier(s);if(!f.length)break;for(const i of f)s.grid[i]=-1;s.left-=f.length;depth++;}
 let demand=Array(34).fill(0),supply=Array(34).fill(0);l.PixelImageData.pixels.forEach(p=>demand[p.material]++);l.QueueGroup.shooterQueues.forEach(q=>q.shooters.forEach(t=>supply[t.material]+=t.ammo));
 return {pixels:l.PixelImageData.pixels.length,front:front.length,exposure:l.PixelImageData.pixels.length?front.length/l.PixelImageData.pixels.length:null,layers:depth,activeHeads:heads.length,productiveHeads:useful,mismatch:heads.length?1-useful/heads.length:null,shortage:demand.map((n,i)=>({material:i,amount:n-supply[i]})).filter(x=>x.amount>0),surplus:supply.reduce((n,x,i)=>n+Math.max(0,x-demand[i]),0),shooters:l.QueueGroup.shooterQueues.reduce((n,q)=>n+q.shooters.length,0)};
}
function evaluate(l,options={}){const d=diagnostics(l),base={version:VERSION,diagnostics:d,policies:[],ignored:['ConveyorLimit','physicalWidth','physicalHeight','Difficulty']};
 if(!d.pixels)return {...base,status:'empty'};
 if(d.shortage.length)return {...base,status:'shortage'};
 const n=options.trials||128;if(d.pixels>1600||d.shooters>160)return {...base,status:'large'};
 let calls=0;const max=options.maxCalls||400000,tick=()=>{if(++calls>max)throw Error('超出固定计算预算，本次不提供采样分数。');};
 const policies=[];for(const policy of ['random','greedy']){let wins=0,overflow=0,stalled=0,peakSum=0,witness=null;for(let i=0;i<n;i++){const t=trajectory(l,policy,((i+1)*2654435761+9187)>>>0,{tick});if(t.win){wins++;if(!witness)witness=t.trace;}else if(t.reason==='overflow')overflow++;else stalled++;peakSum+=t.peak;}
 let fails=n-wins;policies.push({policy,trials:n,wins,fails,overflow,stalled,risk:100*fails/n,interval:wilson(fails,n).map(x=>100*x),meanPeak:peakSum/n,witness});}
 return {...base,status:'sampled',policies,work:calls};}
return {VERSION,build,frontier,fire,actions,step,trajectory,diagnostics,evaluate,wilson};
});
"""
(p/"difficulty.js").write_text(model,encoding="utf-8")
ui=r"""const DifficultyUI=(()=>{
let timer=null,worker=null,request=0,lastInput='',lastScore=null;
const pct=n=>(100*n).toFixed(1)+'%';
function status(t){$('difficulty-status').textContent=t;}
function display(r){
 const d=r.diagnostics;$('metric-exposure').textContent=d.exposure===null?'—':pct(d.exposure);$('metric-layers').textContent=d.layers+' 层';$('metric-mismatch').textContent=d.mismatch===null?'—':pct(d.mismatch);
 $('difficulty-causes').textContent='外围可见 '+d.front+' / '+d.pixels+' 像素；'+d.productiveHeads+' / '+d.activeHeads+' 个非空队首当前可输出。暴露率、层数和错配率是诊断量，不加权凑总分。';
 if(r.status!=='sampled'){const messages={empty:'请先绘制图案。',shortage:'弹药不足：'+d.shortage.map(x=>colorNames[x.material]+' 缺 '+x.amount).join('，')+'。先修复供需，不把资源不足标成“高难”。',large:'已更新结构指标。实时模拟上限为 1600 像素、160 射手；超出时不显示旧分数。'};status(r.status==='shortage'?'供需不成立':r.status==='large'?'仅结构指标':'等待图案');$('difficulty-results').textContent=messages[r.status];return;}
 status('已更新 · 调度模型');$('difficulty-results').innerHTML=r.policies.map(p=>'<div class="risk-card"><span>'+(p.policy==='random'?'随机选择策略':'优先消除策略')+'</span><strong>'+p.risk.toFixed(1)+'<small> / 100</small></strong><p>'+p.fails+' / '+p.trials+' 次模型失败</p><small>95% 采样区间 '+p.interval[0].toFixed(1)+'–'+p.interval[1].toFixed(1)+'</small><small>溢出 '+p.overflow+' 次 · 无可推进动作 '+p.stalled+' 次</small></div>').join('');
 let p=r.policies[0];$('difficulty-causes').textContent+=' '+(lastScore===null?'':('相较上次随机策略风险 '+(p.risk-lastScore>=0?'+':'')+(p.risk-lastScore).toFixed(1)+' 分。 '))+(p.wins?'本批次已找到模型通关轨迹。':'本批次未采到模型通关，不等于证明无解。');lastScore=p.risk;
}
function start(level){
 const id=++request;if(worker){worker.terminate();worker=null;}
 let d=DifficultyModel.diagnostics(level);display({status:d.pixels?'large':'empty',diagnostics:d});status('计算中…');$('difficulty-results').textContent='正在运行两种策略，各 128 次；仅评估简化调度模型。';
 let url;
 try{url=URL.createObjectURL(new Blob([DifficultyModel.workerSource],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);}catch(e){status('模拟不可用');$('difficulty-results').textContent='结构指标已更新。浏览器未允许后台计算，请用 Edge / Chrome 打开。';return;}
 let current=worker;
 const timeout=setTimeout(()=>{if(worker===current){current.terminate();worker=null;status('计算超时');$('difficulty-results').textContent='结构指标已更新；本次模拟超出 5 秒预算，不显示部分或旧分数。';}},5000);
 current.onmessage=e=>{if(e.data.id!==request)return;clearTimeout(timeout);current.terminate();worker=null;if(e.data.error){status('超出计算预算');$('difficulty-results').textContent=e.data.error;return;}display(e.data.result);};
 current.onerror=()=>{clearTimeout(timeout);current.terminate();worker=null;status('模拟不可用');$('difficulty-results').textContent='后台计算失败。结构指标仍可使用；未生成难度分数。';};
 current.postMessage({id,level,options:{trials:128}});
}
function schedule(level){const input=JSON.stringify(level);if(input===lastInput)return;lastInput=input;clearTimeout(timer);request++;if(worker){worker.terminate();worker=null;}status('待更新…');$('difficulty-results').textContent='关卡已变化，旧分数已清除。';timer=setTimeout(()=>start(JSON.parse(input)),280);}
return {schedule};
})();
"""
(p/"difficulty-ui.js").write_text(ui,encoding="utf-8")
index=(p/"index.html").read_text(encoding="utf-8")
panel="""<section class="difficulty panel" aria-label="实时难度评估"><div class="balance-head"><div><h2>实时难度 · 调度模型</h2><p>模型失败率，不是真人胜率；编辑后自动更新。</p></div><span id="difficulty-status" role="status">待计算</span></div><div id="difficulty-results" aria-live="polite"></div><div class="structure-metrics"><div><span>图案暴露率</span><strong id="metric-exposure">—</strong></div><div><span>几何剥离深度</span><strong id="metric-layers">—</strong></div><div><span>队首颜色错配</span><strong id="metric-mismatch">—</strong></div></div><p id="difficulty-causes"></p><details><summary>计算逻辑、公式与适用范围</summary><h3>核心公式</h3><p>Dπ = 100 × Fπ / 128。Fπ 为指定策略在 128 次模拟中的失败次数。随机策略对当前各列队首与可输出的等待射手均匀选择；优先消除策略最大化本次消除数，再优先余弹少者，同分随机。</p><p>图案暴露率 E = 外围首个目标的去重数量 / 剩余像素数。剥离深度 L = 不分颜色逐轮剥去全部外围首个目标，直至清空的轮数。队首错配率 Q = 1 − 当前可输出的队首数 / 非空队列数。它们用于解释，不直接合成分数。</p><h3>这一版模拟什么</h3><p>每次选一个射手，反复打掉从四个外侧可见的同色像素，直至弹尽或没有同色外围目标。前沿像素按 y 再 x 升序处理。余弹射手进入等待区；超过等待槽数量判为模型失败；清空图案优先判胜。等待射手只有可输出时才再次作为候选。</p><p>不模拟移动、射速、投射物、同时在带上的射手或机关。ConveyorLimit、物理尺寸和预设难度标签不参与本模型，所以修改这些值不会改变模型风险。无限制地处理当前可达同色目标是一项简化，模型结果不对真实关卡构成上下界证明。</p><h3>由来与不确定性</h3><p>遮挡、队列、余弹、等待槽来自已核查的游戏机制；串行处理、目标顺序与两种策略是本工具的显式建模选择。0–100 分是失败比例换算，不是官方公式或人为加权分数。95% Wilson 区间只描述采样误差，不包含模型失真和真人差异。128 次全失败也不证明无解；全成功也不保证必过。</p><p>每次编辑使用相同种子序列减少比较噪声；超预算或模拟失败时清除分数。实时模拟限 1600 像素、160 射手。绘图在松开鼠标后更新；属性在应用后更新。原难度标签仍是手工标签。</p><p>方法来源：<a href="https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm" target="_blank" rel="noopener">NIST 二项比例区间</a>；<a href="https://yannakakis.net/wp-content/uploads/2019/02/EDPCG.pdf" target="_blank" rel="noopener">玩家模型与内容评价研究</a>。论文不提供本游戏的评分公式。</p></details></section>"""
if 'id="difficulty-results"' not in index:index=index.replace('<section class="balance panel">',panel+'<section class="balance panel">')
index=index.replace('<script src="app.js"></script>','<script src="difficulty.js"></script><script src="difficulty-ui.js"></script><script src="app.js"></script>')
(p/"index.html").write_text(index,encoding="utf-8")
app=(p/"app.js").read_text(encoding="utf-8")
app=app.replace('draw();renderQueues();renderBalance();','draw();renderQueues();renderBalance();DifficultyUI.schedule(state.level);')
app=app.replace('/* Local pixel level editor; no game simulation. */','/* Local pixel level editor with explicitly simplified scheduling analysis. */')
(p/"app.js").write_text(app,encoding="utf-8")
css=(p/"style.css").read_text(encoding="utf-8")
css+="""\n.difficulty{padding:18px;margin-top:10px}.difficulty .balance-head p{font-size:11px;color:#758279;margin:6px 0 0}#difficulty-status{font-size:10px;color:#166957;white-space:nowrap}#difficulty-results{display:grid;grid-template-columns:1fr 1fr;gap:12px;color:#637468;font-size:12px;line-height:1.8}.risk-card{padding:14px;background:#f3f7f2;border:1px solid #e1eade;border-radius:6px}.risk-card>span,.risk-card>small{display:block}.risk-card>span{font-size:12px}.risk-card strong{display:block;font-size:30px;line-height:1.4;color:#204e3e;margin-top:5px;font-variant-numeric:tabular-nums}.risk-card strong small{font-size:12px;font-weight:400;color:#819284}.risk-card p{font-size:11px;margin:3px 0}.risk-card>small{font-size:10px;color:#738476}.structure-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border-bottom:1px solid #e8ede6;padding:16px 0 12px}.structure-metrics span{display:block;font-size:10px;color:#7c897e}.structure-metrics strong{display:block;font-size:16px;margin-top:5px}#difficulty-causes{font-size:11px;color:#6c7c70;line-height:1.8}.difficulty details{border-top:1px solid #e5ece2;padding-top:12px;font-size:11px;line-height:1.9;color:#657367}.difficulty summary{cursor:pointer;color:#166957}.difficulty details h3{font-size:12px;margin:15px 0 5px}.difficulty a{color:#166957}.difficulty details p{margin:5px 0 10px}@media(max-width:700px){#difficulty-results{gap:7px}.risk-card{padding:10px}.risk-card strong{font-size:25px}}\n"""
(p/"style.css").write_text(css,encoding="utf-8")
print('difficulty model and UI created')

