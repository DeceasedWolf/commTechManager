import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './components/SignIn';
import BorrowPanel from './components/BorrowPanel';
import AdminPanel from './components/AdminPanel';
import { getCurrentUser } from './services/auth';

type User = { email: string; name?: string; isAdmin: boolean };

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrentUser()
            .then(u => setUser(u))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!user) return <SignIn />;

    return (
        <Routes>
            <Route path="/" element={
                user.isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/borrow" replace />
            } />
            <Route path="/borrow" element={<BorrowPanel />} />
            <Route path="/admin" element={user.isAdmin ? <AdminPanel /> : <Navigate to="/borrow" replace />} />
        </Routes>
    );
};

export default App;