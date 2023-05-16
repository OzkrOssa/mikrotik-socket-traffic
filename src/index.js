import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RouterOSClient } from 'routeros-client';
import * as dotenv from 'dotenv'

dotenv.config()

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: 'GET'
  }
});


const rooms = {};

io.on('connection', (socket) => {
  console.log('Connect');
  let traffic;
  let api;

  socket.on('join', ({ host, mikrotikInterface }) => {

    const room = `${host}_${mikrotikInterface}`
    console.log(`Host: ${host}, Interface: ${mikrotikInterface}`);

    // Crear una sala si no existe
    if (!rooms[room]) {
      rooms[room] = new Set();
    }

    // Agregar el cliente a la sala correspondiente
    rooms[room].add(socket);

    api = new RouterOSClient({
      host: host,
      user: process.env.MIKROTIK_API_USER,
      password: process.env.MIKROTIK_API_PASSWORD
    });

    console.log(rooms);
    api.connect().then((client) => {
      const monitorTraffic = client.menu("/interface monitor-traffic");
      traffic = monitorTraffic.where({
        interface: mikrotikInterface
      }).stream((err, data) => {
        if (err) {
          // Error al transmitir
          console.log(err);
          return;
        }

        if (data && data.length > 0) {
          const { rxBitsPerSecond: rx, txBitsPerSecond: tx } = data[0];
          if (rooms[room] && typeof rooms[room].forEach === 'function') {
            rooms[room].forEach(clientSocket => {
              clientSocket.emit('traffic', { rx: rx / 1000000, tx: tx / 1000000 });
            });
          }
        } else {
          io.emit('traffic', { rx: 0, tx: 0 })
        }



      });
    }).catch((err) => {
      // Error al intentar conectar
      console.log(err);
    });

    // Resto del código para la conexión y transmisión de tráfico utilizando los parámetros recibidos
  });

  socket.on('disconnect', () => {
    console.log('Disconnect');

    // Cerrar el streaming de tráfico y desconectar el cliente de la sala correspondiente
    if (traffic) {
      traffic.close();
    }

    if (api) {
      api.close();
    }

    if (rooms) {
      Object.keys(rooms).forEach((room) => {
        if (rooms[room].has(socket)) {
          rooms[room].delete(socket);

          // Si no hay más clientes en la sala, eliminarla
          if (rooms[room].size === 0) {
            delete rooms[room];
          }
        }
      });
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
