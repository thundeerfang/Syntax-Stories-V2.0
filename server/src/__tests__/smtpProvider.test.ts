process.env.EMAIL_USER = "af649e001@smtp-brevo.com";
process.env.EMAIL_APP_PASSWORD = "brevo-smtp-key-for-tests";
process.env.EMAIL_HOST = "smtp-relay.brevo.com";
process.env.EMAIL_PORT = "587";

const { buildSmtpTransportOptions } = await import(
  "../infrastructure/mail/provider/smtpProvider.js"
);

describe("buildSmtpTransportOptions", () => {
  it("uses Brevo SMTP as the primary provider and prefers IPv4", () => {
    const options = buildSmtpTransportOptions();
    expect(options).toMatchObject({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      family: 4,
      auth: {
        user: "af649e001@smtp-brevo.com",
        pass: "brevo-smtp-key-for-tests",
      },
    });
    expect(typeof options.lookup).toBe("function");
  });
});