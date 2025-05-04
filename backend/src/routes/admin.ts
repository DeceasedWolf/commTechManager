import { Router, Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { ensureAdmin } from '../middlewares/ensureAuth';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)){
          fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Admin emails file path
const ADMIN_EMAILS_PATH = path.join(__dirname, '../../admin-emails.json');

// Email preferences directory path
const EMAIL_PREFERENCES_DIR = path.join(__dirname, '../../email-preferences');

// Ensure email preferences directory exists
if (!fs.existsSync(EMAIL_PREFERENCES_DIR)) {
    fs.mkdirSync(EMAIL_PREFERENCES_DIR, { recursive: true });
    console.log('Created email preferences directory');
}

// Default email preferences - removed user notification preferences
const DEFAULT_EMAIL_PREFERENCES = {
    adminOverdueAlert: true,
    adminBorrowNotification: true,
    adminReturnNotification: true
};

// Helper to read admin emails
function readAdminEmails(): string[] {
    try {
        if (fs.existsSync(ADMIN_EMAILS_PATH)) {
            const data = fs.readFileSync(ADMIN_EMAILS_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error reading admin emails:', err);
    }
    return [];
}

// Helper to write admin emails
function writeAdminEmails(emails: string[]): void {
    try {
        fs.writeFileSync(ADMIN_EMAILS_PATH, JSON.stringify(emails, null, 2));
    } catch (err) {
        console.error('Error writing admin emails:', err);
    }
}

// Helper to read email preferences for a user
function readEmailPreferences(email: string) {
    const preferencesPath = path.join(EMAIL_PREFERENCES_DIR, `${email}.json`);
    
    try {
        if (fs.existsSync(preferencesPath)) {
            const data = fs.readFileSync(preferencesPath, 'utf8');
            const prefs = JSON.parse(data);
            
            // Ensure the preferences object has all required fields with defaults
            return {
                ...DEFAULT_EMAIL_PREFERENCES,
                ...prefs
            };
        }
    } catch (err) {
        console.error(`Error reading email preferences for ${email}:`, err);
    }
    
    // Return default preferences if file doesn't exist or has an error
    return {...DEFAULT_EMAIL_PREFERENCES};
}

// Helper to write email preferences for a user
function writeEmailPreferences(email: string, preferences: any): void {
    try {
        const preferencesPath = path.join(EMAIL_PREFERENCES_DIR, `${email}.json`);
        fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2));
    } catch (err) {
        console.error(`Error writing email preferences for ${email}:`, err);
        throw err;
    }
}

// Add logging middleware
router.use((req, res, next) => {
    console.log(`Admin route accessed: ${req.method} ${req.path}`);
    next();
});

// Protect all admin routes
router.use(ensureAdmin);

/**
 * GET /admin/email-preferences
 * Get current admin's email preferences
 */
router.get('/email-preferences', (async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        if (!user || !user.email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const preferences = readEmailPreferences(user.email);
        res.json(preferences);
    } catch (err) {
        console.error('Error fetching email preferences:', err);
        res.status(500).json({ error: 'Failed to fetch email preferences' });
    }
}) as RequestHandler);

/**
 * POST /admin/email-preferences
 * Save admin's email preferences
 */
router.post('/email-preferences', (async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        if (!user || !user.email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Validate required fields - only admin notification preferences
        const preferences = {
            adminOverdueAlert: req.body.adminOverdueAlert === true,
            adminBorrowNotification: req.body.adminBorrowNotification === true,
            adminReturnNotification: req.body.adminReturnNotification === true
        };
        
        // Save preferences to file
        writeEmailPreferences(user.email, preferences);
        
        res.json({ success: true, preferences });
    } catch (err) {
        console.error('Error saving email preferences:', err);
        res.status(500).json({ error: 'Failed to save email preferences' });
    }
}) as RequestHandler);

/**
 * GET /admin/items
 * List all items
 */
