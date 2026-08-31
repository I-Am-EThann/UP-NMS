import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deletes every zone — Device/Port/Alert all cascade off Zone in the schema
// (onDelete: Cascade), so this one delete clears the whole network dataset.
// User accounts are untouched, so you don't need to log in again afterward.
async function main() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const result = await prisma.zone.deleteMany({});
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`Deleted ${result.count} zone(s) (and every device/port/alert under them).`);
  console.log('Admin accounts were left untouched — no need to log in again.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
