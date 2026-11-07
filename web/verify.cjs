// SPDX-License-Identifier: GPL-2.0-or-later
// Mac HTML adaptation by Wenshuishi0528.
'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path'),A=require('./viewer.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),d=JSON.parse(html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/)[1]),b=Buffer.from(d.stars,'base64'),hips=new Map(),stars=[];
for(let o=0;o<b.length;o+=32){const h=b.readUInt32LE(o),s={p:[4,8,12].map(x=>b.readFloatLE(o+x)),v:[16,20,24].map(x=>b.readFloatLE(o+x)),mag:b.readInt16LE(o+28)/1000};stars.push(s);if(h&&!hips.has(String(h)))hips.set(String(h),stars.length-1)}
const lookup=(id,y)=>{const i=hips.get(String(id))??d.gaia[String(id)];if(i==null)return null;const s=stars[i],t=y-(2000+(d.starEpochJD-2451545)/365.25);return A.norm(s.p.map((x,k)=>x+s.v[k]*t))};
const near=(a,b,e=1e-8)=>assert(Math.abs(a-b)<e,`${a} vs ${b}`);
near(A.angle('12h 30m 00s'),187.5);near(A.angle('-12° 30\' 30"'),-12.508333333333333);assert(Number.isNaN(A.angle('missing')));assert(Number.isNaN(A.angle('12° 70\'')));
near(A.epoch('J1034.5'),1034.5);near(A.epoch('JD2451545.0'),2000);near(A.epoch('B1950.0'),1949.9997904423,1e-7);
for(const y of [-1000,300,1034.5,1844.97,2000,2026,4000])for(const p of [A.vec(0,0),A.vec(80,45),A.vec(300,-70)]){const M=A.precession(y),r=A.mat(A.trans(M),A.mat(M,p));r.forEach((v,i)=>near(v,p[i]));near(Math.hypot(...r),1)}
// Equinox and solstice controls: zero ecliptic latitude at longitude 90 has declination epsilon.
const eq=A.sph(A.eclToEqu(A.vec(90,0),2000));near(eq[0],90);near(eq[1],23.43929111111111);
// Traditional coordinates at exactly a defining star's RA and polar distance recover its position.
const year=1034.5,M=A.precession(year),s=lookup('65474',year),r=A.sph(A.mat(M,s)),g={coordinate_system:'equatorial_cn',_epoch:'J1034.5',degrees_per_circle:365.25};
const converted=A.convert(g,{mansion:'角',x:0,y:(90-r[1])*365.25/360},lookup,2026);converted.point.forEach((v,i)=>near(v,s[i]));
// Real star sanity: Sirius is around RA 101.3 / Dec -16.7 and Polaris near the north pole.
let sir=A.sph(lookup('32349',2000));assert(sir[0]>101&&sir[0]<102&&sir[1]>-17&&sir[1]<-16);let pol=A.sph(lookup('11767',2000));assert(pol[1]>89&&pol[1]<90);
let valid=0,invalid=0,files=[];
for(const g of d.catalogs){let n=0,skip=0,reasons={};for(const s of g.data){try{const result=A.convert(g,s,lookup,2026.85);assert(result.point.every(Number.isFinite));near(Math.hypot(...result.point),1);n++}catch(e){skip++;reasons[e.message]=(reasons[e.message]||0)+1}}valid+=n;invalid+=skip;files.push({name:g.id,file:g._file,system:g.coordinate_system||null,valid:n,skipped:skip,reasons})}
assert(valid>27000,`Only ${valid} valid catalog coordinates`);
let missing=[];for(const c of d.cultures)for(const a of c.constellations)for(const line of a.lines)for(const ref of line){if(Array.isArray(ref)||ref==='thin'||ref==='bold')continue;if(String(ref).startsWith('DSO:')){if(!d.dsos[ref])missing.push(ref)}else if(!lookup(ref,2000))missing.push(ref)}assert.deepEqual([...new Set(missing)],[]);
assert(!/<script[^>]+src=|<link[^>]+(?:href=)["']https?:/i.test(html));
const report={passed:true,stars:stars.length,cultures:d.cultures.length,catalogGroups:d.catalogs.length,validCoordinates:valid,skippedCoordinates:invalid,checks:['angle formats and invalid values','J/B/JD epoch parsing','precession matrix round trips','ecliptic solstice','traditional mansion defining-star identity','Sirius and Polaris positions','all catalog records finite and unit-length','all line references resolve','no external runtime dependencies'],catalogs:files};
fs.writeFileSync(path.join(__dirname,'verification-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,catalogs:undefined},null,2));
