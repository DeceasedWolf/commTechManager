import React from 'react';
import { Container, Navbar as BootstrapNavbar, Button } from 'react-bootstrap';
import { signOut } from '../services/auth';
import { useTheme } from '../context/ThemeContext';
import { BsSun, BsMoon } from 'react-icons/bs';

const Navbar: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <BootstrapNavbar bg={darkMode ? "dark" : "light"} variant={darkMode ? "dark" : "light"} expand="lg" className="mb-3">
      <Container fluid>
        <BootstrapNavbar.Brand href="/">CommTech Manager</BootstrapNavbar.Brand>
        <div className="d-flex align-items-center">
          <Button
            variant={darkMode ? "outline-light" : "outline-dark"}
            size="sm"
            onClick={toggleDarkMode}
            className="me-2 d-flex align-items-center justify-content-center"
            aria-label="Toggle dark mode"
            style={{ width: '32px', height: '32px', padding: '0' }}
          >
            {darkMode ? BsSun({ size: 16 }) : BsMoon({ size: 16 })}
          </Button>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={signOut}
          >
            Log Out
          </Button>
        </div>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
