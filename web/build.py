#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
# Mac HTML adaptation by Wenshuishi0528.
"""Build an offline single-file browser adaptation from the downloaded branch."""
from pathlib import Path
import json,struct,base64,subprocess,shutil,re
ROOT=Path(__file__).resolve().parent
SRC=ROOT.parent
def name(d): return d.get('native') or d.get('english') or d.get('name','')
titles={'chinese':'中国传统（三垣二十八宿）','chinese_chenzhuo':'中国·陈卓星官（三世纪）','chinese_cn':'中国·刘春滨中文星名扩展','chinese_dai':'中国·傣族二十七宿','chinese_initial':'中国·初始三家星官','chinese_jin_dynasty':'中国·晋代','chinese_lingtai':'中国·明末清初','chinese_manbu':'漫步中国星空','chinese_manchu':'中国·满族','chinese_mdn':'观津版中国现代（个人架空）','chinese_song_dynasty':'中国·宋代','chinese_southern_huiwuhejie':'近南极星（会舞合节版）','chinese_suzhou':'中国·苏州石刻天文图','chinese_tang_dynasty':'中国·唐代','chinese_test':'中国·测试','chinese_tianguanshu':'中国·史记天官书','chinese_xianglin':'中国·象林星图','chinese_yi':'中国·彝族','chinese_yixiang':'中国·清代','chinese_yuan_dynasty':'中国·元代','chinese_yuanming':'中国·元明','chinese_zhongwenxingming':'观津版中文星名扩展（旧版）','japanese':'日本·安井星图','japanese_koushi':'日本·格子月进图','korean':'朝鲜·天象列次分野之图','manchu':'满族·旧版（存档）','modern_chinese':'现代·中西星座对照','modern_journey_to_the_west':'现代·西游记','mongolian':'蒙古族','nakhi':'纳西族','oroqen':'鄂伦春族','tibetan':'藏族（原作者未完成）','modern':'现代·国际星座（对照）'}
cultures=[]; needed=set(); gaia_needed=set(); dso_needed=set()
for cid,title in titles.items():
 f=SRC/'skycultures'/cid/'index.json'
 if not f.exists():continue
 d=json.loads(f.read_text(encoding="utf-8")); cons=[]
 for ci,c in enumerate(d.get('constellations',[])):
  c.setdefault('id',f'{cid}:{ci}')
  for line in c.get('lines',[]):
   for x in line:
    if isinstance(x,int): needed.add(x)
    elif isinstance(x,str) and x.isdigit(): gaia_needed.add(x)
    elif isinstance(x,str) and x.startswith('DSO:'): dso_needed.add(x[4:])
  cons.append({'id':c['id'],'name':name(c.get('common_name',{})) or c['id'],'lines':c.get('lines',[]),'labels':c.get('label_positions',[])})
 names={}
 for k,v in d.get('common_names',{}).items():
  if not v:continue
  key=k.replace('HIP ','').replace('Gaia DR3 ','')
  names[key]=' / '.join(dict.fromkeys(name(a) for a in v if name(a)))
 cultures.append({'id':cid,'title':title,'constellations':cons,'names':names,'description':(f.parent/'description.md').read_text(encoding="utf-8") if (f.parent/'description.md').exists() else ''})
# Include source catalogs with their metadata intact. Empty entries can set epochs for following groups.
catalogs=[]
for f in sorted((SRC/'starcatalog').rglob('*.json')):
 data=json.loads(f.read_text(encoding="utf-8"))
 if not isinstance(data,list):continue
 epoch=None
 for j,g in enumerate(data):
  if g.get('use_epoch') and 'epoch' in g: epoch=g['epoch']
  if not g.get('data'):continue
  g=dict(g);g['_epoch']=epoch;g['_file']=str(f.relative_to(SRC));g['_key']=f'{f.name}:{j}'
  catalogs.append(g)
  for s in g['data']:
   needed.update(x for x in s.get('HIP',[]) if isinstance(x,int))
# Parse the actual 48-byte Star1 format documented in src/core/modules/Star.hpp.
# Store unit vectors and Cartesian proper motion (radians/year), epoch JD2457389.0.
records=[];gaia={};hip={};fmt=struct.Struct('<qiiiiiihhHHhHB3s')
for f in sorted((SRC/'stars/hip_gaia3').glob('stars_[0-9]*.cat')):
 b=f.read_bytes(); header=struct.unpack_from('<6If',b);assert header[1]==0 and header[-1]==2457389.0
 zones=20*4**header[4]+1; offset=28+zones*4
 assert (len(b)-offset)%48==0
 for raw in fmt.iter_unpack(b[offset:]):
  gid,*_=raw; hid=int.from_bytes(raw[-1],'little')>>5
  if not (raw[8]<=8000 or hid in needed or str(gid) in gaia_needed):continue
  # Separate components share HIP IDs; use brightest, which the source stores first.
  i=len(records); vec=[raw[k]/2e9 for k in (1,2,3)];vel=[raw[k]/206264806247.09636 for k in (4,5,6)]
  records.append(struct.pack('<I6fhh',hid,*vec,*vel,raw[8],raw[7]))
  if hid and (hid not in hip):hip[hid]=i
  if gid:gaia[str(gid)]=i
# Only referenced Gaia IDs need a named lookup; numeric HIP indexes are decoded from records.
gaia={k:v for k,v in gaia.items() if k in gaia_needed}
dsos={}
for line in (SRC/'nebulae/default/catalog.txt').read_text(encoding="utf-8").splitlines():
 if line.startswith('#'):continue
 v=line.split('\t')
 if len(v)<29:continue
 for label,col in [('NGC',16),('IC',17),('M',18),('C',19),('PGC',28)]:
  key=label+v[col].strip()
  for requested in sorted(dso_needed):
   if re.sub(r'\s+','',requested)==key: dsos['DSO:'+requested]=[float(v[1]),float(v[2])]
# Track the most recent input-data change, not the viewer build commit.
sha=subprocess.check_output(['git','-C',str(SRC),'log','-1','--format=%H','--','skycultures','starcatalog','stars/hip_gaia3','nebulae/default/catalog.txt'],text=True).strip()
payload={'cultures':cultures,'catalogs':catalogs,'gaia':gaia,'dsos':dsos,'sha':sha,'starEpochJD':2457389,'stars':base64.b64encode(b''.join(records)).decode()}
encoded=json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
template=(ROOT/'template.html').read_text(encoding="utf-8");js=(ROOT/'viewer.js').read_text(encoding="utf-8")
html=template.replace('/*__VIEWER__*/',js).replace('/*__DATA__*/',encoded)
(ROOT/'index.html').write_text(html,encoding="utf-8")
shutil.copyfile(SRC/'COPYING',ROOT/'COPYING')
report={'source_commit':sha,'cultures':len(cultures),'stars':len(records),'catalog_groups':len(catalogs),'catalog_records':sum(len(c['data']) for c in catalogs),'unresolved_HIP':sorted(needed-hip.keys()),'unresolved_Gaia':sorted(gaia_needed-gaia.keys()),'unresolved_DSO':sorted(dso_needed-{x[4:] for x in dsos}),'html_bytes':len(html.encode())}
(ROOT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
