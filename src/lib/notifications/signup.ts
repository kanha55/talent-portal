type NewSignupPayload = {
  name: string;
  email: string;
  username: string;
};

export async function notifyAdminNewSignup(user: NewSignupPayload) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!adminEmail || !resendApiKey) {
    console.info(
      `[signup] New user registered: ${user.name} <${user.email}> (@${user.username})`,
    );
    return;
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "Talent Portal <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: adminEmail,
        subject: `New Talent Portal signup: ${user.name}`,
        html: `
          <h2>New user signed up</h2>
          <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
          <p><strong>Username:</strong> ${escapeHtml(user.username)}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `.trim(),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[signup] Failed to send admin notification: ${response.status} ${body}`);
    }
  } catch (error) {
    console.error("[signup] Failed to send admin notification:", error);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
