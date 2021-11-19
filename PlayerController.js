import * as THREE from './three/build/three.module.js';
import WeaponController from './WeaponController.js';
import Lever from './Lever.js';
import Projectile from './Projectile.js';
import Station from './Station.js';
import { DecalGeometry } from "./three/examples/jsm/geometries/DecalGeometry.js";

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}
class PlayerController {
    constructor({
        position,
        height,
        camera,
        controls,
        tileMap,
        sourceMap,
        heightMap,
        entities,
        dentMap,
        levelMesh,
        scene,
        decals
    }) {
        this.entities = entities;
        this.tileMap = tileMap;
        this.sourceMap = sourceMap;
        this.heightMap = heightMap;
        this.position = position;
        this.camera = camera;
        this.height = height;
        this.scene = scene;
        this.controls = controls;
        this.velocity = new THREE.Vector3();
        this.onGround = true;
        this.weaponState = "idle";
        this.health = 250;
        this.maxHealth = 250;
        this.healthLoss = 0;
        this.controls.getObject().velocity = this.velocity;
        this.raycaster = new THREE.Raycaster();
        this.dentMaterial = dentMap;
        this.levelMesh = levelMesh;
        this.decals = decals;
    }
    getPosition() {
        return this.controls.getObject().position;
    }
    takeDamage(amt) {
        if (this.weaponState === "block") {
            amt -= this.weapon.blockMax;
            amt = Math.max(amt, 0);
            if (Math.random() < this.weapon.cooldownChance) {
                this.weaponState = "cooldown";
                this.weaponController.addTargetPosition(0, -1.0, 0, 0.3 / this.weapon.speed);
                this.weaponController.addTargetRotation(0, 0, 0, 0.3 / this.weapon.speed);
                this.weaponController.addTargetPosition(0, 0, 0, 0.45 / this.weapon.speed);
                this.weaponController.addTargetRotation(0, 0, 0, 0.45 / this.weapon.speed);
            }
        }
        const oldHealth = this.health;
        this.health -= amt;
        this.health = Math.max(this.health, 0);
        this.healthLoss += oldHealth - this.health;
    }
    update(keys, mouseDown) {
        this.health = Math.max(this.health, 0);
        this.healthLoss *= 0.9;
        const playerPos2D = new THREE.Vector2(this.controls.getObject().position.x, this.controls.getObject().position.z);
        const tile = new THREE.Vector2(Math.floor(playerPos2D.x / 5) + 50, Math.floor(playerPos2D.y / 5) + 50);
        const cameraDir = this.camera.getWorldDirection(new THREE.Vector3());
        const yDir = Math.atan2(cameraDir.x, cameraDir.z);
        const xzVel = new THREE.Vector2();
        if (keys["w"]) {
            xzVel.x += Math.sin(yDir);
            xzVel.y += Math.cos(yDir);
        } else if (keys["s"]) {
            xzVel.x -= Math.sin(yDir);
            xzVel.y -= Math.cos(yDir);
        }
        if (keys["a"]) {
            xzVel.x += Math.sin(yDir + Math.PI / 2);
            xzVel.y += Math.cos(yDir + Math.PI / 2);
        } else if (keys["d"]) {
            xzVel.x -= Math.sin(yDir + Math.PI / 2);
            xzVel.y -= Math.cos(yDir + Math.PI / 2);
        }
        xzVel.normalize();
        xzVel.multiplyScalar(0.025);
        //camera.position.x += xzVel.x;
        //camera.position.z += xzVel.z;
        //console.log(camera.position.x);
        if (!this.onGround) {
            this.velocity.y -= 0.065;
        }
        if (this.position.y < this.height && !this.onGround) {
            this.onGround = true;
            this.velocity.y = 0;
            this.position.y = this.height;
        }
        if (this.position.y <= this.height + 0.25) {
            if (keys[" "]) {
                this.velocity.y += 1.75;
                this.onGround = false;
            }
        }
        this.velocity.x += xzVel.x;
        this.velocity.z += xzVel.y;
        if (this.onGround) {
            this.velocity.multiplyScalar(0.95);
            this.position.y = this.height;
        } else {
            this.velocity.multiplyScalar(0.975);
        }
        /*const playerPos2D = new THREE.Vector2(controls.getObject().position.x, controls.getObject().position.z);
        const tile = new THREE.Vector2(Math.floor(playerPos2D.x / 5) + 50, Math.floor(playerPos2D.y / 5) + 50);*/
        const verticesToCheck = [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1]
        ];
        let hit = false;
        let hitTile;
        verticesToCheck.forEach(vertex => {
            if (hit) {
                return;
            }
            const playerPos2D = new THREE.Vector2(this.controls.getObject().position.x + vertex[0], this.controls.getObject().position.z + vertex[1]);
            const tile = new THREE.Vector2(Math.floor(playerPos2D.x / 5) + 50, Math.floor(playerPos2D.y / 5) + 50);
            if (this.tileMap[tile.x * 100 + tile.y] !== 1) {
                hitTile = tile;
                hit = true;
            }
        });
        let minHeight = this.heightMap[tile.x * 100 + tile.y];
        const verticesToHeight = [
            [-2.5, -2.5],
            [-2.5, 2.5],
            [2.5, 2.5],
            [2.5, -2.5]
        ];
        verticesToHeight.forEach(vertex => {
            const playerPos2D = new THREE.Vector2(this.controls.getObject().position.x + vertex[0], this.controls.getObject().position.z + vertex[1]);
            const tile = new THREE.Vector2(Math.floor(playerPos2D.x / 5) + 50, Math.floor(playerPos2D.y / 5) + 50);
            minHeight = Math.min(minHeight, this.heightMap[tile.x * 100 + tile.y]);
        });
        if (this.position.y > minHeight - 2) {
            this.velocity.y *= -1;
            this.position.y += this.velocity.y;
        }
        if (this.position.y > minHeight - 1) {
            this.velocity.y = 0;
            this.position.y -= 3;
        }
        if (hit) {
            //controls.getObject().position.x -= velocity.x;
            //controls.getObject().position.z -= velocity.z;
            const tileIdx = hitTile.x * 100 + hitTile.y;
            if (this.tileMap[tileIdx - 1] === 2 && this.tileMap[tileIdx + 1] === 2) {
                this.velocity.x *= -1;
                this.position.x += this.velocity.x;
            } else if (this.tileMap[tileIdx - 100] === 2 && this.tileMap[tileIdx + 100] === 2) {
                this.velocity.z *= -1;
                this.position.z += this.velocity.z;
            } else {
                this.velocity.x *= -1;
                this.velocity.z *= -1;
                this.position.x += this.velocity.x;
                this.position.z += this.velocity.z;
            }
        }
        this.entities.forEach(entity => {
            if (entity.blockPlayer) {
                if (entity.box.containsPoint(this.position)) {
                    const away = entity.box.getCenter(new THREE.Vector3()).sub(this.position);
                    this.velocity.add(away.multiplyScalar(-0.025));
                }
            }
        })

