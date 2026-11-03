import struct,json,pathlib,re
root=pathlib.Path(__file__).parent
p=pathlib.Path(r'C:\Users\Admin\AppData\Local\Temp\rea-extracted-c32f2da8-4c2d-4d9a-ab63-2a218f53a32f\assets\bin\Data\Managed\Metadata\global-metadata.dat')
b=p.read_bytes()
names=['stringLiteral','stringLiteralData','string','events','properties','methods','parameterDefaultValues','fieldDefaultValues','fieldAndParameterDefaultValueData','fieldMarshaledSizes','parameters','fields','genericParameters','genericParameterConstraints','genericContainers','nestedTypes','interfaces','vtableMethods','interfaceOffsets','typeDefinitions','images','assemblies','fieldRefs','referencedAssemblies','attributeData','attributeDataRange','unresolvedVirtualCallParameterTypes','unresolvedVirtualCallParameterRanges','windowsRuntimeTypeNames','windowsRuntimeStrings','exportedTypeDefinitions']
h={n:struct.unpack_from('<II',b,8+i*8) for i,n in enumerate(names)}
def records(n,fmt):
 o,s=h[n]; z=struct.calcsize(fmt); assert s%z==0,(n,s,z); return [struct.unpack_from(fmt,b,q) for q in range(o,o+s,z)]
def string(i):
 o,s=h['string']; assert 0<=i<s; return b[o+i:b.index(b'\0',o+i)].decode('utf8','replace')
images=records('images','<10i');types=records('typeDefinitions','<16i8H2I');fields=records('fields','<IiI');methods=records('methods','<I5iI4H');params=records('parameters','<IIi')
out=[]
for image in images:
 im=string(image[0]); print(im,image[2],image[3])
 for ti in range(image[2],image[2]+image[3]):
  t=types[ti]; name=string(t[0]); ns=string(t[1]); fs,ms=t[8],t[9]; mc,pc,fc=t[16:19]
  assert fs>=0 or fc==0;assert ms>=0 or mc==0
  ff=[{'index':i,'name':string(fields[i][0]),'typeIndex':fields[i][1],'token':hex(fields[i][2])} for i in range(fs,fs+fc)]
  mm=[]
  for i in range(ms,ms+mc):
   m=methods[i]; assert m[1]==ti,(i,m[1],ti)
   ps=m[4]; count=m[-1]
   mm.append({'index':i,'name':string(m[0]),'returnTypeIndex':m[2],'parameters':[{'name':string(params[j][0]),'typeIndex':params[j][2]} for j in range(ps,ps+count)],'token':hex(m[6])})
  out.append({'image':im,'index':ti,'name':name,'namespace':ns,'byvalTypeIndex':t[2],'parentTypeIndex':t[4],'fields':ff,'methods':mm})
(root/'metadata-tables.json').write_text(json.dumps({'version':struct.unpack_from('<I',b,4)[0],'header':h,'types':out},ensure_ascii=False,indent=2),encoding='utf8')
custom=[t for t in out if re.search('Core|Assembly-CSharp|Game',t['image'])]
(root/'custom-types.json').write_text(json.dumps(custom,ensure_ascii=False,indent=2),encoding='utf8')
lines=[]
for t in custom:
 lines.append(f"[{t['image']}] #{t['index']} {t['namespace']}.{t['name']} : type#{t['parentTypeIndex']}")
 lines.extend('  F '+f['name']+' : type#'+str(f['typeIndex']) for f in t['fields'])
 lines.extend('  M '+m['name']+'('+', '.join(p['name']+':type#'+str(p['typeIndex']) for p in m['parameters'])+')' for m in t['methods'])
(root/'custom-types.txt').write_text('\n'.join(lines),encoding='utf8')
literals=[]
for i,(length,index) in enumerate(records('stringLiteral','<Ii')):
 off=h['stringLiteralData'][0]+index
 literals.append({'index':i,'offset':off,'value':b[off:off+length].decode('utf8','replace')})
(root/'string-literals.json').write_text(json.dumps(literals,ensure_ascii=False,indent=2),encoding='utf8')
(root/'gameplay-literals.json').write_text(json.dumps([x for x in literals if re.search('level|ball|cannon|shoot|gravity|force|difficult|friction|bounc|win|lose|fail|retry|booster|health|speed|shoot|life|move|reward|screw|bomb',x['value'],re.I)],ensure_ascii=False,indent=2),encoding='utf8')
print('TOTAL',len(out),len(fields),len(methods),'CUSTOM',len(custom),'LITERALS',len(literals))
