import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    // Main container with a background and centered layout
    <main 
      className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4"
      style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' stroke=\'%23d1d5db\' stroke-width=\'1\'%3E%3Cpath d=\'M0 40h80M40 0v80\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundSize: '40px 40px'
      }}
    >
      {/* Semi-transparent card for the content */}
      <div className="text-center p-8 md:p-12 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg max-w-2xl">
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800">
          Welcome to BuildWise
        </h1>
        
        {/* Sub-headline */}
        <p className="mt-4 text-lg text-gray-600">
          The intelligent platform for monitoring your construction projects.
        </p>

        {/* Call-to-action buttons container */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          
          {/* Login Button (Primary Action) */}
          <Link to="/login">
            <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-300">
              Go to Login
            </button>
          </Link>

          {/* Register Button (Secondary Action) */}
          <Link to="/register">
            <button className="w-full sm:w-auto px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-300">
              Go to Register
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default HomePage;