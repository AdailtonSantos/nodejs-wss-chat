const setupWebSocket = (io) => {
  io.on('connection', (socket) => {

    const { Emmiter } = require('./app.js')

    Emmiter.on('message', sentMessage => {
      io.emit('message', sentMessage)
    })

    socket.on('disconnect', () => {
      Emmiter.removeAllListeners()
    })

  });
};

module.exports = setupWebSocket;
