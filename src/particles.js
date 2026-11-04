const num=(v,f)=>{const n=Number(v);return Number.isFinite(n)?n:f;};
const clamp=(v,min,max,f=min)=>Math.max(min,Math.min(max,num(v,f)));
const clampInt=(v,min,max,f=min)=>Math.round(clamp(v,min,max,f));
export function defaultParticle(){return {count:180,size:.08,speed:1.5,lifetime:2.5,spread:2,gravity:-1.2,color:'#38bdf8',loop:true,seed:1};}
export function normalizeParticle(value={}){
 const d=defaultParticle(),p={...d,...value};
 return {count:clampInt(p.count,1,2000,d.count),size:clamp(p.size,.005,5,d.size),speed:clamp(p.speed,0,100,d.speed),lifetime:clamp(p.lifetime,.1,60,d.lifetime),spread:clamp(p.spread,0,100,d.spread),gravity:clamp(p.gravity,-100,100,d.gravity),color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:d.color,loop:!!p.loop,seed:clampInt(p.seed,-1000000,1000000,d.seed)};
}
export function particleSignature(v){return JSON.stringify(normalizeParticle(v));}
export function seeded(index,seed){const x=Math.sin((index+1)*12.9898+(seed||0)*78.233)*43758.5453;return x-Math.floor(x);}
