const DifficultyUI=(()=>{
let timer=null,worker=null,request=0,lastInput='',lastScore=null;
const pct=n=>(100*n).toFixed(1)+'%';
function status(t){$('difficulty-status').textContent=t;}
function display(r){
 const d=r.diagnostics;$('metric-exposure').textContent=d.exposure===null?'—':pct(d.exposure);$('metric-layers').textContent=d.layers+' 层';$('metric-mismatch').textContent=d.mismatch===null?'—':pct(d.mismatch);
 $('difficulty-causes').textContent='外围可见 '+d.front+' / '+d.pixels+' 像素；'+d.productiveHeads+' / '+d.activeHeads+' 个非空队首当前可输出。暴露率、层数和错配率是诊断量，不加权凑总分。';
 if(r.status!=='sampled'){const messages={empty:'请先绘制图案。',shortage:'弹药不足：'+d.shortage.map(x=>colorNames[x.material]+' 缺 '+x.amount).join('，')+'。先修复供需，不把资源不足标成“高难”。',large:'已更新结构指标。实时模拟上限为 1600 像素、160 射手；超出时不显示旧分数。'};status(r.status==='shortage'?'供需不成立':r.status==='large'?'仅结构指标':'等待图案');$('difficulty-results').textContent=messages[r.status];return;}
 status('已更新 · 调度模型');$('difficulty-results').innerHTML=r.policies.map(p=>'<div class="risk-card"><span>'+(p.policy==='random'?'随机选择策略':'优先消除策略')+'</span><strong>'+p.risk.toFixed(1)+'<small> / 100</small></strong><p>'+p.fails+' / '+p.trials+' 次模型失败</p><small>95% 采样区间 '+p.interval[0].toFixed(1)+'–'+p.interval[1].toFixed(1)+'</small><small>溢出 '+p.overflow+' 次 · 无可推进动作 '+p.stalled+' 次</small></div>').join('');
 let p=r.policies[0];$('difficulty-causes').textContent+=' '+(lastScore===null?'':('相较上次随机策略风险 '+(p.risk-lastScore>=0?'+':'')+(p.risk-lastScore).toFixed(1)+' 分。 '))+(p.wins?'本批次已找到模型通关轨迹。':'本批次未采到模型通关，不等于证明无解。');lastScore=p.risk;
}
function start(level){
 const id=++request;if(worker){worker.terminate();worker=null;}
 let d=DifficultyModel.diagnostics(level);display({status:d.pixels?'large':'empty',diagnostics:d});status('计算中…');$('difficulty-results').textContent='正在运行两种策略，各 128 次；仅评估简化调度模型。';
 let url;
 try{url=URL.createObjectURL(new Blob([DifficultyModel.workerSource],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);}catch(e){status('模拟不可用');$('difficulty-results').textContent='结构指标已更新。浏览器未允许后台计算，请用 Edge / Chrome 打开。';return;}
 let current=worker;
 const timeout=setTimeout(()=>{if(worker===current){current.terminate();worker=null;status('计算超时');$('difficulty-results').textContent='结构指标已更新；本次模拟超出 5 秒预算，不显示部分或旧分数。';}},5000);
 current.onmessage=e=>{if(e.data.id!==request)return;clearTimeout(timeout);current.terminate();worker=null;if(e.data.error){status('超出计算预算');$('difficulty-results').textContent=e.data.error;return;}display(e.data.result);};
 current.onerror=()=>{clearTimeout(timeout);current.terminate();worker=null;status('模拟不可用');$('difficulty-results').textContent='后台计算失败。结构指标仍可使用；未生成难度分数。';};
 current.postMessage({id,level,options:{trials:128}});
}
function schedule(level){const input=JSON.stringify(level);if(input===lastInput)return;lastInput=input;clearTimeout(timer);request++;if(worker){worker.terminate();worker=null;}status('待更新…');$('difficulty-results').textContent='关卡已变化，旧分数已清除。';timer=setTimeout(()=>start(JSON.parse(input)),280);}
return {schedule};
})();
