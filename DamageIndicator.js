import SpriteText from "./SpriteText.js";
import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
class DamageIndicator {
    constructor({
        position,
        scene,
        damage,
        entities,
        xVel,
        zVel
    }) {
        const text = new SpriteText(damage.toString(), 10, `rgba(255, ${Math.max(255 - damage * 5, 0)}, 0, 1)`);
        this.mesh = text;
        this.mesh.position.copy(position);
        this.box = new THREE.Box3();
        this.scene = scene;
        this.mesh.scale.multiplyScalar(0.75);
        this.vel = 0;
        this.xVel = xVel;
        this.zVel = zVel;
        this.entities = entities;
    }
    update(delta, frustum) {
        this.mesh.position.y += 0.2 + this.vel;
        this.mesh.position.x += this.xVel;
        this.mesh.position.z += this.zVel;
        this.vel += 0.025;
        this.mesh.scale.multiplyScalar(0.9);
        this.xVel *= 0.95;
        this.yVel *= 0.95;
        if (this.mesh.scale.x < 0.01) {
            this.scene.remove(this.mesh);
            this.entities.splice(this.entities.indexOf(this), 1);
        }
    }
}
export default DamageIndicator;