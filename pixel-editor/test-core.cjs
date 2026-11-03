const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('./core.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/data.js','utf8'),context);const sample=JSON.parse(JSON.stringify(context.window.EDITOR_DATA.sample));
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('native example validates and balances',()=>{C.validate(sample);let c=C.counts(sample);assert.deepEqual(c.target,c.ammo);});
test('flood fills blank region but stops at boundary',()=>{let l=C.blank(sample,4,4);l.PixelImageData.pixels=Array.from({length:4},(_,y)=>({x:1,y,material:5,areaX:1,areaY:1}));C.flood(l,0,0,8);assert.equal(l.PixelImageData.pixels.filter(p=>p.material===8).length,4);assert.equal(l.PixelImageData.pixels.length,8);});
test('generation preserves each color supply exactly and creates unique IDs',()=>{let l=C.copy(sample);C.generate(l,17);C.validate(l);let c=C.counts(l);assert.deepEqual(c.target,c.ammo);assert.ok(l.QueueGroup.shooterQueues.flatMap(q=>q.shooters).every(s=>s.ammo<=17));});
test('unsupported mechanisms rejected instead of silently dropped',()=>{let l=C.copy(sample);l.PixelImageData.snakes={Snakes:[{Count:62}]};assert.throws(()=>C.validate(l),/snakes/);});
test('duplicate coordinates rejected',()=>{let l=C.copy(sample);l.PixelImageData.pixels.push(l.PixelImageData.pixels[0]);assert.throws(()=>C.validate(l),/重复像素/);});
test('duplicate shooter IDs rejected',()=>{let l=C.copy(sample);l.QueueGroup.shooterQueues[1].shooters[0].id=0;assert.throws(()=>C.validate(l),/射手/);});
test('out of bounds and invalid material rejected',()=>{for(const field of ['x','material']){let l=C.copy(sample);l.PixelImageData.pixels[0][field]=999;assert.throws(()=>C.validate(l),/像素/);}});
test('zero ammunition and fractional capacity rejected',()=>{let l=C.copy(sample);l.QueueGroup.shooterQueues[0].shooters[0].ammo=0;assert.throws(()=>C.validate(l),/射手/);l=C.copy(sample);l.SlotCount=1.5;assert.throws(()=>C.validate(l),/容量/);});
console.log(passed+' tests passed');

