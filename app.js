const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(http);

const users = {};
const socketRoomMap = {}

io.on('connection', (socket) =>{
  socket.on('join-room', (roomId, userDetails)=>{
    //adding users to a room so that we can broadcast messages
    socket.join(roomId);

    //adding map users to room
    if (users[roomId]){
      users[roomId].push({socketId: socket.id, ...userDetails});
    }else {
      users[roomId] = [{socketId: socket.id, ...userDetails}];
    }
    //adding map of socketid to room
    socketRoomMap[socket.id] = roomId;
    const usersInThisRoom = users[roomId].filter(
        (user)=> user.socketId !== socket.id
    );

    // once a new user has joined, the app will send the details of users who are already present in the room
    socket.emit('users-present-in-room', usersInThisRoom);
  });
socket.on('initiate-signal', (payload) =>{
  const roomId = socketRoomMap[socket.id];
  let room = users[roomId];
  let name = '';
  if (room) {
    const user = room.find((user) => user.socketId === socket.id);
    name = user.name;
  }
  /* once a peer wants to initiate signal, to old user sending the user details along with signal */
  io.to(payload.userToSignal).emit('user-joined', {
    signal: payload.signal,
    callerId: payload.callerId,
    name,
  });
});

  /* once the peer acknowledges signal sending the acknowledgement back so that it can stream peer to peer */
  socket.on('ack-signal', (payload) => {
    io.to(payload.callerId).emit('signal-accepted', {
      signal: payload.signal,
      id: socket.id,
    });
  });
  socket.on('disconnect', () =>{
    const roomId = socketRoomMap[socket.id];
    let room = users[roomId];
    if (room){
      room = room.filter((user) => user.socketId !== socket.id);
      users[roomId] = room;
    }
    // on disconnect sending to all users that user has disconnected
    socket.to(roomId).broadcast.emit('user-disconnected', socket.id);
  });
});
app.listen(3000, () =>{
  console.log('listening on ' + 'port: 3000');
});