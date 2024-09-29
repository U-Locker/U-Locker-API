import db from "@/services/db";
import { adminUpdatableSchema } from "@/models/user";

const args = process.argv.slice(2);

if (args.length < 4) {
  console.error(
    "Usage: bun run src/utils/createAdminUser.ts email password firstName lastName(optional)"
  );
  process.exit(1);
}

const [email, password, firstName, lastName] = args;

try {
  const data = await adminUpdatableSchema.parseAsync({
    email,
    password,
    firstName,
    lastName,
  });
  const newUser = await db.admin.create({
    data: {
      ...data,
      password: await Bun.password.hash(data.password),
    },
  });

  console.log("Admin user created:", newUser);
} catch (error) {
  console.error("Error creating admin user:", error);
} finally {
  await db.$disconnect();
}
