from pathlib import Path
import json,copy
p=Path('pixel-editor')
s=(p/'test-difficulty.cjs').read_text(encoding='utf-8-sig')
anchor="console.log(passes+' tests passed');"
extra="""test('exact small random-policy probability is one quarter',()=>{let l=fixture([0,0,7]);l.QueueGroup.shooterQueues=[{shooters:l.QueueGroup.shooterQueues[0].shooters.slice(0,2)},{shooters:l.QueueGroup.shooterQueues[0].shooters.slice(2)}];let r=M.evaluate(l).policies;const exact=100*(1/2)*(1/2);assert.equal(exact,25);assert.ok(r[0].interval[0]<=exact&&r[0].interval[1]>=exact);assert.equal(r[1].risk,0);});
"""
s=s.replace(anchor,extra+anchor)
(p/'test-difficulty.cjs').write_text(s,encoding='utf-8')
index=(p/'index.html').read_text(encoding='utf-8')
index=index.replace('每次编辑使用相同种子序列减少比较噪声；','每次编辑使用相同种子序列减少比较噪声；小幅分差不自动代表显著变化。')
(p/'index.html').write_text(index,encoding='utf-8')
template=json.loads(Path('PixelFlow-analysis/levels/3db5681ee587345ad9a3cf8400a692d1-1.decoded.json').read_text(encoding='utf-8-sig'))
ex=p/'难度对照示例';ex.mkdir(exist_ok=True)
def fixture(order,slots):
 l=copy.deepcopy(template);l['SlotCount']=slots;l['PixelImageData'].update(width=4,height=4,pixels=[dict(x=x,y=y,material=0 if y==1 and x in (1,2) else 7,areaX=1,areaY=1) for y in range(3) for x in range(4)])
 l['QueueGroup']['shooterQueues']=[dict(shooters=[dict(id=i,ammo=10 if m==7 else 1,material=m) for i,m in enumerate(q)]) for q in order]
 # IDs must remain unique across columns.
 uid=0
 for q in l['QueueGroup']['shooterQueues']:
  for t in q['shooters']: t['id']=uid;uid+=1
 l['isValid']=False;l['contentHash']=0
 return l
for name,order,slots in [('01-阻塞队列-单槽',[[0,0,7],[]],1),('02-仅前移红射手',[[7,0,0],[]],1),('03-仅增至双槽',[[0,0,7],[]],2),('04-双列策略差异',[[0,0],[7]],1)]:
 (ex/(name+'.json')).write_text(json.dumps(fixture(order,slots),ensure_ascii=False,indent=2),encoding='utf-8')
s=(p/'难度评估说明.md').read_text(encoding='utf-8')
s+='\n## 附：可导入的对照关卡\n难度对照示例目录包含阻塞、重排、加槽和双列策略差异四个JSON。双列例中随机策略理论失败率为1/2×1/2=25%，当前固定128次样本得到25%；该相等是本次样本结果，不保证任意种子样本都恰好相等。\n'
(p/'难度评估说明.md').write_text(s,encoding='utf-8')

