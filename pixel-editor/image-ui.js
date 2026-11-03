/* Local image decoding and preview. Source image is never stored in the level. */
(()=>{
const dialog=$('image-dialog');let source=null,result=null,sourceName='',loadId=0,timer=null;
function emptyPreview(message){result=null;$('image-create').disabled=true;$('image-stats').textContent=message;$('image-color-list').textContent='';const cv=$('image-preview');cv.width=cv.height=1;cv.style.width='1px';cv.style.height='1px';}
function number(id){return +$(id).value;}
function updateRatio(changed){if(!source||!$('image-aspect').checked)return;const ratio=source.originalHeight/source.originalWidth;
 if(changed==='height'){let h=number('image-height');if(C.integer(h,4,160))$('image-width').value=Math.max(4,Math.min(160,Math.round(h/ratio)));}
 else {let w=number('image-width');if(C.integer(w,4,160))$('image-height').value=Math.max(4,Math.min(160,Math.round(w*ratio)));}
}
function preview(){
 if(!source)return;try{
 const w=number('image-width'),h=number('image-height'),ammo=number('image-ammo'),columns=number('image-columns');
 if(!C.integer(ammo,1,9999)||!C.integer(columns,2,5))throw Error('单体弹量须为 1–9999，队列须为 2–5 列。');
 const converted=ImageLevel.convert(source,w,h,{fit:$('image-fit').value,colors:number('image-colors'),alpha:number('image-alpha')},D.palette);
 const n=converted.counts.reduce((a,b)=>a+Math.ceil(b/ammo),0);
 const cv=$('image-preview');cv.width=w;cv.height=h;cv.getContext('2d').putImageData(new ImageData(converted.preview,w,h),0,0);
 const maxHeight=window.innerWidth<=700?160:240,scale=Math.min(380/w,maxHeight/h);cv.style.width=(w*scale)+'px';cv.style.height=(h*scale)+'px';
 let message=w+' × '+h+' 格 · '+converted.pixels.length+' 个有效像素 · '+converted.colorCount+' 色 · '+n+' 个射手';
 if(converted.pixels.length>1600||n>160)message+='。超过实时模拟范围，生成后只显示结构指标。';
 if(!converted.pixels.length)message+='。图案为空，请降低透明阈值或更换图片。';
 if(n>1000)message+='。超过 1000 个射手，请增大单体弹量。';
 $('image-stats').textContent=message;$('image-color-list').innerHTML=converted.counts.map((n,i)=>n?'<span class="image-color-chip"><i class="dot" style="background:'+hex(i)+'"></i>'+colorNames[i]+' '+n+'</span>':'').join('');
 result={...converted,ammo,columns,shooters:n};$('image-create').disabled=!converted.pixels.length||n>1000;
 }catch(e){emptyPreview(e.message);}
}
function schedule(changed){clearTimeout(timer);$('image-create').disabled=true;result=null;updateRatio(changed);if(source){$('image-stats').textContent='正在更新像素预览…';timer=setTimeout(preview,120);}}
async function loadImage(file){
 const id=++loadId;clearTimeout(timer);source=null;$('image-original').hidden=true;$('image-original').removeAttribute('src');emptyPreview('正在读取图片…');$('image-info').textContent='图片仅在本机浏览器处理。';
 if(file.size>12*1024*1024){emptyPreview('图片超过 12 MB，请先压缩后导入。');return;}
 const allowed=['image/png','image/jpeg','image/webp'];
 if(!allowed.includes(file.type)&&!(file.type===''&&/\.(png|jpe?g|webp)$/i.test(file.name||''))){emptyPreview('仅支持 PNG、JPG、WebP 图片。');return;}
 let bitmap;
 try{
 bitmap=await createImageBitmap(file);
 if(id!==loadId){bitmap.close();return;}
 const w=bitmap.width,h=bitmap.height;if(w*h>24000000||w>16000||h>16000)throw Error('图片分辨率过大，请缩至 2400 万像素以下。');
 const scale=Math.min(1,2048/Math.max(w,h)),sw=Math.max(1,Math.round(w*scale)),sh=Math.max(1,Math.round(h*scale));
 const canvas=document.createElement('canvas');canvas.width=sw;canvas.height=sh;const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(bitmap,0,0,sw,sh);bitmap.close();bitmap=null;
 if(id!==loadId)return;
 source={width:sw,height:sh,originalWidth:w,originalHeight:h,data:context.getImageData(0,0,sw,sh).data};sourceName=(file.name||'图片关卡').replace(/\.[^.]+$/,'').slice(0,60)||'图片关卡';
 $('image-original').src=canvas.toDataURL('image/png');$('image-original').hidden=false;$('image-info').textContent=(file.name||'剪贴板图片')+' · '+w+' × '+h+' px'+(scale<1?' · 预处理长边缩至 2048 px':'')+' · 本机处理';
 updateRatio('width');preview();
 }catch(e){if(bitmap)bitmap.close();if(id!==loadId)return;source=null;emptyPreview('图片读取失败：'+e.message+'。可以尝试 Ctrl+V 粘贴图片，或重新保存为 PNG。');}
}
function open(){dialog.showModal();$('image-ammo').value=C.integer(+$('default-ammo').value,1,9999)?$('default-ammo').value:30;$('image-columns').value=queues().length;if(source)preview();}
$('image-open').onclick=open;
$('image-close').onclick=$('image-cancel').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{loadId++;clearTimeout(timer);});
$('image-choose').onclick=()=>$('image-file').click();
$('image-file').onchange=()=>{const f=$('image-file').files[0];$('image-file').value='';if(f)loadImage(f);};
const drop=$('image-drop');
drop.onclick=e=>{if(!e.target.closest('#image-choose'))$('image-file').click();};
drop.onkeydown=e=>{if(e.target===drop&&(e.key==='Enter'||e.key===' ')){e.preventDefault();$('image-file').click();}};
for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover');});
for(const type of ['dragleave','drop'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover');});
drop.addEventListener('drop',e=>{const file=e.dataTransfer.files[0];if(file)loadImage(file);});
document.addEventListener('paste',e=>{if(!dialog.open)return;const files=Array.from(e.clipboardData?.items||[]).filter(x=>x.kind==='file'&&x.type.startsWith('image/'));if(files.length){e.preventDefault();const f=files[0].getAsFile();if(f)loadImage(f);}});
for(const id of ['image-width','image-height','image-alpha','image-ammo'])$(id).oninput=()=>schedule(id==='image-height'?'height':'width');
for(const id of ['image-fit','image-colors','image-columns'])$(id).onchange=()=>schedule();
$('image-aspect').onchange=()=>schedule('width');
$('image-create').onclick=()=>{
 if(!result||!source)return;try{
 const next=C.blank(D.sample,result.width,result.height);next.PixelImageData.pixels=C.copy(result.pixels);
 for(const k of ['SlotCount','ConveyorLimit','Difficulty'])next[k]=state.level[k];
 next.PixelImageData.physicalWidth=pixelData().physicalWidth;next.PixelImageData.physicalHeight=pixelData().physicalHeight;
 next.QueueGroup.shooterQueues=Array.from({length:result.columns},()=>({shooters:[]}));C.generate(next,result.ammo);C.validate(next);
 edit(()=>{state={title:sourceName,level:next};selected=null;selection=null;});dialog.close();fit();notify('已生成 '+result.width+'×'+result.height+' 关卡与配平队列；可继续调整。');
 }catch(e){notify('生成失败：'+e.message);}
};
})();

