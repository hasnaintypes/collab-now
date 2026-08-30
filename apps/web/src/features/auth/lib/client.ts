import { createAuthClient } from "better-auth/react";

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  updateUser,
  deleteUser,
  sendVerificationEmail,
  requestPasswordReset,
  resetPassword,
} = createAuthClient();
