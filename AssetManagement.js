import * as THREE from './three/build/three.module.js';
import {
    GLTFLoader
} from './three/examples/jsm/loaders/GLTFLoader.js';
const AssetManager = {};
AssetManager.gltfLoader = new GLTFLoader();
AssetManager.loadGLTFAsync = (url) => {
    return new Promise((resolve, reject) => {
        AssetManager.gltfLoader.load(url, obj => {
            resolve(obj);
        })
    });
}

export { AssetManager };