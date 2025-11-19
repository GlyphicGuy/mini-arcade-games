// ===========================
// GAME CONFIGURATION
// ===========================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    CELL_SIZE: 40,
    PLAYER_RADIUS: 8,
    PLAYER_COLOR: '#00ffff',
    WALL_COLOR: '#cccccc',
    WALL_ILLUMINATED_COLOR: '#888888',
    EXIT_COLOR: '#00ff88',
    PULSE_COLOR: '#00ff88',
    PULSE_SPEED: 3,
    PULSE_MAX_RADIUS: 250,
    PULSE_WIDTH: 2,
    BACKGROUND_COLOR: '#000000'
};

// ===========================
// CANVAS SETUP
// ===========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageDiv = document.getElementById('message');

// ===========================
// GAME STATE
// ===========================
let gameState = {
    player: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    maze: [],
    pulses: [],
    isGameOver: false,
    isLevelComplete: false,
    keys: {}
};

// ===========================
// MAZE GENERATION (Recursive Backtracker)
// ===========================
function generateMaze() {
    const cols = Math.floor(CONFIG.CANVAS_WIDTH / CONFIG.CELL_SIZE);
    const rows = Math.floor(CONFIG.CANVAS_HEIGHT / CONFIG.CELL_SIZE);
    
    // Initialize grid - all walls
    const grid = [];
    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        for (let x = 0; x < cols; x++) {
            grid[y][x] = {
                x: x,
                y: y,
                walls: { top: true, right: true, bottom: true, left: true },
                visited: false
            };
        }
    }

    // Recursive backtracker algorithm
    const stack = [];
    let current = grid[0][0];
    current.visited = true;

    function getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const { x, y } = cell;

        if (y > 0 && !grid[y - 1][x].visited) neighbors.push({ cell: grid[y - 1][x], dir: 'top' });
        if (x < cols - 1 && !grid[y][x + 1].visited) neighbors.push({ cell: grid[y][x + 1], dir: 'right' });
        if (y < rows - 1 && !grid[y + 1][x].visited) neighbors.push({ cell: grid[y + 1][x], dir: 'bottom' });
        if (x > 0 && !grid[y][x - 1].visited) neighbors.push({ cell: grid[y][x - 1], dir: 'left' });

        return neighbors;
    }

    function removeWalls(current, next, direction) {
        if (direction === 'top') {
            current.walls.top = false;
            next.walls.bottom = false;
        } else if (direction === 'right') {
            current.walls.right = false;
            next.walls.left = false;
        } else if (direction === 'bottom') {
            current.walls.bottom = false;
            next.walls.top = false;
        } else if (direction === 'left') {
            current.walls.left = false;
            next.walls.right = false;
        }
    }

    while (true) {
        const neighbors = getUnvisitedNeighbors(current);

        if (neighbors.length > 0) {
            const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
            stack.push(current);
            removeWalls(current, chosen.cell, chosen.dir);
            chosen.cell.visited = true;
            current = chosen.cell;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }

    return grid;
}

// ===========================
// COLLISION DETECTION
// ===========================
function checkWallCollision(x, y) {
    const cellX = Math.floor(x / CONFIG.CELL_SIZE);
    const cellY = Math.floor(y / CONFIG.CELL_SIZE);

    if (cellY < 0 || cellY >= gameState.maze.length || 
        cellX < 0 || cellX >= gameState.maze[0].length) {
        return true; // Out of bounds
    }

    const cell = gameState.maze[cellY][cellX];
    const cellPixelX = cellX * CONFIG.CELL_SIZE;
    const cellPixelY = cellY * CONFIG.CELL_SIZE;

    // Check collision with each wall
    const margin = CONFIG.PLAYER_RADIUS;

    // Top wall
    if (cell.walls.top && y - margin < cellPixelY) {
        return true;
    }
    // Bottom wall
    if (cell.walls.bottom && y + margin > cellPixelY + CONFIG.CELL_SIZE) {
        return true;
    }
    // Left wall
    if (cell.walls.left && x - margin < cellPixelX) {
        return true;
    }
    // Right wall
    if (cell.walls.right && x + margin > cellPixelX + CONFIG.CELL_SIZE) {
        return true;
    }

    return false;
}

