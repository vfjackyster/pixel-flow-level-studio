(()=>{
const P=PlayEngine,dialog=$('play-dialog'),loader=$('play-load-dialog'),cv=$('play-canvas'),ctx=cv.getContext('2d');
let game=null,original=null,sourceLabel='',editorSnapshot='',same=false,raf=0,lastTime=0,accumulator=0,uiClock=0,listKey='',lastHit=-1,boardCache=document.createElement('canvas');
boardCache.width=cv.width;boardCache.height=cv.height;
function params(){return {loopSeconds:+$('play-loop').value,shotsPerSecond:+$('play-rate').value};}
function message(text){$('play-message').textContent=text;}
function load(level,label){try{C.validate(level,{allowSurprise:true});const next=P.create(level,params());game=next;original=C.copy(level);sourceLabel=label;editorSnapshot=JSON.stringify(state.level);same=P.canonical(state.level)===P.canonical(level);listKey='';lastHit=-1;accumulator=0;lastTime=0;message('点击队首或等待射手，将它送上传送带。');refresh(true);draw();return true;}catch(e){notify(e.message);return false;}}
function openCurrent(){try{if(!state.level.PixelImageData.pixels.length&&window.PIXEL_FLOW_FIRST10){loadBuiltin(1);if(!dialog.open)dialog.showModal();beginFrames();return;}const text=JSON.stringify(C.exportLevel(state.level));const level=JSON.parse(text);if(!load(level,'当前关卡 · 经导出 JSON 重新读取'))return;if(!dialog.open)dialog.showModal();beginFrames();}catch(e){notify(e.message);}}
function beginFrames(){cancelAnimationFrame(raf);lastTime=0;raf=requestAnimationFrame(frame);}
function frame(t){if(!dialog.open||!game)return;
 const elapsed=lastTime?Math.min(.25,(t-lastTime)/1000):0;lastTime=t;
 if(game.status==='running'){accumulator+=elapsed*+$('play-speed').value;let n=0;while(accumulator>=P.DT&&n<120){P.step(game);accumulator-=P.DT;n++;if(game.status!=='running'){accumulator=0;break;}}}else accumulator=0;
 draw();uiClock+=elapsed;if(uiClock>.1){uiClock=0;refresh();}raf=requestAnimationFrame(frame);
}
function world(x,y){const margin=1.4,scale=Math.min((cv.width-90)/(game.pw+2*margin),(cv.height-50)/(game.ph+2*margin));return {x:(cv.width-game.pw*scale)/2+x*scale,y:(cv.height+game.ph*scale)/2-y*scale,scale};}
function cacheBoard(){const c=boardCache.getContext('2d');c.clearRect(0,0,cv.width,cv.height);c.fillStyle='#e9efe5';c.fillRect(0,0,cv.width,cv.height);
 const o=world(0,game.ph),unit=world(0,0).scale;const points=[world(-.6,-.6),world(-.6,game.ph+.6),world(game.pw+.6,game.ph+.6),world(game.pw+.6,-.6)];
 c.lineJoin='round';c.lineWidth=28;c.strokeStyle='#bdcbb8';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();
 c.lineWidth=1;c.setLineDash([5,7]);c.strokeStyle='#8ca381';c.stroke();c.setLineDash([]);
 for(let i=0;i<8;i++){const a=P.path(game,(i+.5)/8),b=P.path(game,(i+.5)/8+.003),pa=world(a.x,a.y),pb=world(b.x,b.y);c.save();c.translate(pa.x,pa.y);c.rotate(Math.atan2(pb.y-pa.y,pb.x-pa.x));c.fillStyle='#809b77';c.beginPath();c.moveTo(5,0);c.lineTo(-4,-4);c.lineTo(-4,4);c.closePath();c.fill();c.restore();}
 c.fillStyle='#f9faf5';c.fillRect(o.x,o.y,game.pw*unit,game.ph*unit);
 const w=game.pw/game.w*unit,h=game.ph/game.h*unit;
 for(let i=0;i<game.grid.length;i++){const mat=game.grid[i];if(mat<0)continue;const x=i%game.w,y=Math.floor(i/game.w),at=world(x*game.pw/game.w,(y+1)*game.ph/game.h);c.fillStyle=hex(mat);c.fillRect(at.x+.25,at.y+.25,Math.max(.5,w-.5),Math.max(.5,h-.5));}
 const entry=world(-.6,-.6);c.fillStyle='#426c4c';c.font='12px Microsoft YaHei';c.textAlign='left';c.fillText('入口 / 出口',entry.x-15,entry.y+38);lastHit=game.stats.hits;
}
function draw(){if(!game)return;if(lastHit!==game.stats.hits)cacheBoard();ctx.drawImage(boardCache,0,0);
 for(const b of game.bullets){const from=world(b.from.x,b.from.y),to=world((b.index%game.w+.5)*game.pw/game.w,(Math.floor(b.index/game.w)+.5)*game.ph/game.h),p=Math.min(1,b.age/Math.max(.001,game.params.flightSeconds));ctx.strokeStyle=hex(b.material);ctx.globalAlpha=.55;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(from.x+(to.x-from.x)*p,from.y+(to.y-from.y)*p,4,0,Math.PI*2);ctx.fill();}
 for(const s of game.active){const p=P.path(game,s.progress),at=world(p.x,p.y);ctx.fillStyle=hex(s.material);ctx.strokeStyle='#ffffffb0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(at.x,at.y,16,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=textColor(s.material);ctx.font='bold 12px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(String(s.ammo),at.x,at.y+4);}
 if(game.status==='won'||game.status==='failed'){ctx.fillStyle='#ffffffed';ctx.fillRect(160,cv.height/2-48,cv.width-320,96);ctx.textAlign='center';ctx.font='bold 25px Microsoft YaHei';ctx.fillStyle=game.status==='won'?'#166957':'#a34d41';ctx.fillText(game.status==='won'?'图案清空，试玩通过':'试玩结束',cv.width/2,cv.height/2-5);ctx.font='12px Microsoft YaHei';ctx.fillStyle='#627562';ctx.fillText(game.reason,cv.width/2,cv.height/2+23);}
}
function shooterButton(s,attributes,label){return '<button class="play-shooter" '+attributes+' style="background:'+hex(s.material)+';color:'+textColor(s.material)+'" aria-label="'+label+'">'+s.ammo+'<small>#'+s.id+' · '+colorNames[s.material]+'</small></button>';}
function refresh(force=false){if(!game)return;const g=game,total=g.input.PixelImageData.pixels.length,a=P.audit(g),phase={ready:'待开始',running:'运行中',paused:'已暂停',won:'通过',failed:'失败'}[g.status];
 $('play-source').textContent=sourceLabel+' · 指纹 '+P.fingerprint(g.sourceCanonical);$('play-state').textContent=phase+' · '+(g.tick*P.DT).toFixed(1)+'s';$('play-targets').textContent='目标 '+g.left+' / '+total;$('play-belt').textContent='传送带 '+g.active.length+' / '+g.input.ConveyorLimit;$('play-shots').textContent='已发射 '+g.stats.shots+' · 在途 '+g.bullets.length;
 $('play-start').textContent=g.status==='running'?'暂停':g.status==='paused'?'继续':'开始';$('play-start').disabled=['won','failed'].includes(g.status);
 if(g.status==='won'||g.status==='failed')message(g.reason+' 可重开，或关闭窗口返回编辑。');
 const key=JSON.stringify([g.pos,g.waiting,g.status]);if(force||key!==listKey){listKey=key;const disabled=['paused','won','failed'].includes(g.status)?'disabled':'';
 $('play-queues').style.gridTemplateColumns='repeat('+g.pos.length+',minmax(55px,1fr))';
 $('play-queues').innerHTML=g.input.QueueGroup.shooterQueues.map((q,c)=>{const remain=q.shooters.slice(g.pos[c]),head=remain[0];return '<div class="play-column"><div>第 '+(c+1)+' 列 · '+remain.length+' 个</div>'+(head?shooterButton(head,'data-play-col="'+c+'" '+disabled,'投放第'+(c+1)+'列队首 ID'+head.id):'<span class="play-empty">已取完</span>')+remain.slice(1,4).map(s=>P.hidden(g,s.id)?'<span class="play-next"><i class="dot" style="background:#899285"></i>#'+s.id+' · ? 色 · ? 弹</span>':'<span class="play-next"><i class="dot" style="background:'+hex(s.material)+'"></i>#'+s.id+' · '+s.ammo+' 弹</span>').join('')+(remain.length>4?'<small>另有 '+(remain.length-4)+' 个</small>':'')+'</div>';}).join('');
 $('play-wait-count').textContent=g.waiting.length+' / '+g.input.SlotCount;$('play-waiting').innerHTML=Array.from({length:g.input.SlotCount},(_,i)=>g.waiting[i]?shooterButton(g.waiting[i],'data-play-wait="'+g.waiting[i].id+'" '+disabled,'重新投放等待射手 ID'+g.waiting[i].id):'<span class="play-empty">空槽 '+(i+1)+'</span>').join('');
 }
 $('play-checks').innerHTML='<p>'+g.w+' × '+g.h+' 格 · '+g.pw+' × '+g.ph+' 物理尺寸</p><p>'+g.input.QueueGroup.shooterQueues.reduce((n,q)=>n+q.shooters.length,0)+' 个射手 · '+total+' 个目标</p><p>字段结构：通过</p><p>与当前编辑稿：'+(same?'玩法数据一致':'不同，正在试玩外部关卡')+'</p><p>编辑原稿：'+(JSON.stringify(state.level)===editorSnapshot?'未修改':'已变化')+'</p><p>目标 / 弹药 / 在途守恒：'+(a.allPassed?'通过':'异常')+'</p>';
 $('play-checks').innerHTML+='<p>像素格形状：'+(Math.abs((g.pw/g.w)/(g.ph/g.h)-1)<.02?'近似正方形':'非正方形；物理宽高会改变图案比例')+'</p>';
 $('play-color-audit').innerHTML=g.initial.target.map((n,m)=>n||g.initial.ammo[m]?'<div class="play-color-line"><span><i class="dot" style="background:'+hex(m)+'"></i>'+colorNames[m]+' #'+m+'</span><span>'+n+' / '+g.initial.ammo[m]+(n!==g.initial.ammo[m]?' ⚠':'')+'</span></div>':'').join('')+'<small>每行：初始目标 / 初始弹药；差额可在编辑器调整。</small>';
 const names={launch:'上带',shot:'开火',hit:'命中',depleted:'弹尽',return:'回槽','exit-blocked':'出口满槽',won:'通过',failed:'失败'};
 $('play-events').textContent=g.events.slice(-10).map(e=>e.time.toFixed(2)+'s '+(names[e.type]||e.type)+(e.id!==undefined?' #'+e.id:'')+(e.ammo!==undefined?' 余弹'+e.ammo:'')).join('\n')||'尚无事件';
}
function runLaunch(kind,index){if(!game)return;const r=P.launch(game,kind,index);message(r.ok?'已投放；按所在侧自动射击前沿同色目标。':r.reason);refresh();}
function loadBuiltin(n){const entry=window.PIXEL_FLOW_FIRST10?.levels.find(l=>l.number===n);if(!entry)return;load(C.copy(entry.data),'Pixel Flow! 0.37.1 · 原版第'+n+'关（基础集合）');beginFrames();}
$('play-builtin-select').innerHTML=window.PIXEL_FLOW_FIRST10.levels.map(l=>'<option value="'+l.number+'">原版第 '+l.number+' 关</option>').join('');
$('play-builtin-load').onclick=()=>loadBuiltin(+$('play-builtin-select').value);

$('play-open').onclick=openCurrent;
$('play-close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{if(game)P.pause(game);cancelAnimationFrame(raf);accumulator=0;});
$('play-start').onclick=()=>{if(!game)return;if(game.status==='running')P.pause(game);else P.start(game);lastTime=0;refresh();};
$('play-restart').onclick=()=>{if(original){load(original,sourceLabel);beginFrames();}};
$('play-queues').onclick=e=>{const b=e.target.closest('[data-play-col]');if(b)runLaunch('queue',+b.dataset.playCol);};
$('play-waiting').onclick=e=>{const b=e.target.closest('[data-play-wait]');if(b)runLaunch('waiting',game.waiting.findIndex(s=>s.id===+b.dataset.playWait));};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&dialog.open){P.pause(game);lastTime=0;refresh();}});
$('play-load-open').onclick=()=>{if(game)P.pause(game);$('play-load-error').textContent='';loader.showModal();refresh();};
$('play-load-cancel').onclick=()=>loader.close();
function importPlay(text,label){try{if(text.length>10*1024*1024)throw Error('JSON 超过10MB。');const data=JSON.parse(text.replace(/^\uFEFF/,'').trim());C.validate(data,{allowSurprise:true});if(!data.PixelImageData.pixels.length)throw Error('空图不能试玩。');if(load(data,label)){loader.close();beginFrames();}}catch(e){$('play-load-error').textContent='读取失败：'+e.message;}}
$('play-load-confirm').onclick=()=>importPlay($('play-json').value,'外部 JSON');
$('play-file-choose').onclick=()=>$('play-file').click();
$('play-file').onchange=async()=>{const f=$('play-file').files[0];$('play-file').value='';if(!f)return;if(f.size>5*1024*1024){$('play-load-error').textContent='文件超过5MB。';return;}try{importPlay(await f.text(),'文件：'+f.name);}catch(e){$('play-load-error').textContent='无法读取文件，请粘贴 JSON 内容。';}};
$('play-report').onclick=()=>{if(!game)return;P.pause(game);refresh();const report={format:'pixel-play-validation-v1',...P.summary(game),source:sourceLabel,canonicalMatchesEditor:same,editorUnchanged:JSON.stringify(state.level)===editorSnapshot,input:C.copy(game.input),acceptedInputs:game.inputs,events:game.events,eventsDropped:game.eventsDropped,limitations:['本地核心规则近似，未逐帧对齐原版','结果不构成官方兼容性或可解性证明','难度面板另用简化调度模型']};$('play-report-text').value=JSON.stringify(report,null,2);$('play-report-dialog').showModal();};
$('play-report-close').onclick=()=>$('play-report-dialog').close();
$('play-report-download').onclick=()=>download(new Blob([$('play-report-text').value],{type:'application/json'}),'试玩验证记录.json');
})();

