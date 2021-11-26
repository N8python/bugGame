import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import {
    GLTFLoader
} from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/loaders/GLTFLoader.js';
const AssetManager = {};
AssetManager.gltfLoader = new GLTFLoader();
AssetManager.audioLoader = new THREE.AudioLoader();
AssetManager.loadGLTFAsync = (url) => {
    return new Promise((resolve, reject) => {
        AssetManager.gltfLoader.load(url, obj => {
            resolve(obj);
        })
    });
}

AssetManager.loadAudioAsync = (url) => {
    return new Promise((resolve, reject) => {
        AssetManager.audioLoader.load(url, (buffer) => {
            resolve(buffer);
        });
    })
}
export { AssetManager };