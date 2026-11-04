const PREFAB_KEY='ravs.prefabs.v1';
const MATERIAL_KEY='ravs.materials.v1';

function read(key,storage=localStorage){
  try{const value=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}
}
function write(key,value,storage=localStorage){storage.setItem(key,JSON.stringify(value));}

export function listPrefabs(storage=localStorage){return read(PREFAB_KEY,storage);}
export function savePrefab(name,object,storage=localStorage){
  const list=listPrefabs(storage),safe=String(name||object?.name||'Prefab').trim().slice(0,80)||'Prefab';
  const item={id:crypto.randomUUID(),name:safe,createdAt:new Date().toISOString(),object:structuredClone(object)};
  item.object.id='__PREFAB__';
  const next=[item,...list].slice(0,50);write(PREFAB_KEY,next,storage);return item;
}
export function instantiatePrefab(prefab){
  if(!prefab?.object)throw Error('Prefab tidak valid.');
  const object=structuredClone(prefab.object);object.id=crypto.randomUUID();object.name=prefab.name;object.position={...object.position,x:(object.position?.x??0)+1};return object;
}
export function removePrefab(id,storage=localStorage){write(PREFAB_KEY,listPrefabs(storage).filter(x=>x.id!==id),storage);}

export function listMaterials(storage=localStorage){return read(MATERIAL_KEY,storage);}
export function saveMaterial(name,object,storage=localStorage){
  const list=listMaterials(storage),safe=String(name||object?.name||'Material').trim().slice(0,80)||'Material';
  const item={id:crypto.randomUUID(),name:safe,createdAt:new Date().toISOString(),color:object.color,material:structuredClone(object.material),render:structuredClone(object.render)};
  write(MATERIAL_KEY,[item,...list].slice(0,50),storage);return item;
}
export function applyMaterialPreset(object,preset){
  if(!preset?.material)throw Error('Material preset tidak valid.');
  object.color=preset.color;object.material=structuredClone(preset.material);object.render=structuredClone(preset.render);
}
export function removeMaterial(id,storage=localStorage){write(MATERIAL_KEY,listMaterials(storage).filter(x=>x.id!==id),storage);}
