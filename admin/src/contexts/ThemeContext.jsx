import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('adminTheme');
    console.log('🎨 Initial theme from localStorage:', savedTheme); // DEBUG
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    console.log('🎨 Theme changed to:', theme); // DEBUG
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log('🌙 Added dark class to root'); // DEBUG
    } else {
      root.classList.remove('dark');
      console.log('☀️ Removed dark class from root'); // DEBUG
    }
    
    // Save to localStorage
    localStorage.setItem('adminTheme', theme);
    console.log('💾 Saved theme to localStorage:', theme); // DEBUG
  }, [theme]);

  const toggleTheme = () => {
    console.log('🔄 Toggle theme clicked'); // DEBUG
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      console.log('🔄 Toggling from', prevTheme, 'to', newTheme); // DEBUG
      return newTheme;
    });
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setLightTheme, 
      setDarkTheme,
      isDark: theme === 'dark' 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
