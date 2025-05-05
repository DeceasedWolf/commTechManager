import api from './api';

type User = { email: string; name?: string; isAdmin: boolean };

export async function getCurrentUser(): Promise<User> {
    const res = await api.get('/auth/me'); // implement this endpoint in backend
    return res.data;
}

export function signInWithGoogle() {
    window.location.href = 'http://localhost:8080/auth/google';
}

export function signOut() {
    window.location.href = 'http://localhost:8080/auth/complete-logout';
}
