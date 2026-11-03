/* Local pixel level editor with explicitly simplified scheduling analysis. */
'use strict';
const $=id=>document.getElementById(id),C=EditorCore,D=EDITOR_DATA;
const colorNames=['蓝','深蓝','黑','绿','橙','粉红','紫','红','青蓝','黄','白灰','棕','深绿','翡翠','淡紫','鼠尾草','鲑红','薰衣草','陶红','米黄','砖红','灰','深灰','暗紫','玫红','浅粉','浅橙','酒红','橄榄','灰青','浅棕','焦糖','霓紫','鲨灰'];
const hex=m=>'#'+D.palette[m].rgb.map(n=>n.toString(16).padStart(2,'0')).join('');
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const key='pixel-level-studio-draft-v1';
let state={title:'双色入门',level:C.copy(D.sample)},undoStack=[],redoStack=[],tool='brush',color=5,selected=null,selection=null,cell=22,showGrid=true,gesture=null,saveTimer,toastTimer,dragged=null,saveError=false;
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
function ask(title,message,callback){$('dialog-title').textContent=title;$('dialog-message').textContent=message;$('confirm-dialog').showModal();$('confirm').onclick=()=>{$('confirm-dialog').close();callback();};}
$('cancel').onclick=()=>$('confirm-dialog').close();
function snapshot(){return JSON.stringify(state);}
function record(before){if(before===snapshot())return;undoStack.push(before);if(undoStack.length>80)undoStack.shift();redoStack=[];mark();}
function edit(fn){const before=snapshot();fn();record(before);render();}
function mark(){clearTimeout(saveTimer);$('save-state').textContent='正在保存…';saveTimer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify({version:1,state}));$('save-state').textContent='草稿已保存';saveError=false;}catch(e){$('save-state').textContent='未保存，请导出备份';if(!saveError)notify('浏览器无法保存草稿，请导出 JSON 备份。');saveError=true;}},250);}
function restore(text){state=JSON.parse(text);selected=null;selection=null;render();mark();}
function undo(){if(!undoStack.length)return;redoStack.push(snapshot());restore(undoStack.pop());}
function redo(){if(!redoStack.length)return;undoStack.push(snapshot());restore(redoStack.pop());}
function nextId(){return Math.max(-1,...state.level.QueueGroup.shooterQueues.flatMap(q=>q.shooters.map(s=>s.id)))+1;}
function locate(id=selected){for(let c=0;c<queues().length;c++){let i=queues()[c].shooters.findIndex(s=>s.id===id);if(i>=0)return {c,i,s:queues()[c].shooters[i]};}return null;}
function queues(){return state.level.QueueGroup.shooterQueues;}
function pixelData(){return state.level.PixelImageData;}
function setPixel(x,y,m){const p=pixelData(),i=p.pixels.findIndex(v=>v.x===x&&v.y===y);if(m===null){if(i>=0)p.pixels.splice(i,1);}else if(i>=0)p.pixels[i].material=m;else p.pixels.push({x,y,material:m,areaX:1,areaY:1});}
function drawLine(a,b,m){let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=-Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,err=dx+dy;while(true){setPixel(x,y,m);if(x===b.x&&y===b.y)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}}
function rect(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.y-b.y)+1};}
function inside(p,r){return r&&p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.w&&p.y<r.y+r.h;}
function setTool(t){tool=t;document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===t);b.setAttribute('aria-pressed',b.dataset.tool===t);});$('tool-hint').textContent=({brush:'拖动画笔绘制；右键擦除。',erase:'拖动移除像素，保留透明空位。',fill:'点击填充相邻的同色区域或空白。',rect:'拖动绘制实心矩形。',pick:'点击像素取色，然后自动切回画笔。',select:'拖动框选；拖动选区移动。Delete 删除，Esc 取消。'})[t];}
function selectColor(m){color=m;$('current-swatch').style.background=hex(m);$('color-name').textContent=colorNames[m]+' · 材质 '+m;$('color-code').textContent=hex(m).toUpperCase();document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('selected',+b.dataset.color===m));}
function draw(){
 const p=pixelData(),cv=$('canvas');cv.width=p.width*cell;cv.height=p.height*cell;cv.style.width=cv.width+'px';cv.style.height=cv.height+'px';let ctx=cv.getContext('2d');
 for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){ctx.fillStyle=(x+y)%2?'#f5f6f2':'#ffffff';ctx.fillRect(x*cell,(p.height-1-y)*cell,cell,cell);}
 for(const v of p.pixels){ctx.fillStyle=hex(v.material);ctx.fillRect(v.x*cell,(p.height-1-v.y)*cell,cell,cell);}
 if(showGrid&&cell>=10){ctx.strokeStyle='#1f3b2c18';ctx.lineWidth=.5;ctx.beginPath();for(let x=0;x<=p.width;x++){ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,cv.height);}for(let y=0;y<=p.height;y++){ctx.moveTo(0,y*cell);ctx.lineTo(cv.width,y*cell);}ctx.stroke();}
 let r=selection;if(gesture&&(gesture.type==='rect'||gesture.type==='select'))r=rect(gesture.start,gesture.end);
 if(gesture&&gesture.type==='move'&&selection){r={...selection,x:selection.x+gesture.dx,y:selection.y+gesture.dy};}
 if(r){ctx.save();ctx.fillStyle='#196b5a24';ctx.fillRect(r.x*cell,(p.height-r.y-r.h)*cell,r.w*cell,r.h*cell);ctx.strokeStyle='#153f33';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.strokeRect(r.x*cell+1,(p.height-r.y-r.h)*cell+1,r.w*cell-2,r.h*cell-2);ctx.restore();}
 $('empty-guide').hidden=p.pixels.length>0;$('pixel-count').textContent=p.pixels.length+' 个像素';$('dimensions').textContent=p.width+' × '+p.height;$('zoom-label').textContent=cell+' px';
}
function textColor(m){let rgb=D.palette[m].rgb;return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>148?'#243b31':'white';}
function renderQueues(){
 $('queues').style.gridTemplateColumns='repeat('+queues().length+', minmax(38px,1fr))';
 $('queues').innerHTML=queues().map((q,c)=>'<div class="queue-column" data-col="'+c+'"><div class="queue-name">第 '+(c+1)+' 列 ↓</div>'+q.shooters.map(s=>'<button class="shooter '+(s.id===selected?'selected':'')+'" draggable="true" data-id="'+s.id+'" style="background:'+hex(s.material)+';color:'+textColor(s.material)+'" aria-label="第'+(c+1)+'列 '+colorNames[s.material]+'色射手 弹药'+s.ammo+'">'+s.ammo+'</button>').join('')+'<button class="queue-add" data-add="'+c+'" aria-label="向第'+(c+1)+'列添加射手">＋</button></div>').join('');
 $('shooter-count').textContent=queues().reduce((n,q)=>n+q.shooters.length,0)+' 个射手 / '+queues().length+' 列';
 $('shooter-column').innerHTML=queues().map((_,i)=>'<option value="'+i+'">第 '+(i+1)+' 列</option>').join('');
 const found=locate();$('shooter-fields').hidden=!found;$('shooter-placeholder').hidden=!!found;
 if(found){$('shooter-color').value=found.s.material;$('shooter-ammo').value=found.s.ammo;$('shooter-column').value=found.c;$('move-up').disabled=found.i===0;$('move-down').disabled=found.i===queues()[found.c].shooters.length-1;}
}
function renderBalance(){
 const {target,ammo}=C.counts(state.level),used=target.map((n,i)=>i).filter(i=>target[i]||ammo[i]);
 let total=target.reduce((a,b)=>a+b,0),off=used.filter(i=>target[i]!==ammo[i]).length;
 $('balance-status').textContent=!total?'尚未绘制图案':off?off+' 色未配平':'各色已配平';
 $('balance-rows').innerHTML='<div class="balance-row"><span>颜色</span><span>目标</span><span>弹药</span><span>差额</span></div>'+used.map(i=>{let d=ammo[i]-target[i];return '<div class="balance-row"><span class="color-label"><i class="dot" style="background:'+hex(i)+'"></i>'+colorNames[i]+' #'+i+'</span><span>'+target[i]+'</span><span>'+ammo[i]+'</span><span class="'+(d<0?'negative':d>0?'positive':'balanced')+'">'+(d>0?'+':'')+d+'</span></div>';}).join('');
}
function render(){
 const l=state.level,p=pixelData();$('title').value=state.title;$('width').value=p.width;$('height').value=p.height;$('slots').value=l.SlotCount;$('belt').value=l.ConveyorLimit;$('difficulty').value=l.Difficulty;$('physical-width').value=p.physicalWidth;$('physical-height').value=p.physicalHeight;$('columns').value=queues().length;
 $('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;draw();renderQueues();renderBalance();DifficultyUI.schedule(state.level);
}
function point(e){let r=$('canvas').getBoundingClientRect(),p=pixelData();return {x:Math.max(0,Math.min(p.width-1,Math.floor((e.clientX-r.left)/cell))),y:Math.max(0,Math.min(p.height-1,p.height-1-Math.floor((e.clientY-r.top)/cell)))};}
$('canvas').oncontextmenu=e=>e.preventDefault();
$('canvas').addEventListener('pointerdown',e=>{
 if(e.button!==0&&e.button!==2)return;e.preventDefault();$('canvas').focus();$('canvas').setPointerCapture(e.pointerId);
 let p=point(e),mode=e.button===2?'erase':tool;
 if(mode==='pick'){let v=pixelData().pixels.find(v=>v.x===p.x&&v.y===p.y);if(v){selectColor(v.material);setTool('brush');}return;}
 gesture={type:mode,start:p,end:p,last:p,before:snapshot(),dx:0,dy:0};
 if(mode==='select'&&inside(p,selection))gesture.type='move';
 else if(mode==='select')selection=null;
 if(mode==='brush'||mode==='erase'){selection=null;setPixel(p.x,p.y,mode==='erase'?null:color);}
 if(mode==='fill'){C.flood(state.level,p.x,p.y,color);}
 draw();
});
$('canvas').addEventListener('pointermove',e=>{let p=point(e);$('cursor').textContent='X '+p.x+' · Y '+p.y;if(!gesture)return;
 gesture.end=p;if(gesture.type==='brush'||gesture.type==='erase')drawLine(gesture.last,p,gesture.type==='erase'?null:color);
 if(gesture.type==='move'){gesture.dx=Math.max(-selection.x,Math.min(pixelData().width-selection.x-selection.w,p.x-gesture.start.x));gesture.dy=Math.max(-selection.y,Math.min(pixelData().height-selection.y-selection.h,p.y-gesture.start.y));}
 gesture.last=p;draw();
});
function endGesture(cancel=false){if(!gesture)return;const g=gesture;
 if(cancel){state=JSON.parse(g.before);gesture=null;render();return;}
 if(g.type==='rect'){let r=rect(g.start,g.end);for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)setPixel(x,y,color);}
 if(g.type==='select')selection=rect(g.start,g.end);
 if(g.type==='move'&&(g.dx||g.dy)){let picked=pixelData().pixels.filter(p=>inside(p,selection));pixelData().pixels=pixelData().pixels.filter(p=>!inside(p,selection));picked.forEach(p=>setPixel(p.x+g.dx,p.y+g.dy,p.material));selection={...selection,x:selection.x+g.dx,y:selection.y+g.dy};}
 gesture=null;record(g.before);render();
}
$('canvas').onpointerup=()=>endGesture();
$('canvas').onpointercancel=()=>endGesture(true);
$('canvas').addEventListener('lostpointercapture',()=>{if(gesture)endGesture();});
$('undo').onclick=undo;$('redo').onclick=redo;
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('palette').innerHTML=colorNames.map((name,i)=>'<button class="swatch" data-color="'+i+'" style="background:'+hex(i)+'" title="'+name+' · 材质 '+i+'" aria-label="'+name+' 材质 '+i+'"></button>').join('');
$('palette').onclick=e=>{let b=e.target.closest('[data-color]');if(b)selectColor(+b.dataset.color);};
$('shooter-color').innerHTML=colorNames.map((name,i)=>'<option value="'+i+'">'+i+' · '+name+'</option>').join('');
$('queues').onclick=e=>{
 let add=e.target.closest('[data-add]');if(add){const ammo=+$('default-ammo').value;if(!C.integer(ammo,1,9999))return notify('单体弹量须为 1 至 9999 的整数。');if(queues().flatMap(q=>q.shooters).length>=1000)return notify('最多支持 1000 个射手。');edit(()=>{selected=nextId();queues()[+add.dataset.add].shooters.push({id:selected,ammo,material:color});});return;}
 let b=e.target.closest('[data-id]');if(b){selected=+b.dataset.id;renderQueues();}
};
$('queues').ondragstart=e=>{let b=e.target.closest('[data-id]');if(!b)return;dragged=+b.dataset.id;e.dataTransfer.setData('text/plain',String(dragged));e.dataTransfer.effectAllowed='move';};
$('queues').ondragover=e=>{if(dragged===null)return;e.preventDefault();const col=e.target.closest('[data-col]');document.querySelectorAll('.dragover').forEach(x=>x.classList.remove('dragover'));if(col)col.classList.add('dragover');};
$('queues').ondragend=()=>{dragged=null;document.querySelectorAll('.dragover').forEach(x=>x.classList.remove('dragover'));};
$('queues').ondrop=e=>{e.preventDefault();const col=e.target.closest('[data-col]');if(!col||dragged===null)return;let from=locate(dragged),b=e.target.closest('[data-id]');if(!from)return;let targetId=b?+b.dataset.id:null,c=+col.dataset.col;if(targetId===dragged)return;
 edit(()=>{queues()[from.c].shooters.splice(from.i,1);let target=targetId===null?queues()[c].shooters.length:queues()[c].shooters.findIndex(s=>s.id===targetId);queues()[c].shooters.splice(Math.max(0,target),0,from.s);selected=from.s.id;});dragged=null;
};
$('shooter-color').onchange=()=>{let f=locate();if(f)edit(()=>f.s.material=+$('shooter-color').value);};
$('shooter-ammo').onchange=()=>{let f=locate(),n=+$('shooter-ammo').value;if(!C.integer(n,1,9999)){notify('弹药须为 1 至 9999 的整数。');return renderQueues();}if(f)edit(()=>f.s.ammo=n);};
$('shooter-column').onchange=()=>{let f=locate(),c=+$('shooter-column').value;if(f&&f.c!==c)edit(()=>{queues()[f.c].shooters.splice(f.i,1);queues()[c].shooters.push(f.s);});};
function shiftShooter(d){let f=locate();if(f&&f.i+d>=0&&f.i+d<queues()[f.c].shooters.length)edit(()=>{let list=queues()[f.c].shooters;[list[f.i],list[f.i+d]]=[list[f.i+d],list[f.i]];});}
$('move-up').onclick=()=>shiftShooter(-1);$('move-down').onclick=()=>shiftShooter(1);
$('delete-shooter').onclick=()=>{let f=locate();if(f)edit(()=>{queues()[f.c].shooters.splice(f.i,1);selected=null;});};
$('duplicate').onclick=()=>{let f=locate();if(!f)return;if(queues().flatMap(q=>q.shooters).length>=1000)return notify('最多支持 1000 个射手。');edit(()=>{selected=nextId();queues()[f.c].shooters.splice(f.i+1,0,{...f.s,id:selected});});};
$('columns').onchange=()=>{let n=+$('columns').value,old=queues().length;function apply(){edit(()=>{if(n>old)for(let i=old;i<n;i++)queues().push({shooters:[]});else{let extras=queues().splice(n).flatMap(q=>q.shooters);extras.forEach((s,i)=>queues()[i%n].shooters.push(s));}});}
 if(n<old&&queues().slice(n).some(q=>q.shooters.length)){$('columns').value=old;ask('减少队列列数','被移除列中的射手将依次追加到保留列末尾，不会删除。',apply);}else apply();
};
$('generate').onclick=()=>{let max=+$('default-ammo').value;if(!C.integer(max,1,9999))return notify('单体弹量须为正整数。');if(!pixelData().pixels.length)return notify('请先绘制图案。');if(C.counts(state.level).target.reduce((n,x)=>n+Math.ceil(x/max),0)>1000)return notify('生成数量超过 1000，请增大单体弹量。');ask('重新生成射手队列','将替换当前所有射手，按颜色拆分弹药并轮流放入各列。只保证数量配平，不保证可通关。',()=>{edit(()=>{C.generate(state.level,max);selected=null;});notify('已生成配平队列，可以继续调整顺序。');});};
$('resize').onclick=()=>{let w=+$('width').value,h=+$('height').value;if(!C.integer(w,4,160)||!C.integer(h,4,160))return notify('宽高须为 4 至 160 的整数。');
 const crop=pixelData().pixels.filter(p=>p.x>=w||p.y>=h).length;const apply=()=>edit(()=>{pixelData().width=w;pixelData().height=h;pixelData().pixels=pixelData().pixels.filter(p=>p.x<w&&p.y<h);selection=null;});
 if(crop)ask('调整画布尺寸','左下角位置保留，边界外的 '+crop+' 个像素会被裁去。可以撤销。',apply);else apply();
};
for(const [id,prop] of [['slots','SlotCount'],['belt','ConveyorLimit']])$(id).onchange=()=>{let n=+$(id).value;if(!C.integer(n,1,20)){notify('容量须为 1 至 20 的整数。');return render();}edit(()=>state.level[prop]=n);};
for(const [id,prop]of [['physical-width','physicalWidth'],['physical-height','physicalHeight']])$(id).onchange=()=>{let n=+$(id).value;if(!Number.isFinite(n)||n<1||n>30){notify('物理尺寸须在 1 至 30 之间。');return render();}edit(()=>pixelData()[prop]=n);};
$('difficulty').onchange=()=>edit(()=>state.level.Difficulty=$('difficulty').value);
$('title').onchange=()=>edit(()=>state.title=$('title').value.trim()||'未命名关卡');
$('flip').onclick=()=>edit(()=>{let p=pixelData();p.pixels.forEach(v=>v.x=p.width-1-v.x);selection=null;});
$('grid').onclick=()=>{showGrid=!showGrid;$('grid').setAttribute('aria-pressed',showGrid);draw();};
$('zoom').oninput=()=>{cell=+$('zoom').value;draw();};
function fit(){cell=Math.max(6,Math.min(36,Math.floor(Math.min(($('canvas-wrap').clientWidth-65)/pixelData().width,450/pixelData().height))));$('zoom').value=cell;draw();}
$('fit').onclick=fit;
$('clear').onclick=()=>ask('清空图案','射手队列保留，图案会被清空。此操作可以撤销。',()=>edit(()=>{pixelData().pixels=[];selection=null;}));
$('new').onclick=()=>ask('创建新关卡','当前内容将替换为空白关卡；可以撤销。建议先导出重要作品。',()=>{edit(()=>{state={title:'未命名关卡',level:C.blank(D.sample)};selected=null;selection=null;});fit();});
$('example').onclick=()=>ask('载入双色入门','用已解码的基础第 1 关替换当前内容。此操作可以撤销。',()=>{edit(()=>{state={title:'双色入门',level:C.copy(D.sample)};selected=null;selection=null;});fit();});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function filename(){return (state.title||'未命名关卡').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60);}
$('export').onclick=()=>{try{C.validate(state.level);}catch(e){return notify(e.message);}if(!pixelData().pixels.length)return notify('请先绘制图案再导出。');
 const save=()=>{let l=C.exportLevel(state.level);download(new Blob([JSON.stringify(l,null,2)],{type:'application/json'}),filename()+'.json');notify('关卡已导出。文件不包含通关验证结果。');};
 const {target,ammo}=C.counts(state.level);if(target.some((n,i)=>n!==ammo[i]))ask('颜色弹药尚未配平','允许保存制作中的关卡。当前弹量与目标不一致，仍然导出吗？',save);else save();
};
$('png').onclick=()=>{const p=pixelData(),cv=document.createElement('canvas');cv.width=p.width*12;cv.height=p.height*12;let ctx=cv.getContext('2d');p.pixels.forEach(v=>{ctx.fillStyle=hex(v.material);ctx.fillRect(v.x*12,(p.height-1-v.y)*12,12,12);});cv.toBlob(b=>{if(b)download(b,filename()+'.png');});};
$('import').onclick=()=>$('import-dialog').showModal();
$('import-cancel').onclick=()=>$('import-dialog').close();
$('choose-file').onclick=()=>{$('import-dialog').close();$('file').click();};
$('import-paste').onclick=()=>{let text=$('import-text').value;if(!text.trim())return notify('请先粘贴关卡内容。');$('import-dialog').close();importText(text,'粘贴导入');};
$('file').onchange=async()=>{const f=$('file').files[0];$('file').value='';if(!f)return;if(f.size>5*1024*1024)return notify('文件超过 5 MB，暂不支持。');try{await importText(await f.text(),f.name);}catch(e){notify('无法读取文件，可改为粘贴 JSON 内容导入。');}};
async function importText(text,name){try{text=text.replace(/^\uFEFF/,'').trim();if(text.startsWith('gzip:')){
 if(typeof DecompressionStream==='undefined')throw Error('当前浏览器无法读取压缩关卡，请导入解码 JSON。');
 let bytes=Uint8Array.from(atob(text.slice(5)),c=>c.charCodeAt(0));const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let chunks=[],size=0;try{while(true){let {value,done}=await reader.read();if(done)break;size+=value.length;if(size>10*1024*1024)throw Error('解压后文件过大。');chunks.push(value);}}finally{reader.cancel().catch(()=>{});}text=await new Blob(chunks).text();}
 const l=JSON.parse(text);C.validate(l);ask('导入关卡','用 '+name+' 替换当前内容。此操作可以撤销。',()=>{edit(()=>{state={title:name.replace(/\.[^.]+$/,''),level:C.copy(l)};selected=null;selection=null;});fit();notify('关卡导入成功。');});
 }catch(e){notify('导入失败：'+e.message);}

}
document.addEventListener('keydown',e=>{
 const typing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName);if($('confirm-dialog').open||$('import-dialog').open||$('image-dialog').open||$('play-dialog').open||$('play-load-dialog').open)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();$('export').click();return;}
 if(typing)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
 if(e.key==='Escape'){selection=null;draw();}
 if((e.key==='Delete'||e.key==='Backspace')&&selection){e.preventDefault();edit(()=>{pixelData().pixels=pixelData().pixels.filter(p=>!inside(p,selection));selection=null;});}
 if(!e.ctrlKey&&!e.metaKey){const t={b:'brush',e:'erase',f:'fill',r:'rect',i:'pick',v:'select'}[e.key.toLowerCase()];if(t)setTool(t);}
});
try{const stored=localStorage.getItem(key);if(stored){const d=JSON.parse(stored);if(d.version!==1||!d.state||typeof d.state.title!=='string')throw Error('草稿格式无效');C.validate(d.state.level);state=d.state;$('save-state').textContent='已恢复本地草稿';}}catch(e){notify('未能恢复本地草稿，已载入基础示例。请使用导出的 JSON 备份。');}
setTool('brush');selectColor(color);render();requestAnimationFrame(fit);


$('apply-shooter').onclick=()=>{const f=locate(),ammo=+$('shooter-ammo').value,m=+$('shooter-color').value,col=+$('shooter-column').value;if(!f)return;if(!C.integer(ammo,1,9999))return notify('弹药须为 1 至 9999 的整数。');edit(()=>{f.s.ammo=ammo;f.s.material=m;if(f.c!==col){queues()[f.c].shooters.splice(f.i,1);queues()[col].shooters.push(f.s);}});notify('射手属性已应用。');};
$('apply-settings').onclick=()=>{const slots=+$('slots').value,belt=+$('belt').value,w=+$('physical-width').value,h=+$('physical-height').value,d=$('difficulty').value;if(!C.integer(slots,1,20)||!C.integer(belt,1,20))return notify('容量须为 1 至 20 的整数。');if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||w>30||h<1||h>30)return notify('物理尺寸须在 1 至 30 之间。');edit(()=>{Object.assign(state.level,{SlotCount:slots,ConveyorLimit:belt,Difficulty:d});pixelData().physicalWidth=w;pixelData().physicalHeight=h;});notify('关卡设置已应用。');};
$('title').oninput=()=>{const before=snapshot();state.title=$('title').value.trim()||'未命名关卡';record(before);$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;};
