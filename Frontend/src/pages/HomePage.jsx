import React from 'react';
import { Link } from 'react-router-dom';

// A simple landing page
function HomePage() {
  return (
    <>
    
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Welcome to BuildWise</h1>
      <p>The intelligent platform for monitoring your construction projects.</p>
      <Link to="/login">
        <button style={{ padding: '10px 20px', fontSize: '16px' }}>Go to Login</button>
      </Link>

      <Link to="/register">
        <button style={{ padding: '10px 20px', fontSize: '16px' }}>Go to register</button>
      </Link>
    </div>
    
   
    
    </>

   

  );
}

export default HomePage;
