import React from 'react';
import { Button } from 'react-bootstrap';
import { signInWithGoogle } from '../services/auth';

const SignIn: React.FC = () => (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Crescent School Equipment Checkout</h2>
        <Button onClick={signInWithGoogle}>Sign in with Google</Button>
    </div>
);

export default SignIn;