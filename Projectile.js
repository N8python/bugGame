import * as THREE from './three/build/three.module.js';
class Projectile {
    constructor(mesh, target, source, velocityMagnitude, {
        scene,
        tileMap,
        heightMap,
        sourceMap,
        entities,
        playerController,
        sourceEntity,
        damage
    }) {
        this.mesh = mesh.clone();
        this.mesh.position.copy(source);
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
        this.damage = damage;
        this.playerController = playerController;
        this.sourceEntity = sourceEntity;
        this.lodged = false;
        this.lodgeTick = 0;
        this.destroyed = false;
    }
    update(delta, frustum) {
        this.box.copy(this.mesh.geometry.boundingBox).applyMatrix4(this.mesh.matrixWorld);
        this.mesh.position.add(this.velocity);
        if (this.destroyed) {
            return;
        }
        const projTile = new THREE.Vector2(Math.floor(this.mesh.position.x / 5) + 50, Math.floor(this.mesh.position.z / 5) + 50);
        const tileIdx = projTile.x * 100 + projTile.y;
        if (this.mesh.position.y >= this.heightMap[tileIdx] || this.mesh.position.y <= 0) {
            this.velocity.multiplyScalar(0);
            this.lodged = true;
        } else if (this.tileMap[tileIdx] !== 1) {
            this.velocity.multiplyScalar(0);
            this.lodged = true;
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
                    if (entity === this.playerController) {
                        this.playerController.velocity.add(new THREE.Vector3(this.velocity.x, 0.3 + 0.3 * Math.random(), this.velocity.z));
                        this.playerController.onGround = false;
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
    }
}
export default Projectile;