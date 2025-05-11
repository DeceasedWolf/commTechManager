import api from './api';
import config from '../config';

type User = { email: string; name?: string; isAdmin: boolean };

export async function getCurrentUser(): Promise<User> {
    const res = await api.get('/auth/me'); // implement this endpoint in backend
    return res.data;
}

export function signInWithGoogle() {
    window.location.href = `${config.API_URL}/auth/google`;
}

export function signOut() {
    window.location.href = `${config.API_URL}/auth/complete-logout`;
}
