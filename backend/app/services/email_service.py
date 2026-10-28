import os
import smtplib

from email.message import EmailMessage


def send_otp_email(
    recipient_email: str,
    otp: str
):
    sender_email = os.getenv("SMTP_EMAIL")
    app_password = os.getenv("SMTP_APP_PASSWORD")

    if not sender_email:
        raise RuntimeError(
            "SMTP_EMAIL is not configured in .env"
        )

    if not app_password:
        raise RuntimeError(
            "SMTP_APP_PASSWORD is not configured in .env"
        )

    # Remove spaces from Gmail App Password
    app_password = app_password.replace(" ", "")

    message = EmailMessage()

    message["Subject"] = "Travelto - Email Verification Code"

    message["From"] = (
        f"Travelto <{sender_email}>"
    )

    message["To"] = recipient_email

    message.set_content(
        f"""
Hello,

Welcome to Travelto!

Your email verification code is:

{otp}

This code is valid for 10 minutes.

If you did not create a Travelto account,
you can safely ignore this email.

Happy travels,
Travelto
AI-Powered Travel
"""
    )

    try:

        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=20
        ) as smtp:

            smtp.login(
                sender_email,
                app_password
            )

            smtp.send_message(message)

    except smtplib.SMTPAuthenticationError:

        raise RuntimeError(
            "Gmail authentication failed. "
            "Check your SMTP email and App Password."
        )

    except Exception as e:

        raise RuntimeError(
            f"Failed to send OTP email: {str(e)}"
        )