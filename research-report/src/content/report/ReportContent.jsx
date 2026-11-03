import React, {useState} from "react";
import {RichNarrative, ReportSection, EvidenceChart, DataComponent, DataTable, useDataApp} from "../../data-app-public.jsx";
import sections from "./sections.json";
function Replay({example}) {
 const [i,setI]=useState(0);
 const s=i===0?{pos:[0,0,0],bus:0,load:0,buffer:[]}:example.replay[i-1].state;
 const l=example.level;
 return <div className="lab-replay">
 <div className="lab-replay-controls"><button onClick={()=>setI(Math.max(0,i-1))} disabled={!i}>上一步</button>
 <strong>第 {i} / {example.replay.length} 步</strong>
 <button onClick={()=>setI(Math.min(example.replay.length,i+1))} disabled={i===example.replay.length}>下一步</button>
 <button onClick={()=>setI(0)}>重置</button></div>
 <div aria-live="polite" data-reviewed-rows>
 {l.lanes.map((row,j)=><p key={j}>第 {j+1} 列（左为队首）：<strong>{row.slice(s.pos[j]).join(" → ")||"已取完"}</strong></p>)}
 <p>车辆：<strong>{s.bus===l.buses.length?"全部完成 · 胜利":l.buses[s.bus].color+" "+s.load+"/"+l.buses[s.bus].seats}</strong></p>
 <p>缓存：<strong>{s.buffer.join(" / ")||"空"}</strong>；结算后达到 {l.capacity} 人即失败</p>
 {i>0&&<p>刚才操作：取第 {example.replay[i-1].action+1} 列</p>}
 </div></div>;
}
export function ReportContent(){
 const {snapshot,appTitle,visible}=useDataApp();
 const rows=snapshot.queries.agent_benchmark.rows;
 const example=snapshot.researchExample;
 return <article className="report-content" aria-label="休闲益智关卡研究">
 <header className="report-hero"><h1>{appTitle}</h1><RichNarrative id="research-intro" value="以 Bus Jam 为主对象的研究基线 · 官方证据、可运行合成实验与真人验证协议" /></header>
 <nav className="research-nav" aria-label="报告目录">{sections.map((s,i)=><a key={s.id} href={"#"+s.id}>{i+1}. {s.title}</a>)}</nav>
 {sections.map(s=><React.Fragment key={s.id}>
 {visible(s.id)&&<section id={s.id}><ReportSection id={"evidence-"+s.id} queryId={s.id} title={s.title} showHeading={false} sourceRows={snapshot.queries[s.id].rows}>
 {s.blocks.map((block,j)=>block.type==="text"?<RichNarrative key={j} id={s.id+":body:"+j} value={block.text} sourcePreviews={snapshot.sourcePreviews}/>:<div className="research-table-block" key={j}><DataComponent id={block.id} title={s.title+" · 对照表"} kind="table" queryId={block.id} sourceRows={block.rows}><DataTable rows={block.rows} columns={block.headers.map(h=>({field:h,label:h}))} searchable={false} label={s.title}/></DataComponent></div>)}</ReportSection></section>}
 {s.id==="experiments"&&visible("agent-chart")&&<EvidenceChart id="agent-chart" queryId="agent_benchmark" title="37个可解合成配置上的代理胜率"
 description="每代理1,480次运行；人工策略，不代表真实玩家。随机策略精确基线为18.67%。"
 spec={{type:"horizontalBar",x:"policy",y:"winRate",valueDecimals:1,stackable:false}} rows={rows} sourceRows={rows} height={340}/>}
 {s.id==="model"&&visible("replay")&&<DataComponent id="replay" title="逐步检查九步获胜证书" kind="custom" queryId="replay" sourceRows={snapshot.queries.replay.rows}>
 <Replay example={example}/></DataComponent>}
 </React.Fragment>)}
 </article>;
}

