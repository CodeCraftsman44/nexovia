const uuidv4 = require('uuid').v4;
const express = require("express");
const session = require('express-session');
const app = express();
const PORT = 7777;
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const usersPath = path.join(__dirname, 'public', 'db', 'users.json');
const data = fs.readFileSync(usersPath, 'utf8');
const users = JSON.parse(data);

app.use(cookieParser());

// Allow access to all public files except chat.html
app.use((req, res, next) => {
  // Skipping the chat.html file while serving all the public files
  if (req.path === '/chat.html') {
    next(); 
  } else {
    express.static(path.join(__dirname, 'public'))(req, res, next); 
  }
});

app.use(session({
  secret: 'TM7u1iODjv', // Secure key
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 600000 } // Session expires in 10 minutes
}));

app.use(express.json()); 
app.use(express.text()); 

// Allow access to chat.html only with a valid user session
app.get('/chat.html', (req, res) => {
  if (!req.session.userId) {
    // Redirect to login if no valid session
    res.redirect('/login.html');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  }
});

// Handle login requests
app.post('/login', (req, res) => {
  const userInput = req.body;

    for(const user of users){
      if (user.username === userInput.loginUsr){
        if (user.password === userInput.loginPW){
          // Correct User Input
          const sessionId = uuidv4();
          req.session.userId = sessionId;  
          req.session.username = user.username; 
          // Store username in the cookie
          res.cookie('sessionUsername', user.username, { maxAge: 3600000, path: '/' });
          console.log(`User ${user.username} logged in with session ID: ${sessionId}`);
          result = ({"result": "true"})
          return res.send(result);
        }
      } 
    }
      result = ({"result": "false"})
      res.send(result);
});

// Handle signup requests
app.post('/signup', (req, res) => {
  const userInput = req.body;

    for(const user of users){
      if (user.username === userInput.signupUsr){
         // Username already exists
        result = ({"result": "false"})
        return res.send(result);
      }
    } 

    const newUser = {
      username: userInput.signupUsr,
      password: userInput.signupPW, 
      userId: users.length + 1
    };
    users.push(newUser);
    // Replcer = null, 2 = spaces
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
    const sessionId = uuidv4();
    req.session.userId = sessionId;  
    req.session.username = userInput.signupUsr; 
    // Store username in the cookie
    res.cookie('sessionUsername', userInput.signupUsr, { maxAge: 3600000, path: '/' });
    console.log(`New user ${user.username} signed up with session ID: ${sessionId}`);
    result = ({"result": "true"})
    return res.send(result);
});

// Handle logout requests
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    // Clear the session cookie
    res.clearCookie('connect.sid');
    res.json({ result: "success" });
  });
});

/*
// Handle messages
app.post('/chat', (req, res) => {
  const userInput = req.body;
    console.log("message sent")
});
*/

// Handle send message request
app.post('/send-message', (req, res) => {
  const { sender, receiver, content } = req.body;
  const newMessage = {
    sender,
    receiver,
    content,
    timestamp: new Date().toISOString()
  };

  const messagesPath = path.join(__dirname, 'public', 'db', 'messages.json');
  const currentMessages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

  // Add the new message to the list
  currentMessages.push(newMessage);
  fs.writeFileSync(messagesPath, JSON.stringify(currentMessages, null, 2));
  res.json({ result: "success", message: newMessage });
});

// Handle get message request
app.get('/get-messages', (req, res) => {
  const messagesPath = path.join(__dirname, 'public', 'db', 'messages.json');
  const currentMessages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

  // Last timestamp
  const lastFetched = req.query.lastFetched;  
  if (!lastFetched) {
    return res.json({ messages: currentMessages });
  }

  // Messages newer then "last timestamp"
  const newMessages = currentMessages.filter(message => new Date(message.timestamp) > new Date(lastFetched));
  res.json({ messages: newMessages });
});

app.use((req, res) => {
  res.status(404);
  res.end()
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
