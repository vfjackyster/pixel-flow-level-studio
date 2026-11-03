from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet" href="style[.]css[^"]*">',lambda m:'<style>'+(root/'style.css').read_text(encoding='utf-8')+'</style>',html)
def inline_script(match):
    code=(root/match.group(1)).read_text(encoding='utf-8-sig').replace('</script','<\\/script')
    return '<script>'+code+'</script>'
html=re.sub(r'<script src="([^"?]+)(?:[?][^"]*)?"></script>',inline_script,html)
assert '<script src=' not in html
assert '<link rel=' not in html
(root/'像素关卡编辑器.html').write_text(html,encoding='utf-8')
print('Portable editor bundled; all styles and scripts embedded')

