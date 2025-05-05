import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { ensureAuth } from '../middlewares/ensureAuth';
import { sendReturnNotice, notifyAdminsBorrow } from '../services/mailer';
import { getAdminList } from '../utils/adminList';

const prisma = new PrismaClient();
const router = Router();

// Protect all borrow routes
router.use(ensureAuth);

/**
 * GET /borrow/items
 * List all available items (not currently borrowed)
 */
router.get('/items', async (_req: Request, res: Response) => {
    try {
        const items = await prisma.item.findMany({
            where: {
                NOT: {
                    borrows: {
                        some: { returned: false }
                    }
                }
            }
        });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch available items' });
    }
});

/**
 * GET /borrow/my
 * List current user's active borrow records
 */
router.get('/my', async (req: Request, res: Response) => {
    const user = req.user as any;
    try {
        const borrows = await prisma.borrow.findMany({
            where: { userId: user.id, returned: false },
            include: { item: true }
        });
        res.json(borrows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch your borrows' });
    }
});

/**
 * POST /borrow
 * Borrow an item until a due date
 * Body: { itemId: number, dueDate: string (DD/MM/YYYY) }
 */
router.post('/', (async (req: Request, res: Response) => {
    const user = req.user as any;
    const { itemId, dueDate } = req.body;

    if (!itemId || !dueDate) {
        return res.status(400).json({ error: 'Missing itemId or dueDate' });
    }

    try {
        // Check availability
        const active = await prisma.borrow.findFirst({
            where: { itemId: Number(itemId), returned: false }
        });
        if (active) {
            return res.status(409).json({ error: 'Item is already borrowed' });
        }

        // Parse DD/MM/YYYY format
        const [day, month, year] = dueDate.split('/').map(Number);
        const due = new Date(year, month - 1, day); // month is 0-indexed in JS Date
        
        // Validate date is valid
        if (isNaN(due.getTime())) {
            return res.status(400).json({ error: 'Invalid date format. Please use DD/MM/YYYY.' });
        }
        
        // Get today and tomorrow dates for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get one year from today
        const oneYearFromToday = new Date(today);
        oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
        
        // Validate that due date is at least tomorrow
        if (due < tomorrow) {
            return res.status(400).json({ error: 'Due date must be at least tomorrow.' });
        }
        
        // Validate that due date is not more than one year in the future
        if (due > oneYearFromToday) {
            return res.status(400).json({ error: 'Due date cannot be more than one year in the future.' });
        }
        
        // set time to 23:59:59
        due.setHours(23, 59, 59, 999);

        const borrow = await prisma.borrow.create({
            data: {
                userId: user.id,
                itemId: Number(itemId),
                dueDate: due,
                borrowedAt: new Date() // Add explicit borrowedAt timestamp
            },
            include: {
                item: true,
                user: true
            }
        });

        try {
            // Notify admins about the new borrow
            const admins = getAdminList();
            await notifyAdminsBorrow(
                borrow.user.name || borrow.user.email,
                borrow.user.email,
                borrow.item.name,
                borrow.dueDate,
                admins
            );
        } catch (emailErr) {
            // Log error but don't fail the request if email sending fails
            console.error("Failed to send admin notification:", emailErr);
        }
        
        return res.status(201).json(borrow);
    } catch (err) {
        console.error("Borrow error:", err);
        return res.status(500).json({ error: 'Failed to create borrow record' });
    }
}) as unknown as RequestHandler);

/**
 * POST /borrow/return/:id
 * Mark a borrow record as returned
 */
router.post('/return/:id', (async (req: Request, res: Response) => {
    const user = req.user as any;
    const borrowId = Number(req.params.id);

    try {
        // Fetch the borrow record
        const record = await prisma.borrow.findUnique({
            where: { id: borrowId },
            include: { item: true, user: true }
        });
        if (!record || record.returned) {
            return res.status(404).json({ error: 'Borrow record not found or already returned' });
        }

        // Update the record as returned
        const updated = await prisma.borrow.update({
            where: { id: borrowId },
            data: { returned: true, returnedAt: new Date() }
        });

        // Notify admins via email
        const admins = getAdminList();
        await sendReturnNotice(record.user.name || record.user.email, record.item.name, admins);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark return' });
    }
}) as unknown as RequestHandler);

export default router;

