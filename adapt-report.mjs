import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const base='research-report/src/',sections=read(base+'content/report/sections.json'),d=read(base+'data.json');
for(const s of sections){
 const lines=s.body.split('\n'),blocks=[];let text=[];
 const flush=()=>{if(text.join('\n').trim())blocks.push({type:'text',text:text.join('\n')});text=[];};
 for(let i=0;i<lines.length;i++){
  if(lines[i].startsWith('|')&&i+1<lines.length&&/^\|[-:| ]+\|$/.test(lines[i+1])){
   flush();const headers=lines[i].split('|').slice(1,-1).map(x=>x.trim());i+=2;const rows=[];
   while(i<lines.length&&lines[i].startsWith('|')){
    const cells=lines[i].split('|').slice(1,-1).map(x=>x.trim());
    if(cells.length!==headers.length)throw Error('Malformed table '+s.id);
    rows.push(Object.fromEntries(headers.map((h,j)=>[h,cells[j]])));i++;
   }i--;
   const id=s.id+'-table-'+blocks.length;
   blocks.push({type:'table',id,headers,rows});
   d.queries[id]={title:s.title+' · 表格',rows,source:{...d.queries[s.id].source}};
  }else text.push(lines[i]);
 }
 flush();s.blocks=blocks;
}
d.generatedAt=new Date().toISOString();
fs.writeFileSync(base+'content/report/sections.json',JSON.stringify(sections,null,2));
fs.writeFileSync(base+'data.json',JSON.stringify(d,null,2));
let jsx=fs.readFileSync(base+'content/report/ReportContent.jsx','utf8');
jsx=jsx.replace('EvidenceChart, DataComponent,','EvidenceChart, DataComponent, DataTable,');
jsx=jsx.replace('<RichNarrative id={s.id+":body"} value={s.body} sourcePreviews={snapshot.sourcePreviews}/>',
 '{s.blocks.map((block,j)=>block.type==="text"?<RichNarrative key={j} id={s.id+":body:"+j} value={block.text} sourcePreviews={snapshot.sourcePreviews}/>:<div className="research-table-block" key={j}><DataComponent id={block.id} title={s.title+" · 对照表"} kind="table" queryId={block.id} sourceRows={block.rows}><DataTable rows={block.rows} columns={block.headers.map(h=>({field:h,label:h}))} searchable={false} label={s.title}/></DataComponent></div>)}');
fs.writeFileSync(base+'content/report/ReportContent.jsx',jsx);

