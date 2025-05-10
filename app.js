const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 7777;

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Load users and proposals from JSON files
const usersPath = path.join(__dirname, "public", "db", "users.json");
const proposalsPath = path.join(__dirname, "public", "db", "proposals.json");
const users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
let proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf8"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Simulate session storage for logged-in users
let loggedInUsers = {};

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Find the user in the database
  const user = users.find((u) => u.username === username.toLowerCase());

  if (!user) {
    return res.status(401).send({ error: "invalid_credentials", message: "Username or password incorrect" });
  }

  // Compare the provided password with the stored password
  const isMatch = password === user.password; // Replace with bcrypt.compare if passwords are hashed
  if (!isMatch) {
    return res.status(401).send({ error: "invalid_credentials", message: "Username or password incorrect" });
  }

  // Check if the user is already logged in
  if (loggedInUsers[username]) {
    return res.status(401).send({ error: "already_logged_in", message: "User is already logged in!" });
  }

  // Mark the user as logged in
  loggedInUsers[username] = { username: user.username, role: user.role };

  console.log(`User ${user.username} logged in with role: ${user.role}`);

// Redirect based on role
if (user.role === "manager") {
  return res.json({ result: "success", redirect: `/manager.html?username=${user.username}`, role: "manager" });
} else if (user.role === "employee") {
  return res.json({ result: "success", redirect: `/employee.html?username=${user.username}`, role: "employee" });
}

  res.status(401).json({ result: "error", message: "Invalid username or password" });
});

// Logout route
app.post("/logout", (req, res) => {
  const { username } = req.body;

  if (loggedInUsers[username]) {
    delete loggedInUsers[username];
    console.log(`User ${username} logged out`);
    return res.json({ result: "success", message: "Logged out successfully" });
  }

  res.status(400).json({ result: "error", message: "User not logged in" });
});

app.get("/api/user", (req, res) => {
  const username = req.query.username;

  console.log("API /api/user called with username:", username); // Debug log
  console.log("Logged-in users:", loggedInUsers); // Debug log

  if (loggedInUsers[username]) {
    return res.json(loggedInUsers[username]);
  }

  res.status(401).json({ result: "error", message: "User not logged in" });
});

// Fetch all proposals
app.get("/api/proposals", (req, res) => {
  res.json(proposals);
});

// Update a proposal's status
app.post("/api/proposals/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const proposal = proposals.find((p) => p.id === parseInt(id));
  if (!proposal) {
    return res.status(404).json({ error: "Proposal not found" });
  }

  proposal.status = status;
  fs.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));

  // Broadcast the updated proposal to all connected clients
  broadcast({ type: "updateProposal", data: proposal });

  res.json(proposal);
});

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === "login") {
      const { username, role } = parsedMessage.data;

      let filteredProposals = [];
      if (role === "manager") {
        filteredProposals = proposals;
      } else if (role === "employee") {
        filteredProposals = proposals.filter((p) => p.createdBy.toLowerCase() === username.toLowerCase());
      }

      ws.send(JSON.stringify({ type: "proposals", data: filteredProposals }));
    }

    if (parsedMessage.type === "createProposal") {
      const { title, description, priority, createdBy } = parsedMessage.data;

      const newProposal = {
        id: proposals.length + 1,
        title,
        description,
        priority,
        createdBy,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      proposals.push(newProposal);
      fs.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));

      broadcast({ type: "newProposal", data: newProposal });
    }

    if (parsedMessage.type === "fetchProposals") {
      ws.send(JSON.stringify({ type: "proposals", data: proposals }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

// Broadcast a message to all connected WebSocket clients
function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});