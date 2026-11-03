import fs from 'node:fs';
import {validate,bfs,analyze,start,step,status} from './puzzle-lab.mjs';
const cfg=JSON.parse(fs.readFileSync(new URL('./generator-spec.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
let r=cfg.seed>>>0;const random=()=>{r=(1664525*r+1013904223)>>>0;return r/4294967296;};
const shuffle=x=>{x=[...x];for(let i=x.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
const accepted=[],rejects={unsolvable:0,unknown:0,duplicate:0,target:0},seen=new Set();let trials=0;
while(accepted.length<cfg.count && trials<cfg.candidate_budget){
 trials++;
 const pieces=shuffle(['R','R','R','G','G','G','B','B','B']),colors=shuffle(['R','G','B']);
 const level={id:'generated-'+trials,synthetic:true,rule_version:'queue-lab-v1',capacity:cfg.capacity,
  lanes:[pieces.slice(0,3),pieces.slice(3,6),pieces.slice(6)],buses:colors.map(color=>({color,seats:3}))};
 validate(level);
 const cmap=Object.fromEntries(colors.map((c,i)=>[c,i]));
 const canonical=JSON.stringify([level.capacity,level.lanes.map(x=>x.map(c=>cmap[c]).join('')).sort()]);
 if(seen.has(canonical)){rejects.duplicate++;continue;}seen.add(canonical);
 const solution=bfs(level,cfg.solver_node_budget);
 if(solution.status==='UNKNOWN'){rejects.unknown++;continue;}
 if(solution.status!=='SOLVED'){rejects.unsolvable++;continue;}
 let a;try{a=analyze(level,cfg.solver_node_budget);}catch(e){if(e.message.startsWith("ANALYSIS_UNKNOWN")){rejects.unknown++;continue;}throw e;}const ratio=a.initial.safe/a.initial.legal;
 if(ratio<cfg.initial_safe_ratio[0]||ratio>cfg.initial_safe_ratio[1]||a.forcedStates<cfg.min_forced_states){rejects.target++;continue;}
 let s=start(level);const replay=[];
 for(const action of solution.path){s=step(level,s,action);replay.push({action,state:s});}
 if(status(level,s)!=='win')throw Error('Invalid certificate');
 accepted.push({level,canonical,certificate:{path:solution.path,replay},metrics:{initialSafeRatio:ratio,
  forcedStates:a.forcedStates,exactRandomPolicyWinRate:a.initial.randomWin}});
}
const result={synthetic:true,status:accepted.length===cfg.count?'TARGET_MET':'BUDGET_EXHAUSTED',
 specification:cfg,trials,rejects,accepted};
fs.writeFileSync(new URL('./results/generated.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,trials,rejects,accepted:accepted.length}));

