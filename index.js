const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const morgan = require('morgan');

app.use(morgan('combined'));

// Ride simulation configuration
class RideSimulation {
    constructor(id, startLat, startLng) {
        this.id = id;
        this.currentLat = startLat;
        this.currentLng = startLng;
        this.speed = 0.005; // Increased speed for more noticeable movement
        this.directionX = Math.random() > 0.5 ? 1 : -1;
        this.directionY = Math.random() > 0.5 ? 1 : -1;
        this.color = ['#FF0000', '#00FF00', '#0000FF', '#FFA500'][id % 4]; // Different colors for each pin
    }

    // Generate a slightly randomized path simulating a ride
    generateNextCoordinate() {
        // Add movement with bounce effect at screen edges
        this.currentLat += this.speed * this.directionY;
        this.currentLng += this.speed * this.directionX;

        // Add some randomness to the movement
        this.currentLat += (Math.random() - 0.5) * 0.002;
        this.currentLng += (Math.random() - 0.5) * 0.002;

        // Change direction if reaching bounds (simulating screen edges)
        if (Math.abs(this.currentLat - 23.8103) > 0.5) {
            this.directionY *= -1;
        }
        if (Math.abs(this.currentLng - 90.4125) > 0.5) {
            this.directionX *= -1;
        }

        // Randomly change direction occasionally
        if (Math.random() < 0.02) {
            this.directionX *= -1;
        }
        if (Math.random() < 0.02) {
            this.directionY *= -1;
        }

        return {
            id: this.id,
            lat: this.currentLat,
            lng: this.currentLng,
            color: this.color,
            timestamp: new Date().toISOString()
        };
    }
}

// Create multiple ride simulations with different starting positions
const rideSimulations = [
    new RideSimulation(0, 23.8103, 90.4125),  // Center
    new RideSimulation(1, 23.8603, 90.4625),  // North East
    new RideSimulation(2, 23.7603, 90.3625),  // South West
    new RideSimulation(3, 23.8603, 90.3625)   // North West
];

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Start sending coordinates for all simulations
    const coordinateInterval = setInterval(() => {
        const updates = rideSimulations.map(sim => sim.generateNextCoordinate());
        socket.emit('ride_update', updates);
    }, 100); // Update every 100ms
    
    socket.on('disconnect', () => {
        clearInterval(coordinateInterval);
        console.log('Client disconnected');
    });
});

// Serve static files
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
