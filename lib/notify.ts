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
 * Envoie un message WhatsApp via CallMeBot (gratuit, sans inscription API).
 * Configurer CALLMEBOT_PHONE (+21620392769) et CALLMEBOT_APIKEY dans l'env.
 * Pour obtenir la clé : envoyer "I allow callmebot to send me messages" sur
 * WhatsApp au +34 644 97 73 30.
 */
async function sendWhatsApp(phone: string, message: string) {
  const apiKey = process.env.CALLMEBOT_APIKEY;
  const botPhone = process.env.CALLMEBOT_PHONE;

  if (!apiKey || !botPhone) {
    // Fallback: log un lien wa.me cliquable dans les logs Vercel
    const link = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message.slice(0, 200))}`;
    console.info("[whatsapp link]", link);
    return;
  }

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", botPhone);
  url.searchParams.set("text", message.slice(0, 400));
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      console.warn("[callmebot] Erreur", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.warn("[callmebot] Échec réseau", err);
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

  if (adminWa) {
    await sendWhatsApp(
      adminWa,
      `L'Artiste — Nouvelle réservation\n${opts.clientName} — ${opts.serviceName}\n${opts.when}\nVoir : ${dash}`,
    );
  }
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
  phoneE164?: string | null;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre réservation pour « ${opts.serviceName} » est confirmée pour le ${opts.when}.\n\nÀ bientôt,\nL'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Réservation confirmée`, text);
  const phone = opts.phoneE164?.replace(/\D/g, "");
  if (phone) {
    await sendWhatsApp(phone, text);
  }
}

export async function notifyClientReservationRejected(opts: {
  to: string;
  name: string;
  reason?: string | null;
  phoneE164?: string | null;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre demande de réservation n'a pas pu être acceptée.${opts.reason ? `\n\nMotif : ${opts.reason}` : ""}\n\nPour un autre créneau, passez par le site ou appelez-nous.\n\n— L'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Réservation non disponible`, text);
  const phone = opts.phoneE164?.replace(/\D/g, "");
  if (phone) {
    await sendWhatsApp(phone, text.slice(0, 300));
  }
}

export async function notifyClientRescheduled(opts: {
  to: string;
  name: string;
  serviceName: string;
  when: string;
  phoneE164?: string | null;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre rendez-vous pour « ${opts.serviceName} » a été replanifié au ${opts.when}.\n\n— L'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Nouveau créneau`, text);
  const phone = opts.phoneE164?.replace(/\D/g, "");
  if (phone) {
    await sendWhatsApp(phone, text);
  }
}
