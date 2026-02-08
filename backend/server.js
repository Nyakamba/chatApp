const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const socketio = require("socket.io");
const userRouter = require("./routes/userRoutes");
const groupRouter = require("./routes/groupRoutes");
const socketIo = require("./socket");

dotenv.config();

const app = express();

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

//Middlewwares
app.use(cors());
app.use(express.json());

//connect to db
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

//initialize socket.io
socketIo(io);
//Routes

app.use("/api/users", userRouter);
app.use("/api/groups", groupRouter);

//Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is up and running on port ${PORT}`);
});