router.get('/items', (async (_req: Request, res: Response) => {
    try {
        console.log('Fetching all items');
        const items = await prisma.item.findMany({
            orderBy: { id: 'desc' }
        });
        console.log(`Found ${items.length} items`);
        res.json(items);
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
}) as RequestHandler);

/**
 * GET /admin/borrows
 * List all borrow records
 */
router.get('/borrows', (async (_req: Request, res: Response) => {
    try {
        console.log('Fetching all borrow records');
        const borrows = await prisma.borrow.findMany({
            where: { returned: false },
            include: {
                user: true,
                item: true
            },
            orderBy: { dueDate: 'asc' }
        });
        console.log(`Found ${borrows.length} active borrows`);
        res.json(borrows);
    } catch (err) {
        console.error('Error fetching borrows:', err);
        res.status(500).json({ error: 'Failed to fetch borrows' });
    }
}) as RequestHandler);

/**
 * GET /admin/admins
 * List all admin emails
 */
router.get('/admins', ((_req: Request, res: Response) => {
    try {
        console.log('Fetching admin list');
        const admins = readAdminEmails();
        console.log(`Found ${admins.length} admins`);
        res.json(admins);
    } catch (err) {
        console.error('Error fetching admins:', err);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
}) as RequestHandler);

/**
 * POST /admin/items
 * Create a new item
 */
router.post('/items', upload.single('image'), (async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const file = req.file;

    if (!name) {
        return res.status(400).json({ error: 'Item name is required' });
    }

    try {
        console.log('Creating new item:', name);
        const item = await prisma.item.create({
            data: {
                name,
                description: description || null,
                imagePath: file ? `/uploads/${file.filename}` : null
            }
        });
        
        console.log('Item created:', item);
        res.status(201).json(item);
    } catch (err) {
        console.error('Error creating item:', err);
        res.status(500).json({ error: 'Failed to create item' });
    }
}) as RequestHandler);

/**
 * DELETE /admin/items/:id
 * Delete an item
 */
router.delete('/items/:id', (async (req: Request, res: Response) => {
    const itemId = parseInt(req.params.id, 10);
    
    if (isNaN(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID' });
    }

    try {
        console.log(`Deleting item ${itemId}`);
        
        // Check if the item is currently borrowed
        const borrow = await prisma.borrow.findFirst({
            where: { itemId, returned: false }
        });

        if (borrow) {
            return res.status(400).json({ error: 'Cannot delete an item that is currently borrowed' });
        }

        // Get the item first to check for an image
        const item = await prisma.item.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Delete the item
        await prisma.item.delete({
            where: { id: itemId }
        });

        // Delete the image file if it exists
        if (item.imagePath) {
            try {
                const imagePath = path.join(__dirname, '../..', item.imagePath);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (imageErr) {
                console.error('Error deleting image file:', imageErr);
                // Continue without error since the item is already deleted
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
}) as RequestHandler);

/**
 * POST /admin/admins
 * Add a new admin
 */
router.post('/admins', (async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!email.endsWith('@crescentschool.org')) {
        return res.status(400).json({ error: 'Email must be from the crescentschool.org domain' });
    }

    try {
        console.log(`Adding new admin: ${email}`);
        const admins = readAdminEmails();
        
        if (admins.includes(email)) {
            return res.status(400).json({ error: 'Email is already an admin' });
        }
        
        admins.push(email);
        writeAdminEmails(admins);
        
        res.json({ success: true, admins });
    } catch (err) {
        console.error('Error adding admin:', err);
        res.status(500).json({ error: 'Failed to add admin' });
    }
}) as RequestHandler);

/**
 * DELETE /admin/admins
 * Remove an admin
 */
router.delete('/admins', (async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        console.log(`Removing admin: ${email}`);
        const admins = readAdminEmails().filter(e => e !== email);
        writeAdminEmails(admins);
        
        res.json({ success: true, admins });
    } catch (err) {
        console.error('Error removing admin:', err);
        res.status(500).json({ error: 'Failed to remove admin' });
    }
}) as RequestHandler);

export default router;
