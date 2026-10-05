import nodemailer from "nodemailer";
import { CFG } from "./config";

export const smtpConfigured = Boolean(CFG.smtp.host && CFG.smtp.user && CFG.smtp.password);

export async function sendConfirmationEmail(to: string, name: string, token: string): Promise<void> {
  if (!smtpConfigured) {
    if (CFG.isProduction) throw new Error("auth.emailUnavailable");
    return;
  }
  const transport = nodemailer.createTransport({
    host: CFG.smtp.host,
    port: CFG.smtp.port,
    secure: CFG.smtp.port === 465,
    requireTLS: CFG.smtp.port !== 465,
    tls: { minVersion: "TLSv1.2" },
    auth: { user: CFG.smtp.user, pass: CFG.smtp.password },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const url = new URL("/auth/confirm", CFG.publicWebUrl);
  url.searchParams.set("token", token);
  await transport.sendMail({
    from: CFG.smtp.from,
    to,
    subject: "Confirm your Kuopio Bites account",
    text: `Hi ${name},\n\nConfirm your account here (valid for 24 hours):\n${url.toString()}\n\nIf you did not create this account, ignore this message.`,
  });
}
