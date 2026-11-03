from pathlib import Path
p=Path('pixel-editor/index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('</div><div class="image-previews">','<label>单体弹量<input id="image-ammo" type="number" min="1" max="9999" value="30"></label><label>队列列数<select id="image-columns"><option>2</option><option>3</option><option selected>4</option><option>5</option></select></label></div><div class="image-previews">')
p.write_text(s,encoding='utf-8')

