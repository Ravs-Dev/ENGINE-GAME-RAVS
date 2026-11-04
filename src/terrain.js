const num=(v,fallback)=>{const n=Number(v);return Number.isFinite(n)?n:fallback;};
const clamp=(v,min,max,fallback=min)=>Math.max(min,Math.min(max,num(v,fallback)));
const clampInt=(v,min,max,fallback=min)=>Math.round(clamp(v,min,max,fallback));

export function defaultTerrain(){
  return {width:30,depth:30,segments:48,height:3,frequency:.16,seed:1};
}

export function normalizeTerrain(value={}){
  const d=defaultTerrain(),t={...d,...value};
  return {
    width:clamp(t.width,1,1000,d.width),
    depth:clamp(t.depth,1,1000,d.depth),
    segments:clampInt(t.segments,2,160,d.segments),
    height:clamp(t.height,0,100,d.height),
    frequency:clamp(t.frequency,.001,10,d.frequency),
    seed:clampInt(t.seed,-1000000,1000000,d.seed)
  };
}

export function terrainHeight(x,z,raw){
  const t=normalizeTerrain(raw),s=t.seed*.173;
  const a=Math.sin((x+s)*t.frequency)*Math.cos((z-s)*t.frequency);
  const b=Math.sin((x*.47-s)*t.frequency*2.13)*Math.cos((z*.53+s)*t.frequency*1.71)*.35;
  const c=Math.sin((x+z+s)*t.frequency*.61)*.18;
  return (a+b+c)*t.height;
}

export function terrainSignature(value){return JSON.stringify(normalizeTerrain(value));}
