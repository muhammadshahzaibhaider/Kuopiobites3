import { randomBytes } from "node:crypto";
import { db } from "../src/supabase";

const [username, role, name, email] = process.argv.slice(2);
if (!username || !["owner", "manager", "kitchen"].includes(role ?? "") || !name || !email) {
  console.error('usage: npx tsx scripts/create-staff.ts <username> <owner|manager|kitchen> "<Full name>" <email>');
  process.exit(1);
}

const password = randomBytes(18).toString("base64url");
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { kb_staff: true },
});
if (error || !data.user) throw error ?? new Error("Staff Auth user creation failed");

const { error: staffError } = await db.from("staff_users").insert({
  id: data.user.id,
  username,
  name,
  role,
});
if (staffError) {
  await db.auth.admin.deleteUser(data.user.id);
  throw new Error(staffError.message);
}

console.log(`Created ${role} account "${username}" for ${email}. Temporary password: ${password}`);
console.log("Sign in at /admin and change this password after first use.");
