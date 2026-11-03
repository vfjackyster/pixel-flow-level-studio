import fs from 'node:fs';
const p='research-report/src/',read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const s=read(p+'content/report/sections.json'),d=read(p+'data.json');
for(const section of s){
 const fix=t=>t.replace('本演示用数组排序，非性能实现，最坏可达 O(V² log V) 量级','本演示反复排序数组；按入队数M保守上界O(M² log M)，非性能实现')
 .replace('约387.34，向上取整','使用未取整的正态分位数计算约387.34，向上取整');
 section.body=fix(section.body);
 for(const b of section.blocks){
  if(b.type==='text')b.text=fix(b.text);
  else {for(const row of b.rows)for(const k in row)row[k]=fix(row[k]);d.queries[b.id].rows=b.rows;}
 }
 d.queries[section.id].rows=[{section:section.title,content:section.body}];
}
d.buildStatus='complete';
fs.writeFileSync(p+'data.json',JSON.stringify(d,null,2));
fs.writeFileSync(p+'content/report/sections.json',JSON.stringify(s,null,2));
fs.writeFileSync('研究报告.md','# '+d.title+'\n\n'+s.map(x=>x.body).join('\n\n---\n\n'));
let g=fs.readFileSync('generate.mjs','utf8');
g=g.replace('const a=analyze(level),ratio=a.initial.safe/a.initial.legal;',
 'let a;try{a=analyze(level,cfg.solver_node_budget);}catch(e){if(e.message.startsWith("ANALYSIS_UNKNOWN")){rejects.unknown++;continue;}throw e;}const ratio=a.initial.safe/a.initial.legal;');
fs.writeFileSync('generate.mjs',g);

