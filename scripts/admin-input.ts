export type NewAdminInput = {
  email: string;
  password: string;
  name: string;
};

export function readNewAdminInput(): NewAdminInput {
  const email = process.env.NEW_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.NEW_ADMIN_PASSWORD;
  const name = process.env.NEW_ADMIN_NAME?.trim() || "Maths4U Admin";

  if (!email || !email.includes("@")) {
    throw new Error("NEW_ADMIN_EMAIL must be set to a valid email address.");
  }

  if (!password || password.length < 8) {
    throw new Error("NEW_ADMIN_PASSWORD must be set and be at least 8 characters long.");
  }

  return { email, password, name };
}