        this.position.add(this.velocity); // += velocity.x;
        //playerElevation += velocity.y;
        const lowFreq = 0.05 * Math.sin(performance.now() / 1000);
        const highFreq = 0.5 * Math.sin(performance.now() / 100);
        this.controls.getObject().position.x = this.position.x;
        this.controls.getObject().position.y = this.position.y - 0.2 * (lowFreq + (highFreq - lowFreq) * (Math.hypot(this.velocity.x, this.velocity.z) / 0.5));
        this.controls.getObject().position.z = this.position.z;
        if (this.weapon) {
            //this.weapon.position.y = -0.5 - 0.1 * (lowFreq + (highFreq - lowFreq) * (Math.hypot(this.velocity.x, this.velocity.z) / 0.5));
            if (!this.weaponController) {
                this.weaponController = new WeaponController(this.weapon.model, {
                    position: this.weapon.position,
                    rotation: this.weapon.rotation,
                    scale: this.weapon.scale
                });
                this.camera.add(this.weapon.model);
            } else {
                this.weaponController.update(-0.1 * (lowFreq + (highFreq - lowFreq) * (Math.hypot(this.velocity.x, this.velocity.z) / 0.5)));
                if (this.weaponController.idle() && this.weaponState !== "idle" && this.weaponState !== "block") {
                    this.weaponState = "idle";
                }
                if (!mouseDown && this.weaponState === "block") {
                    this.weaponController.addTargetPosition(0, 0, 0, 0.2);
                    this.weaponController.addTargetRotation(0, 0, 0, 0.2);
                    this.weaponState = "idle";
                }
            }
        }
        //this.camera.fov = 75 + 5 * (Math.hypot(this.velocity.x, this.velocity.z) / 0.5);
        this.camera.updateProjectionMatrix();
    }
    changeWeapon(weapon) {
        this.camera.remove(this.weapon.model);
        this.weapon = weapon;
        this.weaponController = new WeaponController(this.weapon.model, {
            position: this.weapon.position,
            rotation: this.weapon.rotation,
            scale: this.weapon.scale
        });
        this.camera.add(this.weapon.model);
    }
    handleSwing({ span = Math.PI / 4, strength = 1, range = 5 }) {
        const cameraDir = this.camera.getWorldDirection(new THREE.Vector3());
        const yDir = Math.atan2(cameraDir.x, cameraDir.z);
        this.entities.forEach(entity => {
            if ((entity.memory && entity.memory.maxHealth && entity.memory.health)) {
                const entityDist = entity.box.distanceToPoint(this.controls.getObject().position);
                if (entityDist < range) {
                    const theta = Math.atan2(entity.mesh.position.x - this.controls.getObject().position.x, entity.mesh.position.z - this.controls.getObject().position.z);
                    // const angleDiff = yDir - theta;
                    if (Math.abs(angleDifference(theta, yDir)) < span || entityDist < 3) {
                        const away = this.controls.getObject().position.clone().sub(entity.box.getCenter(new THREE.Vector3())).normalize().multiplyScalar(-1.0);
                        entity.takeDamage((this.weapon.damage + Math.random() * this.weapon.damage) * strength, new THREE.Vector3(away.x, 0, away.z));
                    }
                }
            } else if (entity instanceof Projectile) {
                const entityDist = entity.box.clone().expandByScalar(3).distanceToPoint(this.controls.getObject().position);
                if (entityDist < range) {
                    const theta = Math.atan2(entity.mesh.position.x - this.controls.getObject().position.x, entity.mesh.position.z - this.controls.getObject().position.z);
                    // const angleDiff = yDir - theta;
                    if (Math.abs(angleDifference(theta, yDir)) < span || entityDist < 3) {
                        const awayVelocity = this.getPosition().clone().sub(entity.mesh.position.clone()).normalize().multiplyScalar(-2);
                        entity.velocity.add(awayVelocity);
                        entity.mesh.lookAt(entity.mesh.position.clone().add(entity.velocity));
                        entity.sourceEntity = null;
                    }
                }
            }
        })
    }
    registerClick(input, keys) {
        let doDent = false;
        if (this.weaponState === "idle") {
            if (keys["shift"]) {
                this.weaponController.addTargetPosition(-0.3, 0.1, 0.0025, 0.2 / this.weapon.speed);
                this.weaponController.addTargetPosition(0, 0, 0, 0.2 / this.weapon.speed);
                this.weaponController.addTargetRotation(-0.5, -0.3, 0.3, 0.2 / this.weapon.speed);
                this.weaponController.addTargetRotation(0, 0, 0, 0.2 / this.weapon.speed);
                this.handleSwing({ span: Math.PI / 4, strength: 1, range: 10, strength: 0.75 })
                this.weaponState = "attack";
                this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
                doDent = true;
                this.entities.forEach(entity => {
                    if (entity instanceof Lever) {
                        if (this.raycaster.ray.intersectsBox(entity.box.clone().expandByScalar(1.5))) {
                            entity.push();
                            doDent = false;
                        }
                    } else if (entity instanceof Station) {
                        if (this.raycaster.ray.intersectsBox(entity.box)) {
                            entity.push();
                            doDent = false;
                        }
                    }
                });
            } else if (input.button === 2) {
                this.weaponController.addTargetPosition(-0.5, 0, 0, 0.2 / this.weapon.speed);
                this.weaponController.addTargetRotation(-0.3, 1, 0.5, 0.2 / this.weapon.speed);
                this.weaponState = "block";
            } else {
                this.weaponController.addTargetPosition(-1.5, 0, 0, 0.35 / this.weapon.speed);
                this.weaponController.addTargetPosition(0, 0, 0, 0.35 / this.weapon.speed);
                this.weaponController.addTargetRotation(-0.9, 1, 0, 0.35 / this.weapon.speed);
                this.weaponController.addTargetRotation(0, 0, 0, 0.35 / this.weapon.speed);
                this.handleSwing({ span: Math.PI / 4, strength: 1.5, range: 7.5 });
                this.weaponState = "slash";
                doDent = true;
            }
        }
        if (doDent) {
            this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
            const intersections = this.raycaster.intersectObject(this.levelMesh, false);
            const mouseHelper = new THREE.Object3D();
            if (intersections.length > 0 && intersections[0].point.distanceTo(this.getPosition()) < 12.5) {
                mouseHelper.position.copy(intersections[0].point);
                const n = intersections[0].face.normal.clone();
                n.transformDirection(this.levelMesh.matrixWorld);
                n.multiplyScalar(10);
                n.add(intersections[0].point);
                mouseHelper.rotation.z = 0;
                mouseHelper.lookAt(n);
                mouseHelper.rotation.z = Math.random() * 2 * Math.PI;
                const size = Math.random() * 5 + 7.5;
                const m = new THREE.Mesh(new DecalGeometry(this.levelMesh, intersections[0].point, mouseHelper.rotation, new THREE.Vector3(size, size, size)), this.dentMaterial);
                this.scene.add(m);
                this.decals.push(m);
            }
        }
    }
}
export default PlayerController;