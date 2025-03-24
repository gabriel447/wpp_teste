require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, NoAuth } = require('whatsapp-web.js');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const server = createServer(app);
const io = new Server(server);

let qrCodeData = '';
let isConnected = false;

const client = new Client({
    authStrategy: new NoAuth()
});

client.on('qr', async qr => {
    if (!isConnected) {
        qrCodeData = await qrcode.toDataURL(qr);
        io.emit('qr', qrCodeData);
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    isConnected = true;
    qrCodeData = '';
    io.emit('connected');
});

client.on('message_create', async (message) => {
    let replyMessage;
    const idMessage = crypto.randomUUID();

    if (message.body === '!ping') {
        replyMessage = 'pong';
        await message.reply(replyMessage);

        try {
            await axios.post(process.env.API_URL, {
                id: idMessage,
                message: replyMessage
            });
        } catch (error) {
            console.error('Erro ao enviar para a API:', error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp QR Code</title>
                <script src="/socket.io/socket.io.js"></script>
                <script>
                    const socket = io();

                    socket.on('qr', (qrCode) => {
                        document.getElementById('content').innerHTML = \`
                            <h2>Escaneie o QR Code para conectar</h2>
                            <img src="\${qrCode}" width="300" height="300"/>
                        \`;
                    });

                    socket.on('connected', () => {
                        document.getElementById('content').innerHTML = \`
                            <h2 style="color: green;">✅ WhatsApp Conectado!</h2>
                            <p>Agora você pode usar seu bot no WhatsApp.</p>
                        \`;
                    });
                </script>
                <style>
                    body { display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif; text-align: center; }
                </style>
            </head>
            <body>
                <div id="content">
                    <h2>Carregando QR Code...</h2>
                </div>
            </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;

function getServerUrl() {
    const host = process.env.HOST || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
    return `${protocol}${host}:${PORT}`;
}

server.listen(PORT, () => {
    const serverUrl = getServerUrl();
    console.log(`Servidor rodando em ${serverUrl}`);
});