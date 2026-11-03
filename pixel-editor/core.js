(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
function blank(template,w=20,h=20){let l=copy(template); l.PixelImageData.width=w;l.PixelImageData.height=h;l.PixelImageData.pixels=[];l.QueueGroup.shooterQueues=Array.from({length:4},()=>({shooters:[]}));l.contentHash=0;l.isValid=false;l.validationErrors=[];return l;}
function counts(level){let target=Array(34).fill(0),ammo=Array(34).fill(0);for(const p of level.PixelImageData.pixels)target[p.material]++;for(const q of level.QueueGroup.shooterQueues)for(const s of q.shooters)ammo[s.material]+=s.ammo;return {target,ammo};}
function hasData(v){if(Array.isArray(v))return v.length>0;if(v&&typeof v==='object')return Object.values(v).some(hasData);return v!==null&&v!==false&&v!==0&&v!=='';}
function validate(l,options={}){
 if(!l||typeof l!=='object')throw Error('文件不是有效的关卡对象。');
 const p=l.PixelImageData,q=l.QueueGroup;
 if(!p||!q||!Array.isArray(p.pixels)||!Array.isArray(q.shooterQueues))throw Error('缺少 PixelImageData 或 QueueGroup。请导入本编辑器或已解码的基础关卡。');
 if(!integer(p.width,4,160)||!integer(p.height,4,160))throw Error('画布宽高须为 4 至 160 的整数。');
 for(const k of ['physicalWidth','physicalHeight'])if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<1||p[k]>30)throw Error('物理尺寸须在 1 至 30 之间。');
 if(!integer(l.SlotCount,1,20)||!integer(l.ConveyorLimit,1,20))throw Error('容量须为 1 至 20 的整数。');
 if(l.HasTimeLimit)throw Error('第一版不支持计时关卡。');
 if(!['Very Easy','Easy','Medium','Hard','Very Hard','Ultra Hard'].includes(l.Difficulty))throw Error('无法识别难度标签。');
 const top=new Set(['Difficulty','HasTimeLimit','TimeLimit','SlotCount','ConveyorLimit','QueueGroup','PixelImageData','contentHash','isValid','validationErrors']);
 if(options.allowSurprise)top.add('SurpriseShooters');
 const pix=new Set(['width','height','physicalWidth','physicalHeight','pixels','Preview','contentHash']);
 for(const [k,v]of Object.entries(l))if(!top.has(k)&&hasData(v))throw Error('包含暂不支持的机关或字段：'+k+'。未修改当前草稿。');
 for(const [k,v]of Object.entries(p))if(!pix.has(k)&&hasData(v))throw Error('包含暂不支持的机关或字段：'+k+'。未修改当前草稿。');
 const seen=new Set();
 for(const v of p.pixels){if(!integer(v.x,0,p.width-1)||!integer(v.y,0,p.height-1)||!integer(v.material,0,33)||v.areaX!==1||v.areaY!==1)throw Error('像素坐标、材质或面积无效，仅支持 1×1 像素。');const key=v.x+','+v.y;if(seen.has(key))throw Error('存在重复像素坐标。');seen.add(key);}
 if(!integer(q.shooterQueues.length,2,5))throw Error('射手队列须为 2 至 5 列。');
 const ids=new Set();let n=0;
 for(const col of q.shooterQueues){if(!col||!Array.isArray(col.shooters))throw Error('队列数据不完整。');for(const s of col.shooters){n++;if(Object.entries(s).some(([k,v])=>!['id','ammo','material'].includes(k)&&hasData(v)))throw Error('射手包含暂不支持的附加字段。');if(!integer(s.id,0,1e8)||ids.has(s.id)||!integer(s.ammo,1,9999)||!integer(s.material,0,33))throw Error('射手 ID、颜色或弹药无效。');ids.add(s.id);}}
 if(n>1000)throw Error('最多支持 1000 个射手。');
 if(options.allowSurprise&&l.SurpriseShooters!==undefined){const v=l.SurpriseShooters;if(!v||Array.isArray(v)||typeof v!=='object'||!Array.isArray(v.Shooters)||Object.keys(v).some(k=>k!=='Shooters'))throw Error('隐藏射手数据格式无效。');const seenIds=new Set();for(const id of v.Shooters){if(!integer(id,0,1e8)||!ids.has(id)||seenIds.has(id))throw Error('隐藏射手ID重复或找不到对应射手。');seenIds.add(id);}}

 return true;
}
function flood(l,x,y,mat){const p=l.PixelImageData,map=new Map(p.pixels.map(v=>[v.x+','+v.y,v.material]));const old=map.get(x+','+y);if(old===mat)return;const todo=[[x,y]],visited=new Set();while(todo.length){const [a,b]=todo.pop(),key=a+','+b;if(a<0||b<0||a>=p.width||b>=p.height||visited.has(key)||map.get(key)!==old)continue;visited.add(key);if(mat===null)map.delete(key);else map.set(key,mat);todo.push([a-1,b],[a+1,b],[a,b-1],[a,b+1]);}p.pixels=Array.from(map,([key,material])=>{const [x,y]=key.split(',').map(Number);return {x,y,material,areaX:1,areaY:1};});}
function generate(l,max){let c=counts(l).target,qs=l.QueueGroup.shooterQueues;qs.forEach(q=>q.shooters=[]);let id=0;while(c.some(n=>n>0)){for(let m=0;m<34;m++)if(c[m]>0){let ammo=Math.min(max,c[m]);qs[id%qs.length].shooters.push({id,ammo,material:m});c[m]-=ammo;id++;}}}
function exportLevel(level){validate(level);const l=copy(level);l.contentHash=0;l.PixelImageData.contentHash=0;l.PixelImageData.Preview={instanceID:0};l.isValid=false;l.validationErrors=['Editor export: structural checks only; solvability not verified.'];return l;}
const api={copy,blank,counts,validate,flood,generate,integer,exportLevel};
if(typeof module!=='undefined')module.exports=api;else root.EditorCore=api;
})(typeof window!=='undefined'?window:globalThis);
