import fs from 'node:fs';
import path from 'node:path';
import {createExportCatalog} from 'file:///C:/Users/Admin/.codex/plugins/cache/openai-curated-remote/data-analytics/1.1.0-exp-baseline/templates/data-app/base/src/export-catalog.js';
const root=process.cwd(), app=path.join(root,'research-report');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sections=read(path.join(app,'src/content/report/sections.json')), summary=read(path.join(root,'results/summary.json'));
const snapshot=read(path.join(app,'src/data.json'));
snapshot.title='休闲益智关卡：从规则到可验证的设计体系';
snapshot.status='reviewed';snapshot.buildStatus='creating';snapshot.generatedAt='2026-10-27T12:00:00+08:00';
snapshot.exportPreferences={selected:null,destinations:createExportCatalog([]).filter(x=>x.plugin)};
snapshot.sourcePreviews={};
snapshot.queries={};
for(const s of sections){
 const links=[...s.body.matchAll(/\[([^\]]+)\]\((https:[^)]+)\)/g)].map(m=>({title:m[1],url:m[2]}));
 snapshot.queries[s.id]={title:s.title,rows:[{section:s.title,content:s.body}],source:{
  type:'research',description:'一手文献、声明的研究设计和本地合成实验；证据级别见正文。',
  files:['puzzle-lab.mjs','results/summary.json'],links,
  evidenceFlow:[{title:'证据边界',detail:'未直接试玩商业版本、未取得真人数据；合成模型与商业规则分开标注。'}]
 }};
 for(const link of links)snapshot.sourcePreviews[link.url]={title:link.title,summary:'本报告中引用的一手资料。具体支持范围及局限见对应段落。',source:new URL(link.url).hostname,approvedForReport:true};
}
const names={random:'随机',greedy:'贪心',lookahead2:'两步前瞻',lookahead4:'四步前瞻',attention:'抽看两动作'};
snapshot.queries.agent_benchmark={title:'人工代理合成实验',rows:summary.benchmark.rows.map(r=>({policy:names[r.policy],winRate:r.solvableWinRate,wins:r.wins,games:r.solvableGames})),
source:{type:'synthetic',description:'37个可解配置×40种子；72配置共69结构家族。固定集合描述统计，不是真人数据。',
files:['puzzle-lab.mjs','results/summary.json','results/agent-traces.jsonl'],
metricDefinitions:[{label:'可解配置胜率',definition:'该代理在37个可解合成配置上的获胜次数 / 1480次运行',componentIds:['agent-chart']}],
evidenceFlow:[{title:'复现',detail:'node puzzle-lab.mjs；固定候选种子20261027，代理PRNG Mulberry32。'}, {title:'采样核对',detail:'均匀随机策略的精确可解配置平均胜率为0.18672260223186152，40种子采样为0.17432432432432432。'}]}};
snapshot.researchExample=summary.example;
snapshot.queries.replay={title:'九步解法证书',rows:summary.example.replay.map((x,i)=>({step:i+1,lane:x.action+1,bus:x.state.bus,load:x.state.load,buffer:x.state.buffer.join(',')})),
 source:{type:'synthetic',files:['results/example.json'],description:'全信息队首取人模型的已回放获胜路径，不是商业游戏录像。'}};
fs.writeFileSync(path.join(app,'src/data.json'),JSON.stringify(snapshot,null,2));
fs.writeFileSync(path.join(root,'研究报告.md'),'# '+snapshot.title+'\n\n'+sections.map(s=>s.body).join('\n\n---\n\n'));

