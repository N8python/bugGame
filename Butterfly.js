import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import * as SkeletonUtils from "https://cdn.skypack.dev/three@0.133.0/examples/jsm/utils/SkeletonUtils.js";
import Projectile from "./Projectile.js";

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}
class Butterfly {
    constructor(model, animations, {
        position,
        scene,
        direction = 0,
        tileMap,
        sourceMap,
        heightMap,
        entities,
        projectileMesh,
        playerController
    }) {
        this.mesh = model.clone();
        this.mesh.scale.set(1.5, 1.5, 1.5);
        /*this.antennae = [];
        this.mesh.traverse(child => {
            if (child.name.startsWith("BezierCurve")) {
                this.antennae.push(child);
            }
        });*/
        this.legs = [];
        this.mesh.traverse(child => {
            if (child.isObject3D && !child.isBone && !child.isSkinnedMesh) {
                if (child.name.startsWith("BezierCurve")) {
                    this.legs.push(child);
                }
            }
        });
        this.entities = entities;
        this.playerController = playerController;
        this.tileMap = tileMap;
        this.sourceMap = sourceMap;
        this.heightMap = heightMap;
        this.projectileMesh = projectileMesh;
        this.flyHeight = 17.5;
        this.drop = 0;
        this.direction = direction;
        this.pitch = 0;
        this.flinch = 0;
        this.targetFlinch = 0;
        this.scene = scene;
        this.mesh.position.copy(position);
        this.mesh.position.y = this.flyHeight;
        this.box = new THREE.Box3();
        //const helper = new THREE.Box3Helper(this.box, 0xffff00);
        //scene.add(helper);
        this.updateBox();
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = [];
        animations.forEach(clip => {
            this.animations.push(this.mixer.clipAction(clip));
        });
        //this.walkAnimations = this.animations.filter(x => x._clip.name.startsWith("ArmatureAction"));
        //this.idleAnimations = this.animations.filter(x => !x._clip.name.startsWith("ArmatureAction"));
        const timing = Math.random();
        this.animations.forEach(animation => {
            animation.timeScale = 1;
            animation.time = timing;
            animation.play();
        });
        this.state = {
            type: "idle",
            memory: {
                swayTime: 2000 + 2000 * Math.random(),
                swayOffset: Math.random() * 100,
                swayAmt: Math.random() * 0.01 + 0.01
            }
        };
        const maxHealth = 20 + 20 * Math.random();
        this.memory = {
            health: maxHealth,
            maxHealth: maxHealth,
            cooldown: 0,
            flapTick: 0
        }
        this.velocity = new THREE.Vector3();
        this.deadParts = [];
        this.deadVelocities = [];
        this.lastProjectile = null;
    }
    takeDamage(amt, velocity) {
        this.memory.health -= amt;
        if (this.memory.health < 0) {
            this.memory.health = 0;
            this.die(velocity);
        } else {
            this.velocity.add(velocity);
            this.velocity.y += 0.5 + Math.random() * 0.5;
            const healthFactor = this.memory.health / this.memory.maxHealth;
            if ((healthFactor < 0.75 && this.legs.length > 6) ||
                (healthFactor < 0.5 && this.legs.length > 4) ||
                (healthFactor < 0.25 && this.legs.length > 2)) {
                for (let i = 0; i < Math.round(Math.random()) + 1; i++) {
                    const chosenLeg = this.legs[Math.floor(Math.random() * this.legs.length)];
                    this.legs.splice(this.legs.indexOf(chosenLeg), 1);
                    this.deadParts.push(chosenLeg);
                    this.scene.attach(chosenLeg);
                    this.deadVelocities.push([
                        new THREE.Vector3(0.5 * (Math.random() * 0.25 - 0.125 + velocity.x), 0.15 + Math.random() * 0.1 + velocity.y, 0.5 * (Math.random() * 0.25 - 0.125 + velocity.z)),
                        new THREE.Vector3(Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05)
                    ]);
                }
            }
        }
        if (!this.state.type === "dive") {
            this.targetFlinch = Math.PI / 4 * (0.75 + Math.random() * 0.5);
        }
    }
    die(startingVelocity) {
        if (!startingVelocity) {
            startingVelocity = new THREE.Vector3(0, 0, 0);
        }
        this.state.type = "dead";
        this.state.memory = {};
        this.animations.forEach(animation => {
            animation.timeScale = 0;
            animation.stop();
        });
        this.deathTimer = 0;
        this.dying = true;
        this.mesh.traverse(child => {
            if (child.isMesh || child.isObject3D) {
                if (child.isBone || child.isSkinnedMesh) {
                    return;
                }
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
    }
    update(delta, frustum) {
        this.updateBox();
        this.memory.cooldown -= 1;
        if (frustum.intersectsBox(this.box.clone().expandByScalar(1))) {
            this.mesh.visible = true;
            this.mixer.update(delta);
        } else {
            this.mesh.visible = false;
        }
        this.memory.flapTick += delta;
        if (this.memory.flapTick > 30 / 24) {
            this.memory.flapTick = 0;
            sfx.flap.setVolume(5.0 * Math.min(1 / (Math.min(...this.entities.filter(e => e instanceof Butterfly && !e.dying).map(butterfly => Math.hypot(butterfly.mesh.position.x - this.playerController.getPosition().x, butterfly.mesh.position.z - this.playerController.getPosition().z))) / 20), 1));
            sfx.flap.detune = 100 * (6 * Math.random() - 3);
            sfx.flap.playbackRate = 0.75 + 0.5 * Math.random();
            sfx.flap.isPlaying = false;
            sfx.flap.play();
        }
        //this.mesh.position.y = this.flyHeight;
        //this.direction = Math.atan2(this.playerController.getPosition().x - this.mesh.position.x, this.playerController.getPosition().z - this.mesh.position.z);
        this.pitch = -0.25 * Math.sin(performance.now() / 333);
        if (this.targetFlinch !== 0) {
            this.flinch += 0.05;
            if (Math.abs(this.targetFlinch - this.flinch) < 0.05) {
                this.flinch = this.targetFlinch;
                this.targetFlinch = 0;
            }
        } else {
            this.flinch *= 0.9;
        }
        this.mesh.lookAt(new THREE.Vector3(this.mesh.position.x + Math.sin(this.direction), this.mesh.position.y + Math.tan(this.pitch + this.flinch), this.mesh.position.z + Math.cos(this.direction)));
        this.updateDeadParts(delta);
        if (!this.dying) {
            this.mesh.position.x += this.velocity.x;
            this.mesh.position.y += this.velocity.y;
            this.mesh.position.z += this.velocity.z;
            /* if (this.mesh.position.y > this.flyHeight) {
                 this.velocity.y -= 0.065;
             } else {*/
            const minHeight = this.getMinimumHeight();
            const targetHeight = Math.max(15 + Math.sqrt(minHeight) - this.drop, 7.5);
            this.flyHeight = targetHeight + 2 * Math.sin(performance.now() / 333);
            this.mesh.position.y += (this.flyHeight - this.mesh.position.y) / 10;
            if (this.mesh.position.y > minHeight - 2) {
                this.mesh.position.y = minHeight - 2;
            }
            //const minHeight = this.getMinimumHeight();

            //}
            this.velocity.multiplyScalar(0.95);
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
                if (entity !== this && entity !== this.lastProjectile) {
                    if (entity.box.intersectsBox(this.box) && !entity.dying) {
                        const away = entity.box.getCenter(new THREE.Vector3()).sub(this.box.getCenter(new THREE.Vector3()));
                        this.velocity.add(away.multiplyScalar(-0.01));
                    }
                }
            })
        }
        if (this.state.type === "idle") {
            this.direction += this.state.memory.swayAmt * Math.sin(performance.now() / this.state.memory.swayTime + this.state.memory.swayOffset);
        }
        if (this.state.type === "attack") {
            const distanceToTarget = Math.hypot(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            this.direction += angleDifference(this.direction, angleToTarget) / 10;
            const toTarget = new THREE.Vector3(Math.sin(this.direction), 0, Math.cos(this.direction));
            this.velocity.add(toTarget.multiplyScalar(0.01));
            if (distanceToTarget < 40 && this.memory.cooldown < 1) {
                this.state = {
                    type: "dive",
                    memory: {
                        time: 0,
                        target: this.state.memory.target
                    }
                }
            }
        }
        if (this.state.type === "dive") {
            const distanceToTarget = Math.hypot(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            this.direction += angleDifference(this.direction, angleToTarget) / 10;
            this.state.memory.time += delta;
            if (this.state.memory.dived) {
                this.drop *= 0.9;
                this.flinch *= 0.9;
                if (this.drop < 0.01) {
                    this.drop = 0;
                    this.flinch = 0;
                    this.state = {
                        type: "attack",
                        memory: {
                            target: this.state.memory.target
                        }
                    }
                }
            } else {
                this.drop += 0.25;
                this.flinch = -Math.PI * 0.45 * Math.min(this.state.memory.time, 1);
                const toTarget = new THREE.Vector3(Math.sin(this.direction), 0, Math.cos(this.direction));
                this.velocity.add(toTarget.multiplyScalar(0.025));
                if (distanceToTarget < 15 && this.drop > 20) {
                    const toTarget = this.state.memory.target.position.clone().sub(this.mesh.position).normalize();
                    toTarget.y = 0.5 + 0.5 * Math.random();
                    const distanceScale = Math.max(1.0 - this.box.distanceToPoint(this.state.memory.target.position) / 15, 0);
                    toTarget.multiplyScalar(distanceScale);
                    if (this.state.memory.target === this.playerController.controls.getObject()) {
                        if (this.playerController.weaponState !== "block") {
                            this.state.memory.target.velocity.add(toTarget);
                            this.playerController.onGround = false;
                        }
                        this.playerController.takeDamage((10 + 10 * Math.random()) * distanceScale);
                    } else {
                        this.state.memory.target.takeDamage(10 + 10 * Math.random(), toTarget);
                    }
                    this.state.memory.dived = true;
                }
                if (distanceToTarget > 50) {
                    this.state.memory.dived = true;
                }
            }
            /*this.flinch = 1.25 * Math.sin(this.state.memory.time * 10) * (1 - Math.exp(-(((this.state.memory.time * 10) - 2 * Math.PI) ** 2)));
            this.state.memory.time += delta;
            if (this.state.memory.time * 10 >= 2 * Math.PI) {
                this.memory.cooldown = Math.round(30 + 30 * Math.random());
                this.flinch = 0;
                this.state = {
                    type: "attack",
                    memory: {
                        target: this.state.memory.target
                    }
                }
            }
            if (this.state.memory.time * 10 >= (Math.PI / 2) && !this.state.memory.shot) {
                const projectile = new Projectile(this.projectileMesh, this.state.memory.target.position, this.mesh.position.clone().add(this.mesh.getWorldDirection(new THREE.Vector3()).multiplyScalar(-5)), 1, {
                    scene: this.scene,
                    tileMap: this.tileMap,
                    sourceMap: this.sourceMap,
                    heightMap: this.heightMap,
                    entities: this.entities,
                    playerController: this.playerController,
                    sourceEntity: this,
                    damage: 3 + Math.random() * 3
                });
                this.lastProjectile = projectile;
                this.entities.push(projectile);
                this.state.memory.shot = true;
            }*/
            this.flyHeight -= 1;
        }
        if (this.mesh.position.distanceTo(this.playerController.getPosition()) < 75 && (this.state.type === "idle")) {
            this.state = {
                type: "attack",
                memory: {
                    target: this.playerController.controls.getObject()
                }
            }
        }
    }
    updateBox() {
        this.box.setFromPoints([
            new THREE.Vector3(this.mesh.position.x + 2 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 2 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 2 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 2 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 4 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 4 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 4 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 4 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 3 + Math.abs(this.pitch), this.mesh.position.z),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y - 3 - Math.abs(this.pitch), this.mesh.position.z),
        ]);
    }
    intersectWall() {
        const verticesToCheck = [
            new THREE.Vector3(this.mesh.position.x + 5 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 5 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 5 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 5 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 4 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 4 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 4 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 4 * Math.cos(this.direction + Math.PI / 2))
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
    getMinimumHeight() {
        const verticesToCheck = [
            new THREE.Vector3(this.mesh.position.x + 5 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 5 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 5 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 5 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 4 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 4 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 4 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 4 * Math.cos(this.direction + Math.PI / 2))
        ];
        let minHeight = Infinity;
        verticesToCheck.forEach(vertex => {
            const vPos = new THREE.Vector2(vertex.x, vertex.z);
            const tile = new THREE.Vector2(Math.floor(vPos.x / 5) + 50, Math.floor(vPos.y / 5) + 50);
            if (this.heightMap[tile.x * 100 + tile.y] < minHeight) {
                minHeight = this.heightMap[tile.x * 100 + tile.y];
            }
        });
        return minHeight;
    }
    updateDeadParts(delta) {
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
            if (part.deathTimer > 1.5) {
                part.scale.multiplyScalar(0.95);
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
    }
}
export default Butterfly;