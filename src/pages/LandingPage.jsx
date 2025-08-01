import React from "react";
import { useNavigate } from "react-router-dom";
import './Styles.css'; 


const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="overlay">
        <h1 className="title">Welcome to Farm Manager</h1>
        <p className="subtitle">Simplify your farm operations with ease</p>
        <button className="login-button" onClick={() => navigate("/login")}>
          Get Started
        </button>
      </div>
    </div>
  );
};

export default LandingPage;