from pathlib import Path
from PIL import Image,ImageDraw
import math,base64
p=Path('pixel-editor/测试素材');p.mkdir(exist_ok=True)
im=Image.new('RGBA',(120,80))
for y in range(80):
 for x in range(120): im.putpixel((x,y),(int(40+90*y/80),int(130+65*y/80),220,255))
d=ImageDraw.Draw(im)
d.ellipse((77,8,99,30),fill=(255,195,55,255))
d.polygon([(0,65),(27,28),(65,75)],fill=(70,125,100,255))
d.polygon([(27,80),(79,33),(120,68),(120,80)],fill=(35,95,85,255))
d.rectangle((0,65,119,79),fill=(80,150,60,255))
d.rectangle((45,49,69,69),fill=(245,205,145,255))
d.polygon([(41,50),(57,36),(73,50)],fill=(170,55,45,255))
d.rectangle((54,57,61,69),fill=(90,65,55,255))
d.rectangle((63,53,67,59),fill=(70,150,195,255))
im.save(p/'图片生成测试.png')
small=Image.new('RGBA',(8,4),(0,115,255,255))
ImageDraw.Draw(small).rectangle((4,0,7,3),fill=(160,13,13,255))
small.save(p/'双色与比例测试.png')
print(base64.b64encode((p/'双色与比例测试.png').read_bytes()).decode())

