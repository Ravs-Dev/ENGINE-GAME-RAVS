import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savePrefab, listPrefabs, instantiatePrefab, saveMaterial, listMaterials, applyMaterialPreset } from '../src/assets-library.js';

function memoryStorage(){
  const map=new Map();
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};
}

test('prefab library saves and instantiates independent objects',()=>{
  const storage=memoryStorage();
  const source={id:'a',name:'Cube',position:{x:0,y:1,z:0},material:{roughness:.5},render:{castShadow:true},color:'#ffffff'};
  const saved=savePrefab('Wall',source,storage);
  assert.equal(listPrefabs(storage).length,1);
  const instance=instantiatePrefab(saved);
  assert.notEqual(instance.id,source.id);assert.equal(instance.name,'Wall');assert.equal(instance.position.x,1);
});

test('material presets save and apply cloned material state',()=>{
  const storage=memoryStorage();
  const source={name:'Metal',color:'#112233',material:{roughness:.2,metalness:.8},render:{castShadow:true,receiveShadow:true}};
  const preset=saveMaterial('Metal',source,storage);assert.equal(listMaterials(storage).length,1);
  const target={color:'#000000',material:{},render:{}};applyMaterialPreset(target,preset);
  assert.equal(target.color,'#112233');assert.equal(target.material.metalness,.8);
});
