process.env.EMAIL_USER = "harshitkushwah08@gmail.com";
process.env.EMAIL_APP_PASSWORD = "app-password-for-tests";
process.env.EMAIL_HOST = "smtp.gmail.com";
process.env.EMAIL_PORT = "587";

const { buildSmtpTransportOptions } = await import(
  "../infrastructure/mail/provider/smtpProvider.js"
);

describe("buildSmtpTransportOptions", () => {
  it("prefers IPv4 for SMTP connections", () => {
    const options = buildSmtpTransportOptions();
    expect(options).toMatchObject({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4,
      auth: {
        user: "harshitkushwah08@gmail.com",
        pass: "app-password-for-tests",
      },
    });
    expect(typeof options.lookup).toBe("function");
  });
});