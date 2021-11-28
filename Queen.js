import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import Projectile from './Projectile.js';
import Emitter from "./Emitter.js";
import Ant from './Ant.js';
import Scorpion from './Scorpion.js';
import Beetle from './Beetle.js';
import Butterfly from './Butterfly.js';
import Bee from './Bee.js';
import TextManager from "./TextManager.js";

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}
const texLoader = new THREE.TextureLoader();
const smokeTex = texLoader.load("assets/images/smoke.jpeg");
class Queen {
    constructor(model, animations, {
        position,
        scene,
        direction = 0,
        tileMap,
        sourceMap,
        heightMap,
        entities,
        playerController,
        projectileMesh,
        camera,
        models
    }) {
        this.mesh = model.clone();
        this.mesh.scale.set(0, 0, 0);
        this.mesh.position.copy(position);
        this.height = 11;
        this.direction = direction;
        this.tileMap = tileMap;
        this.sourceMap = sourceMap;
        this.heightMap = heightMap;
        this.entities = entities;
        this.playerController = playerController;
        this.projectileMesh = projectileMesh;
        this.scene = scene;
        this.models = models;
        this.smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.25,
            alphaMap: smokeTex,
            depthTest: true,
            depthWrite: false,
        });
        this.smokeEmitter = new Emitter(new THREE.PlaneGeometry(1, 1), this.smokeMaterial, 2000, {
            deleteOnSize: 0.001,
            deleteOnDark: 0.01
        });
        this.scene.add(this.smokeEmitter);
        this.camera = camera;
        this.box = new THREE.Box3();
        //const helper = new THREE.Box3Helper(this.box, 0xffff00);
        //scene.add(helper);
        this.updateBox();
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = {};
        Object.entries(animations).forEach(([anim, list]) => {
            this.animations[anim] = list.map(clip => this.mixer.clipAction(clip));
        });
        this.flinch = 0;
        this.targetFlinch = 0;
        this.currAnim = "none";
        /* Object.keys(this.animations).forEach(key => {
             this.animations[key].forEach(anim => {
                 anim.play();
             });
         })*/
        //this.switchAnim("walk");
        //this.mesh.rotation.x = 0.25;
        this.state = {
            type: "idle",
            memory: {}
        };
        const maxHealth = 1000;
        this.memory = {
            health: maxHealth,
            maxHealth: maxHealth,
            healthLoss: 0,
            flyCounter: 0,
            summonCounter: 0,
            damageCounter: 0,
            introTick: 0,
            flapTick: 0
        }
        this.velocity = new THREE.Vector3();
        this.deadParts = [];
        this.deadVelocities = [];

    }
    takeDamage(amt, velocity) {
        if (this.memory.introTick <= 120) {
            return;
        }
        const oldHealth = this.memory.health;
        if (this.state.type === "block") {
            this.velocity.add(velocity.multiplyScalar(0.5));
            return;
        }
        this.memory.damageCounter += amt;
        this.memory.health -= amt;
        if (this.memory.health < 0) {
            this.memory.health = 0;
            this.die(velocity);
        } else {
            this.velocity.add(velocity);
            this.velocity.y += 0.5 + Math.random() * 0.5;
        }
        if (this.targetFlinch === 0) {
            this.targetFlinch = 0.5 + 0.15 * Math.random();
        }
        this.memory.healthLoss += oldHealth - this.memory.health;
    }
    die(startingVelocity) {
        sfx.explosion.playbackRate = 0.75 + 0.5 * Math.random();
        sfx.explosion.detune = 100 * (Math.random() * 6 - 3);
        sfx.explosion.setVolume((0.25 + 0.25 * Math.random()) * sfxVolume);
        sfx.explosion.isPlaying = false;
        sfx.explosion.play();
        if (!startingVelocity) {
            startingVelocity = new THREE.Vector3(0, 0, 0);
        }
        this.state.type = "dead";
        this.state.memory = {};
        Object.keys(this.animations).forEach(key => {
            this.animations[key].forEach(anim => {
                anim.timeScale = 0;
                anim.stop();
            });
        })
        this.deathTimer = 0;
        this.dying = true;
        this.mesh.traverse(child => {
            if (child.isMesh || child.isObject3D) {
                if (child.isBone || child.isSkinnedMesh) {
                    return;
                }
                /*if (child.isSkinnedMesh) {
                    child.visible = false;
                }*/
                this.deadParts.push(child);
            }
        });
        this.deadParts.forEach(part => {
            this.scene.attach(part);
            this.deadVelocities.push([
                new THREE.Vector3(Math.random() * 0.25 - 0.125 + startingVelocity.x, -0.05 + Math.random() * 0.25 + startingVelocity.y, Math.random() * 0.25 - 0.125 + startingVelocity.z),
                new THREE.Vector3(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1)
            ]);
        });
        this.entities.forEach(entity => {
            if (entity instanceof Ant || entity instanceof Bee || entity instanceof Beetle || entity instanceof Butterfly || entity instanceof Scorpion) {
                entity.die();
            }
        });
        //this.scene.remove(this.smokeEmitter);
    }
    switchAnim(newAnim) {
        if (this.currAnim !== "none") {
            this.animations[this.currAnim].forEach(anim => {
                anim.fadeOut(0.25);
            });
        }
        this.currAnim = newAnim;
        if (this.currAnim !== "none") {
            this.animations[this.currAnim].forEach(anim => {
                anim.enabled = true;
                anim.reset();
                anim.fadeIn(0.25);
                anim.play();
            });
        }
    }
    update(delta, frustum) {
        this.updateBox();
        this.mixer.update(delta);
        this.smokeEmitter.update(delta, this.camera);
        this.memory.healthLoss *= 0.9;
        this.memory.introTick += 1;
        this.memory.flapTick += delta;
        if (this.memory.flapTick > 30 / 24) {
            this.memory.flapTick = 0;
            sfx.flap.setVolume(10.0 * Math.min(1 / (Math.min(...this.entities.filter(e => e instanceof Queen && !e.dying).map(queen => Math.hypot(queen.mesh.position.x - this.playerController.getPosition().x, queen.mesh.position.z - this.playerController.getPosition().z))) / 40), 1));
            sfx.flap.detune = 100 * (6 * Math.random() - 3);
            sfx.flap.playbackRate = 0.75 + 0.5 * Math.random();
            sfx.flap.isPlaying = false;
            sfx.flap.play();
        }
        if (this.memory.introTick <= 120) {
            this.state = {
                type: "idle",
                memory: {}
            };
            this.mesh.scale.set(2 * this.memory.introTick / 120, 2 * this.memory.introTick / 120, 2 * this.memory.introTick / 120);
            this.height = 11 * (this.memory.introTick / 120);
            this.mesh.traverse(part => {
                if (part.isMesh) {
                    const worldPos = part.getWorldPosition(new THREE.Vector3());
                    if (Math.random() < 1.0) {
                        for (let i = 0; i < 1; i++) {
                            const smokeDir = new THREE.Vector3(0, Math.random() * 0.75, 0).normalize();
                            const saturation = 0.875 + Math.random() * 0.25;
                            this.smokeEmitter.emit({
                                position: new THREE.Vector3(5 * (Math.random() - 0.5), 0, 5 * (Math.random() - 0.5)).add(worldPos),
                                rotation: new THREE.Vector3(0.0, 0.0, Math.random() * Math.PI * 2),
                                scale: new THREE.Vector3(10.0, 10.0, 10.0),
                                speed: 1,
                                size: 1 * this.mesh.scale.x * 0.5,
                                color: new THREE.Vector3(saturation * Math.random(), saturation * Math.random(), saturation * Math.random()).multiplyScalar(0.5),
                                //colorDecay: 0.9,
                                velocityDecay: 0.98,
                                velocity: {
                                    position: smokeDir.add(new THREE.Vector3(0.1 - 0.2 * Math.random(), 0.2 + 0.1 * Math.random(), 0.1 - 0.2 * Math.random())).multiplyScalar(1),
                                    rotation: new THREE.Vector3(0.0, 0.0, 0.0),
                                    scale: new THREE.Vector3(0.0, 0.0, 0.0),
                                    speed: 0,
                                    size: -0.004 + -0.004 * Math.random()
                                },
                                billboard: true
                            });
                        }
                    }
                }
            });
        } else {
            if (!this.dying) {
                this.mesh.scale.set(2, 2, 2);
            }
        }
        if (this.memory.introTick <= 180 && this.memory.introTick >= 120) {
            this.mesh.traverse(part => {
                if (part.isMesh) {
                    const worldPos = part.getWorldPosition(new THREE.Vector3());
                    if (Math.random() < 1) {
                        for (let i = 0; i < 1; i++) {
                            const smokeDir = new THREE.Vector3(0, Math.random() * 0.75, 0).normalize();
                            const saturation = 0.875 + Math.random() * 0.25;
                            this.smokeEmitter.emit({
                                position: new THREE.Vector3(5 * (Math.random() - 0.5), 0, 5 * (Math.random() - 0.5)).add(worldPos),
                                rotation: new THREE.Vector3(0.0, 0.0, Math.random() * Math.PI * 2),
                                scale: new THREE.Vector3(10.0, 10.0, 10.0),
                                speed: 1,
                                size: 1 * this.mesh.scale.x * 0.5 * (1 - (this.memory.introTick - 120) / 60),
                                color: new THREE.Vector3(saturation * Math.random(), saturation * Math.random(), saturation * Math.random()).multiplyScalar(0.5),
                                //colorDecay: 0.9,
                                velocityDecay: 0.98,
                                velocity: {
                                    position: smokeDir.add(new THREE.Vector3(0.1 - 0.2 * Math.random(), 0.2 + 0.1 * Math.random(), 0.1 - 0.2 * Math.random())).multiplyScalar(1),
                                    rotation: new THREE.Vector3(0.0, 0.0, 0.0),
                                    scale: new THREE.Vector3(0.0, 0.0, 0.0),
                                    speed: 0,
                                    size: -0.004 + -0.004 * Math.random()
                                },
                                billboard: true
                            });
                        }
                    }
                }
            });
        }
        const [hit, hitTile] = this.intersectWall();
        if (hit) {
            const tileIdx = hitTile.x * 100 + hitTile.y;
            if (this.tileMap[tileIdx - 1] === 2 && this.tileMap[tileIdx + 1] === 2) {
                this.velocity.x *= -1;
                this.mesh.position.x += this.velocity.x * 3;
            } else if (this.tileMap[tileIdx - 100] === 2 && this.tileMap[tileIdx + 100] === 2) {
                this.velocity.z *= -1;
                this.mesh.position.z += this.velocity.z * 3;
            } else {
                this.velocity.x *= -1;
                this.velocity.z *= -1;
                this.mesh.position.x += this.velocity.x * 3;
                this.mesh.position.z += this.velocity.z * 3;
            }
            const away = new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z).clone().sub(new THREE.Vector3((hitTile.x - 50) * 5, 0, (hitTile.y - 50) * 5)).normalize();
            this.mesh.position.add(away.multiplyScalar(this.velocity.length()));
        }
        if (!this.dying) {
            this.entities.forEach(entity => {
                if (entity !== this) {
                    if (entity.box.intersectsBox(this.box) && !entity.dying) {
                        const away = entity.box.getCenter(new THREE.Vector3()).sub(this.box.getCenter(new THREE.Vector3()));
                        this.velocity.add(away.multiplyScalar(-0.01));
                    }
                }
            })
        }
        if (!this.dying) {
            this.mesh.position.x += this.velocity.x;
            this.mesh.position.y += this.velocity.y;
            this.mesh.position.z += this.velocity.z;
            if (this.mesh.position.y > this.height) {
                this.velocity.y -= 0.065;
            } else {
                this.mesh.position.y = this.height;
            }
            this.velocity.multiplyScalar(0.95);
        }
        //this.direction = Math.atan2(this.playerController.getPosition().x - this.mesh.position.x, this.playerController.getPosition().z - this.mesh.position.z);
        if (this.targetFlinch !== 0) {
            this.flinch += 0.05;
            if (Math.abs(this.targetFlinch - this.flinch) < 0.05) {
                this.flinch = this.targetFlinch;
                this.targetFlinch = 0;
            }
        } else {
            this.flinch *= 0.9;
        }
        this.mesh.lookAt(new THREE.Vector3(this.mesh.position.x + Math.sin(this.direction + Math.PI), this.mesh.position.y + Math.atan(-0.15) - Math.atan(this.flinch), this.mesh.position.z + Math.cos(this.direction + Math.PI)));
        if (this.state.type === "attack") {
            if (this.currAnim !== "walk") {
                this.switchAnim("walk");
            }
            const distanceToTarget = Math.hypot(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            if (this.memory.flyCounter > 10 && distanceToTarget < 50) {
                this.memory.flyCounter = 0;
                this.state = {
                    type: "fly",
                    memory: {
                        time: 0,
                        target: this.state.memory.target
                    }
                }
            } else if (this.memory.summonCounter > 10 && distanceToTarget < 50) {
                this.memory.summonCounter = 0;
                this.state = {
                    type: "summon",
                    memory: {
                        time: 0,
                        target: this.state.memory.target
                    }
                }
            } else if (distanceToTarget < 20) {
                this.memory.flyCounter += Math.floor(Math.random() * 3);
                this.memory.summonCounter += Math.floor(Math.random() * 2);
                this.state = {
                    type: "punch",
                    memory: {
                        time: 0,
                        target: this.state.memory.target
                    }
                }
            } else {
                let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
                this.direction += angleDifference(this.direction, angleToTarget) / 10;
                const toTarget = new THREE.Vector3(Math.sin(this.direction), 0, Math.cos(this.direction));
                this.velocity.add(toTarget.multiplyScalar(0.02));
            }
        }
        if (this.state.type === "fly") {
            if (this.currAnim !== "fly") {
                this.switchAnim("fly");
            }
            this.state.memory.time += delta;
            const clampedTime = Math.max(Math.min(this.state.memory.time, 1), 0)
            this.height = 11 + 15 * (3 * clampedTime ** 2 - 2 * clampedTime ** 3) + 2.5 * Math.sin(this.state.memory.time);
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            if (this.state.memory.time > 1.25) {
                if (this.state.memory.spins === undefined) {
                    this.state.memory.spins = 0;
                }
                this.direction += 0.1;
                if (Math.abs(angleDifference(this.direction, angleToTarget + Math.PI)) < 0.1 && !this.state.memory.shot) {
                    const vel = this.mesh.position.clone();
                    vel.y -= 5;
                    vel.add(new THREE.Vector3(Math.sin(this.direction), 0, Math.cos(this.direction)).multiplyScalar(-4));
                    const projectile = new Projectile(this.projectileMesh, this.state.memory.target.position, vel, 1, {
                        scene: this.scene,
                        tileMap: this.tileMap,
                        sourceMap: this.sourceMap,
                        heightMap: this.heightMap,
                        entities: this.entities,
                        playerController: this.playerController,
                        sourceEntity: this,
                        emitter: this.smokeEmitter,
                        damage: 7 + Math.random() * 7,
                        color: new THREE.Color(1.0, 1.0, 1.0),
                        camera: this.camera
                    });
                    this.lastProjectile = projectile;
                    this.entities.push(projectile);
                    this.state.memory.shot = true;
                    this.state.memory.spins += 1;
                }
                if (Math.abs(angleDifference(this.direction, angleToTarget)) < 0.1) {
                    this.state.memory.shot = false;
                    if (this.state.memory.spins > 2) {
                        this.state = {
                            type: "descend",
                            memory: {
                                time: 0,
                                target: this.state.memory.target
                            }
                        };
                    }
                }
            } else {
                this.direction += angleDifference(this.direction, angleToTarget) / 10;
            }
        }
        if (this.state.type === "descend") {
            if (this.currAnim !== "fly") {
                this.switchAnim("fly");
            }
            this.state.memory.time += delta;
            if (this.height > 11) {
                this.height -= 0.2 + 0.2 * this.state.memory.time;
            } else {
                this.height = 11;
                this.state = {
                    type: "attack",
                    memory: {
                        target: this.state.memory.target
                    }
                };
            }
        }
        if (this.state.type === "summon") {
            if (this.currAnim !== "summon") {
                this.switchAnim("summon");
            }
            this.state.memory.time += delta;
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            this.direction += angleDifference(this.direction, angleToTarget) / 10;
            if (this.state.memory.time >= 20 / 24) {
                //this.state.memory.summoned = true;
                const worldPos = this.mesh.getWorldPosition(new THREE.Vector3());
                for (let i = 0; i < 25; i++) {
                    const smokeDir = new THREE.Vector3(0, Math.random() * 0.75, 0).normalize();
                    const saturation = 0.875 + Math.random() * 0.25;
                    this.smokeEmitter.emit({
                        position: new THREE.Vector3(5 * (Math.random() - 0.5) + 5 * Math.sin(this.direction), -this.height + 1, 5 * (Math.random() - 0.5) + 5 * Math.cos(this.direction)).add(worldPos),
                        rotation: new THREE.Vector3(0.0, 0.0, Math.random() * Math.PI * 2),
                        scale: new THREE.Vector3(10.0, 10.0, 10.0),
                        speed: 1,
                        size: 1,
                        color: new THREE.Vector3(saturation, saturation, saturation).multiplyScalar(0.5),
                        //colorDecay: 0.9,
                        velocityDecay: 0.98,
                        velocity: {
                            position: smokeDir.add(new THREE.Vector3(0.1 - 0.2 * Math.random(), 0.2 + 0.1 * Math.random(), 0.1 - 0.2 * Math.random())).multiplyScalar(1),
                            rotation: new THREE.Vector3(0.0, 0.0, 0.0),
                            scale: new THREE.Vector3(0.0, 0.0, 0.0),
                            speed: 0,
                            size: -0.004 + -0.004 * Math.random()
                        },
                        billboard: true
                    });
                }
            }
            if (this.state.memory.time >= 30 / 24 && !this.state.memory.summoned) {
                sfx.wind.playbackRate = 0.75 + 0.5 * Math.random();
                sfx.wind.detune = 100 * (Math.random() * 6 - 3);
                sfx.wind.setVolume(0.5 + 0.5 * Math.random());
                sfx.wind.isPlaying = false;
                sfx.wind.play();
                let seed = Math.random();
                const placeMag = 5;
                if (seed < 1 / 3) {
                    const summonee = new Beetle(this.models.beetle.scene, this.models.beetle.animations, {
                        position: new THREE.Vector3(this.mesh.position.x + placeMag * Math.sin(this.direction), 0, this.mesh.position.z + placeMag * Math.cos(this.direction)),
                        scene: this.scene,
                        tileMap: this.tileMap,
                        heightMap: this.heightMap,
                        sourceMap: this.sourceMap,
                        entities: this.entities,
                        playerController: this.playerController,
                        camera: this.camera,
                        direction: this.direction
                    });
                    this.entities.push(summonee);
                    this.scene.add(summonee.mesh);
                } else if (seed < 2 / 3) {
                    const summonee = new Scorpion(this.models.scorpion.scene, this.models.scorpion.animations, {
                        position: new THREE.Vector3(this.mesh.position.x + placeMag * Math.sin(this.direction), 0, this.mesh.position.z + placeMag * Math.cos(this.direction)),
                        scene: this.scene,
                        tileMap: this.tileMap,
                        heightMap: this.heightMap,
                        sourceMap: this.sourceMap,
                        entities: this.entities,
                        playerController: this.playerController,
                        projectileMesh: this.models.stinger.scene.children[0],
                        camera: this.camera,
                        direction: this.direction
                    });
                    this.entities.push(summonee);
                    this.scene.add(summonee.mesh);
                } else {
                    for (let i = 0; i < 3; i++) {
                        if (Math.random() < 0.5) {
                            const summonee = new Bee(this.models.bee.scene, this.models.bee.animations, {
                                position: new THREE.Vector3(this.mesh.position.x + placeMag * Math.sin(this.direction) + Math.random() * 5 - 2.5, 0, this.mesh.position.z + placeMag * Math.cos(this.direction) + Math.random() * 5 - 2.5),
                                scene: this.scene,
                                tileMap: this.tileMap,
                                heightMap: this.heightMap,
                                sourceMap: this.sourceMap,
                                entities: this.entities,
                                playerController: this.playerController,
                                projectileMesh: this.models.stinger.scene.children[0],
                                camera: this.camera,
                                direction: this.direction
                            });
                            this.entities.push(summonee);
                            this.scene.add(summonee.mesh);
                        } else {
                            const summonee = new Butterfly(this.models.butterfly.scene, this.models.butterfly.animations, {
                                position: new THREE.Vector3(this.mesh.position.x + placeMag * Math.sin(this.direction) + Math.random() * 5 - 2.5, 0, this.mesh.position.z + placeMag * Math.cos(this.direction) + Math.random() * 5 - 2.5),
                                scene: this.scene,
                                tileMap: this.tileMap,
                                heightMap: this.heightMap,
                                sourceMap: this.sourceMap,
                                entities: this.entities,
                                playerController: this.playerController,
                                projectileMesh: this.models.stinger.scene.children[0],
                                camera: this.camera,
                                direction: this.direction
                            });
                            this.entities.push(summonee);
                            this.scene.add(summonee.mesh);
                        }
                    }
                }
                this.state.memory.summoned = true;
            }
            if (this.state.memory.time >= 40 / 24) {
                this.state = {
                    type: "attack",
                    memory: {
                        target: this.state.memory.target
                    }
                };
            }
        }
        if (this.state.type === "punch") {
            if (this.currAnim !== "punch") {
                this.switchAnim("punch");
            }
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            this.direction += angleDifference(this.direction, angleToTarget) / 10;
            this.state.memory.time += delta;
            const distanceToTarget = Math.hypot(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            if (this.state.memory.time >= 30 / 24) {
                if (distanceToTarget < 20) {
                    this.memory.flyCounter += Math.floor(Math.random() * 3);
                    this.memory.summonCounter += Math.floor(Math.random() * 2);
                    this.state.memory.time = 0;
                    this.state.memory.attacked = false;
                } else {
                    this.state = {
                        type: "attack",
                        memory: {
                            target: this.state.memory.target
                        }
                    };
                }
            }
            if (this.state.memory.time >= 15 / 24 && !this.state.memory.attacked) {
                if (distanceToTarget < 20) {
                    this.state.memory.attacked = true;
                    const toTarget = this.state.memory.target.position.clone().sub(this.mesh.position).normalize().multiplyScalar(1.25);
                    toTarget.y = 0.3 + 0.3 * Math.random();
                    const distanceScale = Math.max(1.0 - this.box.distanceToPoint(this.state.memory.target.position) / 20, 0);
                    toTarget.multiplyScalar(distanceScale);
                    if (this.state.memory.target === this.playerController.controls.getObject()) {
                        if (this.playerController.weaponState !== "block") {
                            this.state.memory.target.velocity.add(toTarget);
                            this.playerController.onGround = false;
                        }
                        this.playerController.takeDamage((15 + 15 * Math.random()) * distanceScale);
                    } else {
                        this.state.memory.target.takeDamage(15 + 15 * Math.random(), toTarget);
                    }
                }
            }
        }
        if (this.state.type === "block") {
            if (this.currAnim !== "block") {
                this.switchAnim("block");
            }
            this.state.memory.time += delta;
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            this.direction += angleDifference(this.direction, angleToTarget) / 10;
            if (this.state.memory.time >= 30 / 24) {
                this.memory.damageCounter /= 2;
                if (this.memory.damageCounter < 35 || this.mesh.position.distanceTo(this.playerController.getPosition()) > 30) {
                    this.state = {
                        type: "attack",
                        memory: {
                            target: this.state.memory.target
                        }
                    };
                } else {
                    this.memory.flyCounter += Math.floor(Math.random() * 3);
                    this.memory.summonCounter += Math.floor(Math.random() * 2);
                }
            }
        }
        const partsToRemove = [];
        this.deadParts.forEach((part, i) => {
            i = this.deadParts.indexOf(part);
            part.position.x += this.deadVelocities[i][0].x;
            part.position.y += this.deadVelocities[i][0].y;
            part.position.z += this.deadVelocities[i][0].z;
            this.deadVelocities[i][0].y -= 0.01;
            if (part.position.y <= 0) {
                part.position.y = 0;
                this.deadVelocities[i][0].x *= 0.9;
                this.deadVelocities[i][0].z *= 0.9;
                this.deadVelocities[i][0].y = 0;
                this.deadVelocities[i][1].x *= 0.9;
                this.deadVelocities[i][1].y *= 0.9;
                this.deadVelocities[i][1].z *= 0.9;
            }
            if (!part.deathTimer) {
                part.deathTimer = 0;
            }
            part.deathTimer += delta;
            if (part.deathTimer > 2) {
                if (!this.winded && this.dying) {
                    this.winded = true;
                    sfx.wind.playbackRate = 0.75 + 0.5 * Math.random();
                    sfx.wind.detune = 100 * (Math.random() * 6 - 3);
                    sfx.wind.setVolume(1.5 + 1.5 * Math.random());
                    sfx.wind.isPlaying = false;
                    sfx.wind.play();
                }
                part.scale.multiplyScalar(0.975);
                const worldPos = part.getWorldPosition(new THREE.Vector3());
                if (Math.random() < 0.25) {
                    for (let i = 0; i < 1; i++) {
                        const smokeDir = new THREE.Vector3(0, Math.random() * 0.75, 0).normalize();
                        const saturation = 0.875 + Math.random() * 0.25;
                        this.smokeEmitter.emit({
                            position: new THREE.Vector3(5 * (Math.random() - 0.5), 0, 5 * (Math.random() - 0.5)).add(worldPos),
                            rotation: new THREE.Vector3(0.0, 0.0, Math.random() * Math.PI * 2),
                            scale: new THREE.Vector3(10.0, 10.0, 10.0),
                            speed: 1,
                            size: 1 * part.scale.x,
                            color: new THREE.Vector3(saturation * Math.random(), saturation * Math.random(), saturation * Math.random()).multiplyScalar(0.5),
                            //colorDecay: 0.9,
                            velocityDecay: 0.98,
                            velocity: {
                                position: smokeDir.add(new THREE.Vector3(0.1 - 0.2 * Math.random(), 0.2 + 0.1 * Math.random(), 0.1 - 0.2 * Math.random())).multiplyScalar(1),
                                rotation: new THREE.Vector3(0.0, 0.0, 0.0),
                                scale: new THREE.Vector3(0.0, 0.0, 0.0),
                                speed: 0,
                                size: -0.004 + -0.004 * Math.random()
                            },
                            billboard: true
                        });
                    }
                }
            }
            if (part.scale.x < 0.001) {
                this.scene.remove(part);
                partsToRemove.push(part);
            }
            part.rotation.x += this.deadVelocities[i][1].x;
            part.rotation.y += this.deadVelocities[i][1].y;
            part.rotation.z += this.deadVelocities[i][1].z;
            const partTile = new THREE.Vector2(Math.floor(part.position.x / 5) + 50, Math.floor(part.position.z / 5) + 50);
            if (this.tileMap[partTile.x * 100 + partTile.y] !== 1) {
                const tileIdx = partTile.x * 100 + partTile.y;
                if (this.tileMap[tileIdx - 1] === 2 && this.tileMap[tileIdx + 1] === 2) {
                    this.deadVelocities[i][0].x *= -0.5;
                    part.position.x += this.deadVelocities[i][0].x;
                } else if (this.tileMap[tileIdx - 100] === 2 && this.tileMap[tileIdx + 100] === 2) {
                    this.deadVelocities[i][0].z *= -0.5;
                    part.position.z += this.deadVelocities[i][0].z;
                } else {
                    this.deadVelocities[i][0].x *= -0.5;
                    this.deadVelocities[i][0].z *= -0.5;
                    part.position.x += this.deadVelocities[i][0].x;
                    part.position.z += this.deadVelocities[i][0].z;
                }
            }
        });
        partsToRemove.forEach(part => {
            const i = this.deadParts.indexOf(part);
            this.deadParts.splice(i, 1);
            this.deadVelocities.splice(i, 1);
        });
        if (this.dying && this.deadParts.length === 0) {
            if (!this.hadVictory) {
                this.hadVictory = true;
                (async() => {
                    await TextManager.displayMessage("Victory");
                    await TextManager.displayMessage("Credits");
                })();
            }
        }
        if (!this.dying) {
            if (this.mesh.position.distanceTo(this.playerController.getPosition()) < 100 && (this.state.type === "idle")) {
                this.state = {
                    type: "attack",
                    memory: {
                        target: this.playerController.controls.getObject()
                    }
                }
            }
            this.memory.damageCounter *= 0.99;
            if (this.memory.damageCounter > 35 && this.mesh.position.distanceTo(this.playerController.getPosition()) < 30 && (this.state.type !== "fly" && this.state.type !== "summon")) {
                this.memory.flyCounter += Math.floor(Math.random() * 3);
                this.memory.summonCounter += Math.floor(Math.random() * 2);
                this.state = {
                    type: "block",
                    memory: {
                        time: 0,
                        target: this.playerController.controls.getObject()
                    }
                }
            }
        }
    }
    updateBox() {
        this.box.setFromPoints([
            new THREE.Vector3(this.mesh.position.x + 6 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 6 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 6 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 6 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 7 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 7 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 7 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 7 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 10, this.mesh.position.z),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y - 10, this.mesh.position.z),
        ]);
    }
    intersectWall() {
        const verticesToCheck = [
            new THREE.Vector3(this.mesh.position.x + 6 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 6 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 6 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 6 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 7 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 7 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 7 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 7 * Math.cos(this.direction + Math.PI / 2))
        ];
        let hit = false;
        let hitTile;
        verticesToCheck.forEach(vertex => {
            if (hit) {
                return;
            }
            const vPos = new THREE.Vector2(vertex.x, vertex.z);
            const tile = new THREE.Vector2(Math.floor(vPos.x / 5) + 50, Math.floor(vPos.y / 5) + 50);
            if (this.tileMap[tile.x * 100 + tile.y] !== 1) {
                hitTile = tile;
                hit = true;
            }
        });
        return [hit, hitTile];
    }
}
export default Queen;