from pathlib import Path
import re
p=Path('pixel-editor/index.html');s=p.read_text(encoding='utf-8')
s=re.sub(r'<script src="([^"?]+)(?:\?[^"]*)?"></script>',lambda m:'<script src="'+m.group(1)+'?v=play1"></script>',s)
p.write_text(s,encoding='utf-8')
p=Path('pixel-editor/bundle.py')
p.write_text("""from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text(encoding='utf-8')+'</style>')
def inline_script(match):
    name=match.group(1)
    code=(root/name).read_text(encoding='utf-8-sig').replace('</script','<\\\\/script')
    return '<script>'+code+'</script>'
html=re.sub(r'<script src="([^"?]+)(?:\\\\?[^"]*)?"></script>',inline_script,html)
(root/'像素关卡编辑器.html').write_text(html,encoding='utf-8')
print('Portable editor bundled')
""",encoding='utf-8')

