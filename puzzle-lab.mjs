// Synthetic finite-buffer scheduling laboratory. Node >= 20; no packages.
// This is NOT a reconstruction of a commercial Bus Jam build.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function validate(l){
 assert.equal(l.rule_version,'queue-lab-v1');
 assert(Number.isInteger(l.capacity)&&l.capacity>=1);
 assert(l.lanes.length>0 && l.lanes.every(x=>Array.isArray(x)));
 assert(l.buses.length>0 && l.buses.every(b=>typeof b.color==='string'&&Number.isInteger(b.seats)&&b.seats>0));
 const a=Object.create(null),b=Object.create(null);
 l.lanes.flat().forEach(c=>{assert.equal(typeof c,'string');a[c]=(a[c]||0)+1;});
 l.buses.forEach(x=>b[x.color]=(b[x.color]||0)+x.seats);
 assert.deepEqual(Object.entries(a).sort(),Object.entries(b).sort());
}
export const start=l=>({pos:l.lanes.map(()=>0),bus:0,load:0,buffer:[]});
export const key=s=>JSON.stringify([s.pos,s.bus,s.load,[...s.buffer].sort()]);
export function status(l,s){
 if(s.bus===l.buses.length && s.buffer.length===0 && s.pos.every((p,i)=>p===l.lanes[i].length))return 'win';
 if(s.buffer.length>=l.capacity)return 'loss';
 if(s.pos.every((p,i)=>p===l.lanes[i].length))return 'loss';
 return 'active';
}
export function actions(l,s){
 return status(l,s)==='active'?l.lanes.flatMap((row,i)=>s.pos[i]<row.length?[i]:[]):[];
}
export function step(l,s,a){
 if(!actions(l,s).includes(a))throw Error('Illegal action');
 const t={pos:[...s.pos],bus:s.bus,load:s.load,buffer:[...s.buffer]};
 t.buffer.push(l.lanes[a][t.pos[a]++]);
 while(t.bus<l.buses.length){
  const ix=t.buffer.indexOf(l.buses[t.bus].color);
  if(ix<0)break;
  t.buffer.splice(ix,1);t.load++;
  if(t.load===l.buses[t.bus].seats){t.bus++;t.load=0;}
 }
 t.buffer.sort();return t;
}
export function bfs(l,limit=100000){
 const q=[[start(l),[]]],seen=new Set([key(start(l))]);let expanded=0;
 for(let i=0;i<q.length;i++){
  const [s,p]=q[i];
  if(status(l,s)==='win')return {status:'SOLVED',path:p,expanded};
  if(expanded++>=limit)return {status:'UNKNOWN',expanded};
  for(const a of actions(l,s)){
   const t=step(l,s,a),k=key(t);
   if(!seen.has(k)){seen.add(k);q.push([t,[...p,a]]);}
  }
 }
 return {status:'UNSOLVABLE',expanded};
}
export function dfs(l,limit=100000){
 const memo=new Map();let expanded=0;
 function visit(s){
  if(status(l,s)==='win')return [];
  if(status(l,s)==='loss')return null;
  const k=key(s);if(memo.has(k))return memo.get(k);
  if(expanded++>=limit)throw Error('BUDGET');
  for(const a of actions(l,s)){
   const p=visit(step(l,s,a));
   if(p){const out=[a,...p];memo.set(k,out);return out;}
  }
  memo.set(k,null);return null;
 }
 try{const p=visit(start(l));return {status:p?'SOLVED':'UNSOLVABLE',path:p,expanded};}
 catch(e){if(e.message!=='BUDGET')throw e;return {status:'UNKNOWN',expanded};}
}
export function astar(l,limit=100000){
 // h = number of unpicked passengers is admissible but f is constant here.
 const remaining=s=>l.lanes.reduce((n,r,i)=>n+r.length-s.pos[i],0);
 const open=[{s:start(l),p:[],f:remaining(start(l))}],seen=new Set();let expanded=0;
 while(open.length){
  open.sort((a,b)=>a.f-b.f);
  const {s,p}=open.shift(),k=key(s);if(seen.has(k))continue;
  seen.add(k);if(status(l,s)==='win')return {status:'SOLVED',path:p,expanded};
  if(expanded++>=limit)return {status:'UNKNOWN',expanded};
  for(const a of actions(l,s)){
   const t=step(l,s,a);open.push({s:t,p:[...p,a],f:p.length+1+remaining(t)});
  }
 }
 return {status:'UNSOLVABLE',expanded};
}
// Independent oracle: rebuild chosen prefix, consume color counts.
// Does not call step/status/actions and enumerates lane interleavings without state hashing.
function oracleState(l,sequence){
 const pos=l.lanes.map(()=>0),counts=Object.create(null);let bus=0,load=0;
 for(let j=0;j<sequence.length;j++){
  const lane=sequence[j];
  if(lane<0||lane>=pos.length||pos[lane]>=l.lanes[lane].length)return {valid:false};
  const color=l.lanes[lane][pos[lane]++];counts[color]=(counts[color]||0)+1;
  while(bus<l.buses.length && (counts[l.buses[bus].color]||0)>0){
   counts[l.buses[bus].color]--;load++;
   if(load===l.buses[bus].seats){bus++;load=0;}
  }
  const n=Object.values(counts).reduce((a,b)=>a+b,0);
  if(n>=l.capacity && j<sequence.length-1)return {valid:false};
 }
 const buffer=Object.entries(counts).flatMap(([c,n])=>Array(n).fill(c)).sort();
 const win=bus===l.buses.length && buffer.length===0 && pos.every((p,i)=>p===l.lanes[i].length);
 const loss=!win && (buffer.length>=l.capacity||pos.every((p,i)=>p===l.lanes[i].length));
 return {valid:true,state:{pos,bus,load,buffer},terminal:win?'win':loss?'loss':'active'};
}
function oracleSolve(l,p=[]){
 const r=oracleState(l,p);if(!r.valid||r.terminal==='loss')return null;
 if(r.terminal==='win')return p;
 for(let i=0;i<l.lanes.length;i++)if(r.state.pos[i]<l.lanes[i].length){
  const x=oracleSolve(l,[...p,i]);if(x)return x;
 }
 return null;
}
export function analyze(l,limit=100000){
 const memo=new Map(),states=new Map();
 function visit(s){
  const k=key(s);if(memo.has(k))return memo.get(k);
  if(states.size>=limit)throw Error("ANALYSIS_UNKNOWN_NODE_BUDGET");
  states.set(k,s);
  const st=status(l,s);
  if(st!=='active'){const z={solvable:st==='win',paths:st==='win'?1:0,safe:0,legal:0,randomWin:st==='win'?1:0};memo.set(k,z);return z;}
  const next=actions(l,s).map(a=>visit(step(l,s,a)));
  const z={solvable:next.some(x=>x.solvable),paths:next.reduce((n,x)=>n+x.paths,0),
   safe:next.filter(x=>x.solvable).length,legal:next.length,
   randomWin:next.reduce((n,x)=>n+x.randomWin,0)/next.length};
  if(!Number.isSafeInteger(z.paths))throw Error("ANALYSIS_UNKNOWN_PATH_OVERFLOW");
  memo.set(k,z);return z;
 }
 const initial=visit(start(l));
 const active=[...memo.values()].filter(x=>x.legal);
 return {initial,memo,states,uniqueStates:memo.size,
  forcedStates:active.filter(x=>x.solvable&&x.safe===1&&x.legal>1).length,
  meanSafeRatioUniformStates:active.length?active.reduce((n,x)=>n+x.safe/x.legal,0)/active.length:null};
}
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function permutations(items){
 if(!items.length)return [[]];
 return [...new Set(items)].flatMap(v=>{const a=[...items];a.splice(a.indexOf(v),1);return permutations(a).map(t=>[v,...t]);});
}
const mk=(lanes,colors,capacity,id)=>({id,synthetic:true,rule_version:'queue-lab-v1',capacity,lanes,buses:colors.map(color=>({color,seats:lanes.flat().filter(x=>x===color).length}))});
function allSmall(){
 const out=[];
 for(const p of permutations(['R','R','G','G','B','B']))
 for(const b of permutations(['R','G','B']))
 for(const c of [1,2,3])out.push(mk([p.slice(0,2),p.slice(2,4),p.slice(4)],b,c,'exhaustive-'+out.length));
 return out;
}
function benchmarkLevels(){
 let candidateSeed=20261027;const random=()=>{candidateSeed=(1664525*candidateSeed+1013904223)>>>0;return candidateSeed/4294967296;};const out=[];
 for(let i=0;i<72;i++){
  const p=['R','R','R','G','G','G','B','B','B'];
  for(let j=p.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[p[k],p[j]]=[p[j],p[k]];}
  const b=permutations(['R','G','B'])[Math.floor(random()*6)];
  out.push(mk([p.slice(0,3),p.slice(3,6),p.slice(6)],b,2+i%3,'benchmark-'+i));
 }
 return out;
}
function selectAction(l,s,policy,random,stats){
 const legal=actions(l,s);
 if(policy==='random')return legal[Math.floor(random()*legal.length)];
 if(policy==='attention'){
  // Attention-limited one-ply: inspect at most two actions; full visible queue and resolution.
  const pool=[...legal],sample=[];
  while(pool.length && sample.length<2)sample.push(pool.splice(Math.floor(random()*pool.length),1)[0]);
  const immediate=sample.map(a=>{stats.evaluations++;const t=step(l,s,a);
   return {a,v:[status(l,t)==='loss'?-2:0,t.pos.reduce((x,y)=>x+y,0)-t.buffer.length,-t.buffer.length]};});
  immediate.sort((a,b)=>cmp(a.v,b.v));
  return immediate[0].a;
 }
 const depth=policy==='greedy'?1:policy==='lookahead2'?2:4;
 const evaluated=new Set();
 function value(t,d){
  stats.evaluations++;
  const ek=key(t)+":"+d;if(evaluated.has(ek))stats.repeatEvaluations++;evaluated.add(ek);
  const st=status(l,t);if(st==='win')return [2,0,0];
  if(st==='loss')return [-2,0,0];
  if(d===0){
   const delivered=t.pos.reduce((a,b)=>a+b,0)-t.buffer.length;
   return [0,delivered,-t.buffer.length];
  }
  return actions(l,t).map(a=>value(step(l,t,a),d-1)).sort(cmp)[0];
 }
 const scored=legal.map(a=>({a,v:value(step(l,s,a),depth-1)}));
 scored.sort((a,b)=>cmp(a.v,b.v));
 const tied=scored.filter(x=>cmp(x.v,scored[0].v)===0);
 return tied[Math.floor(random()*tied.length)].a;
}
function cmp(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return b[i]-a[i];return 0;}
function runAgent(l,policy,seed,analysis){
 const random=rng(seed),stats={evaluations:0,repeatEvaluations:0};let s=start(l),firstIrreversible=null;
 const trajectory=[];
 while(status(l,s)==='active'){
  const a=selectAction(l,s,policy,random,stats),t=step(l,s,a);
  if(firstIrreversible===null && analysis.memo.get(key(s)).solvable && !analysis.memo.get(key(t)).solvable)firstIrreversible=trajectory.length+1;
  trajectory.push({action:a,state:t});s=t;
 }
 return {win:status(l,s)==='win',actions:trajectory.map(x=>x.action),peakBuffer:Math.max(0,...trajectory.map(x=>x.state.buffer.length)),
  firstIrreversible,failureDelay:firstIrreversible===null?null:trajectory.length-firstIrreversible,
  finalState:s,evaluations:stats.evaluations,repeatEvaluations:stats.repeatEvaluations};
}
function runTests(){
 const levels=allSmall();let transitions=0,solved=0;
 for(const l of levels){
  validate(l);const a=bfs(l),b=dfs(l),c=astar(l),o=oracleSolve(l);
  assert.equal(a.status,b.status);assert.equal(b.status,c.status);assert.equal(a.status==='SOLVED',o!==null);
  if(a.status==='SOLVED'){solved++;assert.equal(oracleState(l,a.path).terminal,'win');assert.equal(a.path.length,6);}
  // Compare every reachable transition to independent replay; preserve one path per state.
  const q=[[start(l),[]]],seen=new Set();
  while(q.length){
   const [s,p]=q.pop(),k=key(s);
   const ref=oracleState(l,p);assert(ref.valid);assert.deepEqual(s,ref.state);assert.equal(status(l,s),ref.terminal);
   if(seen.has(k))continue;seen.add(k);
   for(const x of actions(l,s)){transitions++;q.push([step(l,s,x),[...p,x]]);}
  }
 }
 const one=mk([['R']],['R'],1,'boundary');validate(one);assert.equal(status(one,step(one,start(one),0)),'win');
 const bad=mk([['B','R']],['R','B'],1,'dead');assert.equal(status(bad,step(bad,start(bad),0)),'loss');
 assert.throws(()=>validate({...one,lanes:[['1']],buses:[{color:1,seats:1}]}));
 assert.throws(()=>step(one,start(one),9));assert.throws(()=>validate({...one,buses:[{color:'R',seats:2}]}));
 assert.equal(bfs(one,0).status,'UNKNOWN');assert.equal(dfs(one,0).status,'UNKNOWN');assert.equal(astar(one,0).status,'UNKNOWN');
 const cascade=mk([['G','R']],['R','G'],2,'cascade');
 const s1=step(cascade,start(cascade),0),s2=step(cascade,s1,0);assert.equal(status(cascade,s2),'win');
 return {synthetic:true,ruleVersion:'queue-lab-v1',levelCount:levels.length,solved,unsolvable:levels.length-solved,
  checkedTransitions:transitions,solverAgreement:'BFS / memo DFS / A* / independent exhaustive oracle',
  boundaryCases:['instant-match-win','full-buffer-loss','invalid-action','color-balance','color-type','zero-budget-three-solvers','cascade-release']};
}
function main(){
 fs.mkdirSync(path.join(ROOT,'results'),{recursive:true});
 const tests=runTests(),levels=benchmarkLevels(),analyses=levels.map(l=>analyze(l)),rows=[],traces=[];
 const policies=['random','greedy','lookahead2','lookahead4','attention'];
 for(const policy of policies){
  let wins=0,solvableWins=0,evaluations=0,repeats=0,errors=0,delay=0;
  for(let i=0;i<levels.length;i++)for(let seed=1;seed<=40;seed++){
   const r=runAgent(levels[i],policy,seed+1009*i,analyses[i]);
   wins+=Number(r.win);solvableWins+=Number(r.win&&analyses[i].initial.solvable);evaluations+=r.evaluations;repeats+=r.repeatEvaluations;
   if(r.firstIrreversible!==null){errors++;delay+=r.failureDelay;}
   traces.push({levelId:levels[i].id,policy,seed:seed+1009*i,...r});
  }
  const solvable=analyses.filter(a=>a.initial.solvable).length;
  rows.push({policy,games:levels.length*40,wins,winRate:wins/(levels.length*40),solvableGames:solvable*40,
   solvableWinRate:solvableWins/(solvable*40),evaluations,repeatEvaluations:repeats,meanEvaluations:evaluations/(levels.length*40),
   irreversibleErrors:errors,meanObservedFailureDelay:errors?delay/errors:null});
 }
 const levelRows=levels.map((l,i)=>({id:l.id,capacity:l.capacity,...analyses[i].initial,uniqueStates:analyses[i].uniqueStates,forcedStates:analyses[i].forcedStates}));
 // A concrete counterexample to initial safe ratio predicting complete random-policy survival.
 let pair=null;
 for(let i=0;i<levels.length&&!pair;i++)for(let j=i+1;j<levels.length;j++){
  const a=analyses[i].initial,b=analyses[j].initial;
  if(a.solvable&&b.solvable&&a.safe/a.legal===b.safe/b.legal&&Math.abs(a.randomWin-b.randomWin)>.25){pair=[levelRows[i],levelRows[j]];break;}
 }
 const sampleIndex=analyses.findIndex(a=>a.initial.solvable&&a.initial.safe<a.initial.legal);
 const sample=levels[sampleIndex],solution=bfs(sample),replay=[];let s=start(sample);
 for(const a of solution.path){s=step(sample,s,a);replay.push({action:a,state:s});}
 const families=new Set(levels.map(l=>{const m=Object.fromEntries(l.buses.map((b,i)=>[b.color,i]));return JSON.stringify([l.capacity,l.lanes.map(row=>row.map(c=>m[c]).join('')).sort()]);}));
 const result={synthetic:true,seed:20261027,agentPRNG:'Mulberry32',testResults:tests,benchmark:{levels:levels.length,structuralFamilies:families.size,seedsPerLevel:40,exactRandomWinRate:analyses.reduce((n,a)=>n+a.initial.randomWin,0)/levels.length,exactRandomSolvableWinRate:analyses.reduce((n,a)=>n+a.initial.randomWin,0)/analyses.filter(a=>a.initial.solvable).length,
  solvableLevels:analyses.filter(a=>a.initial.solvable).length,rows},counterexample:pair,
  example:{level:sample,solution:solution.path,replay},levelRows};
 fs.writeFileSync(path.join(ROOT,'results','summary.json'),JSON.stringify(result,null,2));
 fs.writeFileSync(path.join(ROOT,'results','levels.json'),JSON.stringify(levels,null,2));
 fs.writeFileSync(path.join(ROOT,'results','agent-traces.jsonl'),traces.map(x=>JSON.stringify(x)).join('\n')+'\n');
 fs.writeFileSync(path.join(ROOT,'results','example.json'),JSON.stringify(result.example,null,2));
 console.log(JSON.stringify({tests,benchmark:result.benchmark,counterexample:pair,example:result.example},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

