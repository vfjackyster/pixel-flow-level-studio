from pathlib import Path
p=Path("pixel-editor/index.html")
s=p.read_text(encoding="utf-8")
s=s.replace('<div class="note">','<button id="apply-settings" style="width:100%;margin-top:12px">应用关卡设置</button><div class="note">',1)
s=s.replace('<div class="shooter-actions">','<button id="apply-shooter" class="primary" style="width:100%;margin-top:12px">应用射手属性</button><div class="shooter-actions">')
p.write_text(s,encoding="utf-8")
p=Path("pixel-editor/app.js")
s=p.read_text(encoding="utf-8-sig")
s+="""
$('apply-shooter').onclick=()=>{const f=locate(),ammo=+$('shooter-ammo').value,m=+$('shooter-color').value,col=+$('shooter-column').value;if(!f)return;if(!C.integer(ammo,1,9999))return notify('弹药须为 1 至 9999 的整数。');edit(()=>{f.s.ammo=ammo;f.s.material=m;if(f.c!==col){queues()[f.c].shooters.splice(f.i,1);queues()[col].shooters.push(f.s);}});notify('射手属性已应用。');};
$('apply-settings').onclick=()=>{const slots=+$('slots').value,belt=+$('belt').value,w=+$('physical-width').value,h=+$('physical-height').value,d=$('difficulty').value;if(!C.integer(slots,1,20)||!C.integer(belt,1,20))return notify('容量须为 1 至 20 的整数。');if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||w>30||h<1||h>30)return notify('物理尺寸须在 1 至 30 之间。');edit(()=>{Object.assign(state.level,{SlotCount:slots,ConveyorLimit:belt,Difficulty:d});pixelData().physicalWidth=w;pixelData().physicalHeight=h;});notify('关卡设置已应用。');};
$('title').oninput=()=>{const before=snapshot();state.title=$('title').value.trim()||'未命名关卡';record(before);$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;};
"""
p.write_text(s,encoding="utf-8")

