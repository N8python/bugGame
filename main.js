import * as THREE from './three/build/three.module.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from './three/examples/jsm/controls/PointerLockControls.js';
import PlayerController from './PlayerController.js';
import Projectile from "./Projectile.js";
import Ant from "./Ant.js";
import Bee from "./Bee.js";
import Beetle from './Beetle.js';
import {
    GLTFLoader
} from './three/examples/jsm/loaders/GLTFLoader.js';
import Delaunator from 'https://cdn.skypack.dev/delaunator@5.0.0';
import Stats from "./stats.js";
import jsgraphs from './jsgraphs.js';
import Station from './Station.js';
import Lever from "./Lever.js";
import { AssetManager } from './AssetManagement.js';
async function main() {
    const gltfLoader = new GLTFLoader();
    let rooms = [];
    for (let i = 0; i < 25; i++) {
        const room = new THREE.Box2();
        room.setFromCenterAndSize(new THREE.Vector2(Math.random() * 100 - 50, Math.random() * 100 - 50), new THREE.Vector2(15 + 25 * (Math.random() ** 2), 15 + 25 * (Math.random() ** 2)));
        rooms.push(room);
    }
    while (true) {
        let total = 0;
        rooms.forEach(room => {
            const velocity = new THREE.Vector2();
            let added = 0;
            rooms.forEach(room2 => {
                if (room.intersectsBox(room2)) {
                    const center = room.getCenter(new THREE.Vector2());
                    const center2 = room2.getCenter(new THREE.Vector2());
                    velocity.add(center2.sub(center));
                    added += 1;
                }
            });
            total += added;
            velocity.multiplyScalar(1 / added);
            velocity.multiplyScalar(-1);
            const center = room.getCenter(new THREE.Vector2());
            center.add(velocity);
            room.setFromCenterAndSize(center, room.max.sub(room.min));
        });
        if (total === rooms.length) {
            break;
        }
    }
    rooms.sort((a, b) => {
        return b.getSize(new THREE.Vector2()).length() - a.getSize(new THREE.Vector2()).length();
    });
    //console.log(rooms.map(x => x.getSize(new THREE.Vector2()).length()));
    for (let i = 0; i < Math.floor(rooms.length * 0.33); i++) {
        rooms[i].main = true;
    }
    const coords = rooms.filter(room => room.main).map(x => [x.getCenter(new THREE.Vector2()).x, x.getCenter(new THREE.Vector2()).y]).flat();
    const coordLookup = rooms.filter(room => room.main).map(x => x.getCenter(new THREE.Vector2()));
    const delaunay = new Delaunator(coords);
    const graph = new jsgraphs.WeightedGraph(8);
    for (let i = 0; i < Math.floor(delaunay.triangles.length / 3); i++) {
        graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1], 0.0));
        graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2], 0.0));
        graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3 + 2], delaunay.triangles[i * 3], 0.0));
    }

    const vertices = Array.from(delaunay.triangles).map(v => coordLookup[v]);
    const triangles = [];
    for (let i = 0; i < vertices.length; i++) {
        if (triangles[Math.floor(i / 3)] === undefined) {
            triangles[Math.floor(i / 3)] = [];
        }
        triangles[Math.floor(i / 3)].push(vertices[i]);
    }
    const kruskal = new jsgraphs.KruskalMST(graph);
    var mst = kruskal.mst;
    let finalEdges = [];
    const mspv = [];
    for (var i = 0; i < mst.length; ++i) {
        var e = mst[i];
        var v = e.either();
        var w = e.other(v);
        finalEdges.push([coordLookup[v], coordLookup[w]]);
        mspv.push([v, w])
    }
    const otherEdges = [];
    for (let i = 0; i < Math.floor(delaunay.triangles.length / 3); i++) {
        otherEdges.push([delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1]]);
        otherEdges.push([delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2]]);
        otherEdges.push([delaunay.triangles[i * 3 + 2], delaunay.triangles[i * 3]]);
    }
    otherEdges.forEach(edge => {
        if (Math.random() < 0.15) {
            if (!mspv.some(([v, w]) => (v === edge[0] && w === edge[1]) || (v === edge[1] && w === edge[0]))) {
                finalEdges.push([coordLookup[edge[0]], coordLookup[edge[1]]]);
            }
        }
    });
    finalEdges = finalEdges.map(line => {
        return [
            [new THREE.Vector2(line[0].x, line[0].y), new THREE.Vector2(line[1].x, line[0].y)],
            [new THREE.Vector2(line[1].x, line[0].y), new THREE.Vector2(line[1].x, line[1].y)]
        ]
    }).flat();
    rooms.forEach(room => {
        finalEdges.forEach(edge => {
            const lineBox = new THREE.Box2();
            // lineBox.min = new THREE.Vector2(edge[0].x, edge[0].y);
            // lineBox.max = new THREE.Vector2(edge[1].x, edge[1].y);
            lineBox.setFromPoints([new THREE.Vector2(edge[0].x, edge[0].y), new THREE.Vector2(edge[1].x, edge[1].y)]);
            lineBox.min.x -= 5;
            lineBox.min.y -= 5;
            lineBox.max.x += 5;
            lineBox.max.y += 5;
            if (room.intersectsBox(lineBox) && !room.main) {
                room.side = true;
            }
        });
    });
    const lineBoxes = [];
    finalEdges.forEach(edge => {
        const lineBox = new THREE.Box2();
        lineBox.setFromPoints([new THREE.Vector2(edge[0].x, edge[0].y), new THREE.Vector2(edge[1].x, edge[1].y)]);
        const size = 4 + Math.floor(Math.random() * 3);
        lineBox.min.x -= size;
        lineBox.min.y -= size;
        lineBox.max.x += size;
        lineBox.max.y += size;
        lineBoxes.push(lineBox);
    });
    rooms = rooms.filter(x => x.main || x.side);
    //const canvas = document.getElementById("canvas");
    //const ctx = canvas.getContext("2d");
    const tileMap = new Uint8Array(100 * 100);
    const sourceMap = new Uint8Array(100 * 100);;
    const heightMap = new Float32Array(100 * 100);
    for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 100; y++) {
            const worldSpaceX = ((x / 100) * 700 - 700 / 2) / 3;
            const worldSpaceY = ((y / 100) * 700 - 700 / 2) / 3;
            const blockWidth = ((2 / 100) * 700 - 700 / 2) / 3 - ((1 / 100) * 700 - 700 / 2) / 3;
            const blockHeight = ((2 / 100) * 700 - 700 / 2) / 3 - ((1 / 100) * 700 - 700 / 2) / 3;
            const blockBox = new THREE.Box2();
            blockBox.setFromCenterAndSize(new THREE.Vector2(worldSpaceX + blockWidth / 2, worldSpaceY + blockHeight / 2), new THREE.Vector2(blockWidth, blockHeight));
            rooms.forEach(room => {
                if (room.intersectsBox(blockBox)) {
                    tileMap[x * 100 + y] = 1;
                    if (room.main) {
                        sourceMap[x * 100 + y] = 1;
                    } else if (room.side) {
                        if (sourceMap[x * 100 + y] === 0 || sourceMap[x * 100 + y] > 2) {
                            sourceMap[x * 100 + y] = 2;
                        }
                    }
                }
            });
            lineBoxes.forEach(lineBox => {
                if (lineBox.intersectsBox(blockBox)) {
                    tileMap[x * 100 + y] = 1;
                    if (sourceMap[x * 100 + y] === 0 || sourceMap[x * 100 + y] > 3) {
                        sourceMap[x * 100 + y] = 3;
                    }
                }
            })
        }
    }
    for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 100; y++) {
            if (tileMap[x * 100 + y] === 1) {
                if (tileMap[x * 100 + y - 1] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y + 1] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y - 100] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y + 100] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y - 101] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y + 101] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y - 99] === 0) {
                    tileMap[x * 100 + y] = 2;
                } else if (tileMap[x * 100 + y + 99] === 0) {
                    tileMap[x * 100 + y] = 2;
                }
                if (x === 0 || x === 99 || y === 0 || y === 99) {
                    tileMap[x * 100 + y] = 2;
                }
                if (sourceMap[x * 100 + y] === 1) {
                    heightMap[x * 100 + y] = 60;
                }
                if (sourceMap[x * 100 + y] === 2) {
                    heightMap[x * 100 + y] = 40;
                }
                if (sourceMap[x * 100 + y] === 3) {
                    heightMap[x * 100 + y] = 25;
                }
            }
        }
    }
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
    const decals = [];
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
    const possibleSpots = [];
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
    const levelGeometry = new THREE.BufferGeometry();
    const levelIndices = [];
    const levelVertices = [];
    const levelNormals = [];
    const levelUvs = [];
    for (let x = -50; x < 50; x++) {
        for (let z = -50; z < 50; z++) {
            if (tileMap[(x + 50) * 100 + (z + 50)] > 0) {
                //const roadPart = cityData.roadMap[(x + 50) * 100 + (z + 50)];
                //const xStart = 0.25 * Math.floor(roadPart / 4);
                //const yStart = 0.75 - 0.25 * (roadPart % 4);
                let uvs = [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0]
                ];
                if (sourceMap[(x + 50) * 100 + (z + 50)] === 1) {
                    uvs = [
                        [0 + 0.5, 0],
                        [0.49 + 0.5, 0],
                        [0.49 + 0.5, 0.49],
                        [0 + 0.5, 0.49]
                    ];
                }
                if (sourceMap[(x + 50) * 100 + (z + 50)] === 2) {
                    uvs = [
                        [0, 0],
                        [0.49, 0],
                        [0.49, 0.49],
                        [0, 0.49]
                    ];
                }
                if (sourceMap[(x + 50) * 100 + (z + 50)] === 3) {
                    uvs = [
                        [0, 0.5],
                        [0.49, 0.5],
                        [0.49, 0.49 + 0.5],
                        [0, 0.49 + 0.5]
                    ];
                }
                const height = heightMap[(x + 50) * 100 + (z + 50)]

                levelVertices.push([x * 5, 0, z * 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[0]);
                levelVertices.push([x * 5 + 5, 0, z * 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[1]);
                levelVertices.push([x * 5 + 5, 0, z * 5 + 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[2]);
                levelVertices.push([x * 5, 0, z * 5 + 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[3]);
                levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                levelVertices.push([x * 5, height, z * 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[0]);
                levelVertices.push([x * 5 + 5, height, z * 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[1]);
                levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[2]);
                levelVertices.push([x * 5, height, z * 5 + 5]);
                levelNormals.push([0, 1, 0])
                levelUvs.push(uvs[3]);
                levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                if (tileMap[(x + 50) * 100 + (z + 50)] !== 2) {
                    if (heightMap[(x + 50 + 1) * 100 + (z + 50)] < height) {
                        levelVertices.push([x * 5 + 5, heightMap[(x + 50 + 1) * 100 + (z + 50)], z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5 + 5, heightMap[(x + 50 + 1) * 100 + (z + 50)], z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    }
                    if (heightMap[(x + 50 - 1) * 100 + (z + 50)] < height) {
                        levelVertices.push([x * 5, heightMap[(x + 50 - 1) * 100 + (z + 50)], z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5, height, z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5, height, z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5, heightMap[(x + 50 - 1) * 100 + (z + 50)], z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    }
                    if (heightMap[(x + 50) * 100 + (z + 50 + 1)] < height) {
                        levelVertices.push([x * 5, heightMap[(x + 50) * 100 + (z + 50 + 1)], z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5, height, z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5 + 5, heightMap[(x + 50) * 100 + (z + 50 + 1)], z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    }
                    if (heightMap[(x + 50) * 100 + (z + 50 - 1)] < height) {
                        levelVertices.push([x * 5, heightMap[(x + 50) * 100 + (z + 50 - 1)], z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5, height, z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5 + 5, heightMap[(x + 50) * 100 + (z + 50 - 1)], z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    }
                }
                if (tileMap[(x + 50) * 100 + (z + 50)] === 2) {
                    levelVertices.push([x * 5, height, z * 5]);
                    levelNormals.push([0, 1, 0]);
                    levelUvs.push([0.5, 0.5]);
                    levelVertices.push([x * 5 + 5, height, z * 5]);
                    levelNormals.push([0, 1, 0]);
                    levelUvs.push([1.0, 0.5]);
                    levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                    levelNormals.push([0, 1, 0]);
                    levelUvs.push([1.0, 1.0]);
                    levelVertices.push([x * 5, height, z * 5 + 5]);
                    levelNormals.push([0, 1, 0]);
                    levelUvs.push([0.5, 1.0]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    levelVertices.push([x * 5, 0, z * 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([0.5, 0.5]);
                    levelVertices.push([x * 5, height, z * 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([1.0, 0.5]);
                    levelVertices.push([x * 5, height, z * 5 + 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([1.0, 1.0]);
                    levelVertices.push([x * 5, 0, z * 5 + 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([0.5, 1.0]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    levelVertices.push([x * 5 + 5, 0, z * 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([0.5, 0.5]);
                    levelVertices.push([x * 5 + 5, height, z * 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([1.0, 0.5]);
                    levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([1.0, 1.0]);
                    levelVertices.push([x * 5 + 5, 0, z * 5 + 5]);
                    levelNormals.push([1, 0, 0]);
                    levelUvs.push([0.5, 1.0]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    levelVertices.push([x * 5, 0, z * 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([0.5, 0.5]);
                    levelVertices.push([x * 5, height, z * 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([1.0, 0.5]);
                    levelVertices.push([x * 5 + 5, height, z * 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([1.0, 1.0]);
                    levelVertices.push([x * 5 + 5, 0, z * 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([0.5, 1.0]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    levelVertices.push([x * 5, 0, z * 5 + 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([0.5, 0.5]);
                    levelVertices.push([x * 5, height, z * 5 + 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([1.0, 0.5]);
                    levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([1.0, 1.0]);
                    levelVertices.push([x * 5 + 5, 0, z * 5 + 5]);
                    levelNormals.push([0, 0, 1]);
                    levelUvs.push([0.5, 1.0]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                }
            }
        }
    }

    levelGeometry.setIndex(levelIndices.flat());
    levelGeometry.setAttribute('position', new THREE.Float32BufferAttribute(levelVertices.flat(), 3));
    levelGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(levelNormals.flat(), 3));
    levelGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(levelUvs.flat(), 2));

    const levelMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.15, 0.15, 0.15),
        map: textures.wall,
        envMap: textures.envMap,
        metalness: 0.5,
        roughness: 0.75,
        side: THREE.DoubleSide
    })
    const levelMesh = new THREE.Mesh(levelGeometry, levelMaterial);
    //levelMesh.castShadow = true;
    //levelMesh.receiveShadow = true;
    scene.add(levelMesh);
    const keys = {};
    const velocity = new THREE.Vector3();
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
        station: await AssetManager.loadGLTFAsync("assets/station.glb"),
        lever: await AssetManager.loadGLTFAsync("assets/lever.glb"),
        ant: await AssetManager.loadGLTFAsync("assets/ant.glb"),
        beetle: await AssetManager.loadGLTFAsync("assets/beetle.glb"),
        stinger: await AssetManager.loadGLTFAsync("assets/stinger.glb"),
        bee: await AssetManager.loadGLTFAsync("assets/bee.glb")
    }
    let weapon = models.cobolt.scene;
    weapon.traverse((child) => {
        if (child.isMesh) {
            /*child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.envMap = textures.envMap;
            if (child.material.metalness < 0.75) {
                child.material.normalMap = textures.buildingNormal;
            }*/
            child.material.envMap = textures.envMap;
            child.material.normalMap = textures.metalNormal;
            child.material.needsUpdate = true;
        }
    });
    camera.add(weapon);
    /*weapon.scale.set(0.075, 0.075, 0.075);
    weapon.position.z = -1;
    weapon.position.y = -0.5;
    weapon.position.x = 0.75;
    weapon.rotation.x = 0.1;*/
    playerController.weapon = weapon;
    models.ant.scene.traverse((child) => {
        if (child.isMesh) {
            child.frustumCulled = false;
            child.material.envMap = textures.envMap;
            child.material.color.r *= 2.0;
            child.material.color.g *= 2.0;
            child.material.color.b *= 2.0;
            child.material.needsUpdate = true;
        }
    }); {
        const possibleSpots = [];
        const isOpen = (idx) => {
            return tileMap[idx - 1] === 1 && tileMap[idx + 1] === 1 && tileMap[idx - 100] === 1 && tileMap[idx + 100] === 1 &&
                tileMap[idx - 99] === 1 && tileMap[idx + 99] === 1 && tileMap[idx - 101] === 1 && tileMap[idx + 101] === 1;
        }
        for (let x = -50; x < 50; x++) {
            for (let z = -50; z < 50; z++) {
                if (tileMap[(x + 50) * 100 + (z + 50)] === 1 && isOpen((x + 50) * 100 + (z + 50))) {
                    possibleSpots.push(new THREE.Vector2(x, z));
                }
            }
        }
        for (let i = 0; i < 12; i++) {
            const chosenSpot = possibleSpots[Math.floor(Math.random() * possibleSpots.length)];
            const ant = new Ant(models.ant.scene, models.ant.animations, {
                position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
                scene,
                tileMap,
                heightMap,
                sourceMap,
                entities,
                playerController,
                direction: 2 * Math.PI * Math.random()
            });
            const [hit] = ant.intersectWall();
            if (hit) {
                i--;
                continue;
            }
            let antHit = false;
            entities.some(entity => {
                if (entity !== ant) {
                    if (entity.box.intersectsBox(ant.box)) {
                        antHit = true;
                        return true;
                    }
                }
            });
            if (antHit) {
                i--;
                continue;
            }
            scene.add(ant.mesh);
            entities.push(ant);
        }
    }
    //scene.add(obj.scene);
    models.beetle.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
            child.material.needsUpdate = true;
        }
    }); {
        const possibleSpots = [];
        const isOpen = (idx) => {
            return tileMap[idx - 1] === 1 && tileMap[idx + 1] === 1 && tileMap[idx - 100] === 1 && tileMap[idx + 100] === 1 &&
                tileMap[idx - 99] === 1 && tileMap[idx + 99] === 1 && tileMap[idx - 101] === 1 && tileMap[idx + 101] === 1;
        }
        for (let x = -50; x < 50; x++) {
            for (let z = -50; z < 50; z++) {
                if (tileMap[(x + 50) * 100 + (z + 50)] === 1 && isOpen((x + 50) * 100 + (z + 50))) {
                    possibleSpots.push(new THREE.Vector2(x, z));
                }
            }
        }
        for (let i = 0; i < 12; i++) {
            const chosenSpot = possibleSpots[Math.floor(Math.random() * possibleSpots.length)];
            const beetle = new Beetle(models.beetle.scene, models.beetle.animations, {
                position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
                scene,
                tileMap,
                heightMap,
                sourceMap,
                entities,
                playerController,
                camera,
                direction: 2 * Math.PI * Math.random()
            });
            const [hit] = beetle.intersectWall();
            if (hit) {
                i--;
                continue;
            }
            let antHit = false;
            entities.some(entity => {
                if (entity !== beetle) {
                    if (entity.box.intersectsBox(beetle.box)) {
                        antHit = true;
                        return true;
                    }
                }
            });
            if (antHit) {
                i--;
                continue;
            }
            scene.add(beetle.mesh);
            entities.push(beetle);
        }
    }
    //scene.add(obj.scene);
    models.stinger.scene.children[0].material.envMap = textures.envMap;
    models.bee.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    }); {
        const possibleSpots = [];
        const isOpen = (idx) => {
            return tileMap[idx - 1] === 1 && tileMap[idx + 1] === 1 && tileMap[idx - 100] === 1 && tileMap[idx + 100] === 1 &&
                tileMap[idx - 99] === 1 && tileMap[idx + 99] === 1 && tileMap[idx - 101] === 1 && tileMap[idx + 101] === 1;
        }
        for (let x = -50; x < 50; x++) {
            for (let z = -50; z < 50; z++) {
                if (tileMap[(x + 50) * 100 + (z + 50)] === 1 && isOpen((x + 50) * 100 + (z + 50))) {
                    possibleSpots.push(new THREE.Vector2(x, z));
                }
            }
        }
        for (let i = 0; i < 5; i++) {
            const chosenSpot = possibleSpots[Math.floor(Math.random() * possibleSpots.length)];
            const bee = new Bee(models.bee.scene, models.bee.animations, {
                position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
                scene,
                tileMap,
                heightMap,
                sourceMap,
                entities,
                playerController,
                projectileMesh: models.stinger.scene.children[0],
                direction: 2 * Math.PI * Math.random()
            });
            const [hit] = bee.intersectWall();
            if (hit) {
                i--;
                continue;
            }
            let antHit = false;
            entities.some(entity => {
                if (entity !== bee) {
                    if (entity.box.intersectsBox(bee.box)) {
                        antHit = true;
                        return true;
                    }
                }
            });
            if (antHit) {
                i--;
                continue;
            }
            scene.add(bee.mesh);
            entities.push(bee);
        }
    }
    models.station.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    });
    let placeX;
    let placeY; {
        const playerX = Math.floor(camera.position.x / 5 + 50);
        const playerY = Math.floor(camera.position.z / 5 + 50);
        let directions = [
            [-1, 0],
            [0, -1],
            [1, 0],
            [0, 1],
        ];
        directions.sort(() => Math.random() - 0.5);
        const isOpen = (idx) => {
            return tileMap[idx - 1] === 1 && tileMap[idx + 1] === 1 && tileMap[idx - 100] === 1 && tileMap[idx + 100] === 1 &&
                tileMap[idx - 99] === 1 && tileMap[idx + 99] === 1 && tileMap[idx - 101] === 1 && tileMap[idx + 101] === 1;
        }
        for (let i = 0; i < directions.length; i++) {
            let max = 3;
            let currX = playerX;
            let currY = playerY;
            let failed = false;
            for (let j = 0; j < max; j++) {
                currX += directions[i][0];
                currY += directions[i][1];
                if (tileMap[currX * 100 + currY] !== 1 || !isOpen(currX * 100 + currY)) {
                    failed = true;
                    break;
                }
            }
            if (failed) {
                continue;
            }
            placeX = currX;
            placeY = currY;
            break;
        }
    }
    /*obj.scene.position.set((placeX - 50) * 5, 6.5, (placeY - 50) * 5);
    obj.scene.scale.set(1.75, 1.75, 1.75);
    //obj.scene.lookAt(camera.position);
    obj.scene.rotation.y = Math.atan2(placeX - playerX, placeY - playerY);*/
    const station = new Station(models.station.scene, models.station.animations, {
        position: new THREE.Vector3((placeX - 50) * 5, 6.5, (placeY - 50) * 5),
        camera,
        scene,
        entities
    });
    scene.add(station.mesh);
    entities.push(station);
    models.lever.scene.traverse((child) => {
        if (child.isMesh) {
            child.material.envMap = textures.envMap;
        }
    });
    for (let i = 0; i < 4; i++) {
        const possibleSpots = [];
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
        const lever = new Lever(models.lever.scene, models.lever.animations, {
            position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
            camera,
            scene,
            entities
        })
        scene.add(lever.mesh);
        entities.push(lever);
    }
    const healthBackground = document.getElementById("healthBackground");
    const healthBar = document.getElementById("healthBar");
    const healthLoss = document.getElementById("healthLoss");
    let playerElevation = 10;
    let onGround = true;
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