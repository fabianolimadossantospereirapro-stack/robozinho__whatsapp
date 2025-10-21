const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Novo cliente conectado ao Socket.IO');

    socket.on('disconnect', () => {
        console.log('Cliente desconectado do Socket.IO');
    });

    // Aqui você pode adicionar lógica para enviar status do bot para a UI
    // Ex: socket.emit('bot_status', { status: 'ready' });
});

server.listen(PORT, () => {
    console.log(`Servidor web rodando em http://localhost:${PORT}`);
});

