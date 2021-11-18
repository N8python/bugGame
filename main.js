import * as THREE from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from './three/examples/jsm/controls/PointerLockControls.js';
import PlayerController from './PlayerController.js';
import Projectile from "./Projectile.js";
import Ant from "./Ant.js";
import Bee from "./Bee.js";
import Beetle from './Beetle.js';
import Butterfly from './Butterfly.js';
import {
    GLTFLoader
} from './three/examples/jsm/loaders/GLTFLoader.js';
import Delaunator from 'https://cdn.skypack.dev/delaunator@5.0.0';
import Stats from "./stats.js";
import jsgraphs from './jsgraphs.js';
import Station from './Station.js';
import Lever from "./Lever.js";
import { AssetManager } from './AssetManagement.js';
import { LevelGenerator } from "./LevelGenerator.js";
import { EnemyManager } from "./EnemyManager.js";
import Level from "./Level.js";
async function main() {
    const gltfLoader = new GLTFLoader();
    let { tileMap, sourceMap, heightMap } = LevelGenerator.generateMaps();
    const texLoader = new THREE.TextureLoader();
    const skyTex = texLoader.load("assets/clouds.jpeg");
    skyTex.wrapS = THREE.RepeatWrapping;
    skyTex.wrapT = THREE.RepeatWrapping;
    skyTex.repeat.set(4, 4);
    const textures = {
        wall: texLoader.load("assets/walltextures.png"),
        envMap: texLoader.load("assets/oldfactory.jpeg"),
        metalNormal: texLoader.load("assets/metalnormal.png"),
        scratch: texLoader.load("assets/scratch.png")
    }
    textures.wall.anisotropy = 16;
    textures.envMap.mapping = THREE.EquirectangularReflectionMapping;
    textures.envMap.encoding = THREE.sRGBEncoding;
    const decalMaterial = new THREE.MeshBasicMaterial({
        map: textures.scratch,
        alphaMap: textures.scratch,
        //normalMap: textures.scratch,
        // normalScale: new THREE.Vector2(1, 1),
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        wireframe: false,
        side: THREE.DoubleSide
    });
    let decals = [];
    const rWidth = window.innerWidth * 0.99;
    const rHeight = window.innerHeight * 0.98;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, rWidth / rHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        // outputEncoding: THREE.sRGBEncoding,
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.setSize(rWidth, rHeight);
    document.body.appendChild(renderer.domElement);
    const controls = new PointerLockControls(camera, renderer.domElement);;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    const skysphere = new THREE.SphereGeometry(500, 32, 32);
    const skymat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, map: skyTex });
    const skydome = new THREE.Mesh(skysphere, skymat);
    scene.add(skydome);
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
    ambientLight.color.setRGB(0.6, 0.6, 0.6);
    ambientLight.groundColor.setRGB(0.3, 0.3, 0.3);
    ambientLight.position.set(0, 50, 0);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
    sunLight.color.setRGB(1.0, 1.0, 1.0);
    sunLight.position.set(100, 500, 100);
    scene.add(sunLight);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    const d = 350;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 1000;
    sunLight.shadow.bias = -0.0025;
    sunLight.shadow.blurSamples = 8;
    sunLight.shadow.radius = 4;
    scene.add(sunLight.target);
    scene.add(camera);
    let possibleSpots = [];
    const isOpen = (idx) => {
        return tileMap[idx - 1] === 1 && tileMap[idx + 1] === 1 && tileMap[idx - 100] === 1 && tileMap[idx + 100] === 1 &&
            tileMap[idx - 99] === 1 && tileMap[idx + 99] === 1 && tileMap[idx - 101] === 1 && tileMap[idx + 101] === 1;
    }
    for (let x = -50; x < 50; x++) {
        for (let z = -50; z < 50; z++) {
            if (tileMap[(x + 50) * 100 + (z + 50)] === 1 && isOpen((x + 50) * 100 + (z + 50))) {
                if (sourceMap[(x + 50) * 100 + (z + 50)] === 1) {
                    possibleSpots.push(new THREE.Vector2(x, z));
                }
            }
        }
    }
    const chosenSpot = possibleSpots[Math.floor(Math.random() * possibleSpots.length)];
    controls.getObject().position.x = chosenSpot.x * 5;
    controls.getObject().position.z = chosenSpot.y * 5;
    controls.getObject().position.y = 10;
    let levelGeometry = LevelGenerator.constructLevelGeometry({ tileMap, sourceMap, heightMap });
    let levelMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.15, 0.15, 0.15),
        map: textures.wall,
        envMap: textures.envMap,
        metalness: 0.5,
        roughness: 0.75,
        side: THREE.DoubleSide
    })
    let levelMesh = new THREE.Mesh(levelGeometry, levelMaterial);
    const keys = {};
    let entities = [];
    const playerController = new PlayerController({
        position: camera.position,
        height: 10,
        camera,
        controls,
        tileMap,
        sourceMap,
        heightMap,
        entities,
        dentMap: decalMaterial,
        levelMesh,
        decals,
        scene
    });
    const models = {
        cobolt: await AssetManager.loadGLTFAsync("assets/cobolt.glb"),
        pascaliber: await AssetManager.loadGLTFAsync("assets/pascaliber.glb"),
        station: await AssetManager.loadGLTFAsync("assets/station.glb"),
        lever: await AssetManager.loadGLTFAsync("assets/lever.glb"),
        ant: await AssetManager.loadGLTFAsync("assets/ant.glb"),
        beetle: await AssetManager.loadGLTFAsync("assets/beetle.glb"),
        stinger: await AssetManager.loadGLTFAsync("assets/stinger.glb"),
        butterfly: await AssetManager.loadGLTFAsync("assets/butterfly.glb"),
        bee: await AssetManager.loadGLTFAsync("assets/bee.glb")
    }
    const weapons = {
        cobolt: {
            damage: 10,
            speed: 1,
            cooldownChance: 1,
            blockMax: 5,
            model: models.cobolt.scene,
            position: new THREE.Vector3(0.75, -0.5, -1),
            rotation: new THREE.Vector3(0.1, 0.0, 0.0),
            scale: new THREE.Vector3(0.075, 0.075, 0.075)
        },
        pascaliber: {
            damage: 12.5,
            speed: 1.5,
            cooldownChance: 0.5,
            blockMax: 10,
            model: models.pascaliber.scene,
            position: new THREE.Vector3(0.75, -0.625, -1),
            rotation: new THREE.Vector3(0.1, 0.0, 0.0),
            scale: new THREE.Vector3(0.35, 0.35, 0.35)
        }
    }
    models.cobolt.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
            child.material.normalMap = textures.metalNormal;
            child.material.needsUpdate = true;
        }
    });
    models.pascaliber.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
            child.material.normalMap = textures.metalNormal;
            child.material.needsUpdate = true;
        }
    });
    playerController.weapon = weapons.cobolt;
    models.ant.scene.traverse((child) => {
        if (child.isMesh) {
            child.frustumCulled = false;
            child.material.envMap = textures.envMap;
            child.material.color.r *= 2.0;
            child.material.color.g *= 2.0;
            child.material.color.b *= 2.0;
            child.material.needsUpdate = true;
        }
    });
    models.beetle.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
            child.material.needsUpdate = true;
        }
    });
    models.stinger.scene.children[0].material.envMap = textures.envMap;
    models.bee.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    });
    models.station.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    });
    models.lever.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    });
    const resetFunction = () => {
        scene.remove(levelMesh);
        entities.forEach(entity => {
            scene.remove(entity.mesh);
            if (entity.deadParts) {
                entity.deadParts.forEach(part => {
                    scene.remove(part);
                })
            }
            if (entity.smokeEmitter) {
                scene.remove(entity.smokeEmitter);
            }
        });
        decals.forEach(decal => {
            scene.remove(decal);
        });
        decals = [];
        const maps = LevelGenerator.generateMaps();
        tileMap = maps.tileMap;
        heightMap = maps.heightMap;
        sourceMap = maps.sourceMap;
        levelGeometry = LevelGenerator.constructLevelGeometry({ tileMap, sourceMap, heightMap });
        levelMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.15, 0.15, 0.15),
            map: textures.wall,
            envMap: textures.envMap,
            metalness: 0.5,
            roughness: 0.75,
            side: THREE.DoubleSide
        })
        levelMesh = new THREE.Mesh(levelGeometry, levelMaterial);
        possibleSpots = [];
        for (let x = -50; x < 50; x++) {
            for (let z = -50; z < 50; z++) {
                if (tileMap[(x + 50) * 100 + (z + 50)] === 1 && isOpen((x + 50) * 100 + (z + 50))) {
                    if (sourceMap[(x + 50) * 100 + (z + 50)] === 1) {
                        possibleSpots.push(new THREE.Vector2(x, z));
                    }
                }
            }
        }
        const chosenSpot = possibleSpots[Math.floor(Math.random() * possibleSpots.length)];
        controls.getObject().position.x = chosenSpot.x * 5;
        controls.getObject().position.z = chosenSpot.y * 5;
        controls.getObject().position.y = 10;
        level = new Level(models, scene, {
            playerController,
            levelMesh,
            tileMap,
            heightMap,
            sourceMap,
            resetFunction,
            number: level.number + 1,
            camera
        });
        entities = level.entities;
        playerController.entities = entities;
        playerController.tileMap = tileMap;
        playerController.sourceMap = sourceMap;
        playerController.heightMap = heightMap;
        playerController.levelMesh = levelMesh;
        playerController.health = playerController.maxHealth;
    };
    let level = new Level(models, scene, {
        playerController,
        levelMesh,
        tileMap,
        heightMap,
        sourceMap,
        resetFunction,
        number: 0,
        camera
    });
    entities = level.entities;
    playerController.entities = entities;
    const healthBackground = document.getElementById("healthBackground");
    const healthBar = document.getElementById("healthBar");
    const healthLoss = document.getElementById("healthLoss");
    let lastUpdate = performance.now();
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = "absolute";
    stats.dom.style.left = "calc(100% - 86px)";
    stats.dom.style.top = "8px";
    document.body.appendChild(stats.dom);

    function animate() {
        const delta = (performance.now() - lastUpdate) * 0.001;
        lastUpdate = performance.now();
        renderer.render(scene, camera);
        playerController.update(keys, mouseDown);
        if (mouseDown) {
            playerController.registerClick(mouseE, keys);
        }
        if (level.number > 2 && playerController.weapon !== weapons.pascaliber) {
            playerController.changeWeapon(weapons.pascaliber);
        }
        const frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        entities.forEach(entity => {
            entity.update(delta, frustum);
        });
        stats.update();
        healthBar.style.width = `${Math.round((playerController.health / playerController.maxHealth) * 192)}px`;
        healthLoss.style.width = `${Math.round((playerController.healthLoss / playerController.maxHealth) * 192)}px`;
        const marginOffset = Math.round((playerController.health / playerController.maxHealth) * 192) + 4 + Math.round(0.0125 * window.innerWidth);
        healthLoss.style.left = `${marginOffset}px`;
        if (decals.length > 100) {
            const first = decals.shift();
            scene.remove(first)
        }
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    let mouseDown = false;
    let mouseE;
    renderer.domElement.onmousedown = (e) => {
        controls.lock();
        if (controls.isLocked) {
            mouseDown = true;
            mouseE = e;
        }
    }
    renderer.domElement.onmouseup = (e) => {
        if (controls.isLocked) {
            mouseDown = false;
            mouseE = e;
        }
    }
    document.onkeydown = (e) => {
        keys[e.key.toLowerCase()] = true;
    }
    document.onkeyup = (e) => {
        keys[e.key.toLowerCase()] = false;
    }
}

main();