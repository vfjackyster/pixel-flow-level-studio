from pathlib import Path
p=Path('pixel-editor/index.html');s=p.read_text(encoding='utf-8').replace('href="style.css"','href="style.css?v=play1"');p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/bundle.py');s=p.read_text(encoding='utf-8')
s=s.replace("html=html.replace('<link rel=\"stylesheet\" href=\"style.css\">','<style>'+(root/'style.css').read_text(encoding='utf-8')+'</style>')","html=re.sub(r'<link rel=\"stylesheet\" href=\"style\\\\.css(?:\\\\?[^\\\"]*)?\">',lambda m:'<style>'+(root/'style.css').read_text(encoding='utf-8')+'</style>',html)")
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/play-ui.js');s=p.read_text(encoding='utf-8')
s=s.replace("+' 个目标</p><p>字段结构：通过</p>'","+' 个目标</p><p>字段结构：通过</p>'") # Inspector note added independently below.
needle=" $('play-color-audit').innerHTML="
s=s.replace(needle," $('play-checks').innerHTML+='<p>像素格形状：'+(Math.abs((g.pw/g.w)/(g.ph/g.h)-1)<.02?'近似正方形':'非正方形；物理宽高会改变图案比例')+'</p>';\\n"+needle).replace(";</p>';\\n",";</p>';\n") if False else s
# Avoid modifying unrelated render logic.
s=s.replace(needle," $('play-checks').innerHTML+='<p>像素格形状：'+(Math.abs((g.pw/g.w)/(g.ph/g.h)-1)<.02?'近似正方形':'非正方形；物理宽高会改变图案比例')+'</p>';\n"+needle)
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/使用说明.md');s=p.read_text(encoding='utf-8').replace('本版仍没有真实传送带模拟、试玩、可解性穷举或经过玩家校准的真人难度预测。','已加入本地核心试玩，但尚无原版逐帧一致性验证、可解性穷举或经过玩家校准的真人难度预测。');p.write_text(s,encoding='utf-8')

