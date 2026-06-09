// ========== 暖通气流粒子系统 ==========
class AirflowManager {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.airflowGroup = new THREE.Group();
        this.airflowGroup.name = 'airflow';
        this.sm.scene.add(this.airflowGroup);
        this.particles = [];
        this.enabled = true;
        this.systems = {
            floorHeat: true,
            ac: true,
            freshAir: true,
        };
    }

    buildAll() {
        this.buildFloorHeatParticles();
        this.buildACParticles();
        this.buildFreshAirParticles();
    }

    createParticleSystem(config) {
        const { count, color, size, bounds, velocity, type } = config;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            this.resetParticle(i, positions, velocities, lifetimes, bounds, velocity);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color,
            size,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        this.airflowGroup.add(points);

        this.particles.push({
            points,
            positions,
            velocities,
            lifetimes,
            bounds,
            velocity,
            type,
            count,
            maxLife: 120,
        });
    }

    resetParticle(i, positions, velocities, lifetimes, bounds, velocity) {
        const i3 = i * 3;
        positions[i3] = bounds.x + Math.random() * bounds.w;
        positions[i3 + 1] = bounds.y;
        positions[i3 + 2] = bounds.z + Math.random() * bounds.d;
        velocities[i3] = (Math.random() - 0.5) * velocity.spread;
        velocities[i3 + 1] = velocity.y;
        velocities[i3 + 2] = (Math.random() - 0.5) * velocity.spread;
        lifetimes[i] = Math.random() * 120;
    }

    buildFloorHeatParticles() {
        ROOM_DATA.rooms.forEach(room => {
            if (room.id === 'living_balcony') return;
            this.createParticleSystem({
                count: 60,
                color: 0xff6b35,
                size: 0.08,
                bounds: {
                    x: room.cx - room.width / 2 + 0.2,
                    y: 0.05,
                    z: room.cz - room.depth / 2 + 0.2,
                    w: Math.max(room.width - 0.4, 0.3),
                    d: Math.max(room.depth - 0.4, 0.3),
                },
                velocity: { y: 0.015, spread: 0.005 },
                type: 'floorHeat',
            });
        });
    }

    buildACParticles() {
        const acPositions = [
            { x: 1.127, z: 0.469, room: 'living_room' },
            { x: -1.845, z: 1.619, room: 'bedroom_a' },
            { x: -1.845, z: -2.380, room: 'bedroom_b' },
        ];
        acPositions.forEach(pos => {
            this.createParticleSystem({
                count: 40,
                color: 0x4fc3f7,
                size: 0.06,
                bounds: {
                    x: pos.x - 0.4,
                    y: 2.6,
                    z: pos.z - 0.4,
                    w: 0.8,
                    d: 0.8,
                },
                velocity: { y: -0.02, spread: 0.01 },
                type: 'ac',
            });
        });
    }

    buildFreshAirParticles() {
        const freshAirPositions = [
            { x: 2.0, z: 0.469, dir: 1 },   // 客厅进风
            { x: 0.0, z: 0.469, dir: -1 },  // 客厅出风
            { x: -1.845, z: 2.5, dir: 1 },   // 卧室A进风
        ];
        freshAirPositions.forEach(pos => {
            this.createParticleSystem({
                count: 30,
                color: 0x66bb6a,
                size: 0.05,
                bounds: {
                    x: pos.x - 0.3,
                    y: 2.4,
                    z: pos.z - 0.3,
                    w: 0.6,
                    d: 0.6,
                },
                velocity: { y: -0.01 * pos.dir, spread: 0.008 },
                type: 'freshAir',
            });
        });
    }

    update() {
        this.particles.forEach(sys => {
            const { positions, velocities, lifetimes, bounds, count, maxLife } = sys;
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                lifetimes[i]++;

                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];

                positions[i3] += (Math.random() - 0.5) * 0.003;
                positions[i3 + 2] += (Math.random() - 0.5) * 0.003;

                if (lifetimes[i] > maxLife || positions[i3 + 1] < 0 || positions[i3 + 1] > 3.0) {
                    this.resetParticle(i, positions, velocities, lifetimes, bounds, sys.velocity);
                }
            }
            sys.points.geometry.attributes.position.needsUpdate = true;
        });
    }

    toggleSystem(type) {
        this.systems[type] = !this.systems[type];
        this.particles.forEach(sys => {
            if (sys.type === type) {
                sys.points.visible = this.systems[type] && this.enabled;
            }
        });
        return this.systems[type];
    }

    toggle() {
        this.enabled = !this.enabled;
        this.airflowGroup.visible = this.enabled;
        return this.enabled;
    }
}
