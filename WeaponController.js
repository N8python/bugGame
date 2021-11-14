import * as THREE from './three/build/three.module.js';

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}
const easeInOut = x => x ** (2 / 5);
class WeaponController {
    constructor(weapon, {
        position,
        rotation,
        scale
    }) {
        weapon.scale.copy(scale);
        weapon.position.copy(position);
        weapon.rotation.x = rotation.x;
        weapon.rotation.y = rotation.y;
        weapon.rotation.z = rotation.z;
        this.weapon = weapon;
        this.defaultPosition = position;
        this.defaultRotation = rotation;
        this.targetWeaponRotations = [

        ];
        this.currWeaponRotation = { x: 0, y: 0, z: 0 };
        this.targetWeaponPositions = [

        ];
        this.currWeaponPosition = { x: 0, y: 0, z: 0 };
        this.lastUpdate = performance.now();
    }
    update(bob) {
        const delta = (performance.now() - this.lastUpdate) / 1000;
        this.lastUpdate = performance.now();
        const deltaRot = new THREE.Vector3();
        if (this.targetWeaponRotations.length > 0) {
            const target = this.targetWeaponRotations[0];
            target.progress += delta;
            const percent = easeInOut(target.progress / target.time);
            const rp = target.progress / target.time;
            deltaRot.x = angleDifference(this.currWeaponRotation.x, target.x) * percent;
            deltaRot.y = angleDifference(this.currWeaponRotation.y, target.y) * percent;
            deltaRot.z = angleDifference(this.currWeaponRotation.z, target.z) * percent;
            if (rp >= 1) {
                deltaRot.multiplyScalar(0);
                this.currWeaponRotation = this.targetWeaponRotations.shift();
            }
        }
        const weaponChange = new THREE.Vector3();
        if (this.targetWeaponPositions.length > 0) {
            const target = this.targetWeaponPositions[0];
            target.progress += delta;
            const percent = easeInOut(target.progress / target.time);
            const rp = target.progress / target.time;
            weaponChange.x = (target.x - this.currWeaponPosition.x) * percent;
            weaponChange.y = (target.y - this.currWeaponPosition.y) * percent;
            weaponChange.z = (target.z - this.currWeaponPosition.z) * percent;
            if (rp >= 1) {
                weaponChange.multiplyScalar(0);
                this.currWeaponPosition = this.targetWeaponPositions.shift();
            }
        }
        this.weapon.position.x = this.defaultPosition.x + this.currWeaponPosition.x + weaponChange.x;
        this.weapon.position.y = this.defaultPosition.y + this.currWeaponPosition.y + weaponChange.y + bob;
        this.weapon.position.z = this.defaultPosition.z + this.currWeaponPosition.z + weaponChange.z;
        this.weapon.rotation.x = this.defaultRotation.x + this.currWeaponRotation.x + deltaRot.x;
        this.weapon.rotation.y = this.defaultRotation.y + this.currWeaponRotation.y + deltaRot.y;
        this.weapon.rotation.z = this.defaultRotation.z + this.currWeaponRotation.z + deltaRot.z;
    }

    addTargetPosition(x, y, z, time, attack) {
        this.targetWeaponPositions.push({ x, y, z, time, attack, progress: 0 });
    }
    addTargetRotation(x, y, z, time, attack) {
        this.targetWeaponRotations.push({ x, y, z, time, attack, progress: 0 });
    }
    idle() {
        return this.targetWeaponPositions.length === 0 && this.targetWeaponRotations.length === 0;
    }
}
export default WeaponController;