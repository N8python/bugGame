import * as THREE from './three/build/three.module.js';
import Station from './Station.js';
class Lever {
    constructor(mesh, animations, {
        position,
        camera,
        entities,
        scene
    }) {
        this.mesh = mesh.clone();
        this.mesh.position.copy(position);
        this.mesh.scale.set(2.0, 2.0, 2.0);
        this.pushed = false;
        this.camera = camera;
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = [];
        animations.forEach(clip => {
            this.animations.push(this.mixer.clipAction(clip));
        });
        this.animations.forEach(anim => {
            anim.setLoop(THREE.LoopOnce);
            anim.clampWhenFinished = true;
            anim.enable = true;
        })
        this.scene = scene;
        this.box = new THREE.Box3();
        this.mesh.rotation.y = Math.random() * 2 * Math.PI;
        //const helper = new THREE.Box3Helper(this.box, 0xffff00);
        //this.scene.add(helper);
        this.updateBox();
        this.entities = entities;
    }
    update(delta, frustum) {
        this.mixer.update(delta);
    }
    push() {
        if (!this.pushed) {
            this.pushed = true;
            this.animations.forEach(anim => {
                anim.play().reset();
            });
            const station = this.entities.find(entity => entity instanceof Station);
            const buttonsAvailable = station.buttons.filter(button => !button.on);
            if (buttonsAvailable.length > 0) {
                const chosenButton = buttonsAvailable[Math.floor(Math.random() * buttonsAvailable.length)];
                chosenButton.on = true;
                chosenButton.material = station.greenMaterial;
                chosenButton.material.needsUpdate = true;
                chosenButton.needsUpdate = true;
            }
        }
    }
    updateBox() {
        this.box.setFromPoints([
            new THREE.Vector3(this.mesh.position.x + 4 * Math.sin(this.mesh.rotation.y), this.mesh.position.y, this.mesh.position.z + 4 * Math.cos(this.mesh.rotation.y)),
            new THREE.Vector3(this.mesh.position.x - 4 * Math.sin(this.mesh.rotation.y), this.mesh.position.y, this.mesh.position.z - 4 * Math.cos(this.mesh.rotation.y)),
            new THREE.Vector3(this.mesh.position.x + 1.5 * Math.sin(this.mesh.rotation.y + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 1.5 * Math.cos(this.mesh.rotation.y + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 1.5 * Math.sin(this.mesh.rotation.y + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 1.5 * Math.cos(this.mesh.rotation.y + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 6.0, this.mesh.position.z),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z),
        ]);
    }
}
export default Lever;