import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import { LevelGenerator } from "./LevelGenerator.js";
import { EnemyManager } from "./EnemyManager.js";
import Ant from "./Ant.js";
import Bee from "./Bee.js";
import Beetle from './Beetle.js';
import Butterfly from './Butterfly.js';
import Scorpion from "./Scorpion.js";
import Queen from "./Queen.js";
import Station from './Station.js';
import Lever from "./Lever.js";
const enemyAmts = [
    [15, 0, 0, 0, 0],
    [12, 5, 0, 0, 0],
    [8, 5, 8, 0, 0],
    [6, 8, 3, 10, 0],
    [6, 4, 3, 6, 3],
    [0, 0, 0, 0, 0]
]
let levelDefault = [10, 8, 6, 8, 2];
class Level {
    constructor(models, scene, {
        playerController,
        levelMesh,
        tileMap,
        sourceMap,
        heightMap,
        resetFunction,
        camera,
        bossAnims,
        number = 0
    }) {
        this.models = models;
        this.scene = scene;
        this.playerController = playerController;
        this.camera = camera;
        this.tileMap = tileMap;
        this.number = number;
        this.bossAnims = bossAnims;
        levelDefault[0] = 5 + Math.floor(4 * Math.random());
        levelDefault[1] = 4 + Math.floor(3 * Math.random());
        levelDefault[2] = 3 + Math.floor(3 * Math.random());
        levelDefault[3] = 4 + Math.floor(3 * Math.random());
        levelDefault[4] = 1 + Math.floor(3 * Math.random());
        this.enemyCounts = enemyAmts[this.number] ? enemyAmts[this.number] : levelDefault;
        const isOpen = (idx) => {
            return tileMap[idx - 1] === 1 && tileMap[idx + 1] === 1 && tileMap[idx - 100] === 1 && tileMap[idx + 100] === 1 &&
                tileMap[idx - 99] === 1 && tileMap[idx + 99] === 1 && tileMap[idx - 101] === 1 && tileMap[idx + 101] === 1;
        }
        this.sourceMap = sourceMap;
        this.heightMap = heightMap;
        this.levelMesh = levelMesh;
        scene.add(levelMesh);
        this.entities = [];
        const entities = this.entities;
        const avoid = [
            [playerController.getPosition(), 100]
        ];
        EnemyManager.placeEnemies(this.enemyCounts[0], {
            tileMap,
            sourceMap,
            heightMap,
            entities,
            scene,
            avoid,
            create(chosenSpot) {
                return new Ant(models.ant.scene, models.ant.animations, {
                    position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
                    scene,
                    tileMap,
                    heightMap,
                    sourceMap,
                    entities,
                    playerController,
                    direction: 2 * Math.PI * Math.random()
                });
            },
            isOpen
        });
        EnemyManager.placeEnemies(this.enemyCounts[1], {
            tileMap,
            sourceMap,
            heightMap,
            entities,
            scene,
            avoid,
            create(chosenSpot) {
                return new Bee(models.bee.scene, models.bee.animations, {
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
            },
            isOpen
        });
        EnemyManager.placeEnemies(this.enemyCounts[2], {
            tileMap,
            sourceMap,
            heightMap,
            entities,
            scene,
            avoid,
            create(chosenSpot) {
                return new Beetle(models.beetle.scene, models.beetle.animations, {
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
            },
            isOpen
        });
        EnemyManager.placeEnemies(this.enemyCounts[3], {
            tileMap,
            sourceMap,
            heightMap,
            entities,
            scene,
            avoid,
            create(chosenSpot) {
                return new Butterfly(models.butterfly.scene, models.butterfly.animations, {
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
            },
            isOpen
        });
        EnemyManager.placeEnemies(this.enemyCounts[4], {
            tileMap,
            sourceMap,
            heightMap,
            entities,
            scene,
            avoid,
            create(chosenSpot) {
                return new Scorpion(models.scorpion.scene, models.scorpion.animations, {
                    position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
                    scene,
                    tileMap,
                    heightMap,
                    sourceMap,
                    entities,
                    playerController,
                    projectileMesh: models.stinger.scene.children[0],
                    camera,
                    direction: 2 * Math.PI * Math.random()
                });
            },
            isOpen
        });
        if (number === 5) {
            const boss = new Queen(models.queen.scene, bossAnims, {
                position: new THREE.Vector3(0, 0, 0),
                scene,
                direction: 0,
                tileMap,
                sourceMap,
                heightMap,
                entities,
                playerController,
                models,
                projectileMesh: models.stinger.scene.children[0],
                camera
            });
            scene.add(boss.mesh);
            entities.push(boss);
        }
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
        const station = new Station(models.station.scene, models.station.animations, {
            position: new THREE.Vector3((placeX - 50) * 5, 6.4, (placeY - 50) * 5),
            camera,
            scene,
            resetFunction,
            entities
        });
        scene.add(station.mesh);
        entities.push(station);
        EnemyManager.placeEnemies(4, {
            tileMap,
            sourceMap,
            heightMap,
            entities,
            scene,
            avoid,
            create(chosenSpot) {
                return new Lever(models.lever.scene, models.lever.animations, {
                    position: new THREE.Vector3(chosenSpot.x * 5, 0, chosenSpot.y * 5),
                    camera,
                    scene,
                    entities,
                    number
                })
            },
            isOpen
        });
    }
}
export default Level;