import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {start,step,status,validate,analyze} from './puzzle-lab.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const summary=read('results/summary.json'),levels=read('results/levels.json');
const byId=new Map(levels.map(l=>[l.id,l])),totals=new Map();
const lines=fs.readFileSync(path.join(root,'results/agent-traces.jsonl'),'utf8').trim().split('\n');
for(const line of lines){
 const t=JSON.parse(line),l=byId.get(t.levelId);validate(l);let s=start(l);
 for(const a of t.actions)s=step(l,s,a);
 assert.deepEqual(s,t.finalState);assert.equal(status(l,s)==='win',t.win);
 const z=totals.get(t.policy)||{games:0,wins:0};z.games++;z.wins+=Number(t.win);totals.set(t.policy,z);
}
for(const row of summary.benchmark.rows){assert.equal(totals.get(row.policy).games,row.games);assert.equal(totals.get(row.policy).wins,row.wins);}
assert.equal(lines.length,14400);
const g=read('results/generated.json'),canonical=new Set();
for(const item of g.accepted){
 assert(!canonical.has(item.canonical));canonical.add(item.canonical);let s=start(item.level);
 for(const [i,a] of item.certificate.path.entries()){s=step(item.level,s,a);assert.deepEqual(s,item.certificate.replay[i].state);}
 assert.equal(status(item.level,s),'win');
 const a=analyze(item.level);assert.equal(a.initial.safe/a.initial.legal,item.metrics.initialSafeRatio);
 assert(item.metrics.initialSafeRatio>=g.specification.initial_safe_ratio[0]&&item.metrics.initialSafeRatio<=g.specification.initial_safe_ratio[1]);
 assert(a.forcedStates>=g.specification.min_forced_states);
}
assert.throws(()=>analyze(levels[0],0),/ANALYSIS_UNKNOWN_NODE_BUDGET/);
const doc=fs.readFileSync(path.join(root,'研究报告.md'),'utf8');
assert(!doc.includes('\uFFFD'));
for(const r of summary.benchmark.rows)assert(doc.includes((r.solvableWinRate*100).toFixed(2)+'%'));
const files=['puzzle-lab.mjs','generate.mjs','generator-spec.json','verify.mjs','README.md','研究报告.md',
 'results/summary.json','results/levels.json','results/agent-traces.jsonl','results/example.json','results/generated.json',
 'research-report/src/data.json','research-report/src/content/report/sections.json','research-report/src/content/report/ReportContent.jsx'];
const hashes=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
const checks={synthetic:true,nodeVersion:process.version,traceReplays:lines.length,generatedCertificates:g.accepted.length,
 aggregateAgreement:true,analysisZeroBudget:'UNKNOWN',reportNumbersVerified:true,files:hashes};
fs.writeFileSync(path.join(root,'results/manifest.json'),JSON.stringify(checks,null,2));
console.log(JSON.stringify({...checks,files:hashes.length}));

