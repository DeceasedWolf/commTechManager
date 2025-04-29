import fs from 'fs';
import path from 'path';

const ADMIN_FILE = path.resolve(__dirname, '../../admin-emails.json');
const DEFAULT_ADMINS = [
    'hsinger@crescentschool.org',
    'CMcGregor@crescentschool.org',
    'deceasedwolf@gmail.com',
    'mathisluo@crescentschool.org'
];

// Ensure the admin file exists; if not, initialize with defaults
function ensureAdminFile() {
    if (!fs.existsSync(ADMIN_FILE)) {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(DEFAULT_ADMINS, null, 2), 'utf-8');
    }
}

// Read and return the list of admin emails
export function getAdminList(): string[] {
    ensureAdminFile();
    try {
        const data = fs.readFileSync(ADMIN_FILE, 'utf-8');
        return JSON.parse(data) as string[];
    } catch (err) {
        console.error('Error reading admin list:', err);
        return [...DEFAULT_ADMINS];
    }
}

// Save the provided list of admin emails
export function saveAdminList(admins: string[]): void {
    try {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error writing admin list:', err);
        throw err;
    }
}

// Add a new admin email if not already present
export function addAdmin(email: string): void {
    const admins = getAdminList();
    if (!admins.includes(email)) {
        admins.push(email);
        saveAdminList(admins);
    }
}

// Remove an admin email if present
export function removeAdmin(email: string): void {
    let admins = getAdminList();
    admins = admins.filter((e) => e !== email);
    saveAdminList(admins);
}
