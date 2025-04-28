import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { ensureAuth } from '../middlewares/ensureAuth';
import { sendReturnNotice } from '../services/mailer';
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
 * Body: { itemId: number, dueDate: string (YYYY-MM-DD) }
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

        const due = new Date(dueDate);
        // set time to 23:59:59
        due.setHours(23, 59, 59, 999);

        const borrow = await prisma.borrow.create({
            data: {
                userId: user.id,
                itemId: Number(itemId),
                dueDate: due
            }
        });
        return res.status(201).json(borrow);
    } catch (err) {
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
