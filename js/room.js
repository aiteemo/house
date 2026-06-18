// ========== 房间建模（等距视角风格） ==========
class RoomBuilder {
    constructor(sceneManager) {
        this.sm = sceneManager;

        // 等距视角风格的材质
        this.wallMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4a6fa5,
            transparent: true,
            opacity: 0.35,
            roughness: 0.3,
            metalness: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a5c,
            roughness: 0.8,
            metalness: 0,
            transparent: true,
            opacity: 0.6,
        });

        this.edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x6b8fc7,
            transparent: true,
            opacity: 0.8,
        });

        // 门洞定义
        this.doors = [
            // 次卧门：右侧墙，靠近餐厅
            { room: 'bedroom_b', wall: 'right', pos: 0.6, width: 0.9 },
            // 厨房门：右侧墙，连接餐厅
            { room: 'kitchen', wall: 'right', pos: 0.5, width: 0.9, isSliding: true },
            // 主卧门：右侧墙，连接客厅
            { room: 'bedroom_a', wall: 'right', pos: 0.15, width: 0.9 },
            // 卫生间门：下方墙，连接餐厅
            { room: 'bathroom', wall: 'bottom', pos: 0.4, width: 0.8 },
            // 入户门：下方墙
            { room: 'entrance', wall: 'bottom', pos: 0.5, width: 1.0 },
        ];

        // 窗户定义
        this.windows = [
            // 次卧窗户：上方
            { room: 'bedroom_b', wall: 'top', pos: 0.5, width: 1.5 },
            // 主卧飘窗：左侧
            { room: 'bedroom_a', wall: 'left', pos: 0.7, width: 1.8 },
            // 客厅阳台门：下方
            { room: 'living_room', wall: 'bottom', pos: 0.5, width: 2.4, isBalcony: true },
            // 主卧阳台门：下方
            { room: 'bedroom_a_balcony', wall: 'bottom', pos: 0.5, width: 1.8, isBalcony: true },
        ];
    }

    buildAll() {
        const sceneOrigin = { x: 4400, y: 5000 };

        ROOM_DATA.rooms.forEach(room => {
            this.buildRoom(room, sceneOrigin);
        });
    }

    buildRoom(roomData, sceneOrigin) {
        const { id, color, name, polygon } = roomData;
        const h = ROOM_DATA.wallHeight;
        const wt = ROOM_DATA.wallThickness;

        // 转换坐标到场景坐标（居中）
        const points = polygon.map(p => ({
            x: (p.x - sceneOrigin.x) / 1000,
            z: (p.y - sceneOrigin.y) / 1000,
        }));

        const group = new THREE.Group();
        group.userData.roomId = id;

        // 计算房间中心
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cz = points.reduce((s, p) => s + p.z, 0) / points.length;

        // 绘制地板
        this.buildFloor(group, points, color, id);

        // 绘制墙体
        this.buildWalls(group, points, h, wt, id, roomData);

        this.sm.scene.add(group);
        this.sm.roomMeshes[id] = { group, data: roomData };
        this.sm.addLabel(id, name, cx, cz);
    }

    buildFloor(group, points, color, roomId) {
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].z);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].z);
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const material = this.floorMaterial.clone();
        material.color.set(color).multiplyScalar(0.4);

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.02;
        floor.receiveShadow = true;
        floor.userData.roomId = roomId;
        floor.userData.isFloor = true;
        group.add(floor);
    }

    buildWalls(group, points, h, wt, roomId, roomData) {
        const n = points.length;

        for (let i = 0; i < n; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % n];

            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const len = Math.sqrt(dx * dx + dz * dz);

            if (len < 0.01) continue;

            // 判断边的方向
            const isHorizontal = Math.abs(dz) < Math.abs(dx);
            const wallDir = isHorizontal ? 'horizontal' : 'vertical';

            // 确定是哪条边（top/bottom/left/right）
            let wallSide;
            if (isHorizontal) {
                wallSide = dz > 0 ? 'right' : 'left';
            } else {
                wallSide = dx > 0 ? 'bottom' : 'top';
            }

            // 检查是否有门或窗
            const door = this.doors.find(d => d.room === roomId && d.wall === wallSide);
            const win = this.windows.find(w => w.room === roomId && w.wall === wallSide);

            if (door) {
                this.buildWallWithDoor(group, p1, p2, h, wt, door, isHorizontal);
            } else if (win) {
                this.buildWallWithWindow(group, p1, p2, h, wt, win, isHorizontal);
            } else {
                this.buildSolidWall(group, p1, p2, h, wt, isHorizontal);
            }
        }
    }

    buildSolidWall(group, p1, p2, h, wt, isHorizontal) {
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);

        const mx = (p1.x + p2.x) / 2;
        const mz = (p1.z + p2.z) / 2;

        // 墙体
        const geo = isHorizontal
            ? new THREE.BoxGeometry(len, h, wt)
            : new THREE.BoxGeometry(wt, h, len);

        const wall = new THREE.Mesh(geo, this.wallMaterial.clone());
        wall.position.set(mx, h / 2, mz);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);

        // 边线
        this.addEdgeLine(group, p1, p2, h);
    }

    buildWallWithDoor(group, p1, p2, h, wt, door, isHorizontal) {
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);

        // 门的位置
        const doorCenter = door.pos * len;
        const doorHalf = door.width / 2;
        const doorH = ROOM_DATA.doorHeight;

        // 分割墙体：左段、门上方、右段
        const segments = [];

        if (isHorizontal) {
            const startX = Math.min(p1.x, p2.x);
            const doorStart = startX + doorCenter - doorHalf;
            const doorEnd = startX + doorCenter + doorHalf;

            // 左段墙
            if (doorStart - startX > 0.01) {
                segments.push({
                    x1: startX, z1: p1.z,
                    x2: doorStart, z2: p1.z,
                    fullHeight: true
                });
            }
            // 门上方墙
            segments.push({
                x1: doorStart, z1: p1.z,
                x2: doorEnd, z2: p1.z,
                fullHeight: false, height: h - doorH, yOffset: doorH
            });
            // 右段墙
            if (Math.max(p1.x, p2.x) - doorEnd > 0.01) {
                segments.push({
                    x1: doorEnd, z1: p1.z,
                    x2: Math.max(p1.x, p2.x), z2: p1.z,
                    fullHeight: true
                });
            }
        } else {
            const startZ = Math.min(p1.z, p2.z);
            const doorStart = startZ + doorCenter - doorHalf;
            const doorEnd = startZ + doorCenter + doorHalf;

            // 上段墙
            if (doorStart - startZ > 0.01) {
                segments.push({
                    x1: p1.x, z1: startZ,
                    x2: p1.x, z2: doorStart,
                    fullHeight: true
                });
            }
            // 门上方墙
            segments.push({
                x1: p1.x, z1: doorStart,
                x2: p1.x, z2: doorEnd,
                fullHeight: false, height: h - doorH, yOffset: doorH
            });
            // 下段墙
            if (Math.max(p1.z, p2.z) - doorEnd > 0.01) {
                segments.push({
                    x1: p1.x, z1: doorEnd,
                    x2: p1.x, z2: Math.max(p1.z, p2.z),
                    fullHeight: true
                });
            }
        }

        // 绘制各段墙体
        segments.forEach(seg => {
            const sdx = seg.x2 - seg.x1;
            const sdz = seg.z2 - seg.z1;
            const segLen = Math.sqrt(sdx * sdx + sdz * sdz);
            if (segLen < 0.01) return;

            const smx = (seg.x1 + seg.x2) / 2;
            const smz = (seg.z1 + seg.z2) / 2;
            const wallH = seg.fullHeight ? h : seg.height;
            const yOff = seg.fullHeight ? 0 : seg.yOffset;

            const geo = isHorizontal
                ? new THREE.BoxGeometry(segLen, wallH, wt)
                : new THREE.BoxGeometry(wt, wallH, segLen);

            const wall = new THREE.Mesh(geo, this.wallMaterial.clone());
            wall.position.set(smx, yOff + wallH / 2, smz);
            wall.castShadow = true;
            group.add(wall);
        });

        // 门框线
        this.addDoorFrame(group, p1, p2, door, isHorizontal);
    }

    buildWallWithWindow(group, p1, p2, h, wt, win, isHorizontal) {
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);

        const winCenter = win.pos * len;
        const winHalf = win.width / 2;
        const sillH = ROOM_DATA.windowSillHeight;
        const winH = ROOM_DATA.windowHeight;

        const segments = [];

        if (isHorizontal) {
            const startX = Math.min(p1.x, p2.x);
            const winStart = startX + winCenter - winHalf;
            const winEnd = startX + winCenter + winHalf;

            // 左段墙
            if (winStart - startX > 0.01) {
                segments.push({
                    x1: startX, z1: p1.z,
                    x2: winStart, z2: p1.z,
                    fullHeight: true
                });
            }
            // 窗户下方墙
            segments.push({
                x1: winStart, z1: p1.z,
                x2: winEnd, z2: p1.z,
                fullHeight: false, height: sillH, yOffset: 0
            });
            // 窗户上方墙
            segments.push({
                x1: winStart, z1: p1.z,
                x2: winEnd, z2: p1.z,
                fullHeight: false, height: h - sillH - winH, yOffset: sillH + winH
            });
            // 右段墙
            if (Math.max(p1.x, p2.x) - winEnd > 0.01) {
                segments.push({
                    x1: winEnd, z1: p1.z,
                    x2: Math.max(p1.x, p2.x), z2: p1.z,
                    fullHeight: true
                });
            }
        } else {
            const startZ = Math.min(p1.z, p2.z);
            const winStart = startZ + winCenter - winHalf;
            const winEnd = startZ + winCenter + winHalf;

            // 上段墙
            if (winStart - startZ > 0.01) {
                segments.push({
                    x1: p1.x, z1: startZ,
                    x2: p1.x, z2: winStart,
                    fullHeight: true
                });
            }
            // 窗户下方墙
            segments.push({
                x1: p1.x, z1: winStart,
                x2: p1.x, z2: winEnd,
                fullHeight: false, height: sillH, yOffset: 0
            });
            // 窗户上方墙
            segments.push({
                x1: p1.x, z1: winStart,
                x2: p1.x, z2: winEnd,
                fullHeight: false, height: h - sillH - winH, yOffset: sillH + winH
            });
            // 下段墙
            if (Math.max(p1.z, p2.z) - winEnd > 0.01) {
                segments.push({
                    x1: p1.x, z1: winEnd,
                    x2: p1.x, z2: Math.max(p1.z, p2.z),
                    fullHeight: true
                });
            }
        }

        // 绘制各段墙体
        segments.forEach(seg => {
            const sdx = seg.x2 - seg.x1;
            const sdz = seg.z2 - seg.z1;
            const segLen = Math.sqrt(sdx * sdx + sdz * sdz);
            if (segLen < 0.01) return;

            const smx = (seg.x1 + seg.x2) / 2;
            const smz = (seg.z1 + seg.z2) / 2;
            const wallH = seg.fullHeight ? h : seg.height;
            const yOff = seg.fullHeight ? 0 : seg.yOffset;

            const geo = isHorizontal
                ? new THREE.BoxGeometry(segLen, wallH, wt)
                : new THREE.BoxGeometry(wt, wallH, segLen);

            const wall = new THREE.Mesh(geo, this.wallMaterial.clone());
            wall.position.set(smx, yOff + wallH / 2, smz);
            wall.castShadow = true;
            group.add(wall);
        });

        // 窗户玻璃
        this.addWindowGlass(group, p1, p2, win, isHorizontal);
    }

    addEdgeLine(group, p1, p2, h) {
        const points = [
            new THREE.Vector3(p1.x, 0, p1.z),
            new THREE.Vector3(p1.x, h, p1.z),
            new THREE.Vector3(p2.x, h, p2.z),
            new THREE.Vector3(p2.x, 0, p2.z),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, this.edgeMaterial);
        group.add(line);
    }

    addDoorFrame(group, p1, p2, door, isHorizontal) {
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const doorH = ROOM_DATA.doorHeight;

        const doorCenter = door.pos * len;
        const doorHalf = door.width / 2;

        let doorP1, doorP2;
        if (isHorizontal) {
            const startX = Math.min(p1.x, p2.x);
            doorP1 = { x: startX + doorCenter - doorHalf, z: p1.z };
            doorP2 = { x: startX + doorCenter + doorHalf, z: p1.z };
        } else {
            const startZ = Math.min(p1.z, p2.z);
            doorP1 = { x: p1.x, z: startZ + doorCenter - doorHalf };
            doorP2 = { x: p1.x, z: startZ + doorCenter + doorHalf };
        }

        // 门框线
        const framePoints = [
            new THREE.Vector3(doorP1.x, 0, doorP1.z),
            new THREE.Vector3(doorP1.x, doorH, doorP1.z),
            new THREE.Vector3(doorP2.x, doorH, doorP2.z),
            new THREE.Vector3(doorP2.x, 0, doorP2.z),
        ];
        const frameGeo = new THREE.BufferGeometry().setFromPoints(framePoints);
        const frameMat = new THREE.LineBasicMaterial({ color: 0x8ab4f8, linewidth: 2 });
        const frame = new THREE.Line(frameGeo, frameMat);
        group.add(frame);
    }

    addWindowGlass(group, p1, p2, win, isHorizontal) {
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.sqrt(dx * dx + dz * dz);

        const winCenter = win.pos * len;
        const winHalf = win.width / 2;
        const sillH = ROOM_DATA.windowSillHeight;
        const winH = ROOM_DATA.windowHeight;

        let winP1, winP2;
        if (isHorizontal) {
            const startX = Math.min(p1.x, p2.x);
            winP1 = { x: startX + winCenter - winHalf, z: p1.z };
            winP2 = { x: startX + winCenter + winHalf, z: p1.z };
        } else {
            const startZ = Math.min(p1.z, p2.z);
            winP1 = { x: p1.x, z: startZ + winCenter - winHalf };
            winP2 = { x: p1.x, z: startZ + winCenter + winHalf };
        }

        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.2,
            side: THREE.DoubleSide,
        });

        if (isHorizontal) {
            const w = Math.abs(winP2.x - winP1.x);
            const geo = new THREE.PlaneGeometry(w, winH);
            const glass = new THREE.Mesh(geo, glassMat);
            glass.position.set(
                (winP1.x + winP2.x) / 2,
                sillH + winH / 2,
                winP1.z
            );
            group.add(glass);
        } else {
            const w = Math.abs(winP2.z - winP1.z);
            const geo = new THREE.PlaneGeometry(w, winH);
            const glass = new THREE.Mesh(geo, glassMat);
            glass.position.set(
                winP1.x,
                sillH + winH / 2,
                (winP1.z + winP2.z) / 2
            );
            glass.rotation.y = Math.PI / 2;
            group.add(glass);
        }
    }
}