function checkExitReached() {
    const dx = gameState.player.x - gameState.exit.x;
    const dy = gameState.player.y - gameState.exit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < CONFIG.CELL_SIZE / 2;
}

// ===========================
// PULSE SYSTEM
// ===========================
function createPulse() {
    gameState.pulses.push({
        x: gameState.player.x,
        y: gameState.player.y,
        radius: 0,
        alpha: 1.0
    });
}

function updatePulses() {
    gameState.pulses = gameState.pulses.filter(pulse => {
        pulse.radius += CONFIG.PULSE_SPEED;
        pulse.alpha = 1 - (pulse.radius / CONFIG.PULSE_MAX_RADIUS);
        return pulse.radius < CONFIG.PULSE_MAX_RADIUS;
    });
}

// ===========================
// GAME INITIALIZATION
// ===========================
function initGame() {
    gameState.maze = generateMaze();
    
    // Set player start position (center of first cell)
    gameState.player.x = CONFIG.CELL_SIZE / 2;
    gameState.player.y = CONFIG.CELL_SIZE / 2;

    // Set exit position (center of last cell)
    const cols = gameState.maze[0].length;
    const rows = gameState.maze.length;
    gameState.exit.x = (cols - 1) * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;
    gameState.exit.y = (rows - 1) * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2;

    gameState.pulses = [];
    gameState.isGameOver = false;
    gameState.isLevelComplete = false;
    messageDiv.innerHTML = '';

    // Create initial pulse so player can see
    createPulse();
}

// ===========================
// UPDATE LOGIC
// ===========================
function update() {
    if (gameState.isGameOver || gameState.isLevelComplete) {
        return;
    }

    // Player movement
    const moveSpeed = 2;
    let newX = gameState.player.x;
    let newY = gameState.player.y;

    if (gameState.keys['ArrowUp'] || gameState.keys['w'] || gameState.keys['W']) {
        newY -= moveSpeed;
    }
    if (gameState.keys['ArrowDown'] || gameState.keys['s'] || gameState.keys['S']) {
        newY += moveSpeed;
    }
    if (gameState.keys['ArrowLeft'] || gameState.keys['a'] || gameState.keys['A']) {
        newX -= moveSpeed;
    }
    if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) {
        newX += moveSpeed;
    }

    // Check collision before moving
    if (!checkWallCollision(newX, newY)) {
        gameState.player.x = newX;
        gameState.player.y = newY;
    } else {
        // Collision detected - Game Over
        gameState.isGameOver = true;
        messageDiv.innerHTML = '<div class="message game-over">GAME OVER - Hit a wall! Press R to restart</div>';
        return;
    }

    // Check if player reached exit
    if (checkExitReached()) {
        gameState.isLevelComplete = true;
        messageDiv.innerHTML = '<div class="message level-complete">LEVEL COMPLETE! Press R to play again</div>';
        return;
    }

    // Update pulses
    updatePulses();
}

// ===========================
// RENDERING
// ===========================
function draw() {
    // Clear canvas with black background
    ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw walls (only if illuminated by pulses)
    drawIlluminatedWalls();

    // Draw exit zone (always visible with pulses nearby)
    drawExit();

    // Draw pulses
    drawPulses();

    // Draw player
    drawPlayer();
}

