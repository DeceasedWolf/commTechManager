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
 * @param name Borrower name
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
            from: process.env.SMTP_SENDER,
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
Comm Tech Dept.`;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_SENDER,
            to: admins.join(','),
            subject,
            text,
        });
    } catch (err) {
        console.error('Error sending return notice email:', err);
    }
}
