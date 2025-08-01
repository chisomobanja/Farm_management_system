import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './Styles.css';

const Login = () => {
  const [username, setUsername] = useState(""); // used in input and login
  const [password, setPassword] = useState(""); // used in input and login
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
     },
     body: JSON.stringify({ username, password }),
    })
      const data = await response.json();

      if (response.ok) {
  const { token, user, role } = data;

  localStorage.setItem("token", token);

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "supervisor") {
      const dept = user.department_name ? user.department_name.toLowerCase() : "";
      if (dept) {
        navigate('/dashboard');
      } else {
        alert("No department assigned to user.");
      }
    } else if (user.role === "farmowner") {
      navigate('/dashboard');
    }
  } 
  // else if (role === "farmowner") {
  //   // fallback if backend returns only role
  //   localStorage.setItem("user", JSON.stringify({ role: "farmowner" }));
  //   navigate("/dashboard");
  // } 
  else {
    alert("Unexpected login response.");
  }
}

    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;