function drawIlluminatedWalls() {
    gameState.maze.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const x = colIndex * CONFIG.CELL_SIZE;
            const y = rowIndex * CONFIG.CELL_SIZE;

            // Check each wall segment for illumination
            const walls = [
                { enabled: cell.walls.top, x1: x, y1: y, x2: x + CONFIG.CELL_SIZE, y2: y },
                { enabled: cell.walls.right, x1: x + CONFIG.CELL_SIZE, y1: y, x2: x + CONFIG.CELL_SIZE, y2: y + CONFIG.CELL_SIZE },
                { enabled: cell.walls.bottom, x1: x, y1: y + CONFIG.CELL_SIZE, x2: x + CONFIG.CELL_SIZE, y2: y + CONFIG.CELL_SIZE },
                { enabled: cell.walls.left, x1: x, y1: y, x2: x, y2: y + CONFIG.CELL_SIZE }
            ];

            walls.forEach(wall => {
                if (!wall.enabled) return;

                // Check if wall is near any pulse
                let maxAlpha = 0;
                gameState.pulses.forEach(pulse => {
                    const midX = (wall.x1 + wall.x2) / 2;
                    const midY = (wall.y1 + wall.y2) / 2;
                    const dx = midX - pulse.x;
                    const dy = midY - pulse.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Wall is illuminated if it's within the pulse ring (with some thickness)
                    const ringThickness = 20;
                    if (Math.abs(distance - pulse.radius) < ringThickness) {
                        maxAlpha = Math.max(maxAlpha, pulse.alpha);
                    }
                });

                if (maxAlpha > 0) {
                    ctx.strokeStyle = `rgba(200, 200, 200, ${maxAlpha * 0.8})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(wall.x1, wall.y1);
                    ctx.lineTo(wall.x2, wall.y2);
                    ctx.stroke();
                }
            });
        });
    });
}

function drawExit() {
    // Draw exit with glow effect
    let baseAlpha = 0.1;
    
    // Check if exit is illuminated by pulses
    gameState.pulses.forEach(pulse => {
        const dx = gameState.exit.x - pulse.x;
        const dy = gameState.exit.y - pulse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const ringThickness = 30;
        if (Math.abs(distance - pulse.radius) < ringThickness) {
            baseAlpha = Math.max(baseAlpha, pulse.alpha * 0.9);
        }
    });

    // Draw exit circle with glow
    const gradient = ctx.createRadialGradient(
        gameState.exit.x, gameState.exit.y, 0,
        gameState.exit.x, gameState.exit.y, CONFIG.CELL_SIZE / 2
    );
    gradient.addColorStop(0, `rgba(0, 255, 136, ${baseAlpha})`);
    gradient.addColorStop(1, `rgba(0, 255, 136, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(gameState.exit.x, gameState.exit.y, CONFIG.CELL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawPulses() {
    gameState.pulses.forEach(pulse => {
        ctx.strokeStyle = `rgba(0, 255, 136, ${pulse.alpha})`;
        ctx.lineWidth = CONFIG.PULSE_WIDTH;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Add inner glow effect
        ctx.strokeStyle = `rgba(0, 255, 200, ${pulse.alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

function drawPlayer() {
    // Draw player with glow
    const gradient = ctx.createRadialGradient(
        gameState.player.x, gameState.player.y, 0,
        gameState.player.x, gameState.player.y, CONFIG.PLAYER_RADIUS * 2
    );
    gradient.addColorStop(0, CONFIG.PLAYER_COLOR);
    gradient.addColorStop(0.5, CONFIG.PLAYER_COLOR);
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(gameState.player.x, gameState.player.y, CONFIG.PLAYER_RADIUS * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw core
    ctx.fillStyle = CONFIG.PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(gameState.player.x, gameState.player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

// ===========================
// GAME LOOP
// ===========================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ===========================
// INPUT HANDLING
// ===========================
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;

    // Pulse emission
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameState.isGameOver && !gameState.isLevelComplete) {
            createPulse();
        }
    }

    // Restart game
    if (e.key === 'r' || e.key === 'R') {
        initGame();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// ===========================
// START GAME
// ===========================
initGame();
gameLoop();
