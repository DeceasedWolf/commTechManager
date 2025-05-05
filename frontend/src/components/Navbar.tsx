import React from 'react';
import { Container, Navbar as BootstrapNavbar, Button } from 'react-bootstrap';
import { signOut } from '../services/auth';

const Navbar: React.FC = () => {
  return (
    <BootstrapNavbar bg="light" expand="lg" className="mb-3">
      <Container fluid>
        <BootstrapNavbar.Brand href="/">CommTech Manager</BootstrapNavbar.Brand>
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={signOut} 
          className="ms-auto"
        >
          Log Out
        </Button>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
