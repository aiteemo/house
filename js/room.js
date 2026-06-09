// ========== 房间建模 ==========
class RoomBuilder {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2d3a,
            roughness: 0.8,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
        });
        this.floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e2030,
            roughness: 0.9,
            metalness: 0,
        });

        // 门洞定义：在共享墙上开门的位置（scene坐标m）
        // { axis: 'x'|'y', pos, range: [min, max], gapStart, gapEnd }
        this.doorGaps = [
            // 厨房↔卧室A：y=3265, x:0~2942, 开0.9m门
            { axis: 'y', pos: -2.127, range: [-4.165, -1.223], gapStart: -3.665, gapEnd: -2.765 },
            // 卧室A↔客厅：x=2942, y:3265~9330, 开0.9m门
            { axis: 'x', pos: -1.223, range: [-2.127, 3.938], gapStart: -0.623, gapEnd: 0.277 },
            // 玄关↔客厅：y=3005, x:5174~6160, 开0.9m门
            { axis: 'y', pos: -1.868, range: [1.009, 1.995], gapStart: 1.209, gapEnd: 1.909 },
        ];

        // 无墙共享边界：这些共享边界完全不画墙（开放通道）
        // { axis: 'x'|'y', pos, range: [min, max] }
        this.noWallEdges = [
            // 卧室A↔卧室A阳台：y=9330, x:0~2942，阳台开放
            { axis: 'y', pos: 3.938, range: [-4.165, -1.223] },
            // 客厅↔客厅阳台：y=9330, x:2942~8330，阳台开放
            { axis: 'y', pos: 3.938, range: [-1.223, 4.165] },
        ];
    }

    buildAll() {
        const roomPolygons = {};
        ROOM_DATA.rooms.forEach(room => {
            const points = room.polygon.map(p => jsonToScene(p.x, p.y));
            roomPolygons[room.id] = points;
        });

        ROOM_DATA.rooms.forEach(room => this.buildRoom(room, roomPolygons));
    }

    buildRoom(roomData, roomPolygons) {
        const { id, color, name } = roomData;
        const h = ROOM_DATA.wallHeight;
        const wt = ROOM_DATA.wallThickness;
        const points = roomPolygons[id];
        if (!points || points.length < 3) return;

        const group = new THREE.Group();
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cz = points.reduce((s, p) => s + p.z, 0) / points.length;
        group.position.set(cx, 0, cz);

        // 地板
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x - cx, points[0].z - cz);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x - cx, points[i].z - cz);
        }
        shape.closePath();
        const floorGeo = new THREE.ShapeGeometry(shape);
        const floorMat = this.floorMaterial.clone();
        floorMat.color.set(color).multiplyScalar(0.3);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        floor.receiveShadow = true;
        floor.userData.roomId = id;
        group.add(floor);

        // 墙体
        const walls = [];
        this.buildWalls(group, id, points, cx, cz, h, wt, roomPolygons, walls);

        this.sm.scene.add(group);
        this.sm.roomMeshes[id] = { group, floor, walls, data: roomData };
        this.sm.addLabel(id, name, cx, cz);
    }

    buildWalls(group, roomId, points, cx, cz, h, wt, roomPolygons, walls) {
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % n];
            this.processEdge(group, roomId, p1, p2, cx, cz, h, wt, roomPolygons, walls, []);
        }
    }

    // 处理一条边：找出共享部分，只画非共享部分；共享部分按规则画墙（含门洞）
    processEdge(group, roomId, p1, p2, cx, cz, h, wt, roomPolygons, walls, usedGaps) {
        const edgeAxis = Math.abs(p2.z - p1.z) < Math.abs(p2.x - p1.x) ? 'x' : 'z';
        const edgePos = edgeAxis === 'x' ? p1.z : p1.x;
        const edgeMin = edgeAxis === 'x' ? Math.min(p1.x, p2.x) : Math.min(p1.z, p2.z);
        const edgeMax = edgeAxis === 'x' ? Math.max(p1.x, p2.x) : Math.max(p1.z, p2.z);

        // 找出所有其他房间与这条边重叠的部分
        const overlaps = [];
        for (const [otherId, otherPoints] of Object.entries(roomPolygons)) {
            if (otherId === roomId) continue;
            const m = otherPoints.length;
            for (let j = 0; j < m; j++) {
                const q1 = otherPoints[j];
                const q2 = otherPoints[(j + 1) % m];
                const oAxis = Math.abs(q2.z - q1.z) < Math.abs(q2.x - q1.x) ? 'x' : 'z';
                if (oAxis !== edgeAxis) continue;
                const oPos = oAxis === 'x' ? q1.z : q1.x;
                if (Math.abs(oPos - edgePos) > 0.05) continue;
                const oMin = oAxis === 'x' ? Math.min(q1.x, q2.x) : Math.min(q1.z, q2.z);
                const oMax = oAxis === 'x' ? Math.max(q1.x, q2.x) : Math.max(q1.z, q2.z);
                const overlapMin = Math.max(edgeMin, oMin);
                const overlapMax = Math.min(edgeMax, oMax);
                if (overlapMax - overlapMin > 0.05) {
                    overlaps.push({ min: overlapMin, max: overlapMax });
                }
            }
        }

        if (overlaps.length === 0) {
            // 完全不共享 → 画整面墙
            this.addWallSegment(group, p1, p2, cx, cz, h, wt, walls, roomId);
            return;
        }

        // 合并重叠区间
        overlaps.sort((a, b) => a.min - b.min);
        const merged = [overlaps[0]];
        for (let i = 1; i < overlaps.length; i++) {
            const last = merged[merged.length - 1];
            if (overlaps[i].min <= last.max + 0.05) {
                last.max = Math.max(last.max, overlaps[i].max);
            } else {
                merged.push(overlaps[i]);
            }
        }

        // 画非共享部分（外边界）
        let cursor = edgeMin;
        for (const ov of merged) {
            if (ov.min > cursor + 0.01) {
                const segP1 = edgeAxis === 'x'
                    ? { x: cursor, z: edgePos }
                    : { x: edgePos, z: cursor };
                const segP2 = edgeAxis === 'x'
                    ? { x: ov.min, z: edgePos }
                    : { x: edgePos, z: ov.min };
                this.addWallSegment(group, segP1, segP2, cx, cz, h, wt, walls, roomId);
            }
            cursor = ov.max;
        }
        if (edgeMax > cursor + 0.01) {
            const segP1 = edgeAxis === 'x'
                ? { x: cursor, z: edgePos }
                : { x: edgePos, z: cursor };
            const segP2 = edgeAxis === 'x'
                ? { x: edgeMax, z: edgePos }
                : { x: edgePos, z: edgeMax };
            this.addWallSegment(group, segP1, segP2, cx, cz, h, wt, walls, roomId);
        }

        // 画共享部分的墙（含门洞，跳过无墙边界）
        for (const ov of merged) {
            if (this.isNoWallEdge(edgeAxis, edgePos, ov.min, ov.max)) continue;
            this.addSharedWallWithGaps(group, roomId, edgeAxis, edgePos, ov.min, ov.max, cx, cz, h, wt, walls);
        }
    }

    // 在共享墙上画墙，跳过门洞区域
    addSharedWallWithGaps(group, roomId, edgeAxis, edgePos, segMin, segMax, cx, cz, h, wt, walls) {
        // 找出这个共享段上的门洞
        const gaps = [];
        for (const dg of this.doorGaps) {
            if (dg.axis !== edgeAxis) continue;
            if (Math.abs(dg.pos - edgePos) > 0.1) continue; // scene坐标直接比较
            const gapMinScene = dg.gapStart;
            const gapMaxScene = dg.gapEnd;
            const overlapMin = Math.max(segMin, gapMinScene);
            const overlapMax = Math.min(segMax, gapMaxScene);
            if (overlapMax - overlapMin > 0.05) {
                gaps.push({ min: overlapMin, max: overlapMax });
            }
        }

        if (gaps.length === 0) {
            // 无门洞，画整段共享墙
            const p1 = edgeAxis === 'x'
                ? { x: segMin, z: edgePos }
                : { x: edgePos, z: segMin };
            const p2 = edgeAxis === 'x'
                ? { x: segMax, z: edgePos }
                : { x: edgePos, z: segMax };
            this.addWallSegment(group, p1, p2, cx, cz, h, wt, walls, roomId);
            return;
        }

        // 按门洞分割墙段
        gaps.sort((a, b) => a.min - b.min);
        let cursor = segMin;
        for (const gap of gaps) {
            if (gap.min > cursor + 0.01) {
                const p1 = edgeAxis === 'x'
                    ? { x: cursor, z: edgePos }
                    : { x: edgePos, z: cursor };
                const p2 = edgeAxis === 'x'
                    ? { x: gap.min, z: edgePos }
                    : { x: edgePos, z: gap.min };
                this.addWallSegment(group, p1, p2, cx, cz, h, wt, walls, roomId);
            }
            cursor = gap.max;
        }
        if (segMax > cursor + 0.01) {
            const p1 = edgeAxis === 'x'
                ? { x: cursor, z: edgePos }
                : { x: edgePos, z: cursor };
            const p2 = edgeAxis === 'x'
                ? { x: segMax, z: edgePos }
                : { x: edgePos, z: segMax };
            this.addWallSegment(group, p1, p2, cx, cz, h, wt, walls, roomId);
        }
    }

    // 检查共享边界是否在无墙列表中
    isNoWallEdge(edgeAxis, edgePos, segMin, segMax) {
        for (const nwe of this.noWallEdges) {
            if (nwe.axis !== edgeAxis) continue;
            if (Math.abs(nwe.pos - edgePos) > 0.1) continue;
            // 检查共享段是否完全落在无墙区间内（scene坐标直接比较）
            if (segMin >= nwe.range[0] - 0.1 && segMax <= nwe.range[1] + 0.1) {
                return true;
            }
        }
        return false;
    }

    addWallSegment(group, p1, p2, cx, cz, h, wt, walls, roomId) {
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) return;

        const mx = (p1.x + p2.x) / 2 - cx;
        const mz = (p1.z + p2.z) / 2 - cz;
        const isHorizontal = Math.abs(dz) < Math.abs(dx);

        const geo = isHorizontal
            ? new THREE.BoxGeometry(len, h, wt)
            : new THREE.BoxGeometry(wt, h, len);

        const mat = this.wallMaterial.clone();
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(mx, h / 2, mz);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData.roomId = roomId;
        group.add(wall);
        walls.push(wall);
    }
}
