import * as THREE from './three/build/three.module.js';

const EnemyManager = {
    placeEnemies(amount, {
        tileMap,
        sourceMap,
        heightMap,
        entities,
        scene,
        create,
        avoid = [],
        isOpen
    }) {
        const possibleSpots = [];
        for (let x = -50; x < 50; x++) {
            for (let z = -50; z < 50; z++) {
                if (tileMap[(x + 50) * 100 + (z + 50)] === 1 && isOpen((x + 50) * 100 + (z + 50))) {
                    possibleSpots.push(new THREE.Vector2(x, z));
                }
            }
        }
        for (let i = 0; i < amount; i++) {
            const chosenSpot = possibleSpots[Math.floor(Math.random() * possibleSpots.length)];
            const enemy = create(chosenSpot);
            if (enemy.intersectWall) {
                const [hit] = enemy.intersectWall();
                if (hit) {
                    i--;
                    continue;
                }
            }
            let hasHit = false;
            entities.some(entity => {
                if (entity !== enemy) {
                    if (entity.box.intersectsBox(enemy.box)) {
                        hasHit = true;
                        return true;
                    }
                }
            });
            avoid.some(pos => {
                if (pos[0].distanceTo(enemy.mesh.position) < pos[1]) {
                    hasHit = true;
                    return true;
                }
            })
            if (hasHit) {
                i--;
                continue;
            }
            scene.add(enemy.mesh);
            entities.push(enemy);
        }
    }
}
export { EnemyManager };