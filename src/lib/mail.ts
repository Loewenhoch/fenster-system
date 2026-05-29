import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key");

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const recipients = Array.isArray(to) ? to : [to];

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "dummy-key") {
    console.log("[EMAIL MOCK] To:", recipients.join(", "));
    console.log("[EMAIL MOCK] Subject:", subject);
    console.log("[EMAIL MOCK] HTML:", html.substring(0, 200) + "...");
    return { id: "mock-email-id", success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Fenster & Sonnenschutz <noreply@starhembergstr.at>",
      to: recipients,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("E-Mail Fehler:", error);
      throw new Error(error.message);
    }

    return { id: data?.id, success: true };
  } catch (err) {
    console.error("E-Mail Versand fehlgeschlagen:", err);
    throw err;
  }
}

export function getInvitationEmail({
  name,
  magicLink,
}: {
  name: string;
  magicLink: string;
}) {
  const subject = "Ihr Zugang zum Fenster & Sonnenschutz Bestellsystem";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e3a5f;">Willkommen beim Bestellsystem</h1>
      <p>Hallo ${name},</p>
      <p>Sie wurden für das digitale Bestellsystem der Starhembergstraße 64 & 66 registriert.</p>
      <p>Hier können Sie online Ihre Fenster und Sonnenschutz-Produkte auswählen und verbindlich bestellen.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLink}" style="background-color: #e67e22; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
          Jetzt einloggen
        </a>
      </div>
      <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
      <p style="word-break: break-all; color: #666;">${magicLink}</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Dieser Link ist 24 Stunden gültig. Bei Fragen wenden Sie sich bitte an die Hausverwaltung.
      </p>
    </div>
  `;

  return { subject, html };
}

export function getOrderConfirmationEmail({
  name,
  orderId,
  total,
  pdfUrl,
}: {
  name: string;
  orderId: string;
  total: string;
  pdfUrl?: string;
}) {
  const subject = "Bestellbestätigung – Fenster & Sonnenschutz";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e3a5f;">Bestellbestätigung</h1>
      <p>Hallo ${name},</p>
      <p>Vielen Dank für Ihre verbindliche Bestellung.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Bestellnummer:</strong> ${orderId}</p>
        <p><strong>Gesamtsumme (netto):</strong> ${total} €</p>
      </div>
      ${pdfUrl ? `<p><a href="${pdfUrl}" style="color: #e67e22;">Bestellung als PDF herunterladen</a></p>` : ""}
      <p style="margin-top: 30px;">Bei Fragen wenden Sie sich bitte an die Hausverwaltung.</p>
    </div>
  `;

  return { subject, html };
}

export function getReminderEmail({
  name,
  dashboardUrl,
}: {
  name: string;
  dashboardUrl: string;
}) {
  const subject = "Erinnerung: Fenster & Sonnenschutz Bestellung";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e3a5f;">Erinnerung</h1>
      <p>Hallo ${name},</p>
      <p>Sie haben noch keine verbindliche Bestellung für Fenster und Sonnenschutz-Produkte abgegeben.</p>
      <p>Bitte loggen Sie sich ein und schließen Sie Ihre Bestellung ab.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="background-color: #e67e22; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; display: inline-block;">
          Zur Bestellung
        </a>
      </div>
    </div>
  `;

  return { subject, html };
}

export function getAdminNotificationEmail({
  residentName,
  apartment,
  orderId,
  total,
}: {
  residentName: string;
  apartment: string;
  orderId: string;
  total: string;
}) {
  const subject = `Neue Bestellung – ${residentName} – ${apartment}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e3a5f;">Neue Bestellung eingegangen</h1>
      <p><strong>Bewohner:</strong> ${residentName}</p>
      <p><strong>Wohnung:</strong> ${apartment}</p>
      <p><strong>Bestellnummer:</strong> ${orderId}</p>
      <p><strong>Summe:</strong> ${total} €</p>
      <p><a href="${process.env.NEXTAUTH_URL}/admin/bestellungen/${orderId}" style="color: #e67e22;">Bestellung im Admin-Panel öffnen</a></p>
    </div>
  `;

  return { subject, html };
}
