(function(root,factory){const api=factory(typeof module!=='undefined'?require('./core.js'):root.EditorCore);if(typeof module!=='undefined')module.exports=api;else root.PlayEngine=api;})(typeof window!=='undefined'?window:globalThis,function(C){
'use strict';
const DT=1/120,VERSION='perimeter-play-v1';
function canonical(l){const p=l.PixelImageData;return JSON.stringify({w:p.width,h:p.height,pw:p.physicalWidth,ph:p.physicalHeight,slots:l.SlotCount,belt:l.ConveyorLimit,pixels:p.pixels.map(v=>[v.x,v.y,v.material,v.areaX,v.areaY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]),queues:l.QueueGroup.shooterQueues.map(q=>q.shooters.map(s=>[s.id,s.material,s.ammo])),...(l.SurpriseShooters?.Shooters?.length?{surprise:l.SurpriseShooters.Shooters.slice().sort((a,b)=>a-b)}:{})});}
function fingerprint(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function create(level,params={}){C.validate(level,{allowSurprise:true});if(!level.PixelImageData.pixels.length)throw Error('空图案不能试玩。');
 const loop=params.loopSeconds??18,rate=params.shotsPerSecond??30,flight=params.flightSeconds??.14;
 if(!Number.isFinite(loop)||loop<4||loop>60||!Number.isFinite(rate)||rate<1||rate>120||!Number.isFinite(flight)||flight<0||flight>1)throw Error('试玩速度参数无效。');
 const input=C.copy(level),p=input.PixelImageData,grid=new Int16Array(p.width*p.height).fill(-1);p.pixels.forEach(v=>grid[v.y*p.width+v.x]=v.material);
 return {version:VERSION,input,hiddenIds:new Set(input.SurpriseShooters?.Shooters||[]),sourceCanonical:canonical(input),w:p.width,h:p.height,pw:p.physicalWidth,ph:p.physicalHeight,grid,left:p.pixels.length,initial:C.counts(input),pos:input.QueueGroup.shooterQueues.map(()=>0),waiting:[],active:[],bullets:[],claimed:new Set(),tick:0,status:'ready',reason:'',params:{loopSeconds:loop,shotsPerSecond:rate,flightSeconds:flight},stats:{launches:0,returns:0,shots:0,hits:0},shotsByColor:Array(34).fill(0),hitsByColor:Array(34).fill(0),events:[],eventsDropped:0,inputs:[]};
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
function hidden(g,id){if(!g.hiddenIds.has(id))return false;return g.input.QueueGroup.shooterQueues.some((q,c)=>q.shooters.slice(g.pos[c]+1).some(s=>s.id===id));}
function summary(g){return {version:VERSION,status:g.status,reason:g.reason,tick:g.tick,seconds:+(g.tick*DT).toFixed(3),params:g.params,contentFingerprint:fingerprint(g.sourceCanonical),stats:{...g.stats},remaining:g.left,beltCount:g.active.length,beltLimit:g.input.ConveyorLimit,waitingCount:g.waiting.length,waitingLimit:g.input.SlotCount,audit:audit(g)};}
return {DT,VERSION,create,canonical,fingerprint,path,target,entry,launch,start,pause,step,audit,hidden,summary};
});
