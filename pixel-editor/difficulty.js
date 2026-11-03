(function(root,factory){const api=factory();if(typeof module!=='undefined')module.exports=api;else root.DifficultyModel=api;api.workerSource='const M=('+factory.toString()+')();self.onmessage=e=>{try{self.postMessage({id:e.data.id,result:M.evaluate(e.data.level,e.data.options)});}catch(err){self.postMessage({id:e.data.id,error:err.message});}};';})(typeof window!=='undefined'?window:globalThis,function(){
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
