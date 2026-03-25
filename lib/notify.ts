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

/** Nouvelle demande de réservation — notifier l’admin */
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
    const text = encodeURIComponent(
      `L'Artiste — Nouvelle réservation\n${opts.clientName} — ${opts.serviceName}\n${opts.when}\nVoir : ${dash}`,
    );
    console.info("[whatsapp admin link]", `https://wa.me/${adminWa}?text=${text}`);
  }
}

export async function notifyClientReservationPending(opts: { to: string; name: string; serviceName: string; when: string }) {
  const text = `Bonjour ${opts.name},\n\nNous avons bien reçu votre demande pour « ${opts.serviceName} » le ${opts.when}.\n\nElle est en attente de validation par le salon. Vous recevrez un message dès qu’elle sera traitée.\n\n— L'Artiste`;
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
    const pre = encodeURIComponent(`L'Artiste : votre RDV « ${opts.serviceName} » est confirmé le ${opts.when}.`);
    console.info("[whatsapp client]", `https://wa.me/${phone}?text=${pre}`);
    if (process.env.TWILIO_WHATSAPP_FROM) {
      await sendWhatsAppIfConfigured(phone, text);
    }
  }
}

export async function notifyClientReservationRejected(opts: {
  to: string;
  name: string;
  reason?: string | null;
  phoneE164?: string | null;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre demande de réservation n’a pas pu être acceptée.${opts.reason ? `\n\nMotif : ${opts.reason}` : ""}\n\nPour un autre créneau, passez par le site ou appelez-nous.\n\n— L'Artiste`;
  await sendMailTo(opts.to, `L'Artiste — Réservation non disponible`, text);
  const phone = opts.phoneE164?.replace(/\D/g, "");
  if (phone) {
    console.info("[whatsapp client]", `https://wa.me/${phone}?text=${encodeURIComponent(text.slice(0, 300))}`);
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
    console.info("[whatsapp client]", `https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
  }
}

async function sendWhatsAppIfConfigured(toPhone: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    console.info("[whatsapp client stub]", toPhone, body.slice(0, 120));
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    From: from,
    To: `whatsapp:${toPhone.startsWith("+") ? toPhone : `+${toPhone}`}`,
    Body: body,
  });
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  }).catch(() => console.info("[twilio whatsapp failed]"));
}
