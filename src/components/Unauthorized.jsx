import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Unauthorized.css'

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleReturnToLogin = () => {
    navigate('/');
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <button className="unauthorized-logout-btn" onClick={handleReturnToLogin}>
          Return to Login
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;