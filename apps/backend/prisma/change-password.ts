import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Changes the password for one existing user. Safe to run any time — only
// touches the passwordHash column for the given username, nothing else.
//
// Usage:
//   docker compose exec backend npm run db:change-password -- <username> <new-password>
async function main() {
  const [, , username, newPassword] = process.argv;

  if (!username || !newPassword) {
    console.error('Usage: npm run db:change-password -- <username> <new-password>');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Error: password must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    console.error(`Error: no user named "${username}" exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { username },
    data: { passwordHash },
  });

  console.log(`Password updated for "${username}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
