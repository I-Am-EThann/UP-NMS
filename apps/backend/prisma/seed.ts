import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Intentionally seeds NOTHING but the admin login — no sample zones,
// devices, ports, or alerts. This is a clean production database: the real
// admin logs in and adds actual zones/devices for the university's network
// through the UI. (Previously this seeded a full mock dataset mirroring
// apps/frontend's old mock-data.ts for demo purposes — removed on request
// to keep the database free of placeholder data.)
//
// NOTE: this file intentionally avoids importing the generated `Role` enum
// type from "@prisma/client" and uses the schema's string literal value
// directly instead. `prisma generate` requires downloading engine binaries
// from binaries.prisma.sh, which isn't reachable from every environment
// (e.g. network-restricted sandboxes) — writing this file against the raw
// enum value means it still type-checks and runs correctly once
// `prisma generate` succeeds on a machine with normal internet access,
// without depending on that step having already run here.

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'phayao2569';

async function main() {
  console.log(`Seeding admin user "${ADMIN_USERNAME}"...`);

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      'WARNING: using the default demo password. Set SEED_ADMIN_PASSWORD ' +
        'before seeding a real deployment, or change the password immediately after first login.',
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    // Deliberately DOES update the password on every re-run — this is what
    // makes "change the admin password" a real, working operation (see
    // README's "Changing the admin password" section): edit
    // SEED_ADMIN_PASSWORD, then re-run `npm run db:seed`. There's no other
    // password-change mechanism (no UI/API for it yet), so if this only
    // fired on first-create, seeding would be a one-way door.
    update: { passwordHash },
    create: {
      username: ADMIN_USERNAME,
      passwordHash,
      displayName: ADMIN_USERNAME,
      role: 'ADMINISTRATOR',
    },
  });

  console.log('Done. No sample zones/devices/alerts were seeded — add real ones through the UI.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
