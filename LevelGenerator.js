import * as THREE from 'https://cdn.skypack.dev/three@0.133.0';
import Delaunator from 'https://cdn.skypack.dev/delaunator@5.0.0';
import jsgraphs from './jsgraphs.js';

const LevelGenerator = {
    generateMaps() {
        let rooms = [];
        for (let i = 0; i < 25; i++) {
            const room = new THREE.Box2();
            room.setFromCenterAndSize(new THREE.Vector2(Math.random() * 100 - 50, Math.random() * 100 - 50), new THREE.Vector2(15 + 25 * (Math.random() ** 2), 15 + 25 * (Math.random() ** 2)));
            rooms.push(room);
        }
        while (true) {
            let total = 0;
            rooms.forEach(room => {
                const velocity = new THREE.Vector2();
                let added = 0;
                rooms.forEach(room2 => {
                    if (room.intersectsBox(room2)) {
                        const center = room.getCenter(new THREE.Vector2());
                        const center2 = room2.getCenter(new THREE.Vector2());
                        velocity.add(center2.sub(center));
                        added += 1;
                    }
                });
                total += added;
                velocity.multiplyScalar(1 / added);
                velocity.multiplyScalar(-1);
                const center = room.getCenter(new THREE.Vector2());
                center.add(velocity);
                room.setFromCenterAndSize(center, room.max.sub(room.min));
            });
            if (total === rooms.length) {
                break;
            }
        }
        rooms.sort((a, b) => {
            return b.getSize(new THREE.Vector2()).length() - a.getSize(new THREE.Vector2()).length();
        });
        //console.log(rooms.map(x => x.getSize(new THREE.Vector2()).length()));
        for (let i = 0; i < Math.floor(rooms.length * 0.33); i++) {
            rooms[i].main = true;
        }
        const coords = rooms.filter(room => room.main).map(x => [x.getCenter(new THREE.Vector2()).x, x.getCenter(new THREE.Vector2()).y]).flat();
        const coordLookup = rooms.filter(room => room.main).map(x => x.getCenter(new THREE.Vector2()));
        const delaunay = new Delaunator(coords);
        const graph = new jsgraphs.WeightedGraph(8);
        for (let i = 0; i < Math.floor(delaunay.triangles.length / 3); i++) {
            graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1], 0.0));
            graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2], 0.0));
            graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3 + 2], delaunay.triangles[i * 3], 0.0));
        }

        const vertices = Array.from(delaunay.triangles).map(v => coordLookup[v]);
        const triangles = [];
        for (let i = 0; i < vertices.length; i++) {
            if (triangles[Math.floor(i / 3)] === undefined) {
                triangles[Math.floor(i / 3)] = [];
            }
            triangles[Math.floor(i / 3)].push(vertices[i]);
        }
        const kruskal = new jsgraphs.KruskalMST(graph);
        var mst = kruskal.mst;
        let finalEdges = [];
        const mspv = [];
        for (var i = 0; i < mst.length; ++i) {
            var e = mst[i];
            var v = e.either();
            var w = e.other(v);
            finalEdges.push([coordLookup[v], coordLookup[w]]);
            mspv.push([v, w])
        }
        const otherEdges = [];
        for (let i = 0; i < Math.floor(delaunay.triangles.length / 3); i++) {
            otherEdges.push([delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1]]);
            otherEdges.push([delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2]]);
            otherEdges.push([delaunay.triangles[i * 3 + 2], delaunay.triangles[i * 3]]);
        }
        otherEdges.forEach(edge => {
            if (Math.random() < 0.15) {
                if (!mspv.some(([v, w]) => (v === edge[0] && w === edge[1]) || (v === edge[1] && w === edge[0]))) {
                    finalEdges.push([coordLookup[edge[0]], coordLookup[edge[1]]]);
                }
            }
        });
        finalEdges = finalEdges.map(line => {
            return [
                [new THREE.Vector2(line[0].x, line[0].y), new THREE.Vector2(line[1].x, line[0].y)],
                [new THREE.Vector2(line[1].x, line[0].y), new THREE.Vector2(line[1].x, line[1].y)]
            ]
        }).flat();
        rooms.forEach(room => {
            finalEdges.forEach(edge => {
                const lineBox = new THREE.Box2();
                // lineBox.min = new THREE.Vector2(edge[0].x, edge[0].y);
                // lineBox.max = new THREE.Vector2(edge[1].x, edge[1].y);
                lineBox.setFromPoints([new THREE.Vector2(edge[0].x, edge[0].y), new THREE.Vector2(edge[1].x, edge[1].y)]);
                lineBox.min.x -= 5;
                lineBox.min.y -= 5;
                lineBox.max.x += 5;
                lineBox.max.y += 5;
                if (room.intersectsBox(lineBox) && !room.main) {
                    room.side = true;
                }
            });
        });
        const lineBoxes = [];
        finalEdges.forEach(edge => {
            const lineBox = new THREE.Box2();
            lineBox.setFromPoints([new THREE.Vector2(edge[0].x, edge[0].y), new THREE.Vector2(edge[1].x, edge[1].y)]);
            const size = 4 + Math.floor(Math.random() * 3);
            lineBox.min.x -= size;
            lineBox.min.y -= size;
            lineBox.max.x += size;
            lineBox.max.y += size;
            lineBoxes.push(lineBox);
        });
        rooms = rooms.filter(x => x.main || x.side);
        //const canvas = document.getElementById("canvas");
        //const ctx = canvas.getContext("2d");
        const tileMap = new Uint8Array(100 * 100);
        const sourceMap = new Uint8Array(100 * 100);;
        const heightMap = new Float32Array(100 * 100);
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const worldSpaceX = ((x / 100) * 700 - 700 / 2) / 3;
                const worldSpaceY = ((y / 100) * 700 - 700 / 2) / 3;
                const blockWidth = ((2 / 100) * 700 - 700 / 2) / 3 - ((1 / 100) * 700 - 700 / 2) / 3;
                const blockHeight = ((2 / 100) * 700 - 700 / 2) / 3 - ((1 / 100) * 700 - 700 / 2) / 3;
                const blockBox = new THREE.Box2();
                blockBox.setFromCenterAndSize(new THREE.Vector2(worldSpaceX + blockWidth / 2, worldSpaceY + blockHeight / 2), new THREE.Vector2(blockWidth, blockHeight));
                rooms.forEach(room => {
                    if (room.intersectsBox(blockBox)) {
                        tileMap[x * 100 + y] = 1;
                        if (room.main) {
                            sourceMap[x * 100 + y] = 1;
                        } else if (room.side) {
                            if (sourceMap[x * 100 + y] === 0 || sourceMap[x * 100 + y] > 2) {
                                sourceMap[x * 100 + y] = 2;
                            }
                        }
                    }
                });
                lineBoxes.forEach(lineBox => {
                    if (lineBox.intersectsBox(blockBox)) {
                        tileMap[x * 100 + y] = 1;
                        if (sourceMap[x * 100 + y] === 0 || sourceMap[x * 100 + y] > 3) {
                            sourceMap[x * 100 + y] = 3;
                        }
                    }
                })
            }
        }
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                if (tileMap[x * 100 + y] === 1) {
                    if (tileMap[x * 100 + y - 1] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 1] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y - 100] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 100] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y - 101] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 101] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y - 99] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 99] === 0) {
                        tileMap[x * 100 + y] = 2;
                    }
                    if (x === 0 || x === 99 || y === 0 || y === 99) {
                        tileMap[x * 100 + y] = 2;
                    }
                    if (sourceMap[x * 100 + y] === 1) {
                        heightMap[x * 100 + y] = 60;
                    }
                    if (sourceMap[x * 100 + y] === 2) {
                        heightMap[x * 100 + y] = 40;
                    }
                    if (sourceMap[x * 100 + y] === 3) {
                        heightMap[x * 100 + y] = 25;
                    }
                }
            }
        }
        return {
            tileMap,
            sourceMap,
            heightMap
        }
    },
    generateBossMaps() {
        let rooms = [
            new THREE.Box2().setFromCenterAndSize(new THREE.Vector2(0, 0), new THREE.Vector2(100, 100))
        ];
        /*for (let i = 0; i < 25; i++) {
            const room = new THREE.Box2();
            room.setFromCenterAndSize(new THREE.Vector2(Math.random() * 100 - 50, Math.random() * 100 - 50), new THREE.Vector2(15 + 25 * (Math.random() ** 2), 15 + 25 * (Math.random() ** 2)));
            rooms.push(room);
        }*/
        while (true) {
            let total = 0;
            rooms.forEach(room => {
                const velocity = new THREE.Vector2();
                let added = 0;
                rooms.forEach(room2 => {
                    if (room.intersectsBox(room2)) {
                        const center = room.getCenter(new THREE.Vector2());
                        const center2 = room2.getCenter(new THREE.Vector2());
                        velocity.add(center2.sub(center));
                        added += 1;
                    }
                });
                total += added;
                velocity.multiplyScalar(1 / added);
                velocity.multiplyScalar(-1);
                const center = room.getCenter(new THREE.Vector2());
                center.add(velocity);
                room.setFromCenterAndSize(center, room.max.sub(room.min));
            });
            if (total === rooms.length) {
                break;
            }
        }
        rooms.sort((a, b) => {
            return b.getSize(new THREE.Vector2()).length() - a.getSize(new THREE.Vector2()).length();
        });
        //console.log(rooms.map(x => x.getSize(new THREE.Vector2()).length()));
        for (let i = 0; i < Math.ceil(rooms.length * 0.33); i++) {
            rooms[i].main = true;
        }
        const coords = rooms.filter(room => room.main).map(x => [x.getCenter(new THREE.Vector2()).x, x.getCenter(new THREE.Vector2()).y]).flat();
        const coordLookup = rooms.filter(room => room.main).map(x => x.getCenter(new THREE.Vector2()));
        const delaunay = new Delaunator(coords);
        const graph = new jsgraphs.WeightedGraph(8);
        for (let i = 0; i < Math.floor(delaunay.triangles.length / 3); i++) {
            graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1], 0.0));
            graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2], 0.0));
            graph.addEdge(new jsgraphs.Edge(delaunay.triangles[i * 3 + 2], delaunay.triangles[i * 3], 0.0));
        }

        const vertices = Array.from(delaunay.triangles).map(v => coordLookup[v]);
        const triangles = [];
        for (let i = 0; i < vertices.length; i++) {
            if (triangles[Math.floor(i / 3)] === undefined) {
                triangles[Math.floor(i / 3)] = [];
            }
            triangles[Math.floor(i / 3)].push(vertices[i]);
        }
        const kruskal = new jsgraphs.KruskalMST(graph);
        var mst = kruskal.mst;
        let finalEdges = [];
        const mspv = [];
        for (var i = 0; i < mst.length; ++i) {
            var e = mst[i];
            var v = e.either();
            var w = e.other(v);
            finalEdges.push([coordLookup[v], coordLookup[w]]);
            mspv.push([v, w])
        }
        const otherEdges = [];
        for (let i = 0; i < Math.floor(delaunay.triangles.length / 3); i++) {
            otherEdges.push([delaunay.triangles[i * 3], delaunay.triangles[i * 3 + 1]]);
            otherEdges.push([delaunay.triangles[i * 3 + 1], delaunay.triangles[i * 3 + 2]]);
            otherEdges.push([delaunay.triangles[i * 3 + 2], delaunay.triangles[i * 3]]);
        }
        otherEdges.forEach(edge => {
            if (Math.random() < 0.15) {
                if (!mspv.some(([v, w]) => (v === edge[0] && w === edge[1]) || (v === edge[1] && w === edge[0]))) {
                    finalEdges.push([coordLookup[edge[0]], coordLookup[edge[1]]]);
                }
            }
        });
        finalEdges = finalEdges.map(line => {
            return [
                [new THREE.Vector2(line[0].x, line[0].y), new THREE.Vector2(line[1].x, line[0].y)],
                [new THREE.Vector2(line[1].x, line[0].y), new THREE.Vector2(line[1].x, line[1].y)]
            ]
        }).flat();
        rooms.forEach(room => {
            finalEdges.forEach(edge => {
                const lineBox = new THREE.Box2();
                // lineBox.min = new THREE.Vector2(edge[0].x, edge[0].y);
                // lineBox.max = new THREE.Vector2(edge[1].x, edge[1].y);
                lineBox.setFromPoints([new THREE.Vector2(edge[0].x, edge[0].y), new THREE.Vector2(edge[1].x, edge[1].y)]);
                lineBox.min.x -= 5;
                lineBox.min.y -= 5;
                lineBox.max.x += 5;
                lineBox.max.y += 5;
                if (room.intersectsBox(lineBox) && !room.main) {
                    room.side = true;
                }
            });
        });
        const lineBoxes = [];
        finalEdges.forEach(edge => {
            const lineBox = new THREE.Box2();
            lineBox.setFromPoints([new THREE.Vector2(edge[0].x, edge[0].y), new THREE.Vector2(edge[1].x, edge[1].y)]);
            const size = 4 + Math.floor(Math.random() * 3);
            lineBox.min.x -= size;
            lineBox.min.y -= size;
            lineBox.max.x += size;
            lineBox.max.y += size;
            lineBoxes.push(lineBox);
        });
        rooms = rooms.filter(x => x.main || x.side);
        //const canvas = document.getElementById("canvas");
        //const ctx = canvas.getContext("2d");
        const tileMap = new Uint8Array(100 * 100);
        const sourceMap = new Uint8Array(100 * 100);;
        const heightMap = new Float32Array(100 * 100);
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                const worldSpaceX = ((x / 100) * 700 - 700 / 2) / 3;
                const worldSpaceY = ((y / 100) * 700 - 700 / 2) / 3;
                const blockWidth = ((2 / 100) * 700 - 700 / 2) / 3 - ((1 / 100) * 700 - 700 / 2) / 3;
                const blockHeight = ((2 / 100) * 700 - 700 / 2) / 3 - ((1 / 100) * 700 - 700 / 2) / 3;
                const blockBox = new THREE.Box2();
                blockBox.setFromCenterAndSize(new THREE.Vector2(worldSpaceX + blockWidth / 2, worldSpaceY + blockHeight / 2), new THREE.Vector2(blockWidth, blockHeight));
                rooms.forEach(room => {
                    if (room.intersectsBox(blockBox)) {
                        tileMap[x * 100 + y] = 1;
                        if (room.main) {
                            sourceMap[x * 100 + y] = 1;
                        } else if (room.side) {
                            if (sourceMap[x * 100 + y] === 0 || sourceMap[x * 100 + y] > 2) {
                                sourceMap[x * 100 + y] = 2;
                            }
                        }
                    }
                });
                lineBoxes.forEach(lineBox => {
                    if (lineBox.intersectsBox(blockBox)) {
                        tileMap[x * 100 + y] = 1;
                        if (sourceMap[x * 100 + y] === 0 || sourceMap[x * 100 + y] > 3) {
                            sourceMap[x * 100 + y] = 3;
                        }
                    }
                })
            }
        }
        for (let x = 0; x < 100; x++) {
            for (let y = 0; y < 100; y++) {
                if (tileMap[x * 100 + y] === 1) {
                    if (tileMap[x * 100 + y - 1] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 1] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y - 100] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 100] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y - 101] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 101] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y - 99] === 0) {
                        tileMap[x * 100 + y] = 2;
                    } else if (tileMap[x * 100 + y + 99] === 0) {
                        tileMap[x * 100 + y] = 2;
                    }
                    if (x === 0 || x === 99 || y === 0 || y === 99) {
                        tileMap[x * 100 + y] = 2;
                    }
                    if (sourceMap[x * 100 + y] === 1) {
                        heightMap[x * 100 + y] = 60;
                    }
                    if (sourceMap[x * 100 + y] === 2) {
                        heightMap[x * 100 + y] = 40;
                    }
                    if (sourceMap[x * 100 + y] === 3) {
                        heightMap[x * 100 + y] = 25;
                    }
                }
            }
        }
        return {
            tileMap,
            sourceMap,
            heightMap
        }
    },
    constructLevelGeometry({
        tileMap,
        sourceMap,
        heightMap
    }) {
        const levelGeometry = new THREE.BufferGeometry();
        const levelIndices = [];
        const levelVertices = [];
        const levelNormals = [];
        const levelUvs = [];
        for (let x = -50; x < 50; x++) {
            for (let z = -50; z < 50; z++) {
                if (tileMap[(x + 50) * 100 + (z + 50)] > 0) {
                    //const roadPart = cityData.roadMap[(x + 50) * 100 + (z + 50)];
                    //const xStart = 0.25 * Math.floor(roadPart / 4);
                    //const yStart = 0.75 - 0.25 * (roadPart % 4);
                    let uvs = [
                        [0, 0],
                        [0, 0],
                        [0, 0],
                        [0, 0]
                    ];
                    if (sourceMap[(x + 50) * 100 + (z + 50)] === 1) {
                        uvs = [
                            [0 + 0.5, 0],
                            [0.49 + 0.5, 0],
                            [0.49 + 0.5, 0.49],
                            [0 + 0.5, 0.49]
                        ];
                    }
                    if (sourceMap[(x + 50) * 100 + (z + 50)] === 2) {
                        uvs = [
                            [0, 0],
                            [0.49, 0],
                            [0.49, 0.49],
                            [0, 0.49]
                        ];
                    }
                    if (sourceMap[(x + 50) * 100 + (z + 50)] === 3) {
                        uvs = [
                            [0, 0.5],
                            [0.49, 0.5],
                            [0.49, 0.49 + 0.5],
                            [0, 0.49 + 0.5]
                        ];
                    }
                    const height = heightMap[(x + 50) * 100 + (z + 50)]

                    levelVertices.push([x * 5, 0, z * 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[0]);
                    levelVertices.push([x * 5 + 5, 0, z * 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[1]);
                    levelVertices.push([x * 5 + 5, 0, z * 5 + 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[2]);
                    levelVertices.push([x * 5, 0, z * 5 + 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[3]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    levelVertices.push([x * 5, height, z * 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[0]);
                    levelVertices.push([x * 5 + 5, height, z * 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[1]);
                    levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[2]);
                    levelVertices.push([x * 5, height, z * 5 + 5]);
                    levelNormals.push([0, 1, 0])
                    levelUvs.push(uvs[3]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                    levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    if (tileMap[(x + 50) * 100 + (z + 50)] !== 2) {
                        if (heightMap[(x + 50 + 1) * 100 + (z + 50)] < height) {
                            levelVertices.push([x * 5 + 5, heightMap[(x + 50 + 1) * 100 + (z + 50)], z * 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([0.5, 0.5]);
                            levelVertices.push([x * 5 + 5, height, z * 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([1.0, 0.5]);
                            levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([1.0, 1.0]);
                            levelVertices.push([x * 5 + 5, heightMap[(x + 50 + 1) * 100 + (z + 50)], z * 5 + 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([0.5, 1.0]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        }
                        if (heightMap[(x + 50 - 1) * 100 + (z + 50)] < height) {
                            levelVertices.push([x * 5, heightMap[(x + 50 - 1) * 100 + (z + 50)], z * 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([0.5, 0.5]);
                            levelVertices.push([x * 5, height, z * 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([1.0, 0.5]);
                            levelVertices.push([x * 5, height, z * 5 + 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([1.0, 1.0]);
                            levelVertices.push([x * 5, heightMap[(x + 50 - 1) * 100 + (z + 50)], z * 5 + 5]);
                            levelNormals.push([1, 0, 0]);
                            levelUvs.push([0.5, 1.0]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        }
                        if (heightMap[(x + 50) * 100 + (z + 50 + 1)] < height) {
                            levelVertices.push([x * 5, heightMap[(x + 50) * 100 + (z + 50 + 1)], z * 5 + 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([0.5, 0.5]);
                            levelVertices.push([x * 5, height, z * 5 + 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([1.0, 0.5]);
                            levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([1.0, 1.0]);
                            levelVertices.push([x * 5 + 5, heightMap[(x + 50) * 100 + (z + 50 + 1)], z * 5 + 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([0.5, 1.0]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        }
                        if (heightMap[(x + 50) * 100 + (z + 50 - 1)] < height) {
                            levelVertices.push([x * 5, heightMap[(x + 50) * 100 + (z + 50 - 1)], z * 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([0.5, 0.5]);
                            levelVertices.push([x * 5, height, z * 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([1.0, 0.5]);
                            levelVertices.push([x * 5 + 5, height, z * 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([1.0, 1.0]);
                            levelVertices.push([x * 5 + 5, heightMap[(x + 50) * 100 + (z + 50 - 1)], z * 5]);
                            levelNormals.push([0, 0, 1]);
                            levelUvs.push([0.5, 1.0]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                            levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        }
                    }
                    if (tileMap[(x + 50) * 100 + (z + 50)] === 2) {
                        levelVertices.push([x * 5, height, z * 5]);
                        levelNormals.push([0, 1, 0]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5]);
                        levelNormals.push([0, 1, 0]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                        levelNormals.push([0, 1, 0]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5, height, z * 5 + 5]);
                        levelNormals.push([0, 1, 0]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        levelVertices.push([x * 5, 0, z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5, height, z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5, height, z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5, 0, z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        levelVertices.push([x * 5 + 5, 0, z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5 + 5, 0, z * 5 + 5]);
                        levelNormals.push([1, 0, 0]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        levelVertices.push([x * 5, 0, z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5, height, z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5 + 5, 0, z * 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                        levelVertices.push([x * 5, 0, z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 0.5]);
                        levelVertices.push([x * 5, height, z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 0.5]);
                        levelVertices.push([x * 5 + 5, height, z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([1.0, 1.0]);
                        levelVertices.push([x * 5 + 5, 0, z * 5 + 5]);
                        levelNormals.push([0, 0, 1]);
                        levelUvs.push([0.5, 1.0]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 1, levelVertices.length - 2]);
                        levelIndices.push([levelVertices.length - 4, levelVertices.length - 2, levelVertices.length - 3]);
                    }
                }
            }
        }

        levelGeometry.setIndex(levelIndices.flat());
        levelGeometry.setAttribute('position', new THREE.Float32BufferAttribute(levelVertices.flat(), 3));
        levelGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(levelNormals.flat(), 3));
        levelGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(levelUvs.flat(), 2));
        return levelGeometry;
    }
}
export {
    LevelGenerator
}