import nodemailer from 'nodemailer';
export declare function getSmtpTransporter(): nodemailer.Transporter | null;
export declare function sendViaSmtp(opts: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}): Promise<void>;
//# sourceMappingURL=smtpProvider.d.ts.map