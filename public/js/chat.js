function getCookie(name) {
  const cookieString = document.cookie;
  const regex = new RegExp('(^| )' + name + '=([^;]+)');
  const match = cookieString.match(regex);
  // If the cookie is found, return its value
  if (match) {
    return decodeURIComponent(match[2]);  
  }
  // Return null if the cookie is not found
  return null;
}
const sessionUsername = getCookie('sessionUsername');

console.log("Logged in as:", sessionUsername);

// Others messages in white
function displayMessage(text) {
    const newMessage = document.createElement('div');
    newMessage.textContent = text;
    newMessage.classList.add('message-left');
    document.getElementById('chat').appendChild(newMessage);
    document.getElementById('userMessage').value = '';
}

// Own message in green
function ownMessage(text){
    const newMessage = document.createElement('div');
    newMessage.textContent = text;
    newMessage.classList.add('message-right');
    document.getElementById('chat').appendChild(newMessage);
    document.getElementById('userMessage').value = '';
}

let lastFetchedTimestamp = null;
fetchMessages();

// Get Message
function fetchMessages() {
  // If == 0, load entire message history
  const url = lastFetchedTimestamp ? `/get-messages?lastFetched=${lastFetchedTimestamp}` : '/get-messages';
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const messages = data.messages;
      if (messages.length > 0) {
        lastFetchedTimestamp = messages[messages.length - 1].timestamp;
      }
      // Display the new messages
      messages.forEach(message => {
        if (message.sender == sessionUsername){
          ownMessage(`${message.content}`);
        }else {
          displayMessage(`${message.sender}: ${message.content}`);
        }
      });
    });
}

// Send a message
function sendMessage(content) {
  const data = {
    sender: sessionUsername,  // Current user
    receiver: 'someOtherUser', 
    content: content
  };
  fetch('/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }, 
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(responseData => {
    if (responseData.result === 'success') {
      console.log('Message sent:', responseData.message);
      fetchMessages();  
    }
  });
}

document.getElementById('messageSend').addEventListener('click', function(e) {
  const userMessage = document.getElementById("userMessage").value;
  if (userMessage.trim() !== '') {   //Remove whitespaces and check if not empty
      sendMessage(userMessage);
  }
});

// Polling (checks for new messages)
setInterval(fetchMessages, 1000);

// Quit button
document.getElementById('logout').addEventListener('click', function(e) {
  // Disables link of a href
  e.preventDefault(); 
  fetch('/logout', {
      method: 'POST',
  })
  .then(response => response.json())
  .then(data => {
      if (data.result === "success") {
          window.location.href = '/index.html'; 
      }
  });
});