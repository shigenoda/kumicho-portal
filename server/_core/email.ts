import nodemailer from "nodemailer";
import { ENV } from "./env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!ENV.smtpHost || !ENV.smtpUser) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: ENV.smtpSecure,
      auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPass,
      },
    });
  }
  return transporter;
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log("[Email] SMTP not configured. Would send:", {
      to: payload.to,
      subject: payload.subject,
    });
    return false;
  }

  try {
    await transport.sendMail({
      from: ENV.smtpFrom,
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    console.log("[Email] Sent:", payload.subject, "->", payload.to);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

// --- メールテンプレート ---

const baseStyle = `
  font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px;
  background: #ffffff;
  color: #1a1a1a;
`;

const headerStyle = `
  font-size: 20px;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
`;

const footerStyle = `
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
`;

function wrapTemplate(title: string, body: string): string {
  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">${title}</div>
      ${body}
      <div style="${footerStyle}">
        <p>このメールは組長ポータルから自動送信されています。</p>
        <p>グリーンピア焼津 組長業務引き継ぎポータル</p>
      </div>
    </div>
  `;
}

export function registrationEmail(householdId: string, portalUrl: string): EmailPayload {
  return {
    to: "",
    subject: "【組長ポータル】メールアドレス登録完了のお知らせ",
    html: wrapTemplate(
      "メールアドレス登録完了",
      `
        <p style="margin-bottom: 16px;">${householdId}号室 様</p>
        <p style="margin-bottom: 16px;">
          組長ポータルへのメールアドレス登録が完了しました。<br>
          今後、ポータルからの通知をこのメールアドレスにお届けします。
        </p>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #0369a1;">
            <strong>ポータルURL:</strong><br>
            <a href="${portalUrl}" style="color: #0369a1;">${portalUrl}</a>
          </p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          通知の種類: フォーム回答依頼、河川清掃リマインダー、組長確定通知 など
        </p>
      `
    ),
    text: `${householdId}号室 様\n\n組長ポータルへのメールアドレス登録が完了しました。\n今後、ポータルからの通知をこのメールアドレスにお届けします。\n\nポータルURL: ${portalUrl}`,
  };
}

export function formNotificationEmail(
  householdId: string,
  formTitle: string,
  dueDate: string | null,
  portalUrl: string
): EmailPayload {
  const dueLine = dueDate
    ? `<p style="font-size: 14px; color: #b91c1c; margin-bottom: 16px;">回答期限: <strong>${dueDate}</strong></p>`
    : "";
  const dueText = dueDate ? `回答期限: ${dueDate}\n` : "";

  return {
    to: "",
    subject: `【組長ポータル】「${formTitle}」への回答をお願いします`,
    html: wrapTemplate(
      "フォーム回答のお願い",
      `
        <p style="margin-bottom: 16px;">${householdId}号室 様</p>
        <p style="margin-bottom: 16px;">
          新しいフォームが公開されました。回答にご協力ください。
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1e3a5f;">${formTitle}</p>
          ${dueLine}
        </div>
        <a href="${portalUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          回答する
        </a>
      `
    ),
    text: `${householdId}号室 様\n\n新しいフォーム「${formTitle}」が公開されました。\n${dueText}\n回答はこちら: ${portalUrl}`,
  };
}

export function riverCleaningReminderEmail(
  householdId: string,
  date: string,
  portalUrl: string
): EmailPayload {
  return {
    to: "",
    subject: "【組長ポータル】河川清掃のリマインダー",
    html: wrapTemplate(
      "河川清掃リマインダー",
      `
        <p style="margin-bottom: 16px;">${householdId}号室 様</p>
        <p style="margin-bottom: 16px;">
          河川清掃の日程が近づいています。
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534;">
            実施日: ${date}
          </p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
          詳細はポータルをご確認ください。
        </p>
        <a href="${portalUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          詳細を確認
        </a>
      `
    ),
    text: `${householdId}号室 様\n\n河川清掃の日程が近づいています。\n実施日: ${date}\n\n詳細: ${portalUrl}`,
  };
}

export function leaderConfirmationEmail(
  householdId: string,
  year: number,
  portalUrl: string
): EmailPayload {
  return {
    to: "",
    subject: `【組長ポータル】${year}年度 組長確定のお知らせ`,
    html: wrapTemplate(
      "組長確定のお知らせ",
      `
        <p style="margin-bottom: 16px;">${householdId}号室 様</p>
        <p style="margin-bottom: 16px;">
          ${year}年度の組長が<strong>${householdId}号室</strong>に確定しました。
        </p>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            組長業務に必要な情報はポータルで確認できます。<br>
            引き継ぎ袋の受け取りもお忘れなく。
          </p>
        </div>
        <a href="${portalUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          ポータルを開く
        </a>
      `
    ),
    text: `${householdId}号室 様\n\n${year}年度の組長が${householdId}号室に確定しました。\n\nポータル: ${portalUrl}`,
  };
}

export function exemptionResultEmail(
  householdId: string,
  year: number,
  approved: boolean,
  portalUrl: string
): EmailPayload {
  const result = approved ? "承認" : "却下";
  return {
    to: "",
    subject: `【組長ポータル】${year}年度 免除申請${result}のお知らせ`,
    html: wrapTemplate(
      `免除申請${result}のお知らせ`,
      `
        <p style="margin-bottom: 16px;">${householdId}号室 様</p>
        <p style="margin-bottom: 16px;">
          ${year}年度の組長免除申請が<strong>${result}</strong>されました。
        </p>
        <div style="background: ${approved ? "#f0fdf4" : "#fef2f2"}; border: 1px solid ${approved ? "#bbf7d0" : "#fecaca"}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${approved ? "#166534" : "#991b1b"};">
            結果: ${result}
          </p>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
          詳細はポータルをご確認ください。
        </p>
        <a href="${portalUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          詳細を確認
        </a>
      `
    ),
    text: `${householdId}号室 様\n\n${year}年度の組長免除申請が${result}されました。\n\n詳細: ${portalUrl}`,
  };
}
