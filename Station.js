import * as THREE from './three/build/three.module.js';
import Ant from './Ant.js';
import Bee from './Bee.js';
import Beetle from "./Beetle.js";
import Butterfly from './Butterfly.js';
import Scorpion from './Scorpion.js';
class Station {
    constructor(mesh, animations, {
        position,
        camera,
        entities,
        resetFunction,
        scene
    }) {
        this.mesh = mesh.clone();
        this.mesh.position.copy(position);
        this.mesh.scale.set(1.75, 1.75, 1.75);
        this.mesh.rotation.y = Math.atan2(position.x - camera.position.x, position.z - camera.position.z);
        this.registers = [];
        this.buttons = [];
        this.finalButton = null;
        this.resetFunction = resetFunction;
        this.mesh.traverse(child => {
            if (child.isMesh && child.name.startsWith("Register")) {
                this.registers.push(child);
            }
            if (child.isMesh && child.name.startsWith("Button")) {
                this.buttons.push(child);
            }
            if (child.isMesh && child.name === "Final_Button") {
                this.finalButton = child;
            }
            if (child.isMesh && child.name === "Cube003") {
                this.greenMaterial = child.material;
            }
        });
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = [];
        animations.forEach(clip => {
            this.animations.push(this.mixer.clipAction(clip));
        });
        this.animations.forEach(anim => {
            anim.setLoop(THREE.LoopOnce);
            anim.clampWhenFinished = true;
            anim.enable = true;
        });
        this.pushed = false;
        this.scene = scene;
        this.box = new THREE.Box3();
        this.redMaterial = this.finalButton.material;
        this.buttons.forEach(button => {
                button.on = false;
            })
            //this.greenMaterial = 
            //const helper = new THREE.Box3Helper(this.box, 0xffff00);
            //this.scene.add(helper);
            //this.box.setFromCenterAndSize(this.mesh.position, new THREE.Vector3(10, 10, 5));
        this.updateBox();
        this.entities = entities;
        this.blockPlayer = true;
        this.pushed = false;
    }
    update(delta, frustum) {
        const eLength = this.entities.filter(x => (x instanceof Ant || x instanceof Bee || x instanceof Beetle || x instanceof Butterfly || x instanceof Scorpion) && !x.dying).length;
        const tens = Math.floor(eLength / 10);
        const ones = eLength % 10;
        if (!this.pushed) {
            this.setRegister(1, tens);
            this.setRegister(0, ones);
        }
        if (eLength === 0 && this.buttons.every(button => button.on)) {
            this.finalButton.material = this.greenMaterial;
        }
        if (this.pushed) {
            if (!this.pushedTimer) {
                this.pushedTimer = 0;
            }
            this.pushedTimer += delta;
        }
        if (this.pushedTimer > 1) {
            this.resetFunction();
        }
        this.mixer.update(delta);
    }
    push() {
        if (this.finalButton.material === this.greenMaterial) {
            if (!this.pushed) {
                this.pushed = true;
                this.animations.forEach(anim => {
                    anim.play().reset();
                });
            }
        }
    }
    setRegister(i, num) {
        if (num === 0) {
            this.registers[i].rotation.x = (Math.PI * 2 / 9.675) * (num + 1.2);
        } else {
            this.registers[i].rotation.x = (Math.PI * 2 / 9.675) * (num + 1);
        }
    }
    updateBox() {
        this.box.setFromPoints([
            new THREE.Vector3(this.mesh.position.x + 4 * Math.sin(this.mesh.rotation.y), this.mesh.position.y, this.mesh.position.z + 4 * Math.cos(this.mesh.rotation.y)),
            new THREE.Vector3(this.mesh.position.x - 4 * Math.sin(this.mesh.rotation.y), this.mesh.position.y, this.mesh.position.z - 4 * Math.cos(this.mesh.rotation.y)),
            new THREE.Vector3(this.mesh.position.x + 4 * Math.sin(this.mesh.rotation.y + Math.PI / 2), this.mesh.position.y, this.mesh.position.z + 4 * Math.cos(this.mesh.rotation.y + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x - 4 * Math.sin(this.mesh.rotation.y + Math.PI / 2), this.mesh.position.y, this.mesh.position.z - 4 * Math.cos(this.mesh.rotation.y + Math.PI / 2)),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 6.0, this.mesh.position.z),
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y - 6.0, this.mesh.position.z),
        ]);
    }
}
export default Station;