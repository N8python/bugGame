import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import * as SkeletonUtils from "https://cdn.skypack.dev/three@0.133.0/examples/jsm/utils/SkeletonUtils.js";

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}
class Ant {
    constructor(model, animations, {
        position,
        scene,
        direction = 0,
        tileMap,
        sourceMap,
        heightMap,
        entities,
        playerController
    }) {
        this.mesh = SkeletonUtils.clone(model);
        this.antennae = [];
        this.mesh.traverse(child => {
            if (child.name.startsWith("BezierCurve")) {
                this.antennae.push(child);
            }
        });
        this.legs = [];
        this.mesh.traverse(child => {
            if (child.isObject3D && !child.isBone && !child.isSkinnedMesh) {
                if (child.name.startsWith("Armature")) {
                    this.legs.push(child);
                }
            }
        });
        this.entities = entities;
        this.playerController = playerController;
        this.tileMap = tileMap;
        this.sourceMap = sourceMap;
        this.heightMap = heightMap;
        this.height = 3.25;
        this.direction = direction;
        this.pitch = 0;
        this.flinch = 0;
        this.targetFlinch = 0;
        this.scene = scene;
        this.mesh.position.copy(position);
        this.mesh.position.y = this.height;
        this.box = new THREE.Box3();
        //const helper = new THREE.Box3Helper(this.box, 0xffff00);
        //scene.add(helper);
        this.updateBox();
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = [];
        animations.forEach(clip => {
            this.animations.push(this.mixer.clipAction(clip));
        });
        this.walkAnimations = this.animations.filter(x => x._clip.name.startsWith("ArmatureAction"));
        this.idleAnimations = this.animations.filter(x => !x._clip.name.startsWith("ArmatureAction"));
        this.animations.forEach(animation => {
            animation.timeScale = 0;
            animation.play();
        });
        this.state = {
            type: "idle",
            memory: {
                swayTime: 2000 + 2000 * Math.random(),
                swayOffset: Math.random() * 1000,
                swayAmt: Math.random() * 0.06 + 0.06
            }
        };
        const maxHealth = 50 + 25 * Math.random();
        this.memory = {
            health: maxHealth,
            maxHealth: maxHealth
        }
        this.velocity = new THREE.Vector3();
        this.deadParts = [];
        this.deadVelocities = [];
    }
    idle() {
        this.animations.forEach(animation => {
            animation.timeScale = 0;
        });
        this.walkAnimations.forEach(animation => {
            animation.time = 0;
        })
        this.idleAnimations.forEach(animation => {
            animation.timeScale = 0.15;
        });
    }
    walk() {
        this.animations.forEach(animation => {
            animation.timeScale = 1;
        });
    }
    takeDamage(amt, velocity) {
        this.memory.health -= amt;
        if (this.memory.health < 0) {
            this.memory.health = 0;
            this.die(velocity);
        } else {
            this.velocity.add(velocity);
            this.velocity.y += 0.5 + Math.random() * 0.5;
        }
        this.targetFlinch = 0.2 + 0.2 * Math.random();
        const healthFactor = this.memory.health / this.memory.maxHealth;
        if ((healthFactor < 0.75 && this.legs.length === 6) ||
            (healthFactor < 0.5 && this.legs.length === 5) ||
            (healthFactor < 0.25 && this.legs.length === 4)) {
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
    }
    update(delta, frustum) {
        this.updateBox();
        this.health = Math.max(this.health, 0);
        this.antennae.forEach(antenna => {
            antenna.rotation.x = (Math.PI / 3) * (1 - this.memory.health / this.memory.maxHealth);
        })
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
        //this.mesh.rotation.y = this.direction;
        if (this.targetFlinch !== 0) {
            this.flinch += 0.05;
            if (Math.abs(this.targetFlinch - this.flinch) < 0.06 || this.flinch > this.targetFlinch) {
                this.flinch = this.targetFlinch;
                this.targetFlinch = 0;
            }
        } else {
            this.flinch *= 0.9;
        }
        this.mesh.lookAt(new THREE.Vector3(this.mesh.position.x + Math.sin(this.direction), this.mesh.position.y + this.pitch + this.flinch, this.mesh.position.z + Math.cos(this.direction)));
        if (this.state.type === "idle") {
            this.idle();
            this.mesh.rotation.y += this.state.memory.swayAmt * Math.sin(performance.now() / this.state.memory.swayTime + this.state.memory.swayOffset);
        } else if (this.state.type === "walk" || this.state.type === "attack") {
            this.walk();
        }
        if (this.state.type === "attack") {
            const distanceToTarget = Math.hypot(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            if (distanceToTarget > 15) {
                let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
                /*if (hit) {
                    if (hitTile) {
                        const angleToWall = Math.atan2(((hitTile.x - 50) * 5) - this.mesh.position.x, ((hitTile.y - 50) * 5) - this.mesh.position.z);
                        this.direction -= angleDifference(this.direction, angleToWall) / 30;
                    }
                }*/
                this.direction += angleDifference(this.direction, angleToTarget) / 10;
                const toTarget = new THREE.Vector3(Math.sin(this.direction), 0, Math.cos(this.direction));
                this.velocity.add(toTarget.multiplyScalar(0.01));
            } else {
                this.state = {
                    type: "bite",
                    memory: {
                        time: 0,
                        target: this.state.memory.target
                    }
                }
            }
        }
        if (this.state.type === "bite") {
            this.state.memory.time += delta * 4.0;
            const pitch = 0.5 * Math.abs(Math.sin(this.state.memory.time));
            if (this.state.memory.time > Math.PI) {
                /*this.mesh.rotation.x = 0;
                this.mesh.rotation.y = this.direction;
                this.mesh.rotation.z = 0;*/
                const toTarget = this.state.memory.target.position.clone().sub(this.mesh.position).normalize().multiplyScalar(0.5);
                toTarget.y = 0.3 + 0.3 * Math.random();
                const distanceScale = Math.max(1.0 - this.box.distanceToPoint(this.state.memory.target.position) / 15, 0);
                toTarget.multiplyScalar(distanceScale);
                if (this.state.memory.target === this.playerController.controls.getObject()) {
                    if (this.playerController.weaponState !== "block") {
                        this.state.memory.target.velocity.add(toTarget);
                        this.playerController.onGround = false;
                    }
                    this.playerController.takeDamage((3 + 3 * Math.random()) * distanceScale);
                } else {
                    this.state.memory.target.takeDamage(3 + 3 * Math.random(), toTarget);
                }
                this.state = {
                    type: "attack",
                    memory: {
                        target: this.state.memory.target
                    }
                }
            }
            let angleToTarget = Math.atan2(this.state.memory.target.position.x - this.mesh.position.x, this.state.memory.target.position.z - this.mesh.position.z);
            this.direction += angleDifference(this.direction, angleToTarget) / 10;
            this.pitch = pitch;
            //this.mesh.lookAt(new THREE.Vector3(this.mesh.position.x + Math.sin(this.direction), this.mesh.position.y + pitch, this.mesh.position.z + Math.cos(this.direction)));;
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
            if (part.deathTimer > 1) {
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
        })
        if (frustum.intersectsBox(this.box.clone().expandByScalar(1))) {
            this.mesh.visible = true;
            this.mixer.update(delta);
        } else {
            this.mesh.visible = false;
        }
        if (this.mesh.position.distanceTo(this.playerController.getPosition()) < 75 && (this.state.type === "idle" || this.state.type === "walk")) {
            this.state = {
                type: "attack",
                memory: {
                    target: this.playerController.controls.getObject()
                }
            }
        }
    }
    intersectWall() {
        const verticesToCheck = [
            new THREE.Vector3(this.mesh.position.x + 8 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 8 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 8 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 8 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 5 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 5 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 5 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 5 * Math.cos(this.direction + Math.PI / 2))
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
    updateBox() {
        this.box.setFromPoints([
            new THREE.Vector3(this.mesh.position.x + 8 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z + 8 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x - 8 * Math.sin(this.direction), this.mesh.position.y, this.mesh.position.z - 8 * Math.cos(this.direction)),
            new THREE.Vector3(this.mesh.position.x + 5 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 5 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 5 * Math.sin(this.direction + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 5 * Math.cos(this.direction + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 3.75, this.mesh.position.z),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y - 3.75, this.mesh.position.z),
        ]);
    }
}
export default Ant;