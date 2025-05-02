import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// SMTP configuration from environment
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send a reminder email to the borrower 24h before due and on due date
 * @param to Borrower email address
 * @param name Borrower na
 * @param itemName Name of the item
 * @param dueDate Date object representing due date/time
 */
export async function sendReminder(
    to: string,
    name: string,
    itemName: string,
    dueDate: Date
): Promise<void> {
    const dueDateStr = dueDate.toLocaleString('en-US', { dateStyle: 'full' });
    const subject = `Reminder: '${itemName}' due on ${dueDateStr}`;
    const text = `Hello ${name},

This is a friendly reminder that the item '${itemName}' you borrowed is due on ${dueDateStr}. Please return it by 11:59 PM.

Thank you,
Comm Tech Dept.`;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to,
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending reminder email:', err);
    }
}

/**
 * Notify administrators that a borrower has returned an item
 * @param borrowerName Name or email of borrower
 * @param itemName Name of the returned item
 * @param admins Array of admin email addresses
 */
export async function sendReturnNotice(
    borrowerName: string,
    itemName: string,
    admins: string[]
): Promise<void> {
    const subject = `Return Notice: '${itemName}' returned by ${borrowerName}`;
    const text = `Hello Admin,

The item '${itemName}' has been marked as returned by ${borrowerName}.

Regards,
Comm Tech Dept. Bot`;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: admins.join(','),
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending return notice email:', err);
    }
}

/**
 * Send email notification when item is due today
 * @param to Borrower email address
 * @param name Borrower name
 * @param itemName Name of the item
 * @param dueDate Date object representing due date/time
 */
export async function sendDueTodayNotice(
    to: string,
    name: string,
    itemName: string,
    dueDate: Date
): Promise<void> {
    const dueDateStr = dueDate.toLocaleString('en-US', { dateStyle: 'full' });
    const subject = `'${itemName}' is due TODAY`;
    const text = `Hello ${name},

This is a reminder that the item '${itemName}' you borrowed is due for return TODAY (${dueDateStr}).

Please return it by 11:59 PM today.

Thank you,
Comm Tech Dept.`;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to,
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending due-today notification email:', err);
    }
}

/**
 * Send overdue notification to borrower
 * @param to Borrower email address
 * @param name Borrower name
 * @param itemName Name of the item
 * @param dueDate Date object representing due date/time
 */
export async function sendOverdueNotice(
    to: string,
    name: string,
    itemName: string,
    dueDate: Date
): Promise<void> {
    const dueDateStr = dueDate.toLocaleString('en-US', { dateStyle: 'full' });
    const subject = `OVERDUE: '${itemName}' was due on ${dueDateStr}`;
    const text = `Hello ${name},

The item '${itemName}' you borrowed was due on ${dueDateStr} and is now OVERDUE.

Please return this item immediately.

If you have any questions or need assistance, please contact the Comm Tech Department.

Thank you,
Comm Tech Dept.`;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to,
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending overdue notification email:', err);
    }
}

/**
 * Notify administrators about overdue items
 * @param borrowerName Name of borrower
 * @param borrowerEmail Email of borrower
 * @param itemName Name of the overdue item
 * @param dueDate Date object representing due date/time
 * @param admins Array of admin email addresses
 */
export async function notifyAdminsOverdue(
    borrowerName: string,
    borrowerEmail: string,
    itemName: string,
    dueDate: Date,
    admins: string[]
): Promise<void> {
    const dueDateStr = dueDate.toLocaleString('en-US', { dateStyle: 'full' });
    const subject = `Alert: Item '${itemName}' is OVERDUE`;
    const text = `Hello Admin,

The following item is now overdue:

Item: ${itemName}
Borrower: ${borrowerName} (${borrowerEmail})
Due Date: ${dueDateStr}

This item has not been returned on time. An overdue notice has been automatically sent to the borrower.

Regards,
Comm Tech Dept. Bot`;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: admins.join(','),
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending admin overdue alert email:', err);
    }
}

/**
 * Notify administrators when an item is borrowed
 * @param borrowerName Name of borrower
 * @param borrowerEmail Email of borrower
 * @param itemName Name of the borrowed item
 * @param dueDate Date object representing due date/time
 * @param admins Array of admin email addresses
 */
export async function notifyAdminsBorrow(
    borrowerName: string,
    borrowerEmail: string,
    itemName: string,
    dueDate: Date,
    admins: string[]
): Promise<void> {
    const dueDateStr = dueDate.toLocaleString('en-US', { dateStyle: 'full' });
    const subject = `Item Borrowed: '${itemName}' by ${borrowerName}`;
    const text = `Hello Admin,

The following item has been borrowed:

Item: ${itemName}
Borrower: ${borrowerName} (${borrowerEmail})
Due Date: ${dueDateStr}

Regards,
Comm Tech Dept. Bot`;

    try {
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: admins.join(','),
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending admin borrow notification email:', err);
    }
}
