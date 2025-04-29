import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {ensureAdmin, ensureAuth} from '../middlewares/ensureAuth';
import { getAdminList, addAdmin, removeAdmin } from '../utils/adminList';

const prisma = new PrismaClient();
const router = Router();

// Configure multer for image uploads (8MB max)
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// Protect all admin routes
router.use(ensureAuth, ensureAdmin);

// Typed delete handler
const handleDeleteItem: RequestHandler = async (req, res, next) => {
    const id = Number(req.params.id);
    console.log(`🗑️  Deleting item with ID: ${id}`);

    try {
        // First check if the item exists
        const item = await prisma.item.findUnique({ 
            where: { id },
            include: {
                borrows: {
                    where: { returned: false }
                }
            }
        });

        if (!item) {
            console.log(`⚠️  Item ${id} not found`);
            res.status(404).json({ error: 'Item not found' });
            return;
        }

        // Check if there are any active borrows
        if (item.borrows && item.borrows.length > 0) {
            console.log(`⚠️  Item ${id} has active borrows and cannot be deleted`);
            res.status(409).json({ 
                error: 'Cannot delete item that is currently borrowed' 
            });
            return;
        }

        // Delete associated borrow records first (even returned ones)
        await prisma.borrow.deleteMany({
            where: { itemId: id }
        });
        console.log(`✅ Deleted borrow records for item ${id}`);

        // Then delete the image file if it exists
        if (item.imagePath) {
            const filename = path.basename(item.imagePath);
            const fullPath = path.join(uploadDir, filename);
            try {
                await fs.promises.unlink(fullPath);
                console.log(`✅ Deleted image file: ${fullPath}`);
            } catch (fileErr) {
                console.warn(`⚠️  Could not delete image file ${fullPath}`, fileErr);
            }
        }

        // Finally delete the item
        await prisma.item.delete({ where: { id } });
        console.log(`✅ Deleted item record ${id} from database`);
        res.sendStatus(204);
        return;
    } catch (err) {
        console.error('❌ Failed to delete item:', err);
        res.status(500).json({ error: 'Failed to delete item' });
        return;
    }
};


// GET /admin/items - list all items
router.get('/items', async (_req: Request, res: Response) => {
    const items = await prisma.item.findMany();
    res.json(items);
});

// POST /admin/items - create a new item (with optional image)
router.post('/items', upload.single('image'), async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        const item = await prisma.item.create({ data: { name, description, imagePath } });
        res.status(201).json(item);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create item' });
    }
});

// DELETE /admin/items/:id
router.delete('/items/:id', handleDeleteItem);


// GET /admin/borrows - list all borrow records
router.get('/borrows', async (_req: Request, res: Response) => {
    const borrows = await prisma.borrow.findMany({
        where: { returned: false },
        include: {
            user: true,
            item: true
        },
        orderBy: { id: 'desc' }
    });
    res.json(borrows);
});

// GET /admin/admins - list all admin emails
router.get('/admins', (_req: Request, res: Response) => {
    const admins = getAdminList();
    res.json(admins);
});

// POST /admin/admins - add an admin email
router.post('/admins', async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        addAdmin(email);
        res.status(201).json({ message: 'Admin added', admins: getAdminList() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add admin' });
    }
});

// DELETE /admin/admins - remove an admin email
router.delete('/admins', async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        removeAdmin(email);
        res.json({ message: 'Admin removed', admins: getAdminList() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove admin' });
    }
});

export default router;

