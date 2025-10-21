const socket = io();

const statusDiv = document.getElementById("status");
const qrcodeDiv = document.getElementById("qrcode");
const logsDiv = document.getElementById("logs");

function addLog(message) {
    const p = document.createElement("p");
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsDiv.prepend(p); // Adiciona os logs mais recentes no topo
    if (logsDiv.children.length > 50) { // Limita o número de logs para não sobrecarregar
        logsDiv.removeChild(logsDiv.lastChild);
    }
}

socket.on("message", (message) => {
    addLog(`Server: ${message}`);
});

socket.on("qr", (qr) => {
    qrcodeDiv.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}" alt="QR Code">`;
    statusDiv.textContent = "Escaneie o QR Code com seu WhatsApp";
    addLog("QR Code recebido. Escaneie para conectar.");
});

socket.on("ready", () => {
    qrcodeDiv.innerHTML = ";
    statusDiv.textContent = "Bot pronto e conectado!";
    addLog("Bot conectado e pronto para uso.");
});

socket.on("authenticated", () => {
    statusDiv.textContent = "Autenticado!";
    addLog("Bot autenticado.");
});

socket.on("auth_failure", (msg) => {
    statusDiv.textContent = `Falha na autenticação: ${msg}`;
    addLog(`Falha na autenticação: ${msg}`);
});

socket.on("disconnected", (reason) => {
    statusDiv.textContent = `Desconectado: ${reason}`;
    qrcodeDiv.innerHTML = ";
    addLog(`Bot desconectado: ${reason}`);
});

socket.on("loading_screen", (percent, message) => {
    statusDiv.textContent = `Carregando: ${percent}% - ${message}`;
    addLog(`Carregando: ${percent}% - ${message}`);
});

// Mensagem inicial para o usuário
addLog("Aguardando o bot iniciar...");

