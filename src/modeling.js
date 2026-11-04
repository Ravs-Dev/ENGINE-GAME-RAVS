const numeric=(v,fallback)=>{const n=Number(v);return Number.isFinite(n)?n:fallback;};
const clampInt=(v,min,max)=>Math.max(min,Math.min(max,Math.round(numeric(v,min))));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,numeric(v,min)));

export const MODEL_KINDS=['box','sphere','cylinder','plane','cone','torus'];

export function defaultGeometry(kind){
  switch(kind){
    case 'sphere': return { radius:0.5,widthSegments:32,heightSegments:20 };
    case 'cylinder': return { radiusTop:0.5,radiusBottom:0.5,height:1,radialSegments:32,heightSegments:1 };
    case 'plane': return { width:1,height:1,widthSegments:1,heightSegments:1 };
    case 'cone': return { radius:0.5,height:1,radialSegments:32,heightSegments:1 };
    case 'torus': return { radius:0.5,tube:0.18,radialSegments:16,tubularSegments:48 };
    default: return { width:1,height:1,depth:1,widthSegments:1,heightSegments:1,depthSegments:1 };
  }
}

export function defaultModifiers(){
  return {
    twist:{enabled:false,angle:0,axis:'y'},
    taper:{enabled:false,amount:0,axis:'y'}
  };
}

export function normalizeGeometry(kind,value={}){
  const d=defaultGeometry(kind),g={...d,...value};
  if(kind==='box') return {
    width:clamp(g.width,.01,1000),height:clamp(g.height,.01,1000),depth:clamp(g.depth,.01,1000),
    widthSegments:clampInt(g.widthSegments,1,64),heightSegments:clampInt(g.heightSegments,1,64),depthSegments:clampInt(g.depthSegments,1,64)
  };
  if(kind==='sphere') return {radius:clamp(g.radius,.01,1000),widthSegments:clampInt(g.widthSegments,3,128),heightSegments:clampInt(g.heightSegments,2,128)};
  if(kind==='cylinder') return {
    radiusTop:clamp(g.radiusTop,0,1000),radiusBottom:clamp(g.radiusBottom,0,1000),height:clamp(g.height,.01,1000),
    radialSegments:clampInt(g.radialSegments,3,128),heightSegments:clampInt(g.heightSegments,1,64)
  };
  if(kind==='plane') return {width:clamp(g.width,.01,1000),height:clamp(g.height,.01,1000),widthSegments:clampInt(g.widthSegments,1,128),heightSegments:clampInt(g.heightSegments,1,128)};
  if(kind==='cone') return {radius:clamp(g.radius,.01,1000),height:clamp(g.height,.01,1000),radialSegments:clampInt(g.radialSegments,3,128),heightSegments:clampInt(g.heightSegments,1,64)};
  return {radius:clamp(g.radius,.01,1000),tube:clamp(g.tube,.005,1000),radialSegments:clampInt(g.radialSegments,3,64),tubularSegments:clampInt(g.tubularSegments,3,256)};
}

export function normalizeModifiers(value={}){
  const d=defaultModifiers(),tw={...d.twist,...(value.twist??{})},ta={...d.taper,...(value.taper??{})};
  const axis=v=>['x','y','z'].includes(v)?v:'y';
  return {
    twist:{enabled:!!tw.enabled,angle:clamp(tw.angle,-1080,1080),axis:axis(tw.axis)},
    taper:{enabled:!!ta.enabled,amount:clamp(ta.amount,-.95,4),axis:axis(ta.axis)}
  };
}

export function modelingSignature(object){
  return JSON.stringify([object.kind,normalizeGeometry(object.kind,object.geometry),normalizeModifiers(object.modifiers)]);
}

export function validateModeling(kind,geometry,modifiers){
  if(!MODEL_KINDS.includes(kind)) return geometry==null&&modifiers==null;
  const g=normalizeGeometry(kind,geometry),m=normalizeModifiers(modifiers);
  return JSON.stringify(g)===JSON.stringify(geometry)&&JSON.stringify(m)===JSON.stringify(modifiers);
}
