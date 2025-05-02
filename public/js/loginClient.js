document.getElementById('loginSubmit').addEventListener('click', async function(e) {


  const loginUsr = document.getElementById("loginUsr").value;
  const loginPW = document.getElementById("loginPw").value;

  e.preventDefault();

  // Send a POST (HTML) request to the server (async function)
  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ loginUsr, loginPW })
  });
  
  // Check if the response is ok and redirect to the appropriate page
  const data = await response.json();
    if (data.result === "true"){
      window.location.href = data.redirect;
      document.getElementById("wrongInput").textContent = "";
    } else {
      document.getElementById("wrongInput").textContent = "The Username or Password is Incorrect";
    }
  });
