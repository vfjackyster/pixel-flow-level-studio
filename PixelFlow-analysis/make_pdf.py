from pathlib import Path
import re, html, json
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
from PIL import Image as PILImage
root=Path(r"C:\Users\Admin\Documents\ChatGPT\关卡学习之旅\PixelFlow-analysis")
out=root/"output"/"pdf"; tmp=root/"tmp"/"pdfs"
out.mkdir(parents=True,exist_ok=True); tmp.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont("YaHei",r"C:\Windows\Fonts\msyh.ttc",subfontIndex=0))
pdfmetrics.registerFont(TTFont("YaHeiBold",r"C:\Windows\Fonts\msyhbd.ttc",subfontIndex=0))
pdfmetrics.registerFontFamily("YaHei",normal="YaHei",bold="YaHeiBold",italic="YaHei",boldItalic="YaHeiBold")
ink=colors.HexColor("#19283B"); accent=colors.HexColor("#166878")
body=ParagraphStyle("Body",fontName="YaHei",fontSize=9.5,leading=15.5,textColor=ink,spaceAfter=6,wordWrap="CJK",splitLongWords=True)
styles={
"title":ParagraphStyle("Title",parent=body,fontName="YaHeiBold",fontSize=24,leading=33,spaceBefore=10,spaceAfter=18),
"h2":ParagraphStyle("H2",parent=body,fontName="YaHeiBold",fontSize=17,leading=25,textColor=accent,spaceBefore=12,spaceAfter=13,keepWithNext=True),
"h3":ParagraphStyle("H3",parent=body,fontName="YaHeiBold",fontSize=11.7,leading=18,spaceBefore=11,spaceAfter=7,keepWithNext=True),
"cell":ParagraphStyle("Cell",parent=body,fontSize=8.2,leading=12.4,spaceAfter=0),
"small":ParagraphStyle("Small",parent=body,fontSize=8,leading=12,textColor=colors.HexColor("#536476"))}
def inline(s):
    s=s.replace("\u2011","-").replace("\u2013","-").replace("\u2014","-")
    links=[]
    def link(m):
        label,target=m.group(1),m.group(2)
        uri=(root/target).resolve().as_uri()
        links.append('<link href="'+html.escape(uri,quote=True)+'" color="#166878">'+html.escape(label)+'</link>')
        return "LINKTOKEN"+str(len(links)-1)+"END"
    s=re.sub(r"\[([^\]]+)\]\(([^)]+)\)",link,s)
    s=html.escape(s)
    s=re.sub(r"\*\*(.+?)\*\*",r"<b>\1</b>",s)
    s=re.sub(r"\x60([^\x60]+)\x60",r'<font color="#3E596E">\1</font>',s)
    for i,l in enumerate(links): s=s.replace("LINKTOKEN"+str(i)+"END",l)
    return s
story=[]; lines=(root/"拆解报告.md").read_text(encoding="utf-8-sig").splitlines(); i=0
while i<len(lines):
    line=lines[i].strip()
    if not line: i+=1; continue
    if line.startswith("|"):
        table=[]
        while i<len(lines) and lines[i].strip().startswith("|"):
            cells=[c.strip() for c in lines[i].strip().strip("|").split("|")]
            if not all(re.fullmatch(r":?-+:?",c) for c in cells): table.append(cells)
            i+=1
        n=len(table[0]); ratios=([.22,.46,.32] if n==3 else [.28,.13,.14,.45] if n==4 else [1/n]*n)
        width=A4[0]-96
        rows=[[Paragraph(inline(c),styles["cell"]) for c in row] for row in table]
        t=Table(rows,colWidths=[width*r for r in ratios],repeatRows=1,hAlign="LEFT")
        t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#E2EEF0")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F5F7FA")]),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),("LINEBELOW",(0,0),(-1,0),.65,accent),("LINEBELOW",(0,1),(-1,-1),.25,colors.HexColor("#DCE4E9"))]))
        story.extend([t,Spacer(1,8)]); continue
    if line.startswith("# "):
        story.append(Paragraph(inline(line[2:]),styles["title"]))
        story.append(Paragraph("静态安装包研究 · 资源 / 关卡 / 动态减难 / 核心玩法",styles["small"]))
        story.append(Spacer(1,10))
    elif line.startswith("## "):
        if line.startswith("## 1."): story.append(PageBreak())
        story.append(Paragraph(inline(line[3:]),styles["h2"]))
    elif line.startswith("### "): story.append(Paragraph(inline(line[4:]),styles["h3"]))
    else:
        if line.startswith("- "): line="• "+line[2:]
        story.append(Paragraph(inline(line),body))
    i+=1
for title,name,note in [
("附图 A · 包内实际贴图","texture-contact-sheet.png","包内贴图解码联系表，非实机截图。尺寸、压缩格式和资源对象编号见图内标注。"),
("附图 B · 关卡像素布局","level-reconstruction.png","依据关卡数据与包内材质颜色重建；非实机渲染，不含机关模型、灯光和最终shader效果。")]:
    story.append(PageBreak()); story.append(Paragraph(title,styles["h2"])); story.append(Paragraph(note,body))
    p=root/"art"/name; w,h=PILImage.open(p).size
    scale=min((A4[0]-96)/w,(A4[1]-190)/h)
    story.append(Spacer(1,12)); story.append(Image(str(p),width=w*scale,height=h*scale))
def furniture(c,doc):
    c.setStrokeColor(colors.HexColor("#DCE4E9")); c.setLineWidth(.5)
    c.line(48,A4[1]-35,A4[0]-48,A4[1]-35)
    c.setFont("YaHei",7.5); c.setFillColor(colors.HexColor("#66788A"))
    c.drawString(48,A4[1]-26,"PIXEL FLOW! 0.37.1 / 安装包拆解")
    c.drawString(48,27,"静态分析 · 2026-10-29"); c.drawRightString(A4[0]-48,27,str(doc.page))
pdf=out/"Pixel Flow 0.37.1 拆解报告.pdf"
doc=SimpleDocTemplate(str(pdf),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=52,bottomMargin=48,title="Pixel Flow! 0.37.1 安装包拆解",author="Codex",pageCompression=1)
doc.build(story,onFirstPage=furniture,onLaterPages=furniture)
reader=PdfReader(str(pdf)); texts=[p.extract_text() or "" for p in reader.pages]
for term in ["LevelEase","2700","ASTC","FailureRows"]: assert term in "\n".join(texts),term
result={"pdf":str(pdf),"pages":len(reader.pages),"bytes":pdf.stat().st_size,"pageTextLengths":[len(x) for x in texts]}
(tmp/"verification.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(result,ensure_ascii=False))


