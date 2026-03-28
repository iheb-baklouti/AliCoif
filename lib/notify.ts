import nodemailer from "nodemailer";
import { getSiteUrl } from "@/lib/site-url";

function transporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

const FROM = process.env.SMTP_FROM;

export async function sendMailTo(to: string, subject: string, text: string) {
  const t = transporter();
  if (!t || !FROM) {
    console.info("[email stub]", { to, subject, text: text.slice(0, 200) });
    return;
  }
  await t.sendMail({ from: FROM, to, subject, text });
}

/**
 * Envoie un message Telegram à l'Admin.
 * Configurer TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID dans l'env.
 */
async function sendTelegramAdmin(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.info("[telegram stub]", message.slice(0, 200));
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!res.ok) {
      console.warn("[telegram] Erreur", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.warn("[telegram] Échec réseau", err);
  }
}

/** Nouvelle demande de réservation — notifier l'admin */
export async function notifyAdminNewReservation(opts: {
  clientName: string;
  serviceName: string;
  when: string;
  reservationId: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;
  const adminWa = process.env.ADMIN_WHATSAPP_E164?.replace(/\D/g, "");
  const base = getSiteUrl();
  const dash = `${base}/dashboard?tab=res`;
  const body = `Nouvelle réservation à traiter.\n\nClient : ${opts.clientName}\nService : ${opts.serviceName}\nCréneau : ${opts.when}\nID : ${opts.reservationId}\n\nTableau de bord : ${dash}`;

  if (adminEmail) {
    await sendMailTo(adminEmail, `[L'Artiste] Nouvelle réservation — action requise`, body);
  } else {
    console.info("[admin notify email skipped — ADMIN_NOTIFY_EMAIL / SMTP_USER]", body);
  }

  await sendTelegramAdmin(
    `💈 Nouvelle réservation\n${opts.clientName} — ${opts.serviceName}\n🕒 ${opts.when}\nVoir : ${dash}`
  );
}

export async function notifyClientReservationPending(opts: {
  to: string;
  name: string;
  serviceName: string;
  when: string;
}) {
  const text = `Bonjour ${opts.name},\n\nNous avons bien reçu votre demande pour « ${opts.serviceName} » le ${opts.when}.\n\nElle est en attente de validation par le salon. Vous recevrez un message dès qu'elle sera traitée.\n\n— L'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Demande de réservation reçue`, text);
}

export async function notifyClientReservationConfirmed(opts: {
  to: string;
  name: string;
  serviceName: string;
  when: string;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre réservation pour « ${opts.serviceName} » est confirmée pour le ${opts.when}.\n\nÀ bientôt,\nL'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Réservation confirmée`, text);
}

export async function notifyClientReservationRejected(opts: {
  to: string;
  name: string;
  reason?: string | null;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre demande de réservation n'a pas pu être acceptée.${opts.reason ? `\n\nMotif : ${opts.reason}` : ""}\n\nPour un autre créneau, passez par le site ou appelez-nous.\n\n— L'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Réservation non disponible`, text);
}

export async function notifyClientRescheduled(opts: {
  to: string;
  name: string;
  serviceName: string;
  when: string;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre rendez-vous pour « ${opts.serviceName} » a été replanifié au ${opts.when}.\n\n— L'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Nouveau créneau`, text);
}
