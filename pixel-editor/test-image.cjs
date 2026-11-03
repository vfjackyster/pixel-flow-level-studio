const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),I=require('./image-level.js'),C=require('./core.js');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/data.js','utf8'),ctx);const D=JSON.parse(JSON.stringify(ctx.window.EDITOR_DATA));let passes=0;
function test(n,f){f();passes++;console.log('PASS '+n);}
function image(w,h,fn){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(fn(x,y),(y*w+x)*4);return {width:w,height:h,data};}
const opt={fit:'stretch',colors:34,alpha:32};
test('exact material colors map without changing IDs',()=>{for(let m=0;m<34;m++){const r=I.convert(image(1,1,()=>[...D.palette[m].rgb,255]),4,4,opt,D.palette);assert.equal(r.colorCount,1);assert.equal(r.pixels[0].material,m);assert.equal(r.pixels.length,16);}});
test('source top row becomes high game y, with no vertical inversion',()=>{let r=I.convert(image(1,2,(x,y)=>[...D.palette[y?0:7].rgb,255]),4,4,opt,D.palette);assert.ok(r.pixels.filter(p=>p.y>=2).every(p=>p.material===7));assert.ok(r.pixels.filter(p=>p.y<2).every(p=>p.material===0));});
test('area averaging sees all contributing pixels',()=>{const palette={0:{rgb:[255,0,0]},1:{rgb:[0,0,255]},2:{rgb:[128,0,128]}};let r=I.convert(image(8,8,(x,y)=>(x+y)%2?[255,0,0,255]:[0,0,255,255]),4,4,opt,palette);assert.ok(r.pixels.every(p=>p.material===2));});
test('fully transparent cells remain empty, even at threshold zero',()=>{let r=I.convert(image(1,1,()=>[255,0,0,0]),4,4,{...opt,alpha:0},D.palette);assert.equal(r.pixels.length,0);assert.equal(r.empty,16);});
test('alpha threshold excludes low coverage and accepts threshold boundary',()=>{let src=image(1,1,()=>[...D.palette[3].rgb,31]);assert.equal(I.convert(src,4,4,opt,D.palette).pixels.length,0);assert.equal(I.convert(src,4,4,{...opt,alpha:31},D.palette).pixels.length,16);});
test('transparent RGB does not darken visible pixels',()=>{let src=image(8,8,(x,y)=>x%2?[0,0,0,0]:[...D.palette[7].rgb,255]);let r=I.convert(src,4,4,opt,D.palette);assert.ok(r.pixels.every(p=>p.material===7));});
test('contain preserves wide image and leaves empty letterbox rows',()=>{let r=I.convert(image(8,4,()=>[...D.palette[0].rgb,255]),4,4,{...opt,fit:'contain'},D.palette);assert.equal(r.pixels.length,8);assert.ok(r.pixels.every(p=>p.y===1||p.y===2));});
test('cover fills output and crops opposite side bands',()=>{let src=image(8,4,x=>[...D.palette[x<2||x>=6?7:0].rgb,255]),r=I.convert(src,4,4,{...opt,fit:'cover'},D.palette);assert.equal(r.pixels.length,16);assert.ok(r.pixels.every(p=>p.material===0));});
test('limited palette never emits more than configured colors',()=>{let src=image(12,12,(x,y)=>[...D.palette[(x+y)%12].rgb,255]),r=I.convert(src,12,12,{...opt,colors:4},D.palette);assert.equal(r.colorCount,4);assert.equal(r.counts.reduce((a,b)=>a+b,0),144);});
test('generated level is structurally valid and every color balances',()=>{let r=I.convert(image(32,20,(x,y)=>[x*8,y*12,100,255]),32,20,{...opt,colors:8},D.palette),l=C.blank(D.sample,32,20);l.PixelImageData.pixels=r.pixels;C.generate(l,30);C.validate(l);const c=C.counts(l);assert.deepEqual(c.target,c.ammo);});
test('invalid size and conversion options are rejected',()=>{let src=image(1,1,()=>[0,0,0,255]);assert.throws(()=>I.convert(src,3,4,opt,D.palette),/宽高/);assert.throws(()=>I.convert(src,4,4,{...opt,colors:35},D.palette),/参数/);});
console.log(passes+' image tests passed');

