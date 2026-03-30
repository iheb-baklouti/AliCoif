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

export async function sendMailTo(to: string, subject: string, text: string, html?: string) {
  const t = transporter();
  if (!t || !FROM) {
    console.info("[email stub]", { to, subject, text: text.slice(0, 200) });
    return;
  }
  await t.sendMail({ from: FROM, to, subject, text, html });
}

function buildHtmlTemplate(title: string, contentHtml: string) {
  const siteUrl = getSiteUrl();
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #111111; border: 1px solid #333333; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <div style="background-color: #c9a227; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #000000; font-size: 32px; font-weight: 700; letter-spacing: -1px; font-family: Georgia, serif;">L&apos;Artiste</h1>
      <p style="margin: 8px 0 0 0; color: rgba(0, 0, 0, 0.7); font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">Excellence &amp; Tradition</p>
    </div>
    <!-- Body -->
    <div style="padding: 40px 32px; font-size: 16px; line-height: 1.6; color: #e5e5e5;">
      ${contentHtml}
    </div>
    <!-- Footer -->
    <div style="padding: 24px 32px; background-color: #0a0a0a; border-top: 1px solid #222222; text-align: center; font-size: 13px; color: #888888;">
      <p style="margin: 0;">L'Artiste by Ali Chakroun &mdash; Kairouan, Tunisie</p>
      <p style="margin: 12px 0 0 0;">
        <a href="${siteUrl}" style="color: #c9a227; text-decoration: none; font-weight: 500;">Accéder au site web</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
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
  
  const html = buildHtmlTemplate(
    "Nouvelle réservation",
    `
    <h2 style="margin-top: 0; font-size: 20px; color: #ffffff;">Action requise</h2>
    <p>Une nouvelle demande de réservation vient d'être soumise sur le site.</p>
    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Client :</strong> ${opts.clientName}</p>
      <p style="margin: 0 0 10px 0;"><strong>Service :</strong> ${opts.serviceName}</p>
      <p style="margin: 0;"><strong>Créneau :</strong> ${opts.when}</p>
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${dash}" style="display: inline-block; background-color: #c9a227; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 600; font-size: 14px;">Ouvrir le tableau de bord</a>
    </div>
    `
  );

  if (adminEmail) {
    await sendMailTo(adminEmail, `[L'Artiste] Nouvelle réservation — action requise`, body, html);
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
  const html = buildHtmlTemplate(
    "Demande reçue",
    `
    <p>Bonjour <strong>${opts.name}</strong>,</p>
    <p>Votre demande de rituel de soin a bien été transmise à notre équipe pour étude.</p>
    <div style="background-color: #1a1a1a; border-left: 4px solid #c9a227; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; color: #c9a227; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Détails du soin (En attente)</p>
      <p style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff;">${opts.serviceName}</p>
      <p style="margin: 0; color: #aaaaaa;">🗓️ ${opts.when}</p>
    </div>
    <p>Cette demande est actuellement <strong>en attente de validation</strong>. Vous recevrez une confirmation très prochainement dès qu&apos;un expert aura validé votre créneau.</p>
    <p style="margin-top: 32px; color: #888888;">À l&apos;écoute de votre style,<br>L&apos;équipe L&apos;Artiste</p>
    `
  );
  await sendMailTo(opts.to, `L'Artiste — Demande de réservation reçue`, text, html);
}

export async function notifyClientReservationConfirmed(opts: {
  to: string;
  name: string;
  serviceName: string;
  when: string;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre réservation pour « ${opts.serviceName} » est confirmée pour le ${opts.when}.\n\nÀ bientôt,\nL'Artiste`;
  const html = buildHtmlTemplate(
    "Réservation confirmée",
    `
    <p>Bonjour <strong>${opts.name}</strong>,</p>
    <h2 style="color: #4ade80; font-size: 20px; margin-top: 24px;">✅ Votre expérience L&apos;Artiste est confirmée</h2>
    <div style="background-color: #1a1a1a; border: 1px solid #333333; padding: 20px; margin: 24px 0; border-radius: 12px;">
      <p style="margin: 0 0 12px 0; color: #c9a227; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Récapitulatif</p>
      <p style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff;">✂️ ${opts.serviceName}</p>
      <p style="margin: 0; font-size: 16px; color: #cccccc;">🗓️ ${opts.when}</p>
    </div>
    <p>Nous nous réjouissons de vous accueillir prochainement au salon.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${getSiteUrl()}/compte" style="display: inline-block; background-color: #222222; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-size: 14px; border: 1px solid #444444;">Gérer mon rendez-vous</a>
    </div>
    <p style="margin-top: 32px; color: #888888;">À très bientôt,<br>L&apos;équipe L&apos;Artiste</p>
    `
  );
  await sendMailTo(opts.to, `L'Artiste — Réservation confirmée`, text, html);
}

export async function notifyClientReservationRejected(opts: {
  to: string;
  name: string;
  reason?: string | null;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre demande de réservation n'a pas pu être acceptée.${opts.reason ? `\n\nMotif : ${opts.reason}` : ""}\n\nPour un autre créneau, passez par le site ou appelez-nous.\n\n— L'Artiste`;
  const html = buildHtmlTemplate(
    "Créneau indisponible",
    `
    <p>Bonjour <strong>${opts.name}</strong>,</p>
    <p>Malheureusement, nous ne pouvons pas honorer votre demande de réservation pour le moment.</p>
    ${opts.reason ? `
    <div style="background-color: rgba(248, 113, 113, 0.1); border-left: 4px solid #f87171; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #fca5a5;"><strong>Motif :</strong> ${opts.reason}</p>
    </div>
    ` : ''}
    <p>N'hésitez pas à choisir un autre créneau sur notre site web, ou contactez-nous directement par téléphone si vous avez besoin d'aide pour trouver de la disponibilité.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${getSiteUrl()}/reservation" style="display: inline-block; background-color: #c9a227; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 600; font-size: 14px;">Réserver un autre créneau</a>
    </div>
    `
  );
  await sendMailTo(opts.to, `L'Artiste — Réservation non disponible`, text, html);
}

export async function notifyClientRescheduled(opts: {
  to: string;
  name: string;
  serviceName: string;
  when: string;
}) {
  const text = `Bonjour ${opts.name},\n\nVotre rendez-vous pour « ${opts.serviceName} » a été replanifié au ${opts.when}.\n\n— L'Artiste`;
  const html = buildHtmlTemplate(
    "Nouvel horaire",
    `
    <p>Bonjour <strong>${opts.name}</strong>,</p>
    <p>Votre rendez-vous a été repoussé ou modifié par le salon.</p>
    <div style="background-color: #1a1a1a; border-left: 4px solid #60a5fa; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; color: #60a5fa; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Nouveau Créneau Confirmé</p>
      <p style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff;">✂️ ${opts.serviceName}</p>
      <p style="margin: 0; color: #ffffff;">🗓️ <strong>${opts.when}</strong></p>
    </div>
    <p>Si cet horaire ne vous convient pas, merci de nous contacter pour l'annuler ou le replanifier.</p>
    <p style="margin-top: 32px; color: #888888;">Merci de votre compréhension,<br>L'équipe L'Artiste</p>
    `
  );
  await sendMailTo(opts.to, `L'Artiste — Nouveau créneau`, text, html);
}
