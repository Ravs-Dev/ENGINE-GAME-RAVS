export const FEATURE_PACKS = [
  { id:'character-animation', name:'Character & Animation Pack', category:'Characters', size:'Separate download', description:'Rig, armature, skeleton, animation clips, humanoid presets, retargeting metadata.', kind:'engine', url:'https://github.com/Ravs-Dev/ENGINE-GAME-RAVS/releases', requires:[] },
  { id:'android-build', name:'Android Build Pack', category:'Platforms', size:'External SDK', description:'Android packaging support. Requires Android Studio/SDK, JDK and platform tools installed separately.', kind:'external', url:'https://developer.android.com/studio', requires:['java'] },
  { id:'native-cpp', name:'Native C/C++ Pack', category:'Scripting', size:'External toolchain', description:'Native C/C++ compilation support through MSVC, Clang or GCC.', kind:'external', url:'https://visualstudio.microsoft.com/vs/features/cplusplus/', requires:['cpp'] },
  { id:'dotnet-runtime', name:'C# / .NET Pack', category:'Scripting', size:'External SDK', description:'C# scripting/build support through the .NET SDK.', kind:'external', url:'https://dotnet.microsoft.com/download', requires:['csharp'] },
  { id:'java-runtime', name:'Java Pack', category:'Scripting', size:'External JDK', description:'Java scripting/build tools through a local JDK.', kind:'external', url:'https://adoptium.net/', requires:['java'] },
  { id:'terrain-world', name:'Terrain & World Pack', category:'World', size:'Separate download', description:'Terrain editing, foliage, world streaming and landscape data.', kind:'engine', url:'https://github.com/Ravs-Dev/ENGINE-GAME-RAVS/releases', requires:[] },
  { id:'audio-fx', name:'Audio & FX Pack', category:'Audio', size:'Separate download', description:'Spatial audio, mixers, reverb zones and particle/VFX templates.', kind:'engine', url:'https://github.com/Ravs-Dev/ENGINE-GAME-RAVS/releases', requires:[] },
  { id:'ai-navmesh', name:'AI & Navigation Pack', category:'AI', size:'Separate download', description:'Navigation mesh data, pathfinding helpers, behavior/AI foundations.', kind:'engine', url:'https://github.com/Ravs-Dev/ENGINE-GAME-RAVS/releases', requires:[] },
  { id:'networking', name:'Multiplayer Networking Pack', category:'Networking', size:'Separate download', description:'Replication/session/networking foundations for multiplayer projects.', kind:'engine', url:'https://github.com/Ravs-Dev/ENGINE-GAME-RAVS/releases', requires:[] }
];

export const PACK_STATE_KEY = 'ravs.feature-packs.v1';

export function readPackState(storage = localStorage) {
  try { return JSON.parse(storage.getItem(PACK_STATE_KEY) || '{}') || {}; } catch { return {}; }
}
export function writePackState(state, storage = localStorage) {
  storage.setItem(PACK_STATE_KEY, JSON.stringify(state));
}
export function isPackReady(pack, state, toolchains = []) {
  if (pack.kind === 'external') return pack.requires.every(req => toolchains.some(t => t.language === req && t.available));
  return !!state[pack.id]?.installed;
}
