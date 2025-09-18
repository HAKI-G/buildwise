import React from 'react';

// A simple, reusable button component
function Button({ onClick, children, type = 'button', style }) {
  const buttonStyle = {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#007bff',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    ...style, // Allow custom styles to be passed
  };

  return (
    <button type={type} onClick={onClick} style={buttonStyle}>
      {children}
    </button>
  );
}

export default Button;