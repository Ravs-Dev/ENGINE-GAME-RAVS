export const BUILD_KEY='ravs.build-settings.v1';
export const BUILD_TARGETS=[
 {id:'web',name:'Web / HTML5',icon:'WEB',readyByDefault:true,description:'Standalone WebGL 2 game build.'},
 {id:'windows',name:'Windows x64',icon:'WIN',requiredPacks:['native-cpp'],description:'Native desktop game target. Requires native runtime/build pipeline.'},
 {id:'linux',name:'Linux x64',icon:'LNX',requiredPacks:['native-cpp'],description:'Native Linux game target. Requires native runtime/build pipeline.'},
 {id:'android',name:'Android APK',icon:'APK',requiredPacks:['android-build','java-runtime'],description:'Android target. Requires Android SDK/JDK and the RAVS Android runtime pack.'}
];
export function defaultBuildSettings(){return {target:'web',quality:'high',width:1920,height:1080,fullscreen:true,development:false};}
export function normalizeBuildSettings(value={}){
 const d=defaultBuildSettings(),v={...d,...value};
 return {
  target:BUILD_TARGETS.some(t=>t.id===v.target)?v.target:d.target,
  quality:['low','medium','high','ultra'].includes(v.quality)?v.quality:d.quality,
  width:Math.max(320,Math.min(7680,Math.round(Number(v.width)||d.width))),
  height:Math.max(240,Math.min(4320,Math.round(Number(v.height)||d.height))),
  fullscreen:!!v.fullscreen,development:!!v.development
 };
}
export function readBuildSettings(storage=localStorage){try{return normalizeBuildSettings(JSON.parse(storage.getItem(BUILD_KEY)||'{}'));}catch{return defaultBuildSettings();}}
export function writeBuildSettings(value,storage=localStorage){const v=normalizeBuildSettings(value);storage.setItem(BUILD_KEY,JSON.stringify(v));return v;}
