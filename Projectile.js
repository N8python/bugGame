import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import Emitter from "./Emitter.js";
const texLoader = new THREE.TextureLoader();
const smokeTex = texLoader.load("assets/images/smoke.jpeg");
class Projectile {
    constructor(mesh, target, source, velocityMagnitude, {
        scene,
        tileMap,
        heightMap,
        sourceMap,
        entities,
        playerController,
        sourceEntity,
        emitter,
        damage,
        color,
        camera
    }) {
        this.mesh = mesh.clone();
        this.mesh.position.copy(source);
        if (color) {
            this.mesh.material = this.mesh.material.clone();
            this.mesh.material.color = color;
        }
        this.target = target;
        this.scene = scene;
        this.scene.add(this.mesh);
        this.mesh.lookAt(target);
        this.mesh.geometry.computeBoundingBox();
        this.box = new THREE.Box3();
        this.velocity = target.clone().sub(source.clone()).normalize().multiplyScalar(velocityMagnitude);
        this.tileMap = tileMap;
        this.heightMap = heightMap;
        this.sourceMap = sourceMap;
        this.entities = entities;
        this.size = this.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).length();
        this.velocityMagnitude = velocityMagnitude;
        this.damage = damage;
        this.playerController = playerController;
        this.sourceEntity = sourceEntity;
        this.lodged = false;
        this.lodgeTick = 0;
        this.destroyed = false;
        this.emitter = emitter;
        this.camera = camera;
    }
    update(delta, frustum) {
        this.box.copy(this.mesh.geometry.boundingBox).applyMatrix4(this.mesh.matrixWorld);
        this.mesh.position.add(this.velocity);
        //this.mesh.lookAt(this.target);
        if (!this.lodged && this.emitter) {
            this.velocity = this.velocity.multiplyScalar(0.9625).add(this.target.clone().sub(this.mesh.position.clone()).normalize().multiplyScalar(this.velocityMagnitude).multiplyScalar(0.0375));
            this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
            for (let i = 0; i < 1; i++) {
                const smokeDir = this.mesh.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1).add(new THREE.Vector3(Math.random() - 0.2, Math.random() - 0.2, Math.random() - 0.2).normalize());
                const saturation = 0.875 + Math.random() * 0.25;
                this.emitter.emit({
                    position: this.mesh.getWorldPosition(new THREE.Vector3()).add(this.mesh.getWorldDirection(new THREE.Vector3()).multiplyScalar(-2)),
                    rotation: new THREE.Vector3(0.0, 0.0, Math.random() * Math.PI * 2),
                    scale: new THREE.Vector3(10.0, 10.0, 10.0),
                    speed: 1,
                    size: 1,
                    color: new THREE.Vector3(saturation, saturation, saturation).multiplyScalar(0.5),
                    //colorDecay: 0.9,
                    velocityDecay: 0.95,
                    velocity: {
                        position: smokeDir.add(new THREE.Vector3(0.05 - 0.1 * Math.random(), 0.05 + 0.1 * Math.random(), 0.05 - 0.1 * Math.random())).multiplyScalar(0.5),
                        rotation: new THREE.Vector3(0.0, 0.0, 0.0),
                        scale: new THREE.Vector3(0.0, 0.0, 0.0),
                        speed: 0,
                        size: -0.04 + -0.04 * Math.random()
                    },
                    billboard: true
                });
            }
        }
        if (this.destroyed) {
            return;
        }
        const projTile = new THREE.Vector2(Math.floor(this.mesh.position.x / 5) + 50, Math.floor(this.mesh.position.z / 5) + 50);
        const tileIdx = projTile.x * 100 + projTile.y;
        const oldLodged = this.lodged;
        if (this.mesh.position.y >= this.heightMap[tileIdx] || this.mesh.position.y <= 0) {
            this.velocity.multiplyScalar(0);
            this.lodged = true;
            if (this.emitter) {
                this.destroy();
            }
        } else if (this.tileMap[tileIdx] !== 1) {
            this.velocity.multiplyScalar(0);
            this.lodged = true;
            if (this.emitter) {
                this.destroy();
            }
        }
        if (oldLodged !== this.lodged) {
            sfx.slashWood.setVolume(0.3 + 0.2 * Math.random());
            sfx.slashWood.detune = 100 * (Math.random() * 6 - 3);
            sfx.slashWood.playbackRate = 1 + 0.5 * Math.random();
            sfx.slashWood.play();
        }
        if (!this.lodged) {
            [this.playerController, ...this.entities].some(entity => {
                if (entity === this.sourceEntity) {
                    return;
                }
                if (entity === this) {
                    return;
                }
                if (entity instanceof Projectile) {
                    return;
                }
                let entityDist;
                if (entity.box) {
                    entityDist = entity.box.distanceToPoint(this.mesh.position);
                } else {
                    entityDist = entity.getPosition().distanceTo(this.mesh.position);
                }
                if (entityDist < this.size) {
                    this.destroy();
                    if (!entity.takeDamage) {
                        return true;
                    }
                    sfx.slashHit.setVolume(0.2 + 0.2 * Math.random());
                    sfx.slashHit.playbackRate = 1 + 0.5 * Math.random();
                    //sfx.swordHit.detune = 100 * (Math.random() * 6 - 3);
                    //sfx.slashHit.stop();
                    sfx.slashHit.play();
                    if (entity === this.playerController) {
                        if (this.playerController.weaponState !== "block") {
                            this.playerController.velocity.add(new THREE.Vector3(this.velocity.x, 0.3 + 0.3 * Math.random(), this.velocity.z));
                            this.playerController.onGround = false;
                        }
                        this.playerController.takeDamage(this.damage);
                    } else {
                        entity.takeDamage(this.damage, new THREE.Vector3(this.velocity.x, 0.1 + 0.1 * Math.random(), this.velocity.z));
                    }
                    return true;
                }
            });
        } else {
            this.lodgeTick++;
            if (this.lodgeTick > 240 && Math.random() < 0.01) {
                if (!frustum.intersectsBox(this.box)) {
                    this.destroy();
                }
            }
        }
    }
    destroy() {
        this.destroyed = true;
        this.mesh.geometry.dispose();
        this.scene.remove(this.mesh);
        this.entities.splice(this.entities.indexOf(this), 1);
        if (this.emitter) {
            sfx.explosion.playbackRate = 0.75 + 0.5 * Math.random();
            sfx.explosion.detune = 100 * (Math.random() * 6 - 3);
            sfx.explosion.setVolume(0.03 + 0.03 * Math.random());
            sfx.explosion.isPlaying = false;
            sfx.explosion.play();
            for (let i = 0; i < 100; i++) {
                const smokeDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                const saturation = 0.875 + Math.random() * 0.25;
                this.emitter.emit({
                    position: this.mesh.getWorldPosition(new THREE.Vector3()).add(this.mesh.getWorldDirection(new THREE.Vector3()).multiplyScalar(-2)),
                    rotation: new THREE.Vector3(0.0, 0.0, Math.random() * Math.PI * 2),
                    scale: new THREE.Vector3(10.0, 10.0, 10.0),
                    speed: 1,
                    size: 1,
                    color: new THREE.Vector3(saturation, saturation, saturation).multiplyScalar(0.5),
                    //colorDecay: 0.9,
                    velocityDecay: 0.95,
                    velocity: {
                        position: smokeDir.add(new THREE.Vector3(0.05 - 0.1 * Math.random(), 0.05 + 0.1 * Math.random(), 0.05 - 0.1 * Math.random())).multiplyScalar(0.5),
                        rotation: new THREE.Vector3(0.0, 0.0, 0.0),
                        scale: new THREE.Vector3(0.0, 0.0, 0.0),
                        speed: 0,
                        size: -0.02 + -0.02 * Math.random()
                    },
                    billboard: true
                });
            }
            const explosionCenter = this.mesh.getWorldPosition(new THREE.Vector3());
            const explosionRadius = 15;
            [this.playerController, ...this.entities].forEach(entity => {
                if (!entity.takeDamage) {
                    return;
                }
                if (entity === this) {
                    return;
                }
                let entityDist;
                let awayVector;
                if (entity === this.playerController) {
                    entityDist = entity.getPosition().distanceTo(explosionCenter);
                    awayVector = entity.getPosition().clone().sub(explosionCenter).normalize();
                } else {
                    entityDist = entity.mesh.position.distanceTo(explosionCenter);
                    awayVector = entity.mesh.position.clone().sub(explosionCenter).normalize();
                }
                let explosionFactor = 1 - entityDist / explosionRadius;
                if (entityDist < explosionRadius) {
                    if (entity === this.playerController) {
                        this.playerController.velocity.add(new THREE.Vector3(awayVector.x * 1.5, 0.75 + 0.75 * Math.random(), awayVector.z * 1.5).multiplyScalar(explosionFactor * 0.33));
                        this.playerController.onGround = false;
                        this.playerController.takeDamage((this.damage * 0.33) * explosionFactor);
                    } else {
                        entity.takeDamage((this.damage) * explosionFactor, new THREE.Vector3(awayVector.x * 1.5, 0.1 + 0.1 * Math.random(), awayVector.z * 1.5).multiplyScalar(explosionFactor * 0.33));
                    }
                }
            })
        }
    }
}
export default Projectile;