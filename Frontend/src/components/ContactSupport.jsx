import React from "react";
// If you have your auth system (optional)
import { auth } from "../utils/auth"; // Adjust path if needed (remove if no auth)

const ContactSupport = () => {
  // (Optional) Get user info from your auth utility
  const user = auth?.getUser?.();

  // Support email & default message
  const supportEmail = "buildwisecapstone@gmail.com";
  const subject = encodeURIComponent("BuildWise Support Request");
  const body = encodeURIComponent(
    `Hi BuildWise Support,\n\n` +
    `I need help regarding the BuildWise platform.\n\n` +
    `${user ? `User: ${user.name || "N/A"}\nEmail: ${user.email || "N/A"}\n\n` : ""}` +
    `Please assist me with this issue. Thank you!\n\n`
  );

  // Function to handle click event
  const handleContactClick = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=${subject}&body=${body}`;
    const mailtoUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    try {
      // If Gmail web is open, open compose there
      if (window.location.hostname.includes("gmail.com")) {
        window.open(gmailUrl, "_blank", "noopener,noreferrer");
      } else {
        // Otherwise, fallback to mail client
        window.location.href = mailtoUrl;
      }
    } catch (error) {
      console.error("Error opening email client:", error);
      alert("Unable to open your email client. Please email us manually at " + supportEmail);
    }
  };

  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-4">
        Need urgent assistance?
      </p>
      <button
        onClick={handleContactClick}
        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
      >
        Contact Support
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
};

export default ContactSupport;
