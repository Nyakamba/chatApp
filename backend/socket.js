const socketIo = (io) => {
  //Store connected users with their room information using socket.id as their key
  const connectedUsers = new Map();

  //Handle socket connection
  io.on("connection", (socket) => {
    //Get user from authenticatiion
    const user = socket.handshake.auth.user;
    console.log("User Connected", user?.username);
    console.log(user);

    //!START: Join room handler
    socket.on("join-room", (groupId) => {
      //Add socket to the specified room
      socket.join(groupId);
      //Store user and room information in connectedUsers map
      connectedUsers.set(socket.id, { user, room: groupId });
      //Get list of all users currently in the room
      const usersInRoom = Array.from(connectedUsers.values())
        .filter((u) => u.room === groupId)
        .map((u) => u.user);

      //Emit updated user list to all clients in the room
      io.to(groupId).emit("users-in-room", usersInRoom);

      //Broadcast to other clients in the room that a new user has joined
      socket.to(groupId).emit("notification", {
        type: "USER_JOINED",
        message: `${user?.username} has joined the chat`,
        user: user,
      });
    });
    //!END: Join room handler

    //!START: Leave room handler
    //Triggered when a user manually leaves a room
    socket.on("leave-room", (groupId) => {
      console.log(`${user?.username} leaving room:`, groupId);
      //Remove socket from the room
      socket.leave(groupId);

      //Remove user from connectedUsers map
      if (connectedUsers.has(socket.id)) {
        connectedUsers.delete(socket.id);
        socket.to(groupId).emit("user-left", user?._id);
      }
    });
    //!END: Leave room handler

    //!START: New Message Handler
    //Triggered when a user sends a new message
    socket.on("new-message", (message) => {
      const { message: content, groupId } = message;
      const sender = user;

      //Broadcast the new message to all clients in the room
      socket.to(groupId).emit("message-received", content);
    });
    //!END: New Message Handler

    //!START: Disconnect Handler
    //Triggered when a user disconnects (e.g. closes browser, loses connection)
    socket.on("disconnect", () => {
      console.log("User Disconnected", user?.username);
      //Get user and room information from connectedUsers map
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        const { user, room } = userInfo;
        //Remove user from connectedUsers map
        connectedUsers.delete(socket.id);
        //Broadcast to other clients in the room that a user has left
        socket.to(room).emit("user-left", user?._id);
        // //Emit updated user list to all clients in the room
        // const usersInRoom = Array.from(connectedUsers.values())
        //   .filter((u) => u.room === room)
        //   .map((u) => u.user);
        // io.to(room).emit("users-in-room", usersInRoom);
      }
    });
    //!END: Disconnect Handler

    //!START: Typing Indicator Handler
    //Triggered when a user starts typing
    socket.on("typing", ({ groupId, username }) => {
      //Broadcast to other clients in the room that a user is typing
      socket.to(groupId).emit("user-typing", username);
    });

    //Triggered when a user stops typing
    socket.on("stop-typing", ({ groupId, username }) => {
      //Broadcast to other clients in the room that a user has stopped typing
      socket.to(groupId).emit("user-stop-typing", username);
    });
    //!END: Typing Indicator Handler
  });
};

module.exports = socketIo;
