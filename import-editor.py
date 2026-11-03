from pathlib import Path
p=Path("pixel-editor/index.html");s=p.read_text(encoding="utf-8")
s=s.replace('<input id="file"','<dialog id="import-dialog"><h2>导入关卡</h2><p>选择 JSON 文件，或粘贴已解码的关卡 JSON / gzip: 压缩文本。</p><textarea id="import-text" aria-label="关卡 JSON 内容" placeholder="在这里粘贴关卡数据" style="width:100%;height:200px;padding:10px;border:1px solid #dbe2dd;border-radius:5px;resize:vertical"></textarea><div style="margin-top:14px"><button id="import-cancel">取消</button><button id="choose-file">选择文件</button><button id="import-paste" class="primary">导入内容</button></div></dialog><input id="file"')
p.write_text(s,encoding="utf-8")
p=Path("pixel-editor/app.js");s=p.read_text(encoding="utf-8")
s=s.replace("$('import').onclick=()=>$('file').click();","""$('import').onclick=()=>$('import-dialog').showModal();
$('import-cancel').onclick=()=>$('import-dialog').close();
$('choose-file').onclick=()=>{$('import-dialog').close();$('file').click();};
$('import-paste').onclick=()=>{let text=$('import-text').value;if(!text.trim())return notify('请先粘贴关卡内容。');$('import-dialog').close();importText(text,'粘贴导入');};""")
start=s.index("$('file').onchange=async()=>{")
end=s.index("document.addEventListener('keydown'",start)
old=s[start:end]
body=old[old.index("try{let text=await f.text();")+len("try{let text=await f.text();"):old.rindex("};")]
body=body.replace("f.name","name")
new="""$('file').onchange=async()=>{const f=$('file').files[0];$('file').value='';if(!f)return;if(f.size>5*1024*1024)return notify('文件超过 5 MB，暂不支持。');try{await importText(await f.text(),f.name);}catch(e){notify('无法读取文件，可改为粘贴 JSON 内容导入。');}};
async function importText(text,name){try{"""+body+"\n}\n"
s=s[:start]+new+s[end:]
s=s.replace("if($('confirm-dialog').open)return;","if($('confirm-dialog').open||$('import-dialog').open)return;")
p.write_text(s,encoding="utf-8")

