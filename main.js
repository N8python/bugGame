import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/controls/PointerLockControls.js';
import PlayerController from './PlayerController.js';
import Projectile from "./Projectile.js";
import Ant from "./Ant.js";
import Bee from "./Bee.js";
import Beetle from './Beetle.js';
import Butterfly from './Butterfly.js';
import Scorpion from './Scorpion.js';
import Queen from "./Queen.js";
import {
    GLTFLoader
} from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/loaders/GLTFLoader.js';
import Delaunator from 'https://cdn.skypack.dev/delaunator@5.0.0';
import Stats from "./stats.js";
import jsgraphs from './jsgraphs.js';
import Station from './Station.js';
import Lever from "./Lever.js";
import { AssetManager } from './AssetManagement.js';
import { LevelGenerator } from "./LevelGenerator.js";
import { EnemyManager } from "./EnemyManager.js";
import Level from "./Level.js";
import TextManager from "./TextManager.js";
async function main() {
    TextManager.element = document.getElementById("textContainer");
    TextManager.backgroundElement = document.getElementById("transmissionBackground");
    const load = document.getElementById("load");
    async function displayText(level) {
        if (level === 0) {
            await TextManager.displayMessage("Introduction");
            await TextManager.displayMessage("Tutorial");
        } else if (level === 3) {
            await TextManager.displayMessage("Pascaliber");
        } else if (level === 5) {
            await TextManager.displayMessage("Boss");
        }
    }
    load.innerHTML = "Loading&nbsp;Sounds...";
    let startLevel = 0;
    displayText(startLevel);
    let { tileMap, sourceMap, heightMap } = startLevel === 5 ? LevelGenerator.generateBossMaps() : LevelGenerator.generateMaps();
    const texLoader = new THREE.TextureLoader();
    const skyTex = texLoader.load("assets/images/clouds.jpeg");
    skyTex.wrapS = THREE.RepeatWrapping;
    skyTex.wrapT = THREE.RepeatWrapping;
    skyTex.repeat.set(4, 4);
    const textures = {
        wall: texLoader.load("assets/images/walltextures.png"),
        envMap: texLoader.load("assets/images/oldfactory.png"),
        metalNormal: texLoader.load("assets/images/metalnormal.png"),
        scratch: texLoader.load("assets/images/scratch.png")
    }
    textures.wall.anisotropy = 16;
    textures.envMap.mapping = THREE.EquirectangularReflectionMapping;
    textures.envMap.encoding = THREE.sRGBEncoding;
    textures.scratch.anisotropy = 16;
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
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const backgroundMusic = new THREE.Audio(listener);
    backgroundMusic.setBuffer(await AssetManager.loadAudioAsync("assets/sounds/music/backgroundMusic.mp3"));
    backgroundMusic.setLoop(true);
    backgroundMusic.setVolume(0.5);
    const sfxArray = await Promise.all([
        AssetManager.loadAudioAsync("assets/sounds/sfx/slash-hit.ogg"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/swish.wav"), // kwahmah_02
        AssetManager.loadAudioAsync("assets/sounds/sfx/slash-wood.wav"), // "Dropping, Wood, C.wav", InspectorJ
        AssetManager.loadAudioAsync("assets/sounds/sfx/player-damage.wav"), // "Digging, Ice, Hammer, A.wav", InspectorJ
        AssetManager.loadAudioAsync("assets/sounds/sfx/sword-block.wav"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/footsteps.mov"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/thump.wav"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/explosion.wav"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/lever.mov"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/wind.m4a"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/bee.wav"),
        AssetManager.loadAudioAsync("assets/sounds/sfx/flap.wav")

    ]);
    const sfxKeys = [
        "slashHit",
        "swish",
        "slashWood",
        "playerDamage",
        "swordBlock",
        "footsteps",
        "thump",
        "explosion",
        "lever",
        "wind",
        "bee",
        "flap"
    ];
    window.sfx = {};
    sfxArray.forEach((buffer, i) => {
        const audio = new THREE.Audio(listener);
        audio.setBuffer(buffer);
        window.sfx[sfxKeys[i]] = audio;
    });
    window.addEventListener("click", () => {
        if (!backgroundMusic.isPlaying) {
            backgroundMusic.play();
        }
    });
    window.addEventListener("keypress", () => {
        if (!backgroundMusic.isPlaying) {
            backgroundMusic.play();
        }
    });
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
    load.innerHTML = "Loading&nbsp;Models...";
    const zip = (a, b) => a.map((k, i) => [k, b[i]]);
    const models =
        /*{
               cobolt: await AssetManager.loadGLTFAsync("assets/models/cobolt.glb"),
               pascaliber: await AssetManager.loadGLTFAsync("assets/models/pascaliber.glb"),
               station: await AssetManager.loadGLTFAsync("assets/models/station.glb"),
               lever: await AssetManager.loadGLTFAsync("assets/models/lever.glb"),
               ant: await AssetManager.loadGLTFAsync("assets/models/ant.glb"),
               beetle: await AssetManager.loadGLTFAsync("assets/models/beetle.glb"),
               stinger: await AssetManager.loadGLTFAsync("assets/models/stinger.glb"),
               butterfly: await AssetManager.loadGLTFAsync("assets/models/butterfly.glb"),
               bee: await AssetManager.loadGLTFAsync("assets/models/bee.glb"),
               scorpion: await AssetManager.loadGLTFAsync("assets/models/scorpion.glb"),
               queen: await AssetManager.loadGLTFAsync("assets/models/queen.glb")
           }*/
        Object.fromEntries(zip([
            "cobolt",
            "pascaliber",
            "station",
            "lever",
            "ant",
            "beetle",
            "stinger",
            "butterfly",
            "bee",
            "scorpion",
            "queen"
        ], await Promise.all([
            AssetManager.loadGLTFAsync("assets/models/cobolt.glb"),
            AssetManager.loadGLTFAsync("assets/models/pascaliber.glb"),
            AssetManager.loadGLTFAsync("assets/models/station.glb"),
            AssetManager.loadGLTFAsync("assets/models/lever.glb"),
            AssetManager.loadGLTFAsync("assets/models/ant.glb"),
            AssetManager.loadGLTFAsync("assets/models/beetle.glb"),
            AssetManager.loadGLTFAsync("assets/models/stinger.glb"),
            AssetManager.loadGLTFAsync("assets/models/butterfly.glb"),
            AssetManager.loadGLTFAsync("assets/models/bee.glb"),
            AssetManager.loadGLTFAsync("assets/models/scorpion.glb"),
            AssetManager.loadGLTFAsync("assets/models/queen.glb")
        ])));
    load.innerHTML = "Loading&nbsp;Animations...";
    const bossAnimArrs = (await Promise.all([
        AssetManager.loadGLTFAsync("assets/models/anims/queenwalk.glb"),
        AssetManager.loadGLTFAsync("assets/models/anims/queenfly.glb"),
        AssetManager.loadGLTFAsync("assets/models/anims/queenpunch.glb"),
        AssetManager.loadGLTFAsync("assets/models/anims/queenblock.glb"),
        AssetManager.loadGLTFAsync("assets/models/anims/queensummon.glb")
    ])).map(obj => obj.animations);

    const bossAnims = {
        "walk": bossAnimArrs[0],
        "fly": bossAnimArrs[1],
        "punch": bossAnimArrs[2],
        "block": bossAnimArrs[3],
        "summon": bossAnimArrs[4],
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
    models.queen.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    })
    const resetFunction = (stayOnLevel) => {
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
        const maps = (stayOnLevel ? level.number === 5 : level.number + 1 === 5) ? LevelGenerator.generateBossMaps() : LevelGenerator.generateMaps();
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
            bossAnims,
            resetFunction,
            number: level.number + +!stayOnLevel,
            camera
        });
        entities = level.entities;
        playerController.entities = entities;
        playerController.decals = decals;
        playerController.tileMap = tileMap;
        playerController.sourceMap = sourceMap;
        playerController.heightMap = heightMap;
        playerController.levelMesh = levelMesh;
        playerController.health = playerController.maxHealth;
        if (playerController.dead) {
            playerController.revive();
        }
        playerController.camera.lookAt(0, 0, 0);
        if (!stayOnLevel) {
            displayText(level.number);
        }
    };
    let level = new Level(models, scene, {
        playerController,
        levelMesh,
        tileMap,
        heightMap,
        sourceMap,
        resetFunction,
        bossAnims,
        number: startLevel,
        camera
    });
    entities = level.entities;
    playerController.entities = entities;
    const healthBackground = document.getElementById("healthBackground");
    const healthBar = document.getElementById("healthBar");
    const healthLoss = document.getElementById("healthLoss");
    const enemyBackground = document.getElementById("enemyBackground");
    const enemyBar = document.getElementById("enemyBar");
    const enemyLoss = document.getElementById("enemyLoss");
    let lastUpdate = performance.now();
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = "absolute";
    stats.dom.style.left = "calc(100% - 86px)";
    stats.dom.style.top = "8px";
    document.body.appendChild(stats.dom);
    document.getElementById("coverScreen").style.display = "none";
    load.innerHTML = "Loaded!";
    setTimeout(() => {
        load.innerHTML = "";
    }, 100);

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
        if (!TextManager.displaying) {
            entities.forEach(entity => {
                entity.update(delta, frustum);
            });
        }
        stats.update();
        healthBar.style.width = `${Math.round((playerController.health / playerController.maxHealth) * 192)}px`;
        healthLoss.style.width = `${Math.round((playerController.healthLoss / playerController.maxHealth) * 192)}px`;
        const marginOffset = Math.round((playerController.health / playerController.maxHealth) * 192) + 4 + Math.round(0.0125 * window.innerWidth);
        healthLoss.style.left = `${marginOffset}px`;
        const enemy = entities.find(e => e instanceof Queen);
        if (enemy) {
            enemyBar.style.width = `${Math.round((enemy.memory.health / enemy.memory.maxHealth) * 192)}px`;
            enemyLoss.style.width = `${Math.round((enemy.memory.healthLoss / enemy.memory.maxHealth) * 192)}px`;
            const marginOffset = Math.round((enemy.memory.health / enemy.memory.maxHealth) * 192) + 4 + Math.round(0.0125 * window.innerWidth);
            enemyLoss.style.left = `${marginOffset}px`;
            // healthLoss.style.width = `${Math.round((enemy.healthLoss / enemy.maxHealth) * 192)}px`;
        }
        if (decals.length > 100) {
            const first = decals.shift();
            scene.remove(first)
        }
        if (level.number !== 5) {
            enemyBar.style.display = "none";
            enemyLoss.style.display = "none";
            enemyBackground.style.display = "none";
        } else {
            enemyBar.style.display = "block";
            enemyLoss.style.display = "block";
            enemyBackground.style.display = "block";
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
    document.getElementById("restart").onclick = () => {
            resetFunction(true);
        }
        /*TextManager.typeOut(document.getElementById("textContainer"),
            `Dear AGENT REPPOH,

        Armies of insects have invaded the KRAM II’s systems. The survival of the KRAM II, our most powerful computer, is vital to our university. You, AGENT, have been tasked with expunging this insect scourge, and restoring all switches and machinery that these foul beasts have disabled. We have provided you with a powerful weapon: The COBOLT. Use it well. We wish you the best of luck.

        KILL ALL INSECTS.

        FLIP ALL LEVERS.

        CLEANSE ALL TUBES.

        Sincerely,
        DRAVRAH UNIVERSITY

        `);*/
}

main();