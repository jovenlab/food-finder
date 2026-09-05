// Seed script - puts the demo user into the database.
//
// The assignment specifies one demo user. Rather than inserting it by hand in
// MySQL Workbench (which nobody else could reproduce), we create it with a script
// that can be run any number of times safely.

import "dotenv/config";
import { prisma } from "../src/prisma";

// The demo user is identified by this email everywhere in the application.
const DEMO_USER_EMAIL = "demo@foodfinder.local";

async function main() {
  // "upsert" = update if it exists, otherwise create it.
  // This is what makes the script safe to run twice: the second run changes
  // nothing instead of failing on the unique email constraint.
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: {
      email: DEMO_USER_EMAIL,
      name: "Demo User",
    },
  });

  console.log(`Demo user ready: id=${demoUser.id}, email=${demoUser.email}`);

  const userCount = await prisma.user.count();
  console.log(`Users in database: ${userCount}`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
