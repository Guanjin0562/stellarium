/* SPDX-License-Identifier: GPL-2.0-or-later
 * Mac HTML adaptation by Wenshuishi0528.
 * Original Stellarium, skyculture and star-catalog credits are preserved.
 */
'use strict';
const Astro=(()=>{
 const D=Math.PI/180,AS=D/3600;
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const norm=v=>{const n=Math.hypot(...v);return v.map(x=>x/n)};
 const vec=(ra,dec)=>[Math.cos(dec*D)*Math.cos(ra*D),Math.cos(dec*D)*Math.sin(ra*D),Math.sin(dec*D)];
 const sph=v=>[mod(Math.atan2(v[1],v[0])/D,360),Math.atan2(v[2],Math.hypot(v[0],v[1]))/D];
 const mod=(a,n)=>((a%n)+n)%n;
 const mat=(m,v)=>[dot(m.slice(0,3),v),dot(m.slice(3,6),v),dot(m.slice(6,9),v)];
 const trans=m=>[m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
 function precession(year){
  const t=(year-2000)/100,zeta=(2306.2181*t+.30188*t*t+.017998*t*t*t)*AS,z=(2306.2181*t+1.09468*t*t+.018203*t*t*t)*AS,theta=(2004.3109*t-.42665*t*t-.041833*t*t*t)*AS;
  const a=Math.cos(zeta),b=Math.sin(zeta),c=Math.cos(theta),d=Math.sin(theta),e=Math.cos(z),f=Math.sin(z);
  return [e*c*a-f*b,-e*c*b-f*a,-e*d,f*c*a+e*b,-f*c*b+e*a,-f*d,d*a,-d*b,c];
 }
 function angle(value){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  if(typeof value!=='string'||!value.trim())return NaN;
  const s=value.trim().replace(/[−–]/g,'-').replace(/[′’]/g,"'").replace(/[″“”]/g,'"');
  if(!/^[+\-\d.\s°dhms'":]+$/i.test(s))return NaN;
  const n=s.match(/\d+(?:\.\d*)?|\.\d+/g);if(!n||n.length>3)return NaN;
  const parts=n.map(Number);if(parts.slice(1).some(x=>x>60))return NaN;
  const result=(parts[0]+(parts[1]||0)/60+(parts[2]||0)/3600)*(s.startsWith('-')?-1:1)*(/h/i.test(s)?15:1);
  return Math.abs(result)<=360?result:NaN;
 }
 function epoch(value,fallback=2000){
  if(value==null)return fallback;
  const s=String(value).trim(), n=Number(s.replace(/^(JD|J|B)/i,''));if(!Number.isFinite(n))return fallback;
  if(/^JD/i.test(s)||(!/^[JB]/i.test(s)&&n>1e5))return 2000+(n-2451545)/365.25;
  if(/^B/i.test(s))return 2000+(2415020.31352+(n-1900)*365.242198781-2451545)/365.25;
  return n;
 }
 function obliquity(year){const t=(year-2000)/100;return (84381.448-46.815*t-.00059*t*t+.001813*t*t*t)*AS}
 const eclToEqu=(v,year)=>{const e=obliquity(year),c=Math.cos(e),s=Math.sin(e);return [v[0],c*v[1]-s*v[2],s*v[1]+c*v[2]]};
 const gal=[-.0548755604,-.8734370902,-.4838350155,.4941094279,-.44482963,.7469822445,-.867666149,-.1980763734,.4559837762];
 const sgal=[-.7357425748,.6772612964,0,-.0745537784,-.0809914713,.9939225904,.6731453021,.7312711658,.1100812622];
 const mansions={'角':65474,'亢':69427,'氐':72622,'房':78265,'心':80112,'尾':82514,'箕':88635,'斗':92041,'牛':100345,'女':102618,'虚':106278,'危':109074,'室':113963,'壁':1067,'奎':3693,'娄':8903,'胃':12719,'昴':17499,'毕':20889,'觜':26176,'参':25930,'井':30343,'鬼':41822,'柳':42313,'星':46390,'张':48356,'翼':53740,'轸':59803,'虛':106278,'婁':8903,'畢':20889,'參':25930,'張':48356,'軫':59803};
 function horizontal(az,alt,lat,lst){const a=az*D,h=alt*D,l=lat*D;const dec=Math.asin(Math.sin(h)*Math.sin(l)+Math.cos(h)*Math.cos(l)*Math.cos(a));const ha=Math.atan2(-Math.sin(a)*Math.cos(h),Math.sin(h)*Math.cos(l)-Math.cos(h)*Math.sin(l)*Math.cos(a));return vec(lst-ha/D,dec/D)}
 const sidereal=(jd,lon)=>mod(280.46061837+360.98564736629*(jd-2451545)+.000387933*((jd-2451545)/36525)**2-((jd-2451545)/36525)**3/38710000+lon,360);
 function convert(g,s,lookup,fallback,location={lat:39.9042,lon:116.4074,jd:2451545}){
  const year=epoch(g._epoch??(g.use_epoch?g.epoch:null),fallback),P=precession(year),inv=trans(P),system=g.coordinate_system;
  let x,y,point;
  if(system==='equatorial_cn'){
   const dx=Number(g.degrees_per_circle_x??g.degrees_per_circle??365.25),dy=Number(g.degrees_per_circle_y??g.degrees_per_circle??365.25);
   const custom=(g.mansions||[]).find(a=>a.name===s.mansion);const id=custom?custom.defining_star:mansions[s.mansion];
   const base=lookup(String(id),year);x=typeof s.x==='number'?s.x:NaN;y=s.y!=null?Number(s.y):(s.io_degree!=null?dy/4-Number(s.io_degree):NaN);
   if(!base||!Number.isFinite(x)||!Number.isFinite(y)||!(dx>0&&dy>0)||x<0||x>dx||y<0||y>dy/2)throw Error('缺失或无效的入宿度／去极度／距星');
   x=sph(mat(P,base))[0]+x*360/dx;y=90-y*360/dy;point=mat(inv,vec(x,y));
  }else{
   x=angle(s.x);y=angle(s.y);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(y)>90)throw Error('缺失或无效的角度');
   const p=vec(x,y);
   if(system==='equatorial'||system==='equatorial_dms')point=mat(inv,p);
   else if(system==='equatorialJ2000')point=p;
   else if(system==='ecliptic')point=mat(inv,eclToEqu(p,year));
   else if(system==='eclipticJ2000')point=eclToEqu(p,2000);
   else if(system==='galactic')point=mat(trans(gal),p);
   else if(system==='supergalactic')point=mat(trans(gal),mat(trans(sgal),p));
   else if(system==='horizontal')point=mat(inv,horizontal(x,y,location.lat,sidereal(location.jd,location.lon)));
   else throw Error('未指定或不支持的坐标系');
  }
  return {point:norm(point),epoch:year};
 }
 return {D,dot,norm,vec,sph,mod,mat,trans,precession,angle,epoch,obliquity,eclToEqu,horizontal,sidereal,convert};
})();
if(typeof module!=='undefined')module.exports=Astro;
if(typeof document!=='undefined')(()=>{
 const $=id=>document.getElementById(id),A=Astro,D=A.D;
 let DATA;
 try{DATA=JSON.parse($('payload').textContent)}catch(e){$('loading').textContent='数据读取失败：'+e.message;throw e}
 const raw=atob(DATA.stars),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const dv=new DataView(bytes.buffer),N=bytes.length/32,hip=new Map(),star=[];
 for(let i=0;i<N;i++){
  const o=i*32,h=dv.getUint32(o,true),p=[dv.getFloat32(o+4,true),dv.getFloat32(o+8,true),dv.getFloat32(o+12,true)],v=[dv.getFloat32(o+16,true),dv.getFloat32(o+20,true),dv.getFloat32(o+24,true)],mag=dv.getInt16(o+28,true)/1000,bv=dv.getInt16(o+30,true)/1000;
  star.push({hip:h,p,v,mag,bv});if(h&&!hip.has(String(h)))hip.set(String(h),i);
 }
 const now=new Date(),nowJD=now.getTime()/86400000+2440587.5;
 let state={culture:'chinese',ra:85,dec:15,fov:100,year:2000+(nowJD-2451545)/365.25,jd:nowJD,mag:6,catalog:-1,selected:null};
 let culture,cons=[],markers=[],bad=[],searchIndex=[],positions=new Float32Array(N*3),P=A.precession(state.year),frameRequested=false,W=0,H=0,cx=0,cy=0,scale=1,hit=[],camera,epochCache=new Map(),pointerMap=new Map(),pinch=null;
 const canvas=$('sky'),ctx=canvas.getContext('2d',{alpha:false});
 const finite=(v,min,max)=>Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
 function starJ2000(id,year){const i=hip.get(String(id))??DATA.gaia[String(id)];if(i==null)return null;const s=star[i],t=year-(2000+(DATA.starEpochJD-2451545)/365.25);return A.norm(s.p.map((x,k)=>x+s.v[k]*t))}
 function pointFor(ref,year=state.year){
  if(Array.isArray(ref))return A.vec(ref[0]*15,ref[1]);
  if(typeof ref==='string'&&ref.startsWith('DSO:'))return DATA.dsos[ref]?A.vec(...DATA.dsos[ref]):null;
  return starJ2000(ref,year);
 }
 function location(){return {lat:finite($('lat').value,-90,90)?Number($('lat').value):39.9042,lon:finite($('lon').value,-180,180)?Number($('lon').value):116.4074,jd:state.jd}}
 function rebuildPositions(){
  P=A.precession(state.year);epochCache.clear();const t=state.year-(2000+(DATA.starEpochJD-2451545)/365.25);
  for(let i=0;i<N;i++){const s=star[i],p=A.mat(P,A.norm(s.p.map((x,k)=>x+s.v[k]*t)));positions.set(p,i*3)}
  rebuildCons();rebuildMarkers();requestDraw();
 }
 function displayPoint(p){return A.mat(P,p)}
 function rebuildCons(){
  cons=culture.constellations.map(c=>{
   const lines=c.lines.map(line=>line.filter(r=>r!=='thin'&&r!=='bold').map(r=>{const p=pointFor(r);return p?displayPoint(p):null}));
   const pts=lines.flat().filter(Boolean),sum=pts.reduce((s,p)=>s.map((a,i)=>a+p[i]),[0,0,0]);
   const center=c.labels?.length?displayPoint(A.vec(c.labels[0][0]*15,c.labels[0][1])):(Math.hypot(...sum)>1e-8?A.norm(sum):null);
   return {...c,lines,center};
  });
 }
 function selectCulture(id){
  state.culture=id;culture=DATA.cultures.find(c=>c.id===id)||DATA.cultures[0];rebuildCons();
  $('cultureDescription').textContent=culture.description;$('cultureStats').textContent=`${culture.title} · ${cons.length} 个星官／星座`;
  buildSearchIndex();requestDraw();
 }
 function rebuildMarkers(){
  markers=[];bad=[];const g=DATA.catalogs[state.catalog];if(!g){$('catalogStatus').textContent='选择星表，查看其观测坐标。';$('catalogMeta').textContent='尚未选择星表';buildSearchIndex();return}
  const l=location(),epoch=A.epoch(g._epoch,state.year);
  const resolve=(id,year)=>{const key=id+':'+year;if(!epochCache.has(key))epochCache.set(key,starJ2000(id,year));return epochCache.get(key)};
  for(const s of g.data){
   try{
    const result=A.convert(g,s,resolve,state.year,l),p=displayPoint(result.point);
    let color=s.color??g.default_color??'79d8bb';if(!/^#?[0-9a-f]{6}$/i.test(color))color='79d8bb';color='#'+color.replace('#','');
    const target=Array.isArray(s.HIP)?s.HIP.map(h=>resolve(String(h),result.epoch)).find(Boolean):null;
    const converted={...s,j2000:result.point,point:p,target:target?displayPoint(target):null,epoch:result.epoch,color,icon:s.icon??g.default_icon??'cross',markerSize:Number(s.size??g.default_size??6)};
    markers.push(converted);
   }catch(e){bad.push({name:s.name||'未命名',reason:e.message})}
  }
  const systems={equatorial_cn:'传统赤道（入宿度／去极度）',equatorial:'赤道',ecliptic:'黄道',equatorialJ2000:'赤道 J2000',eclipticJ2000:'黄道 J2000',horizontal:'地平',galactic:'银道',supergalactic:'超星系'};
  $('catalogStatus').textContent=`${g.id||'未命名星表'}\n有效 ${markers.length} 条／总计 ${g.data.length} 条；跳过 ${bad.length} 条。${systems[g.coordinate_system]||'未指定坐标系'} · 历元 ${epoch.toFixed(2)}`;
  const meta={...g};delete meta.data;delete meta._key;meta['网页跳过记录']=bad;
  $('catalogMeta').textContent=JSON.stringify(meta,null,2);buildSearchIndex();
 }
 function setYear(year){
  if(!finite(year,-4000,6000)){toast('年份需介于 −4000 与 6000 之间');return}
  state.year=Number(year);state.jd=2451545+(state.year-2000)*365.25;$('year').value=state.year.toFixed(3);const date=new Date((state.jd-2440587.5)*86400000),local=new Date(date.getTime()-date.getTimezoneOffset()*60000);$('time').value=local.getFullYear()>0?local.toISOString().slice(0,16):'';rebuildPositions();
  if(state.selected)showSelection(state.selected);
 }
 function chooseCatalog(index){
  state.catalog=Number(index);const g=DATA.catalogs[state.catalog];$('markers').checked=true;
  if(g&&$('epochFollow').checked&&g._epoch!=null)setYear(A.epoch(g._epoch,state.year));else{rebuildMarkers();requestDraw()}
  buildSearchIndex();
 }
 function project(p,clip=true){
  const z=A.dot(p,camera.forward);if(z<-.1)return null;
  const k=2/(1+z),x=cx+scale*k*A.dot(p,camera.right),y=cy-scale*k*A.dot(p,camera.up);
  if(clip&&(x< -50||x>W+50||y< -50||y>H+50))return null;return [x,y];
 }
 function requestDraw(){if(!frameRequested){frameRequested=true;requestAnimationFrame(draw)}}
 function path(points,color,width=1,dash=[]){
  ctx.beginPath();let previous=null;
  let last=null;for(const p of points){if(!p){previous=null;last=null;continue}const count=last?Math.max(1,Math.ceil(Math.acos(Math.min(1,Math.max(-1,A.dot(last,p))))/D/3)):1;for(let step=1;step<=count;step++){const t=step/count,v=last?A.norm(last.map((a,k)=>a*(1-t)+p[k]*t)):p,q=project(v,false);if(q&&previous)ctx.lineTo(...q);else if(q)ctx.moveTo(...q);previous=q}last=p}
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
 }
 function grid(){
  if($('grid').checked){
   for(let ra=0;ra<360;ra+=30){const a=[];for(let dec=-89;dec<=89;dec+=2)a.push(A.vec(ra,dec));path(a,'#31435b88');const q=project(A.vec(ra,0));if(q){ctx.fillStyle='#8296b5';ctx.font='10px sans-serif';ctx.fillText(`${ra/15}h`,q[0]+4,q[1]+14)}}
   for(let dec=-60;dec<=60;dec+=30){const a=[];for(let ra=0;ra<=360;ra+=3)a.push(A.vec(ra,dec));path(a,dec===0?'#637e9a88':'#31435b88',dec===0?1.2:1)}
  }
  if($('ecliptic').checked){const a=[];for(let lon=0;lon<=360;lon+=2)a.push(A.eclToEqu(A.vec(lon,0),state.year));path(a,'#bca76c99',1,[5,5])}
  if($('horizon').checked){const l=location(),lst=A.sidereal(l.jd,l.lon),a=[];for(let az=0;az<=360;az+=2)a.push(A.horizontal(az,0,l.lat,lst));path(a,'#75c2b5bb',1.5);for(const [az,label] of [[0,'北'],[90,'东'],[180,'南'],[270,'西']]){const q=project(A.horizontal(az,0,l.lat,lst));if(q){ctx.fillStyle='#a7d0c2';ctx.font='13px sans-serif';ctx.fillText(label,q[0]+6,q[1]-8)}}}
 }
 function draw(){
  frameRequested=false;W=innerWidth;H=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const side=$('panel').classList.contains('hidden')?0:(W>570?Math.min(350,W*.34):0);cx=(W+side)/2;cy=H*.5;scale=Math.min(W-side,H)*.5/(2*Math.tan(state.fov*D/4));
  camera={forward:A.vec(state.ra,state.dec),right:[Math.sin(state.ra*D),-Math.cos(state.ra*D),0],up:[-Math.sin(state.dec*D)*Math.cos(state.ra*D),-Math.sin(state.dec*D)*Math.sin(state.ra*D),Math.cos(state.dec*D)]};
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.7);bg.addColorStop(0,'#101c2b');bg.addColorStop(.55,'#07101e');bg.addColorStop(1,'#030711');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);grid();
  if($('lines').checked){for(const c of cons){const chosen=state.selected?.kind==='constellation'&&state.selected.id===c.id;for(const line of c.lines){path(line,chosen?'#ffe2a4':'#b6a16d80',chosen?2:1);if(line.length>=2&&line[0]&&line[1]&&A.dot(line[0],line[1])>.99999999){const q=project(line[0]);if(q){ctx.strokeStyle='#b6a16d99';ctx.beginPath();ctx.arc(...q,7,0,Math.PI*2);ctx.stroke()}}}}}
  hit=[];const starLabels=[];ctx.textAlign='left';
  for(let i=0;i<N;i++){
   const s=star[i];if(s.mag>state.mag)continue;const o=i*3,q=project([positions[o],positions[o+1],positions[o+2]]);if(!q)continue;
   const radius=Math.max(.35,Math.min(4.6,2.9*Math.pow(10,-.115*s.mag)))*(state.fov<30?1.2:1),color=s.bv<.25?'#c6ddff':s.bv>1.1?'#ffd4a3':'#edf0e6';
   if(s.mag<1.8){const g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],radius*4);g.addColorStop(0,color+'aa');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(q[0]-radius*4,q[1]-radius*4,radius*8,radius*8)}
   ctx.globalAlpha=Math.max(.25,Math.min(1,(state.mag-s.mag+1.5)*.5));ctx.fillStyle=color;ctx.beginPath();ctx.arc(q[0],q[1],radius,0,2*Math.PI);ctx.fill();ctx.globalAlpha=1;
   hit.push({x:q[0],y:q[1],kind:'star',i,priority:s.mag});
   if($('starNames').checked&&s.mag<Math.min(2.5,2.5+Math.max(0,70-state.fov)/20)&&s.hip&&culture.names[String(s.hip)])starLabels.push({q,name:culture.names[String(s.hip)].split(' / ')[0],mag:s.mag});
  }
  const occupied=[];function text(label,x,y,color,size=12,force=false){if(!Number.isFinite(x+y))return;ctx.font=`${size}px -apple-system, sans-serif`;const w=ctx.measureText(label).width,box=[x-w/2,y-size,w,size+5];if(!force&&occupied.some(b=>box[0]<b[0]+b[2]+8&&box[0]+box[2]>b[0]-8&&box[1]<b[1]+b[3]&&box[1]+box[3]>b[1]))return;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#08101ed9';ctx.strokeText(label,x,y);ctx.fillStyle=color;ctx.fillText(label,x,y);occupied.push(box)}
  if($('names').checked){for(const c of cons){if(!c.center)continue;const q=project(c.center);if(q)text(c.name,q[0],q[1]-9,'#cbb88c',12,state.selected?.id===c.id)}}
  starLabels.sort((a,b)=>a.mag-b.mag).forEach(l=>text(l.name,l.q[0],l.q[1]+21,'#91b8d5',11));
  if($('markers').checked){for(let i=0;i<markers.length;i++){
   const s=markers[i],q=project(s.point);if(!q)continue;
   if($('residuals').checked&&s.target)path([s.point,s.target],s.color+'70',1,[3,3]);
   let r=s.icon==='circle'?Math.max(1.7,(5*s.markerSize*s.markerSize-80*s.markerSize+405)/32):Math.max(1.5,12.5-1.25*s.markerSize);r=Math.min(r,13);
   ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=1;ctx.beginPath();
   if(s.icon==='dot'||s.markerSize>=8.5){ctx.arc(...q,1.7,0,2*Math.PI);ctx.fill()}else if(s.icon==='circle'){ctx.arc(...q,r,0,2*Math.PI);ctx.stroke()}else{ctx.moveTo(q[0]-r,q[1]);ctx.lineTo(q[0]+r,q[1]);ctx.moveTo(q[0],q[1]-r);ctx.lineTo(q[0],q[1]+r);ctx.stroke()}
   hit.push({x:q[0],y:q[1],kind:'marker',i,priority:-5});if($('markerNames').checked)text(s.name||'未命名',q[0],q[1]-r-5,s.color,10);
  }}
  if(state.selected){let p=null;const s=state.selected;if(s.kind==='star'){const o=s.i*3;p=[positions[o],positions[o+1],positions[o+2]]}else if(s.kind==='marker')p=markers[s.i]?.point;else p=cons.find(c=>c.id===s.id)?.center;const q=p&&project(p);if(q){ctx.strokeStyle='#fff0bf';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(...q,13,0,2*Math.PI);ctx.stroke();ctx.setLineDash([])}}
  ctx.textAlign='left';$('sceneStatus').textContent=`${culture.title} · ${state.year.toFixed(2)} 年\n视场 ${state.fov.toFixed(1)}° · 赤经 ${(state.ra/15).toFixed(2)}h · 赤纬 ${state.dec.toFixed(1)}°`;
 }
 function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500)}
 function go(p,fov){if(!p)return;[state.ra,state.dec]=A.sph(p);if(fov)state.fov=fov;requestDraw()}
 function infoRow(dl,k,v){if(v==null||v==='')return;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=String(v);dl.append(dt,dd)}
 function showSelection(selected){
  state.selected=selected;const body=$('infoBody');body.replaceChildren();const dl=document.createElement('dl');body.append(dl);
  if(selected.kind==='star'){
   const s=star[selected.i],id=String(s.hip),o=selected.i*3,coords=A.sph([positions[o],positions[o+1],positions[o+2]]);$('infoTitle').textContent=culture.names[id]||(s.hip?'HIP '+s.hip:'Gaia 恒星');
   infoRow(dl,'编号',s.hip?'HIP '+s.hip:'项目 Gaia 恒星');infoRow(dl,'视星等',s.mag.toFixed(3));infoRow(dl,'赤经',(coords[0]/15).toFixed(6)+' h');infoRow(dl,'赤纬',coords[1].toFixed(6)+'°');infoRow(dl,'观测年份',state.year.toFixed(3));
   const belong=culture.constellations.filter(c=>c.lines.some(l=>l.some(r=>String(r)===id))).map(c=>c.name);infoRow(dl,'所属星官',belong.join('、'));
  }else if(selected.kind==='marker'){
   const s=markers[selected.i];if(!s){$('info').classList.remove('show');return}const coords=A.sph(s.j2000);$('infoTitle').textContent=s.name||'星表标记';
   infoRow(dl,'星表',DATA.catalogs[state.catalog]?.id);infoRow(dl,'原始 X',s.x);infoRow(dl,'原始 Y',s.y);infoRow(dl,'所在宿',s.mansion);infoRow(dl,'赤道内外度',s.io_degree);infoRow(dl,'历元',s.epoch.toFixed(3));infoRow(dl,'赤经 J2000',(coords[0]/15).toFixed(6)+' h');infoRow(dl,'赤纬 J2000',coords[1].toFixed(6)+'°');infoRow(dl,'证认星',s.id_star);infoRow(dl,'HIP',s.HIP?.join(', '));infoRow(dl,'原始备注',s.note);
   if(s.target){const error=Math.acos(Math.max(-1,Math.min(1,A.dot(s.point,s.target))))/D;infoRow(dl,'与证认星角距',error.toFixed(4)+'°（本适配近似）')}
  }else{
   const c=cons.find(c=>c.id===selected.id);if(!c)return;$('infoTitle').textContent=c.name;infoRow(dl,'星空文化',culture.title);infoRow(dl,'标识',c.id);infoRow(dl,'连线段数',c.lines.reduce((n,l)=>n+Math.max(0,l.length-1),0));infoRow(dl,'说明','名称与连线来自项目原始星空文化数据。');
  }
  $('info').classList.add('show');requestDraw();
 }
 function buildSearchIndex(){
  searchIndex=[];if(!culture)return;
  for(const c of cons)if(c.center)searchIndex.push({name:c.name,detail:'星官／星座',kind:'constellation',id:c.id,key:c.name.toLowerCase()});
  for(const [id,name] of Object.entries(culture.names)){const i=hip.get(id)??DATA.gaia[id];if(i!=null)searchIndex.push({name,detail:hip.has(id)?'HIP '+id:'Gaia '+id,kind:'star',i,key:(name+' hip '+id).toLowerCase()})}
  const ids=new Set(searchIndex.filter(x=>x.kind==='star').map(x=>x.i));
  for(const [id,i] of hip)if(!ids.has(i)&&star[i].mag<3)searchIndex.push({name:'HIP '+id,detail:'恒星',kind:'star',i,key:'hip '+id});
  for(let i=0;i<markers.length;i++)searchIndex.push({name:markers[i].name||'未命名',detail:'当前古星表',kind:'marker',i,key:(markers[i].name||'').toLowerCase()});
  if($('search').value)search();
 }
 function search(){
  const query=$('search').value.trim().toLowerCase(),results=$('results');results.replaceChildren();if(!query)return;
  let matches=searchIndex.filter(x=>x.key.includes(query));const id=query.replace(/^hip\s*/,'');
  if(/^\d+$/.test(id)&&hip.has(id)&&!matches.some(x=>x.kind==='star'&&x.i===hip.get(id)))matches.unshift({name:'HIP '+id,detail:'恒星',kind:'star',i:hip.get(id)});
  matches.sort((a,b)=>(a.name===query?-1:0)-(b.name===query?-1:0));
  for(const match of matches.slice(0,28)){
   const b=document.createElement('button'),title=document.createElement('span'),detail=document.createElement('small');title.textContent=match.name;detail.textContent=match.detail;b.append(title,detail);b.onclick=()=>{
    let p;if(match.kind==='star'){const o=match.i*3;p=[positions[o],positions[o+1],positions[o+2]]}else if(match.kind==='marker')p=markers[match.i]?.point;else p=cons.find(c=>c.id===match.id)?.center;
    go(p,Math.min(70,state.fov));showSelection(match);
   };results.append(b);
  }
  if(!matches.length){const p=document.createElement('p');p.className='muted';p.textContent='没有找到。试试当前文化中的星官名，或 HIP 编号。';results.append(p)}
 }
 // All controls work from a file:// URL: no fetch, CDN, local server or browser permissions.
 for(const c of DATA.cultures){const o=document.createElement('option');o.value=c.id;o.textContent=c.title;$('culture').append(o)}$('culture').value=state.culture;
 const none=document.createElement('option');none.value=-1;none.textContent='不显示古星表';$('catalogSelect').append(none);
 function appendCatalogOptions(start=0){const groups=new Map();for(let i=0;i<DATA.catalogs.length;i++){const g=DATA.catalogs[i],name=g._file;let group=groups.get(name);if(!group){group=document.createElement('optgroup');group.label=name.replace('starcatalog/','');groups.set(name,group)}const o=document.createElement('option');o.value=i;o.textContent=`${g.id||'未命名'}（${g.data.length}）`;group.append(o)}$('catalogSelect').replaceChildren(none,...groups.values())}
 appendCatalogOptions();$('culture').onchange=e=>{state.selected=null;$('info').classList.remove('show');selectCulture(e.target.value)};
 $('catalogSelect').onchange=e=>{state.selected=null;$('info').classList.remove('show');chooseCatalog(e.target.value)};
 $('search').oninput=search;$('search').onkeydown=e=>{if(e.key==='Enter')$('results').querySelector('button')?.click()};
 $('applyYear').onclick=()=>setYear($('year').value);$('year').onkeydown=e=>{if(e.key==='Enter')setYear(e.target.value)};
 $('mag').oninput=e=>{state.mag=Number(e.target.value);$('magOut').textContent=state.mag.toFixed(1);requestDraw()};
 for(const id of ['lines','names','starNames','grid','ecliptic','horizon','markers','markerNames','residuals'])$(id).onchange=requestDraw;
 for(const id of ['lat','lon','time'])$(id).onchange=()=>{
  if(!finite($('lat').value,-90,90)||!finite($('lon').value,-180,180)){toast('请输入有效的经纬度');return}
  if(id==='time'){const d=new Date($('time').value);if(Number.isFinite(+d))setYear(2000+(+d/86400000+2440587.5-2451545)/365.25)}rebuildMarkers();requestDraw();
 };
 $('zenith').onclick=()=>{const l=location();$('horizon').checked=true;go(A.vec(A.sidereal(l.jd,l.lon),l.lat),100)};
 $('focusCatalog').onclick=()=>{if(markers.length){go(markers[0].point,70);showSelection({kind:'marker',i:0})}else toast('当前星表没有可显示的坐标')};
 const localNow=new Date(now.getTime()-now.getTimezoneOffset()*60000);$('time').value=localNow.toISOString().slice(0,16);$('year').value=state.year.toFixed(3);
 for(const b of document.querySelectorAll('[data-hip]'))b.onclick=()=>{const i=hip.get(b.dataset.hip);if(i!=null){go(displayPoint(starJ2000(b.dataset.hip,state.year)),70);showSelection({kind:'star',i})}};
 for(const b of document.querySelectorAll('[data-target]'))b.onclick=()=>{go(b.dataset.target==='north'?[0,0,1]:A.vec(85,0),b.dataset.target==='north'?100:70)};
 for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{for(const tab of document.querySelectorAll('[data-tab]'))tab.setAttribute('aria-selected',String(tab===b));for(const s of document.querySelectorAll('.tab'))s.classList.toggle('active',s.id===b.dataset.tab)};
 $('menuButton').onclick=()=>{$('panel').classList.toggle('hidden');requestDraw()};$('infoClose').onclick=()=>{state.selected=null;$('info').classList.remove('show');requestDraw()};
 $('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);function zoom(factor){state.fov=Math.max(3,Math.min(170,state.fov*factor));requestDraw()}
 $('resetView').onclick=()=>{state.ra=85;state.dec=15;state.fov=100;state.selected=null;$('info').classList.remove('show');requestDraw()};$('night').onclick=()=>{document.body.classList.toggle('night');$('night').textContent=document.body.classList.contains('night')?'白光':'红光'};
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('当前浏览器请使用窗口的全屏按钮')}catch(e){toast('请使用浏览器窗口的全屏按钮')}};
 function download(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
 $('saveImage').onclick=()=>{draw();canvas.toBlob(b=>{if(b)download(b,`东亚星空_${state.year.toFixed(1)}.png`)})};
 $('exportCatalog').onclick=()=>{
  if(!markers.length){toast('请先选择含有效坐标的星表');return}
  const quote=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
  const rows=[['name','epoch','ra_J2000_deg','dec_J2000_deg','mansion','source_x','source_y','HIP','note'],...markers.map(s=>[s.name,s.epoch,...A.sph(s.j2000),s.mansion,s.x,s.y,s.HIP?.join(';'),s.note])];
  download(new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'古星表_J2000坐标.csv');
 };
 $('importFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;if(file.size>20*1024*1024){toast('请选择小于 20 MB 的 JSON 星表');return}
  try{let data=JSON.parse(await file.text());if(!Array.isArray(data))data=[data];if(!data.every(g=>g&&typeof g==='object'&&!Array.isArray(g)))throw Error('星表应为对象或对象数组');let inheritedEpoch=null;const added=[];
   for(const [i,g] of data.entries()){if(g.use_epoch&&g.epoch!=null)inheritedEpoch=g.epoch;if(!Array.isArray(g.data)||!g.data.length)continue;if(!g.data.every(s=>s&&typeof s==='object'&&!Array.isArray(s)))throw Error('data 中的记录应为对象');added.push({...g,_epoch:inheritedEpoch,_file:'本地导入/'+file.name,_key:'import:'+Date.now()+':'+i})}
   if(!added.length)throw Error('没有包含 data 数组的星表');const start=DATA.catalogs.length;DATA.catalogs.push(...added);appendCatalogOptions();$('catalogSelect').value=start;chooseCatalog(start);toast(`已导入 ${added.length} 组星表`);
  }catch(err){toast('导入失败：'+err.message)}finally{e.target.value=''}
 };
 // Pointer drag and two-finger pinch. A click selects only when movement stayed under 6 pixels.
 let drag=null;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointerMap.set(e.pointerId,[e.clientX,e.clientY]);canvas.classList.add('drag');if(pointerMap.size===1)drag={x:e.clientX,y:e.clientY,ra:state.ra,dec:state.dec,moved:false};else if(pointerMap.size===2){const p=[...pointerMap.values()];pinch={distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),fov:state.fov};if(drag)drag.moved=true}});
 canvas.addEventListener('pointermove',e=>{if(!pointerMap.has(e.pointerId))return;pointerMap.set(e.pointerId,[e.clientX,e.clientY]);if(pointerMap.size===2&&pinch){const p=[...pointerMap.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);state.fov=Math.max(3,Math.min(170,pinch.fov*pinch.distance/Math.max(1,d)));requestDraw();return}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;state.ra=A.mod(drag.ra+dx*state.fov/Math.min(W,H)/Math.max(.2,Math.cos(drag.dec*D)),360);state.dec=Math.max(-89.8,Math.min(89.8,drag.dec+dy*state.fov/Math.min(W,H)));requestDraw()});
 function pointerEnd(e){const click=drag&&!drag.moved&&pointerMap.size===1&&e.type!=='pointercancel';pointerMap.delete(e.pointerId);if(!pointerMap.size){canvas.classList.remove('drag');drag=null;pinch=null}else if(pointerMap.size===1){const p=[...pointerMap.values()][0];drag={x:p[0],y:p[1],ra:state.ra,dec:state.dec,moved:true};pinch=null}if(click){const list=hit.map(h=>({...h,d:Math.hypot(h.x-e.clientX,h.y-e.clientY)})).filter(h=>h.d<10).sort((a,b)=>a.d-b.d||a.priority-b.priority);if(list.length)showSelection(list[0])}}
 canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.0015))},{passive:false});
 window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;const step=state.fov*.07;if(e.key==='Escape')$('infoClose').click();else if(e.key==='ArrowLeft')state.ra=A.mod(state.ra-step,360);else if(e.key==='ArrowRight')state.ra=A.mod(state.ra+step,360);else if(e.key==='ArrowUp')state.dec=Math.min(89.8,state.dec+step);else if(e.key==='ArrowDown')state.dec=Math.max(-89.8,state.dec-step);else if(e.key==='+'||e.key==='=')zoom(.8);else if(e.key==='-')zoom(1.25);else return;e.preventDefault();requestDraw()});
 window.addEventListener('resize',requestDraw);
 $('buildStats').textContent=`${DATA.cultures.length} 套星空文化 · ${N.toLocaleString()} 颗恒星 · ${DATA.catalogs.length} 组古星表 · ${DATA.catalogs.reduce((n,c)=>n+c.data.length,0).toLocaleString()} 条原始记录。`;$('commit').textContent='源码提交：'+DATA.sha;
 selectCulture(state.culture);rebuildPositions();$('loading').remove();requestDraw();
 // A read-only diagnostic lets local regression checks validate the actual data without a browser runtime.
 window.stellariumLocal={getSummary:()=>({stars:N,cultures:DATA.cultures.length,catalogs:DATA.catalogs.length,validMarkers:markers.length,skippedMarkers:bad.length,culture:state.culture,year:state.year})};
})();
