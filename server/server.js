const { serverHttp } = require('./app.js')
const { io } = require('./app.js')

const setupWebSocket = require('./webSockets.js'); // Certifique-se de que este caminho está correto
setupWebSocket(io);

const port = process.env.PORT || 8082;
serverHttp.listen(port, () => {
    console.log('Servidor rodando na porta', port)
})
