from pathlib import Path
p=Path('pixel-editor')
model=r"""(function(root,factory){const api=factory();if(typeof module!=='undefined')module.exports=api;else root.ImageLevel=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function nearest(rgb,ids,palette){let best=ids[0],d=Infinity;for(const id of ids){let n=distance(rgb,palette[id].rgb);if(n<d){d=n;best=id;}}return best;}
function convert(source,w,h,options,palette){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<4||h<4||w>160||h>160)throw Error('目标宽高须为 4 至 160 的整数。');
 const sw=source.width,sh=source.height,src=source.data;if(!Number.isInteger(sw)||!Number.isInteger(sh)||sw<1||sh<1||src.length!==sw*sh*4)throw Error('图像数据无效。');
 const mode=options.fit||'contain',limit=options.colors??12,threshold=options.alpha??32;
 if(!['contain','cover','stretch'].includes(mode)||!Number.isInteger(limit)||limit<2||limit>34||!Number.isInteger(threshold)||threshold<0||threshold>255)throw Error('转换参数无效。');
 let sx=w/sw,sy=h/sh;if(mode!=='stretch'){sx=sy=mode==='cover'?Math.max(sx,sy):Math.min(sx,sy);}const ox=(w-sw*sx)/2,oy=(h-sh*sy)/2;
 const ids=Object.keys(palette).map(Number).sort((a,b)=>a-b),cells=[],hist=Array(34).fill(0);
 for(let row=0;row<h;row++)for(let col=0;col<w;col++){
 const x0=Math.max(0,(col-ox)/sx),x1=Math.min(sw,(col+1-ox)/sx),y0=Math.max(0,(row-oy)/sy),y1=Math.min(sh,(row+1-oy)/sy);
 if(x1<=x0||y1<=y0)continue;
 let sum=0,r=0,g=0,b=0;
 for(let y=Math.floor(y0);y<Math.ceil(y1);y++)for(let x=Math.floor(x0);x<Math.ceil(x1);x++){
 const area=(Math.min(x+1,x1)-Math.max(x,x0))*(Math.min(y+1,y1)-Math.max(y,y0)),i=(y*sw+x)*4,a=area*src[i+3]/255;sum+=a;r+=src[i]*a;g+=src[i+1]*a;b+=src[i+2]*a;
 }
 if(sum<=1e-12||sum*sx*sy*255+1e-7<threshold)continue;
 const rgb=[r/sum,g/sum,b/sum],material=nearest(rgb,ids,palette);hist[material]++;cells.push({col,row,rgb,material});
 }
 const keep=ids.filter(id=>hist[id]).sort((a,b)=>hist[b]-hist[a]||a-b).slice(0,limit);
 const counts=Array(34).fill(0),preview=new Uint8ClampedArray(w*h*4),pixels=[];
 for(const c of cells){const m=keep.includes(c.material)?c.material:nearest(c.rgb,keep,palette);counts[m]++;pixels.push({x:c.col,y:h-1-c.row,material:m,areaX:1,areaY:1});const i=(c.row*w+c.col)*4;preview.set([...palette[m].rgb,255],i);}
 return {width:w,height:h,pixels,counts,preview,colorCount:counts.filter(Boolean).length,empty:w*h-pixels.length};
}
return {convert,nearest,distance};
});
"""
(p/'image-level.js').write_text(model,encoding='utf-8')
dialog="""<dialog id="image-dialog" class="image-dialog"><div class="image-heading"><div><h2>图片生成关卡</h2><p>图片像素化 → 近似到材质色 → 适配画布 → 生成射手</p></div><button id="image-close" aria-label="关闭图片生成">✕</button></div><div id="image-drop" tabindex="0" role="button" aria-label="选择、拖入或粘贴图片"><strong>选择图片，或把图片拖到这里</strong><span>支持 PNG / JPG / WebP，最大 12 MB。也可聚焦此处后 Ctrl+V 粘贴图片。</span><button id="image-choose" type="button">选择图片</button></div><input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" hidden><p id="image-info" role="status">图片只在本机浏览器中处理。</p><div class="image-options"><label>画布宽<input id="image-width" type="number" min="4" max="160" value="32"></label><label>画布高<input id="image-height" type="number" min="4" max="160" value="32"></label><label class="check-label"><input id="image-aspect" type="checkbox" checked>锁定原图比例</label><label>适配方式<select id="image-fit"><option value="contain">完整保留，空白留边</option><option value="cover">填满画布，居中裁切</option><option value="stretch">拉伸到指定宽高</option></select></label><label>最多用色<select id="image-colors"><option>2</option><option>4</option><option>6</option><option>8</option><option selected>12</option><option>16</option><option>24</option><option>34</option></select></label><label>透明阈值<input id="image-alpha" type="number" min="0" max="255" value="32"></label></div><div class="image-previews"><figure><figcaption>原图</figcaption><div class="checker"><img id="image-original" alt="待转换的原图" hidden></div></figure><figure><figcaption>关卡预览 · 近似材质色</figcaption><div class="checker"><canvas id="image-preview" aria-label="生成关卡的像素预览"></canvas></div></figure></div><div id="image-stats" role="status">选择图片后查看转换结果。</div><div id="image-color-list"></div><details class="image-method"><summary>像素化与近似颜色如何处理？</summary><p>将原图按所选方式适配到目标网格，每格取覆盖区域的透明度加权平均色，再按 RGB 欧氏距离选最接近的34色材质。限制用色时保留出现最多的材质色，其余像素重新映射到这些颜色。不加抖动，减少零碎色点。透明覆盖低于阈值的格子留空；图片的白色背景仍是像素目标。</p><p>会按各色像素数量拆分弹药，并生成配平队列。生成不等于已证明可通关；超过1600像素或160射手时，当前难度面板只提供结构指标。关卡的等待槽、传送带容量、物理尺寸和难度标签沿用当前设置。</p></details><div class="image-footer"><span>生成将替换图案与射手队列，可以整步撤销。</span><button id="image-cancel">取消</button><button id="image-create" class="primary" disabled>生成并替换当前关卡</button></div></dialog>"""
index=(p/'index.html').read_text(encoding='utf-8')
index=index.replace('<button id="import">导入</button>','<button id="image-open">图片生成</button><button id="import">导入 JSON</button>')
index=index.replace('<dialog id="confirm-dialog">',dialog+'<dialog id="confirm-dialog">')
index=index.replace('<script src="difficulty.js"></script>','<script src="image-level.js"></script><script src="difficulty.js"></script>')
index=index.replace('<script src="app.js"></script>','<script src="app.js"></script><script src="image-ui.js"></script>')
(p/'index.html').write_text(index,encoding='utf-8')
app=(p/'app.js').read_text(encoding='utf-8')
app=app.replace("if($('confirm-dialog').open||$('import-dialog').open)return;","if($('confirm-dialog').open||$('import-dialog').open||$('image-dialog').open)return;")
(p/'app.js').write_text(app,encoding='utf-8')
css="""
.image-dialog{width:min(900px,96vw);max-width:900px;max-height:92vh;overflow:auto;padding:24px}.image-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.image-heading p{font-size:12px;margin:8px 0 16px}.image-heading h2{font-size:19px}#image-drop{border:1px dashed #a7bdae;border-radius:6px;padding:16px;background:#f4f8f3;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;outline-offset:3px}#image-drop strong{font-size:13px}#image-drop span{font-size:11px;color:#718477;text-align:center}#image-drop.dragover{background:#dfeddf;border-color:#2f7b58}#image-info{font-size:11px;line-height:1.6}.image-options{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 20px;margin:16px 0}.image-options label{min-width:0}.image-options select{max-width:160px}.check-label{justify-content:flex-start}.check-label input{accent-color:#166957}.image-previews{display:grid;grid-template-columns:1fr 1fr;gap:16px}.image-previews figure{margin:0;min-width:0}.image-previews figcaption{font-size:11px;color:#637c6b;margin-bottom:8px}.checker{height:245px;border:1px solid #dbe4d8;display:flex;align-items:center;justify-content:center;overflow:hidden;background-color:#fff;background-image:linear-gradient(45deg,#e7ece5 25%,transparent 25%),linear-gradient(-45deg,#e7ece5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e7ece5 75%),linear-gradient(-45deg,transparent 75%,#e7ece5 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;border-radius:5px}.checker img{max-width:100%;max-height:100%;object-fit:contain}.checker canvas{box-shadow:none;max-width:100%;max-height:100%;image-rendering:pixelated;background:transparent;cursor:default}#image-stats{font-size:12px;line-height:1.8;padding-top:12px}#image-color-list{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.image-color-chip{display:flex;gap:5px;align-items:center;font-size:10px;color:#617666;background:#f1f5ef;padding:4px 7px;border-radius:4px}.image-method{font-size:11px;line-height:1.8;color:#6e7c70;margin:12px 0}.image-method summary{cursor:pointer;color:#166957}.image-method p{font-size:11px;line-height:1.9;margin:8px 0}.image-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;border-top:1px solid #e4eae1;padding-top:16px;margin-top:12px}.image-footer>span{margin-right:auto;font-size:11px;color:#86907f}@media(max-width:700px){.image-dialog{padding:16px;max-height:95vh}.image-options{grid-template-columns:1fr 1fr;gap:10px}.image-options select{max-width:130px}.image-previews{gap:8px}.checker{height:165px}.image-footer{flex-wrap:wrap}.image-footer>span{width:100%;margin-bottom:4px}nav{flex-wrap:wrap}nav button{flex:1}header #title{max-width:45vw}}"""
with (p/'style.css').open('a',encoding='utf-8') as f:f.write(css)
bundle=(p/'bundle.py').read_text(encoding='utf-8').replace("'difficulty.js','difficulty-ui.js','app.js'","'image-level.js','difficulty.js','difficulty-ui.js','app.js','image-ui.js'")
(p/'bundle.py').write_text(bundle,encoding='utf-8')
print('image conversion module and dialog ready')

