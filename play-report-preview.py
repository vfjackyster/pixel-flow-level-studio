from pathlib import Path
p=Path('pixel-editor/index.html');s=p.read_text(encoding='utf-8')
report='<dialog id="play-report-dialog" style="width:min(760px,94vw);max-width:760px;max-height:90vh"><h2>试玩验证记录</h2><p>这是当前试玩的快照，包含输入关卡、守恒核查和操作轨迹。关闭后可继续试玩。</p><textarea id="play-report-text" aria-label="试玩验证记录 JSON" readonly style="width:100%;height:55vh;padding:12px;font-size:11px;line-height:1.6"></textarea><div style="margin-top:12px"><button id="play-report-close">关闭</button><button id="play-report-download" class="primary">下载验证记录 JSON</button></div></dialog>'
s=s.replace('<dialog id="confirm-dialog">',report+'<dialog id="confirm-dialog">').replace('id="play-report">导出验证记录','id="play-report">查看 / 导出验证记录')
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/play-ui.js');s=p.read_text(encoding='utf-8')
s=s.replace("$('play-report').onclick=()=>{if(!game)return;const report=","$('play-report').onclick=()=>{if(!game)return;P.pause(game);refresh();const report=")
s=s.replace("download(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),'试玩验证记录.json');message('已导出输入关卡、规则参数、守恒检查和操作轨迹。');","$('play-report-text').value=JSON.stringify(report,null,2);$('play-report-dialog').showModal();")
s=s.replace('\n})();',"\n$('play-report-close').onclick=()=>$('play-report-dialog').close();\n$('play-report-download').onclick=()=>download(new Blob([$('play-report-text').value],{type:'application/json'}),'试玩验证记录.json');\n})();")
p.write_text(s,encoding='utf-8')

