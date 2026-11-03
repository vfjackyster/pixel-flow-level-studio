const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),P=require('./play-engine.js');
const file=process.argv[2]||path.join(__dirname,'试玩验证样例.json'),r=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(r.format,'pixel-play-validation-v1');assert.equal(r.version,P.VERSION);assert.ok(Number.isInteger(r.tick)&&r.tick>=0&&r.tick<1e7,'Invalid replay tick budget');
const g=P.create(r.input,r.params),inputs=r.acceptedInputs;assert.ok(Array.isArray(inputs));let i=0;
if(r.tick>0||inputs.length)P.start(g);
function apply(){while(i<inputs.length&&inputs[i].tick===g.tick){const a=inputs[i++],out=P.launch(g,a.kind,a.index);assert.ok(out.ok,'Recorded input rejected: '+JSON.stringify(a));assert.equal(g.inputs.at(-1).id,a.id);}}
while(g.tick<r.tick){apply();assert.equal(g.status,'running','Replay ended before recorded tick');P.step(g);}apply();if(r.status==='paused')P.pause(g);
assert.equal(i,inputs.length);assert.deepEqual(g.stats,r.stats);assert.equal(g.left,r.remaining);assert.deepEqual(P.audit(g),r.audit);assert.equal(P.fingerprint(g.sourceCanonical),r.contentFingerprint);
console.log(JSON.stringify({replayed:true,tick:g.tick,stats:g.stats,remaining:g.left,audit:P.audit(g)},null,2));

