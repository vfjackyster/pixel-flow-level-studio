(function(root,factory){const api=factory();if(typeof module!=='undefined')module.exports=api;else root.ImageLevel=api;})(typeof window!=='undefined'?window:globalThis,function(){
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
