const dgram = require('dgram');
const path = require('path');
const express = require('express');
const app = express();
const http = require('http');
const socketIO = require('socket.io');
const httpServer = http.createServer(app);
const io = socketIO(httpServer);


const expressPort = 80; // leave default http port 80 for hosts file on windows to map to hostname
// const http = require('http');
// const server = http.createServer(app);


// express app
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    // res.send('<h1>Hello world</h1>');
    res.sendFile(path.join(__dirname, 'public', 'display.html'));
})

httpServer.listen(expressPort, () => {
    console.log(`Express app listening on port ${expressPort}`);
})

// Create a UDP socket as a client
const udpClient = dgram.createSocket('udp4');

// Port and ip to listen on 
const udpServerIP = '0.0.0.0';
const port = 50000;
let leftBatteryIP;
let leftBatteryUDPPort;
let rightBatteryIP;
let rightBatteryUDPPort;

let displayDataOceanflight = {};
let displayDataLeft = {};
let displayDataRight = {};

// Listen for incoming messages
udpClient.on('message', (msg, rinfo) => {
    const msgObject = JSON.parse(msg.toString());
    // console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${JSON.stringify(msgObject, null, 2)}`);
    if (msgObject.sender) {  
        // populate oceanflight data from both senders
        for (const key of Object.keys(msgObject)) {
            if (key.includes('oceanflight')) {
                displayDataOceanflight[key] = msgObject[key];
            }
        }
    }
    if (msgObject.sender && msgObject.sender == 'left') {
        leftBatteryIP = rinfo.address;
        leftBatteryUDPPort = rinfo.port;
        displayDataLeft = msgObject;
    }
    if (msgObject.sender && msgObject.sender == 'right') {
        rightBatteryIP = rinfo.address;
        rightBatteryUDPPort = rinfo.port;
        displayDataRight = msgObject;
    }
});

// Handle errors
udpClient.on('error', (err) => {
    console.error(`UDP client error:\n${err.stack}`);
    udpClient.close();
});

// Start listening on the specified port and IP address
udpClient.bind(port, udpServerIP);

// Output a message to let you know it's listening
console.log(`UDP client listening on port ${port}`);

// end UDP server

// Socket.io
const displayEmitInterval = 200;
io.on('connection', function(socket) {
    console.log('ROOT HTTP SOCKET CONNECTED');
});
const displayio = io.of('/display');
displayio.on('connect', async (socket) => {
    console.log('DISPLAY IO CONNECTED');
    setInterval(() => {
        socket.emit('sendDisplayData', {
            topData: displayDataOceanflight,
            leftData: displayDataLeft,
            rightData: displayDataRight
        });
    }, displayEmitInterval);

    socket.on('command', handleCommand);
});

function handleCommand(cmd) {
    if (cmd.cmd == 'restartMqttClient') {
        let port = cmd.battery == 'left' ? 
        leftBatteryUDPPort : cmd.battery == 'right' ? 
        rightBatteryUDPPort : null;
        let ip = cmd.battery == 'left' ?
        leftBatteryIP : cmd.battery == 'right' ?
        rightBatteryIP : null;
        const message = JSON.stringify({
            type: 'command',
            cmd: 'restartMqttClient'
        })
        if (port == null || ip == nul) {
            console.log('Error in restartMqttClient: Port unknown');
            return;
        }
        udpClient.send(message, port, ip, (err) => {
            if (err) {
              console.log(`======================================\nError sending message: ${err}`);
            } else {
              // console.log(`======================================\nMessage sent to ${udpClientIP}:${udpClientPort}: ${udpMessage}`);
            }
        });
    } else if (cmd.cmd == 'delayTimeout') {
        const message = JSON.stringify({
            type: 'command',
            cmd: 'delayTimeout',
            durationSec: cmd.durationSec
        });
        //  // delay for both batteries
        // udpClient.send(message, leftBatteryUDPPort, leftBatteryIP, (err) => {
        //     if (err) {
        //       console.log(`======================================\nError sending message: ${err}`);
        //     } else {
        //       // console.log(`======================================\nMessage sent to ${udpClientIP}:${udpClientPort}: ${udpMessage}`);
        //     }
        // });
        // udpClient.send(message, rightBatteryUDPPort, rightBatteryIP, (err) => {
        //     if (err) {
        //       console.log(`======================================\nError sending message: ${err}`);
        //     } else {
        //       // console.log(`======================================\nMessage sent to ${udpClientIP}:${udpClientPort}: ${udpMessage}`);
        //     }
        // });
    }
}