import test from 'node:test';import assert from 'node:assert/strict';
import {portalTargetSize as native}from '../src/world-runtime/PortalViews.js';import{portalTargetSize as webgl}from '../src/world-runtime/WebGLPortalViews.js';
for(const [name,size]of [['native',native],['webgl',webgl]])test(name+' capture quality remains bounded and preserves aspect',()=>{assert.deepEqual(size(1280,720),{width:512,height:288});assert.deepEqual(size(1280,720,1024),{width:1024,height:576});assert.deepEqual(size(3840,2160,99999),{width:1024,height:576});});
