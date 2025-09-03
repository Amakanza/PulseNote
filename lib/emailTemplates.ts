// lib/emailTemplates.ts
export function generateInviteEmailHtml({
  inviterName,
  workspaceName,
  role,
  inviteUrl
}: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invitation to ${workspaceName}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: #059669; color: white; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">
                P
            </div>
            <h1 style="margin: 0; color: #1f2937;">PulseNote</h1>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Clinical Note Reporter</p>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
            <h2 style="margin-top: 0; color: #1f2937;">You're invited to join a workspace!</h2>
            
            <p style="font-size: 16px; margin: 20px 0;">
                <strong>${inviterName}</strong> has invited you to join the 
                <strong>${workspaceName}</strong> workspace on PulseNote as a <strong>${role}</strong>.
            </p>

            <div style="background: white; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
                <p style="margin: 0; color: #374151;">
                    <strong>Workspace:</strong> ${workspaceName}<br>
                    <strong>Your Role:</strong> ${role}<br>
                    <strong>Invited by:</strong> ${inviterName}
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                This invitation will expire in 7 days. If you don't have a PulseNote account yet, 
                you'll be prompted to create one when you click the link above.
            </p>
        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
            <p>This invitation was sent by ${inviterName} through PulseNote.</p>
            <p>
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>

    </body>
    </html>
  `;
}

export function generateInviteEmailText({
  inviterName,
  workspaceName,
  role,
  inviteUrl
}: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}) {
  return `
PulseNote - Workspace Invitation

You're invited to join a workspace!

${inviterName} has invited you to join the "${workspaceName}" workspace on PulseNote as a ${role}.

Workspace: ${workspaceName}
Your Role: ${role}
Invited by: ${inviterName}

Accept your invitation:
${inviteUrl}

This invitation will expire in 7 days. If you don't have a PulseNote account yet, you'll be prompted to create one when you click the link above.

---
This invitation was sent by ${inviterName} through PulseNote.
If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
}
