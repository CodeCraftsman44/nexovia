const uuidv4 = require('uuid').v4;
const express = require("express");
const session = require('express-session');
const app = express();
const PORT = 7777;
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const usersPath = path.join('C:\\Users\\matko\\OneDrive\\Desktop\\nexovia-1\\public\\db','users.json');
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

  for (const user of users) {
    if (user.username === userInput.loginUsr && user.password === userInput.loginPW) {
      const sessionId = uuidv4();
      req.session.userId = user.userId;
      req.session.username = user.username;
      req.session.role = user.role;

      res.cookie('sessionUsername', user.username, { maxAge: 3600000, path: '/' });
      console.log(`User ${user.username} logged in with session ID: ${sessionId}`);

      // Redirect based on role
      if (user.role === 'employee') {
        return res.json({ result: "true", redirect: '/employee.html' });
      } else if (user.role === 'manager') {
        return res.json({ result: "true", redirect: '/manager.html' });
      }
    }
  }

  res.json({ result: "false" });
});

// Handle signup requests
app.post('/signup', (req, res) => {
  const userInput = req.body;

    for(const user of users){
      if (user.username === userInput.signupUsr){
         // Username already exists
         res.json({ result: "false" });
      }
    } 

    const newUser = {
      userId: users.length + 1,
      username: userInput.signupUsr,
      password: userInput.signupPW, 
      role: "employee" // Default role
    };

    users.push(newUser);
    // Replacer = null, 2 = spaces
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
    const sessionId = uuidv4();
    req.session.userId = sessionId;  
    req.session.username = userInput.signupUsr; 
    // Store username in the cookie
    res.cookie('sessionUsername', userInput.signupUsr, { maxAge: 3600000, path: '/' });
    console.log(`New user ${userInput.signupUsr} signed up with session ID: ${sessionId}`);
    return res.json({ result: "true", redirect: '/employee.html' });
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

app.post('/create-proposal', (req, res) => {
  const { title, description, priority } = req.body;

  if (req.session.userId) {
    const user = users.find(u => u.userId === req.session.userId);

    if (user && user.role === 'employee') {
      const proposalsPath = path.join(__dirname, 'public', 'db', 'proposals.json');
      const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'));

      const newProposal = {
        id: proposals.length + 1,
        title,
        description,
        priority, // Add priority to the proposal
        createdBy: user.username,
        status: 'pending', // Default status
        timestamp: new Date().toISOString()
      };

      proposals.push(newProposal);
      fs.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));

      return res.json({ result: "success", proposal: newProposal });
    }
  }

  res.status(403).json({ result: "error", message: "Unauthorized" });
});

app.post('/update-proposal', (req, res) => {
  const { proposalId, action } = req.body;

  if (req.session.userId) {
    const user = users.find(u => u.userId === req.session.userId);

    if (user && user.role === 'manager') {
      const proposalsPath = path.join(__dirname, 'public', 'db', 'proposals.json');
      const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'));

      const proposal = proposals.find(p => p.id === proposalId);

      if (proposal) {
        proposal.status = action === 'approve' ? 'approved' : 'denied';
        fs.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));

        return res.json({ result: "success", proposal });
      }

      return res.status(404).json({ result: "error", message: "Proposal not found" });
    }
  }

  res.status(403).json({ result: "error", message: "Unauthorized" });
});
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ result: 'error', message: 'Failed to log out' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({ result: 'success', message: 'Logged out successfully' });
  });
});

app.get('/proposals', (req, res) => {
  if (req.session.userId) {
    const proposalsPath = path.join(__dirname, 'public', 'db', 'proposals.json');
    const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'));

    return res.json({ proposals });
  }

  res.status(403).json({ result: "error", message: "Unauthorized" });
});

app.use((req, res) => {
  res.status(404);
  res.end()
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
