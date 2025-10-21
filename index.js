const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY não está definida no arquivo .env");
    process.exit(1);
}

// Inicializa o Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 2
    }
});

// Configuração do Express e Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Variável global para armazenar a conexão do Socket.IO
let connectedSocket = null;

io.on("connection", (socket) => {
    console.log("Novo cliente conectado ao Socket.IO");
    connectedSocket = socket;

    socket.on("disconnect", () => {
        console.log("Cliente desconectado do Socket.IO");
        connectedSocket = null;
    });
});

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("QR RECEIVED", qr);
    if (connectedSocket) {
        connectedSocket.emit("qr", qr);
    }
});

client.on("ready", () => {
    console.log("Client is ready!");
    if (connectedSocket) {
        connectedSocket.emit("ready");
    }
});

client.on("authenticated", () => {
    console.log("Client authenticated!");
    if (connectedSocket) {
        connectedSocket.emit("authenticated");
    }
});

client.on("auth_failure", (msg) => {
    console.error("Authentication failure:", msg);
    if (connectedSocket) {
        connectedSocket.emit("auth_failure", msg);
    }
});

client.on("disconnected", (reason) => {
    console.log("Client disconnected:", reason);
    if (connectedSocket) {
        connectedSocket.emit("disconnected", reason);
    }
});

client.on("message", async msg => {
    console.log("MESSAGE RECEIVED", msg.body);

    const BOT_KEYWORD = "bot"; // Palavra-chave para ativar o bot

    // Verifica se a mensagem começa com a palavra-chave ou se é uma mensagem privada
    const isPrivateChat = msg.from.endsWith("@c.us");
    const startsWithKeyword = msg.body.toLowerCase().startsWith(BOT_KEYWORD.toLowerCase());

    // O bot responderá em chats privados ou em grupos se a palavra-chave for usada
    if (isPrivateChat || startsWithKeyword) {
        let promptText = msg.body;

        // Se for um grupo e a mensagem começar com a palavra-chave, remove a palavra-chave do prompt
        if (!isPrivateChat && startsWithKeyword) {
            promptText = msg.body.substring(BOT_KEYWORD.length).trim();
        }

        // Se o prompt estiver vazio após remover a palavra-chave em um grupo, não faz nada
        if (promptText.length === 0 && !isPrivateChat) {
            return;
        }

        try {
            // Adiciona a programação interna e o humor ácido ao prompt do Gemini
            // Inclui a instrução para simular busca na web e usar outros recursos do Gemini
            const fullPrompt = `Você é um amigo com humor ácido e descontraído. Responda de forma informal, divertida e sarcástica. Se for relevante, use seu conhecimento geral ou simule uma busca na web para responder. Não se limite a responder diretamente, adicione comentários irônicos ou observações peculiares. A mensagem do usuário é: "${promptText}"`;

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            msg.reply(text);

            // Emite o log para a interface web
            if (connectedSocket) {
                connectedSocket.emit("message", `Resposta enviada para ${msg.from}: ${text.substring(0, 50)}...`);
            }
        } catch (error) {
            console.error("Erro ao chamar a API do Gemini:", error);
            msg.reply("Ops! Parece que meu humor ácido está de férias. Tente novamente mais tarde.");

            // Emite o erro para a interface web
            if (connectedSocket) {
                connectedSocket.emit("message", `Erro ao processar mensagem: ${error.message}`);
            }
        }
    }
});

client.initialize();

// Inicia o servidor web
server.listen(PORT, () => {
    console.log(`Servidor web rodando em http://localhost:${PORT}`);
});

