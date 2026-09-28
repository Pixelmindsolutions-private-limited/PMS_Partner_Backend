import User from '../models/User.js';

export const createNotification = async ({
  partner,
  type,
  title,
  message,
  referenceId = null,
}) => {
  try {
    await User.findByIdAndUpdate(partner, {
      $push: {
        notifications: {
          title,
          message,
          type,
          referenceId,
          isRead: false,
        },
      },
    });
  } catch (err) {
    // never let a notification failure break the main flow
    console.error('❌ Notification push failed:', err.message);
  }
};