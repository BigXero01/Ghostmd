import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_USER_ID = process.env.DEMO_USER_ID ?? 'demo';

async function main() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: 'demo@ghostmd.io',
      firstName: 'Demo',
      lastName: 'Vault',
      passwordHash: '',
      portfolio: { create: {} },
    },
  });

  console.log(`Demo user seeded (id=${DEMO_USER_ID})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
