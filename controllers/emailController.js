import nodemailer from "nodemailer";
import mongoose from "mongoose";
import User from "../models/User.js";

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const DELETE_ACCOUNT_URL =
  "https://www.pixelmindsolutions.com/pms-partner/delete-account";

// Escape HTML
const escapeHtml = (value) => {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value).replace(/[&<>"']/g, (char) => entities[char]);
};

// ======================================================
// SEND DELETE ACCOUNT EMAIL
// POST /api/messages/send
// ======================================================
export const sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.status(500).json({
        success: false,
        message: "Email configuration is missing",
      });
    }

    // Fetch user from MongoDB
    const user = await User.findById(userId).select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fixed subject
    const finalSubject =
      "Hello This is PMS Partner Click Here To Delete Your Account";

    const finalMessage = message.trim();

    // Add MongoDB user ID to URL
    const deleteAccountUrl = `${DELETE_ACCOUNT_URL}/${user._id.toString()}`;

    const emailText = `

This is PMS Partner.

Please click the following link to open the Delete Account page:

${deleteAccountUrl}

User Details:


Email: ${user.email || "Not provided"}
User ID: ${user._id.toString()}

Message:
${finalMessage}
`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.7;">
      
        <p>This is PMS Partner.</p>

        <p>
          Please click the button below to open the Delete Account page.
        </p>

        <p>
          <a
            href="${escapeHtml(deleteAccountUrl)}"
            style="
              display: inline-block;
              background-color: #015754;
              color: #ffffff;
              padding: 12px 22px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
            "
          >
            Click Here To Delete Your Account
          </a>
        </p>

        <p>
          If the button does not work, open this link:
          <br />
          <a href="${escapeHtml(deleteAccountUrl)}">
            ${escapeHtml(deleteAccountUrl)}
          </a>
        </p>

        <hr />

        <h3>User Details</h3>

        <p><strong>User ID:</strong> ${escapeHtml(user._id.toString())}</p>

        <p><strong>Message:</strong></p>
        <p>${escapeHtml(finalMessage).replace(/\n/g, "<br />")}</p>

        <p style="color: #777; font-size: 12px;">
          PMS Partner
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: {
        name: "PMS Partner",
        address: process.env.EMAIL_USER,
      },

      // Receiver comes from .env
      to: process.env.EMAIL_USER,


      subject: finalSubject,
      text: emailText,
      html: emailHtml,
    });

    console.log("Delete account email sent:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return res.status(200).json({
      success: true,
      message: "Delete account email sent successfully",
      userId: user._id.toString(),
      deleteAccountUrl,
    });
  } catch (error) {
    console.error("Send message error:", {
      message: error.message,
      code: error.code,
      response: error.response,
      command: error.command,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
      code: error.code || null,
    });
  }
};


// ======================================================
// DELETE USER ACCOUNT BY USER ID
// DELETE /api/users/delete-account/:userId
// ======================================================
export const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    // Find and delete user
    const deletedUser = await User.findByIdAndDelete(userId);

    // User not found
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    console.log("User account deleted successfully:", {
      userId: deletedUser._id.toString(),
      mobile: deletedUser.mobile,
    });

    return res.status(200).json({
      success: true,
      message: "User account deleted successfully",
      userId: deletedUser._id.toString(),
    });
  } catch (error) {
    console.error("Delete user account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user account",
    });
  }
};