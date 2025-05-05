document.getElementById('signupSubmit').addEventListener('click', async function(e) {
    
    const signupUsr = document.getElementById("signupUsr").value;
    const signupPW = document.getElementById("signupPW").value;
  
    e.preventDefault();
  
    // Send a POST (HTML) request to the server (async function)
    const response = await fetch('/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ signupUsr, signupPW })
    });
    
    const data = await response.json();
      if (data.result === "true"){
        window.location.href = data.redirect;
        document.getElementById("userExists").textContent = "";
      } else {
        document.getElementById("userExists").textContent = "The Username is already taken!";
      }
});
  