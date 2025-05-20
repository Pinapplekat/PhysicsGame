try {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    // Resize canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Physics constants
    const TILE_SIZE = 32;

    const gravity = 0.5;
    const friction = 0.8;
    const moveSpeed = TILE_SIZE / 5;
    const jumpStrength = TILE_SIZE / 3;


    var scroll = {
        horizontal: 0,
        vertical: 0,
        horizontalAbs: 0,
        verticalAbs: 0
    }
    var scrollX = 0
    var scrollY = 0

    var blocks = {
        'sand': { type: 'sand', color: '#d49e15', rigid: false, image: './images/sand.png' },
        'dirt': { type: 'dirt', color: '#330c06', rigid: false, image: './images/dirt.png' },
        'stone': { type: 'stone', color: '#525252', rigid: true, image: './images/stone.png' },
        'grass': { type: 'grass', color: '#548a2d', rigid: true, image: './images/grass.png' },
        'wood': { type: 'wood', color: '#5c2d22', rigid: true, image: './images/wood.png' },
        // 'wood_log': { type: 'wood_log', color: '#5c2d22', rigid: true, collidable: false, image: './images/wood.png' },
        'coin': { type: 'coin', color: '#f7c340', rigid: false, image: './images/coin.png' },
        'gem': { type: 'gem', color: '#4df0ff', rigid: true, image: './images/gem.png' },
        'leaf': { type: 'leaf', color: '#548a2d', rigid: true, image: './images/leaf.png' },
        'snow': { type: 'snow', color: '#ffffff', rigid: true },
        'ice': { type: 'ice', color: 'lightblue', rigid: true },
        'sandstone': { type: 'sandstone', color: 'lightbrown', rigid: true },
    }

    const keys = {
        left: false,
        right: false,
        up: false,
        space: false,
        shift: false,
    };

    var objects = []; // Store interactable objects in an array

    let resetted = false

    // PhysicsObject class for player
    class PhysicsObject {
        constructor(x, y, width, height, color) {
            this.x = x - scroll.horizontal;
            this.y = y + scroll.vertical;
            this.width = width;
            this.height = height;
            this.color = color;

            this.velocityX = 0;
            this.velocityY = 0;
            this.accelerationY = gravity;

            this.jumpCount = 0;
            this.maxJumps = 1;

            this.score = 0;
            this.gems = 0;

            // Arm and leg movement constants
            this.armSwing = 0;
            this.legSwing = 0;
            this.legRotation = 0; // Initialize legRotation for the walking effect

            this.inventory = {};
            for (let block in blocks) {
                this.inventory[block] = 0
            }
            this.inventory['dirt'] = 10
            this.selectedBlock = "dirt";

        }

        handleInput() {
            let currentSpeed = keys.shift ? moveSpeed * 1.5 : moveSpeed;
            this.velocityX = 0;

            if (keys.right) this.velocityX = currentSpeed;
            if (keys.left) this.velocityX = -currentSpeed;

            if ((keys.up || keys.space) && this.jumpCount < this.maxJumps) {
                this.velocityY = -jumpStrength;
                this.jumpCount++;
                keys.up = false;
                keys.space = false;
            }
        }

        update() {
            // Apply gravity
            this.velocityY += this.accelerationY;

            this.x -= scroll.horizontal
            this.y += scroll.vertical

            let nextX = this.x + this.velocityX;
            let nextY = this.y + this.velocityY;
            let grounded = false;

            // --- SIDE COLLISION FIX ---
            let collidedX = false;

            for (let obj of objects) {
                if (obj.destroyed) continue;
                const drawX = obj.x - scrollX

                const verticalOverlap =
                    this.y + this.height > obj.y && this.y < obj.y + obj.height;

                // Moving right into object
                if (
                    this.velocityX > 0 &&
                    this.x + this.width <= drawX &&
                    nextX + this.width > drawX &&
                    verticalOverlap &&
                    obj.collisions
                ) {
                    this.x = drawX - this.width;
                    this.velocityX = 0;
                    collidedX = true;
                    break;
                }

                // Moving left into object
                if (
                    this.velocityX < 0 &&
                    this.x >= drawX + obj.width &&
                    nextX < drawX + obj.width &&
                    verticalOverlap &&
                    obj.collisions
                ) {
                    this.x = drawX + obj.width;
                    this.velocityX = 0;
                    collidedX = true;
                    break;
                }
            }

            // If not blocked, apply horizontal movement
            if (!collidedX) {
                this.x += this.velocityX;
            }

            // --- Y AXIS COLLISION ---
            for (let obj of objects) {
                if (obj.destroyed || !obj.collisions) continue;

                const isFalling = this.velocityY >= 0;
                const isAbove = this.y + this.height <= obj.y;

                const horizontalOverlap =
                    this.x + this.width > obj.x && this.x < obj.x + obj.width;
                const willLand =
                    this.y + this.height <= obj.y &&
                    nextY + this.height > obj.y;

                if (isFalling && isAbove && horizontalOverlap && willLand && obj.collisions) {
                    this.velocityY = 0;
                    this.jumpCount = 0;
                    grounded = true;
                    this.y = obj.y - this.height;
                    break;
                }
            }

            if (!grounded) {
                this.y += this.velocityY;

                if (this.y > canvas.height + 10) {
                    scroll = {
                        horizontal: 0,
                        vertical: 0,
                        horizontalAbs: 0,
                        verticalAbs: 0
                    }
                    this.y = 100
                    this.x = 100 - Math.round(scroll.horizontalAbs)
                    this.velocityY = 0;
                    this.jumpCount = 0;
                    // grounded = true;
                }
            }
            var screenLeftX = 0
            var screenRightX = canvas.width - this.width
            // Keep player inside canvas horizontally
            if (player.x <= screenLeftX && player.velocityX < 0) {
                scrollX += player.velocityX; // Scroll the world right as player moves left
                player.x = screenLeftX;    // Keep player in place
            } else if (player.x >= screenRightX && player.velocityX > 0) {
                scrollX += player.velocityX; // Scroll the world left as player moves right
                player.x = screenRightX;
            }


            if (this.x + this.width < canvas.width - (TILE_SIZE * 2) && this.x > (TILE_SIZE * 2)) {
                scroll.horizontal = 0
            }

            // Animate limbs
            if (Math.abs(this.velocityX) > 0.5) {
                this.armSwing += 0.1;
                this.legRotation += 0.2;
            } else {
                this.armSwing = 0;
                this.legRotation = 0;
            }
        }

        draw() {
            // Draw the hitbox (main body)
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            if (this.velocityX > 0) {
                this.drawRightArm()
                this.drawRightLeg()
            }
            if (this.velocityX < 0) {
                this.drawLeftArm()
                this.drawLeftLeg()
            }

            // Draw the torso (main body)
            this.drawTorso();

            if (this.velocityX < 0) {
                this.drawRightArm()
                this.drawRightLeg()
            }
            if (this.velocityX > 0) {
                this.drawLeftArm()
                this.drawLeftLeg()
            }
            if (this.velocityX == 0) {
                this.drawLeftArm()
                this.drawLeftLeg()
                this.drawRightArm()
                this.drawRightLeg()
            }

            this.drawHead()
        }

        // Draw rotating legs with walking animation
        drawRightLeg() {
            ctx.save(); // Save the context for the right leg

            // Right leg - rotate around the other hip
            ctx.translate(this.x + this.width - this.width / 3, this.y + this.height - this.height / 3); // Move to the other hip
            ctx.rotate(Math.sin(this.legRotation + Math.PI) * 0.5); // Rotate in opposite direction for walking effect
            ctx.fillStyle = "yellow";
            ctx.fillRect(-5, 0, this.height / 6, this.height / 3); // Draw right leg
            ctx.restore(); // Restore the context
        }

        drawLeftLeg() {
            ctx.save(); // Save the current drawing context

            // Left leg - rotate around the hip
            ctx.translate(this.x + this.width / 3, this.y + this.height - this.height / 3); // Move to the hip position (adjusted)
            ctx.rotate(Math.sin(this.legRotation) * 0.5); // Rotate back and forth for walking effect
            ctx.fillStyle = "yellow";
            ctx.fillRect(-5, 0, this.height / 6, this.height / 3); // Draw left leg
            ctx.restore(); // Restore the drawing context
        }

        drawRightArm() {
            ctx.save()

            // Right arm
            ctx.translate(this.x + this.width, this.y + this.height / 3); // Move to the hip position (adjusted)
            ctx.rotate(Math.sin(this.legRotation) * 0.5);
            ctx.fillStyle = "yellow";
            ctx.fillRect(-5, 0, this.height / 6, this.height / 3);
            ctx.restore()
        }

        // Draw arms with swinging animation
        drawLeftArm() {
            ctx.save()

            // Left arm
            ctx.translate(this.x, this.y + this.height / 3); // Move to the hip position (adjusted)
            ctx.rotate(Math.sin(this.legRotation + Math.PI) * 0.5);
            ctx.fillStyle = "yellow";
            ctx.fillRect(-5, 0, this.height / 6, this.height / 3);
            ctx.restore()
        }

        // Draw torso (body) at a fixed position
        drawTorso() {
            ctx.fillStyle = "blue";
            ctx.fillRect(this.x + this.height / 9, this.y + this.height / 3, this.width - this.height / 6, this.height - this.height / 1.5); // Draw the torso at the correct position
        }
        drawHead() {
            ctx.fillStyle = "yellow";
            ctx.fillRect(this.x + this.height / 9, this.y + (this.height * 0.05), this.width - this.height / 6, this.width - this.height / 6); // Draw the head at the correct position
        }
    }

    var no_collisions = [
        'wood',
        'leaf',
        'coin',
        'gem'
    ]

    var blockImages = {}
    for (let block in blocks) {
        if (!block.image) continue
        var image = document.createElement('img')
        image.src = block.image
        blockImages[block.type] = image
    }

    var interactables = ['coin', 'gem']

    class InteractableObject {
        constructor(x, y, width, height, color, type, image, destroyed) {
            this.x = snapToGrid(x) - scroll.horizontal;
            this.y = snapToGrid(y) + scroll.vertical;
            this.width = width;
            this.height = height;
            this.color = color;
            this.type = type; // Could be 'coin', 'key', etc.
            // if (blocks[this.type].image) {
            //     image = blockImages[this.type]
            //     this.image = image
            // }
            this.collected = false;
            this.collisions = true

            if (no_collisions.includes(this.type)) this.collisions = false

            this.velocityX = 0;
            this.velocityY = 0;
            this.accelerationY = gravity;
            this.movable = (this.type === "object")
            this.rigid = false
            this.destroyed = false
            if (destroyed) this.destroyed = destroyed

            if (this.type) {
                this.color = blocks[this.type].color
                this.rigid = blocks[this.type].rigid
            }
        }

        returnData() {
            return { x: this.x, y: this.y, width: this.width, height: this.height, color: this.color, type: this.type, destroyed: this.destroyed }
        }

        // Check for collision with player
        checkCollision(player, drawX) {
            if (
                player.x+scrollX < drawX + this.width &&
                player.x+scrollX + player.width > drawX &&
                player.y < this.y + this.height &&
                player.y + player.height > this.y &&
                !this.destroyed
            ) {
                // Don't interact if the type is 'object' (just pushable)
                // if (this.type === "object") return;

                this.onInteract(player);
            }
        }

        onInteract(player) {
            if (!interactables.includes(this.type)) return
            this.destroyed = true
            if (this.type == 'coin') return player.score++
            if (this.type == 'gem') return player.gems++
        }


        destroy() {
            this.destroyed = true
        }

        update(player, allObjects = []) {
            // if (this.destroyed) return;
            const drawX = obj.x - scrollX
            if (drawX + this.width < 0 || drawX > canvas.width) return


            this.checkCollision(player, drawX)
            // this.x -= scroll.horizontal
            // this.y += scroll.vertical
            // Apply gravity
            if (!this.rigid) this.velocityY += this.accelerationY;

            // Predict new position
            const nextY = this.y + this.velocityY;
            let landed = false;

            // Check for stacking on other objects
            for (let other of allObjects) {
                if (other === this || other.destroyed) continue;

                const futureRect = {
                    x: this.x,
                    y: nextY,
                    width: this.width,
                    height: this.height
                };

                const otherRect = {
                    x: other.x,
                    y: other.y,
                    width: other.width,
                    height: other.height
                };

                // Only stop if we're falling onto the object
                if (
                    isColliding(futureRect, otherRect) &&
                    this.velocityY >= 0 && // falling
                    this.y + this.height <= other.y + 5// was above the object
                ) {
                    this.y = other.y - this.height;
                    // this.y = snapToGrid(this.y);
                    if (Math.abs(this.velocityY) < 0.05) this.velocityY = 0;

                    this.velocityY = 0;
                    // landed = true;

                    // ✅ Snap to grid to avoid float drift
                    // this.y = snapToGrid(this.y);
                    break;
                }

            }

            // Ground collision
            if (!landed && this.y + this.height + this.velocityY > canvas.height) {
                this.y = canvas.height - this.height;
                this.velocityY = 0;
                landed = true;
            }

            if (!landed) {
                this.y += this.velocityY;
            } else {
                // Snap after landing
                // this.y = snapToGrid(this.y);
            }


            // Horizontal push
            drawX += this.velocityX;
            this.velocityX *= 0.9;

            // Wall bounds
            // if (this.x < 0) {
            //     this.x = 0;
            //     this.velocityX = 0;
            // }
            // if (this.x + this.width > canvas.width) {
            //     this.x = canvas.width - this.width;
            //     this.velocityX = 0;
            // }

            // Allow pushing
            if (this.movable) {
                const pushingRight = player.x + player.width > this.x &&
                    player.x+scrollX < drawX &&
                    Math.abs(player.y - this.y) < this.height;

                const pushingLeft = player.x < this.x + this.width &&
                    player.x+scrollX + player.width > drawX + this.width &&
                    Math.abs(player.y - this.y) < this.height;

                if (pushingRight || pushingLeft) {
                    this.velocityX = player.velocityX;
                }
            }
        }

        draw() {
            const drawX = this.x - scrollX
            if (drawX + this.width < 0 || drawX > canvas.width) return
            if (!this.destroyed) {
                ctx.fillStyle = this.color;
                // if (!this.image) 
                ctx.fillRect(drawX, this.y, this.width, this.height);
                // else ctx.drawImage(this.image, this.x, this.y, this.width, this.height)
            }
        }
    }

    let animals = []

    class Sheep {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 80;   // <--- Add this
            this.height = 60;  // <--- Add this
            this.velocityY = 0;
            this.velocityX = 0;
            this.accelerationY = gravity;
            this.jumpCount = 0;
            this.health = 3
            this.killed = false

            this.legSwing = 0;
            this.legRotation = 0
            this.jumpCount = 0

            this.moving = {
                left: false,
                right: false,
                not: true,
                framecount: 0,
                prev: 'not'
            };
        }

        draw() {
            if (this.killed) return
            // ctx.fillStyle = 'gray';
            // ctx.fillRect(this.x, this.y, this.width, this.height);

            // this.drawText()
            this.drawLegs()
            this.drawTorso()
            this.drawHead()
        }
        drawTorso() {
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + this.height / 6, this.y, this.width - this.height / 3, this.height - this.height / 3);
        }
        drawHead() {
            ctx.fillStyle = 'black';
            if (this.moving.left)
                ctx.fillRect(this.x, this.y, this.height / 3, this.height / 3);
            else //if(this.moving.right)
                ctx.fillRect(this.x + this.width - this.height / 3, this.y, this.height / 3, this.height / 3);
        }
        drawLegs() {
            ctx.save(); // Save the current drawing context

            // Right leg - rotate around the hip
            ctx.translate(this.x + this.width - this.width / 3, this.y + this.height - this.height / 3); // Move to the hip position (adjusted)
            ctx.rotate(Math.sin(this.legRotation + Math.PI) * 0.5); // Rotate back and forth for walking effect
            ctx.fillStyle = "black";
            ctx.fillRect(-5, 0, this.height / 6, this.height / 3); // Draw left leg
            ctx.restore(); // Restore the drawing context

            ctx.save(); // Save the current drawing context

            // Left leg - rotate around the hip
            ctx.translate(this.x + this.width / 3, this.y + this.height - this.height / 3); // Move to the hip position (adjusted)
            ctx.rotate(Math.sin(this.legRotation) * 0.5); // Rotate back and forth for walking effect
            ctx.fillStyle = "black";
            ctx.fillRect(-5, 0, this.height / 6, this.height / 3); // Draw left leg
            ctx.restore(); // Restore the drawing context
        }
        drawText() {
            ctx.font = "50px Arial";
            ctx.fillStyle = 'black'
            ctx.fillText(this.moving.prev, this.x, this.y + 50);
            ctx.fillText(this.moving.framecount, this.x, this.y);
        }

        damage(damage) {
            this.health -= damage
            if (this.health <= 0) {
                this.kill()
            }
        }

        returnData() {
            return { x: this.x, y: this.y }
        }

        kill() {
            console.log(`sheep is being destroyed.`);
            // for (const key in this) {
            //     if (this.hasOwnProperty(key)) {
            //         delete this[key];
            //     }
            // }
            delete animals[this]
            this.killed = true
            // delete this.constructor.instances[this.name];
        }

        update() {
            this.velocityY += this.accelerationY;
            // this.y += this.velocityY
            // this.x += this.velocityX

            var states = ['left', 'right', 'not'];

            if (this.moving.framecount <= 0) {
                let cur;
                if (this.moving.prev === 'not') {
                    cur = states[Math.floor(Math.random() * 2)];
                } else {
                    cur = 'not';
                }

                // Reset all states
                this.moving.left = false;
                this.moving.right = false;
                this.moving.not = false;

                this.moving[cur] = true;
                this.moving.framecount = Math.floor(Math.random() * 480);
                this.moving.prev = cur;
            }
            this.moving.framecount--;

            // Apply movement direction
            if (this.moving.prev === 'not') {
                this.velocityX = 0;
            } else if (this.moving.prev === 'left') {
                this.velocityX = -2;
            } else if (this.moving.prev === 'right') {
                this.velocityX = 2;
            }

            let nextX = this.x + this.velocityX;
            let nextY = this.y + this.velocityY;

            let grounded = false;

            // --- SIDE COLLISION FIX ---
            let collidedX = false;

            for (let obj of objects) {
                if (obj.destroyed || !obj.collisions) continue;

                const verticalOverlap =
                    this.y + this.height > obj.y && this.y < obj.y + obj.height;

                // Moving right into object
                if (
                    this.velocityX > 0 &&
                    this.x + this.width <= obj.x &&
                    nextX + this.width > obj.x &&
                    verticalOverlap
                ) {
                    if (this.jumpCount == 0) {
                        this.velocityY = -jumpStrength
                        this.jumpCount++
                    }
                    this.x = obj.x - this.width;
                    this.velocityX = 0;
                    collidedX = true;
                    break;
                }

                // Moving left into object
                if (
                    this.velocityX < 0 &&
                    this.x >= obj.x + obj.width &&
                    nextX < obj.x + obj.width &&
                    verticalOverlap
                ) {
                    if (this.jumpCount == 0) {
                        this.velocityY = -jumpStrength
                        this.jumpCount++
                    }
                    this.x = obj.x + obj.width;
                    this.velocityX = 0;
                    collidedX = true;
                    break;
                }
            }

            // If not blocked, apply horizontal movement
            if (!collidedX) {
                this.x += this.velocityX;
            }

            for (let obj of objects) {
                if (obj.destroyed || !obj.collisions) continue;

                const isFalling = this.velocityY >= 0;
                const isAbove = this.y + this.height <= obj.y;

                const horizontalOverlap =
                    this.x + this.width > obj.x && this.x < obj.x + obj.width;
                const willLand =
                    nextY + this.height >= obj.y && this.y + this.height <= obj.y;

                if (isFalling && isAbove && horizontalOverlap && willLand) {
                    this.y = obj.y - this.height;
                    this.velocityY = 0;
                    this.jumpCount = 0;
                    grounded = true;
                    break;
                }
            }

            if (!grounded) {
                this.y += this.velocityY;

                if (this.y > canvas.height + 10) {
                    this.y = -this.height
                    this.x = 100 - scroll.horizontalAbs
                    // this.velocityY = 0;
                    // this.jumpCount = 0;
                    // grounded = true;
                }
            }

            // Keep player inside canvas horizontally
            if (this.x < 0) {
                this.x = 0;
                this.velocityX = 0;
                this.moving.framecount = 100
                this.moving.left = false
                this.moving.prev = 'right'
                this.moving.right = true
            }
            if (this.x + this.width > canvas.width) {
                this.x = canvas.width - this.width;
                this.velocityX = 0;
                this.moving.framecount = 100
                this.moving.left = true
                this.moving.prev = 'left'
                this.moving.right = false
            }

            // Animate limbs
            if (Math.abs(this.velocityX) > 0.5) {
                this.armSwing += 0.1;
                this.legRotation += 0.2;
            } else {
                this.armSwing = 0;
                this.legRotation = 0;
            }
        }
    }

    function spawnAnimals(amount) {
        for (let i = 0; i < amount; i++) {
            var animal = new Sheep(TILE_SIZE * 2 - TILE_SIZE / 3, TILE_SIZE - TILE_SIZE / 5)
            animals.push(animal)
        }
    }

    spawnAnimals(Math.ceil(Math.random() * 5))

    function isSupported(block, others) {
        for (let other of others) {
            if (other === block || other.destroyed) continue;

            if (
                block.x < other.x + other.width &&
                block.x + block.width > other.x &&
                block.y + block.height === other.y
            ) return true;
        }
        return block.y + block.height === canvas.height;
    }

    function isColliding(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    let layers = [
        'stone', 'stone', 'dirt', 'dirt', 'grass'
    ]

    function generateTrees(surfaceTiles, options = {}) {
        const {
            treeChance = 0.1, // 10% chance per tile
            minHeight = 4,
            maxHeight = 10
        } = options;

        for (let tile of surfaceTiles) {
            if (Math.random() < treeChance) {
                const { x, y } = tile;
                const height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

                // Create trunk
                for (let h = 1; h <= height; h++) {
                    const trunkBlock = new InteractableObject(
                        x,
                        y - h * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE,
                        blocks.wood.color,
                        'wood'
                    );
                    objects.push(trunkBlock);
                }

                // Add leaves (simple 3x3 square)
                const leafTopY = y - height * TILE_SIZE;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const leafX = x + dx * TILE_SIZE;
                        const leafY = leafTopY + dy * TILE_SIZE;

                        const leafBlock = new InteractableObject(
                            leafX,
                            leafY,
                            TILE_SIZE,
                            TILE_SIZE,
                            blocks.leaf.color,
                            'leaf'
                        );

                        objects.push(leafBlock);
                    }
                }
            }
        }
    }


    // Helper function to return a random biome type
    function getRandomBiome() {
        const biomes = ['grassland', 'desert', 'mountain', 'forest', 'snow'];
        return biomes[Math.floor(Math.random() * biomes.length)];
    }

    function generateHillyTerrain(options = {}) {
        const {
            segmentWidth = TILE_SIZE,
            maxHeight = canvas.height - TILE_SIZE * 2,
            minHeight = canvas.height / 2,
            roughness = 1.5,
            smoothness = 0.3,
            baseType = 'stone'
        } = options;

        const terrainHeights = [];
        const numSegments = Math.floor(150);

        let lastY = snapToGrid(randomBetween(minHeight, maxHeight));

        for (let i = 0; i < numSegments; i++) {
            let change = (Math.random() - 0.5) * TILE_SIZE * roughness;
            let newY = lastY + change;
            newY = Math.max(minHeight, Math.min(maxHeight, newY));
            newY = lastY * (1 - smoothness) + newY * smoothness;
            newY = snapToGrid(newY);

            terrainHeights.push(newY);
            lastY = newY;
        }

        const surfaceTiles = [];
        let currentBiome = getRandomBiome(); // Random biome for this section

        for (let i = 0; i < numSegments; i++) {
            const x = i * segmentWidth;
            const topY = terrainHeights[i];

            // Choose surface and underground types based on biome
            let surfaceType = 'grass'; // Default is grass
            let undergroundType = 'dirt'; // Default is dirt
            let baseType = 'stone'; // Default base type

            switch (currentBiome) {
                case 'desert':
                    surfaceType = 'sand';
                    undergroundType = 'sandstone';
                    break;
                case 'forest':
                    surfaceType = 'grass';
                    undergroundType = 'dirt';
                    break;
                case 'mountain':
                    surfaceType = 'grass';
                    undergroundType = 'stone';
                    break;
                case 'snow':
                    surfaceType = 'snow';
                    undergroundType = 'ice';
                    break;
                // Add more biomes as needed
            }

            // Update biome if transitioning
            if (Math.random() < 0.1) { // Random chance to transition to a new biome
                currentBiome = getRandomBiome();
            }

            // Create blocks based on terrain type
            for (let y = topY; y < canvas.height; y += TILE_SIZE) {
                let type = undergroundType;

                if (y === topY) {
                    type = surfaceType;
                    surfaceTiles.push({ x: snapToGrid(x), y: snapToGrid(y) }); // Store surface tile
                } else if (y > canvas.height - TILE_SIZE * 2) {
                    type = baseType;
                }
                const depth = (y - topY) / TILE_SIZE;
                if (depth > 8) {
                    type = baseType;
                }


                const blockDef = blocks[type];

                const block = new InteractableObject(
                    snapToGrid(x),
                    snapToGrid(y),
                    TILE_SIZE,
                    TILE_SIZE,
                    blockDef.color,
                    blockDef.type
                );

                if (blockDef.image) {
                    const img = new Image();
                    img.src = blockDef.image;
                    block.image = img;
                }

                objects.push(block);
            }
        }

        // Generate trees only on specific biomes
        generateTrees(surfaceTiles, { treeChance: currentBiome === 'forest' ? 0.15 : 0.05 });
    }

    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    generateHillyTerrain({
        surfaceType: 'grass',
        undergroundType: 'dirt',
        baseType: 'stone',
        roughness: 5,
        smoothness: 0.6
    });


    function drawHotbar(player) {
        const slotSize = 50;
        const padding = 10;
        const barWidth = Object.keys(player.inventory).length * (slotSize + padding);
        const startX = canvas.width / 2 - barWidth / 2;
        const y = 70;

        let i = 0;
        for (let blockType in player.inventory) {
            const x = startX + i * (slotSize + padding);
            ctx.fillStyle = blockType === player.selectedBlock ? "#aaa" : "#666";
            ctx.fillRect(x, y, slotSize, slotSize);

            ctx.fillStyle = "white";
            ctx.font = "16px Arial";
            ctx.fillText(blockType, x + 5, y + 20);
            ctx.fillText("x" + player.inventory[blockType], x + 5, y + 40);

            i++;
        }
    }


    // Create player
    const player = new PhysicsObject(100, 100, TILE_SIZE * 1.25, TILE_SIZE * 2.75, "transparent");

    // Keyboard listeners
    document.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        const x = snapToGrid(e.clientX);
        const y = snapToGrid(e.clientY - TILE_SIZE / 2);

        if (player.inventory[player.selectedBlock] > 0) {
            const block = new InteractableObject(x, y, TILE_SIZE, TILE_SIZE, "saddlebrown", player.selectedBlock);
            objects.push(block);
            player.inventory[player.selectedBlock]--;
        }
    });


    canvas.addEventListener("click", (e) => {
        e.preventDefault();
        const mx = e.clientX;
        const my = e.clientY;

        for (let obj of objects) {
            if (
                mx >= obj.x && mx <= obj.x + obj.width &&
                my >= obj.y && my <= obj.y + obj.height &&
                !obj.destroyed && player.inventory.hasOwnProperty(obj.type)
            ) {
                obj.destroy();
                player.inventory[obj.type] = (player.inventory[obj.type] || 0) + 1;
                break;
            }
        }
        for (let anim of animals) {
            if (
                mx >= anim.x && mx <= anim.x + anim.width &&
                my >= anim.y && my <= anim.y + anim.height
            ) {
                anim.damage(1)
                break;
            }
        }
    });


    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
        if (e.key === "ArrowUp" || e.key === "w") keys.up = true;
        if (e.key === " ") keys.space = true;
        if (e.key === "r") resetData()
        if (e.key === "Shift") keys.shift = true;
        if (e.key >= "1" && e.key <= "9") {
            const index = parseInt(e.key) - 1;
            const keys = Object.keys(player.inventory);
            if (index < keys.length) {
                player.selectedBlock = keys[index];
            }
        }
    });

    let scrollIndex = 0

    window.addEventListener('wheel', function (event) {
        if (event.deltaY > 0) {
            var index = scrollIndex--
            const keys = Object.keys(player.inventory);
            if (index < 0) {
                index = keys.length - 1
                scrollIndex = keys.length - 1
            }
            if (index < keys.length) {
                player.selectedBlock = keys[index];
            }
        } else if (event.deltaY < 0) {
            var index = scrollIndex++
            const keys = Object.keys(player.inventory);
            if (index > keys.length) {
                index = 0
                scrollIndex = 0
            }
            if (index < keys.length) {
                player.selectedBlock = keys[index];
            }
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
        if (e.key === "ArrowUp" || e.key === "w") keys.up = false;
        if (e.key === " ") keys.space = false;
        if (e.key === "Shift") keys.shift = false;
    });


    function snapToGrid(val) {
        return Math.floor(val / TILE_SIZE) * TILE_SIZE;
    }

    function saveData(objects, animals) {
        let objData = []
        let animData = []
        for (obj of objects) {
            if (obj.destroyed) continue
            var data = obj.returnData()
            objData.push(data)
        }
        for (anim of animals) {
            if (anim.killed) continue
            var data = anim.returnData()
            animData.push(data)
        }
        localStorage.setItem('objects', JSON.stringify(objData))
        localStorage.setItem('animals', JSON.stringify(animData))
        localStorage.setItem('player', JSON.stringify({ x: player.x, y: player.y, score: player.score }))
        localStorage.setItem('inventory', JSON.stringify(player.inventory))
        localStorage.setItem('gems', JSON.stringify(player.gems))
    }

    function copyData() {
        let objData = []
        let animData = []
        for (obj of objects) {
            if (obj.destroyed) continue
            var data = obj.returnData()
            objData.push(data)
        }
        for (anim of animals) {
            if (anim.killed) continue
            var data = anim.returnData()
            animData.push(data)
        }
        var data = {
            blocks: objData,
            animals: animData,
            player: {
                pos: {
                    x: player.x,
                    y: player.y
                },
                inventory: player.inventory
            }
        }
        saveTextAsFile(JSON.stringify(data), 'world-' + Date.now() + '.world')
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Text copied to clipboard');
            alert('Copied world data')
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }

    function saveTextAsFile(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function resetData() {
        resetted = true
        localStorage.clear()
        window.location.reload()
    }

    function resetFileInput(input) {
        try {
            input.value = null;
        } catch (ex) { }
        if (input.value) {
            input.parentNode.replaceChild(input.cloneNode(true), input);
        }
    }

    var worldFile = document.getElementById('worldFile')
    worldFile.addEventListener('input', (event) => {
        const file = event.target.files[0];

        if (!file) return

        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;
            loadWorldData(JSON.parse(text), file.name)
            resetFileInput(worldFile)
        };

        reader.readAsText(file);
    })

    function loadWorldData(data, filename) {
        // var data = prompt('Paste world data here:')
        if (!data) return

        filename = filename || 'unknown name'
        var confirmation = confirm('Load selected world: ' + filename)
        if (!confirmation) return
        var objData
        var animData
        var playerData
        var playerInventory
        // data = JSON.parse(data)
        var savedobjects = data.blocks
        if (savedobjects) objData = savedobjects
        else return
        var savedAnims = data.animals
        if (savedAnims) animData = savedAnims
        var playerPos = data.player.pos
        if (playerPos) playerData = playerPos
        else playerData = { x: 100 - scroll.horizontalAbs, y: 100 }
        var playerInv = data.player.inventory
        if (playerInv) playerInventory = playerInv
        else playerInventory = {}

        player.x = playerData.x
        player.y = playerData.y
        player.inventory = playerInventory

        objects = []
        animals = []
        for (let obj of objData) {
            var { type, color, x, y, width, height, destroyed } = obj
            var newObj = new InteractableObject(x, y, width, height, color, type, destroyed)
            objects.push(newObj)
        }
        for (let anim of animData) {
            var { x, y } = anim
            var newAnim = new Sheep(x, y)
            animals.push(newAnim)
        }

    }

    function loadData() {
        var objData
        var animData
        var playerData
        var playerInventory
        var gems

        var savedobjects = localStorage.getItem('objects')
        if (savedobjects) objData = JSON.parse(savedobjects)
        else return

        var savedAnims = localStorage.getItem('animals')
        if (savedAnims) animData = JSON.parse(savedAnims)

        var playerPos = localStorage.getItem('player')
        if (playerPos) playerData = JSON.parse(playerPos)
        else playerData = { x: 100 - scroll.horizontalAbs, y: 100, score: 0 }

        var playerInv = localStorage.getItem('inventory')
        if (playerInv) playerInventory = JSON.parse(playerInv)
        else playerInventory = {}

        var gems = localStorage.getItem('gems')
        if (gems) gems = Number(gems)
        else gems = 0

        player.x = playerData.x
        player.y = playerData.y
        if (playerData.score) player.score = playerData.score
        player.inventory = playerInventory
        player.gems = gems

        objects = []
        animals = []
        for (let obj of objData) {
            var { type, color, x, y, width, height, destroyed } = obj
            var newObj = new InteractableObject(x, y, width, height, color, type, destroyed)
            objects.push(newObj)
        }
        for (let anim of animData) {
            var { x, y } = anim
            var newAnim = new Sheep(x, y)
            animals.push(newAnim)
        }

    }

    loadData()

    // Main game loop
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#8aace3";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var image = document.createElement('img')
        image.src = blocks['coin'].image
        ctx.drawImage(image, canvas.width - 32, 0, 32, 32)
        image = document.createElement('img')
        image.src = blocks['gem'].image
        ctx.drawImage(image, canvas.width - 32, 42, 32, 32)

        player.handleInput();
        player.update();
        player.draw();
        ctx.font = "bold 32px arial"
        ctx.fillText(player.score, canvas.width - 96, 28)
        ctx.fillText(player.gems, canvas.width - 96, 70)
        if (!resetted) saveData(objects, animals)

        // Check for interactions with objects
        for (let object of objects) {
            object.update(player, objects);
            object.draw();
        }
        for (let animal of animals) {
            animal.update(player, objects);
            animal.draw();
        }
        drawHotbar(player);

        requestAnimationFrame(gameLoop);
    }

    gameLoop();

    const form = document.getElementById('newObject')

    for (let block in blocks) {
        var option = document.createElement('option')
        option.value = block
        option.innerText = block.charAt(0).toUpperCase() + block.slice(1)
        document.getElementById('type').appendChild(option)
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Initialize settings object
        var settings = {
            "type": document.getElementById('type').value
        };

        // Collect all input values and store them in settings
        var inputs = form.querySelectorAll('input');
        for (let input of inputs) {
            // If the input value is empty, set a default value (optional)
            settings[input.id] = input.value || 0; // Default to 0 if input is empty
        }

        // Generate random color
        const randomColor = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;

        // Construct the alert message with the random color
        // alert(
        //     `Pos: (${settings['xpos']}, ${settings['ypos']}), Height and Width: (${settings['height']}, ${settings['width']}), Color: ${randomColor}, Type: ${settings['type']}`
        // );

        // Create a new interactable object with random color
        var object = new InteractableObject(
            snapToGrid(parseFloat(settings['xpos'])),
            snapToGrid(parseFloat(settings['ypos'])),
            32,
            32,
            randomColor,
            settings['type']
        );

        // Push the newly created object to the objects array
        objects.push(object);
    });
} catch (e) {
    alert(e)
    throw e
}