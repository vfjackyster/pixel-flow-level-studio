import pathlib,struct,json,bisect,re,collections,sys
root=pathlib.Path(__file__).parent
b=pathlib.Path(r'C:\Users\Admin\AppData\Local\Temp\rea-extracted-e858f9d8-0bd2-49e8-9fc4-d9223ff1035e\lib\armeabi-v7a\libil2cpp.so').read_bytes()
o=struct.unpack_from('<I',b,32)[0];z,n,si=struct.unpack_from('<3H',b,46)
secs=[struct.unpack_from('<10I',b,o+i*z) for i in range(n)];st=secs[si];ss=b[st[4]:st[4]+st[5]]
sd={ss[s[0]:ss.index(0,s[0])].decode():s for s in secs}
def offset(a):
 for s in secs:
  if s[1]!=8 and s[3]<=a<s[3]+s[5]:return a-s[3]+s[4]
 raise ValueError(hex(a))
def va(p):
 for s in secs:
  if s[1]!=8 and s[4]<=p<s[4]+s[5]:return p-s[4]+s[3]
 raise ValueError(hex(p))
def ptr(a):return struct.unpack_from('<I',b,offset(a))[0]
T=json.loads((root/'metadata-tables.json').read_text(encoding='utf8'))['types'];ims=collections.defaultdict(list)
for t in T:ims[t['image']].append(t)
nameva={}
for im in ims:
 start=0
 while True:
  q=b.find(im.encode()+b'\0',start)
  if q<0:break
  try:nameva[va(q)]=im
  except:pass
  start=q+1
moduleMap={};targets={}
for s in secs:
 if s[1]==8 or not (s[2]&1):continue
 for i in range(s[4],s[4]+s[5]-12,4):
  name,count,mp=struct.unpack_from('<3I',b,i)
  if name not in nameva or count>250000:continue
  im=nameva[name];ts=ims[im];maxid=max((int(m['token'],16)&0xffffff for t in ts for m in t['methods']),default=0)
  if maxid!=count or not count:continue
  try:offset(mp)
  except:continue
  moduleMap[im]=(va(i),count,mp)
  for t in ts:
   for m in t['methods']:
    a=ptr(mp+4*((int(m['token'],16)&0xffffff)-1));m['nativeAddress']=hex(a)
    if a:targets[a&~1]=(t,m)
(root/'native-modules.json').write_text(json.dumps(moduleMap,indent=2),encoding='utf8')
(root/'methods-native.json').write_text(json.dumps([t for t in T if any('nativeAddress' in m for m in t['methods'])],ensure_ascii=False),encoding='utf8')
print('MODULES',len(moduleMap),'METHODS',len(targets));print({k:tuple(hex(x) for x in v) for k,v in moduleMap.items() if 'LevelEase' in k or k=='Assembly-CSharp.dll'})
sys.path.insert(0,r'C:\Users\Admin\Documents\Codex\2026-10-16\referenced-chatgpt-conversation-this-is-an\work\royal-smash\metadata-analysis\deps')
from capstone import *
addresses=sorted(targets)
def dis(a,size=None):
 a=a&~1;t,m=targets.get(a,({'name':'unknown','namespace':''},{'name':'unknown'}));rawa=int(m.get('nativeAddress',hex(a)),16)
 end=addresses[bisect.bisect_right(addresses,a)] if a<addresses[-1] else a+4096
 size=min(size or end-a,100000);q=offset(a);md=Cs(CS_ARCH_ARM,CS_MODE_THUMB if rawa&1 else CS_MODE_ARM);md.detail=True
 lines=[f"\n# {t['namespace']}.{t['name']}::{m['name']} {hex(rawa)} size={size}"]
 for ins in md.disasm(b[q:q+size],a):
  st=f'{ins.address:x}: {ins.mnemonic} {ins.op_str}'
  if ins.mnemonic in ['b','bl','blx'] and ins.op_str.startswith('#0x'):
   dest=int(ins.op_str[1:],16)&~1
   if dest in targets:
    tt,mm=targets[dest];st+=f" ; {tt['namespace']}.{tt['name']}::{mm['name']}"
  lines.append(st)
 return '\n'.join(lines)
if __name__=='__main__':
 selected=[(a,t,m) for a,(t,m) in targets.items() if ('LevelEase' in t['namespace'] or t['name'] in ['LevelCreator','LevelSessionInfoData','ShootersOffenseController','PixelGridController','ShooterController','Shooter','ShooterTargetSelector'])]
 (root/'selected-native.txt').write_text('\n'.join(dis(a) for a,t,m in selected),encoding='utf8')
 (root/'selected-methods.json').write_text(json.dumps([{'type':t['name'],'method':m['name'],'address':hex(a),'image':t['image']} for a,t,m in selected],indent=2),encoding='utf8')
 print('SELECTED',len(selected))
