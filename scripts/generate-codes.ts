import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateRandomCode() {
  // 生成格式例如：KEY-A1B2-C3D4
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `KEY-${part1}-${part2}`;
}

async function main() {
  const durationArg = process.argv[2];
  const countArg = process.argv[3];
  
  const duration = parseInt(durationArg, 10);
  const count = parseInt(countArg, 10) || 1;

  if (!duration || ![1, 3, 15, 30].includes(duration)) {
    console.error('\n❌ Error: Please specify a valid duration in days (1, 3, 15, 30).');
    console.error('Usage: npx tsx scripts/generate-codes.ts <durationDays> [count]');
    console.error('Example: npx tsx scripts/generate-codes.ts 15 5\n');
    process.exit(1);
  }

  console.log(`\nGenerating ${count} activation code(s) for ${duration} days...`);
  
  const codesData = [];
  for (let i = 0; i < count; i++) {
    codesData.push({
      code: generateRandomCode(),
      durationDays: duration,
    });
  }

  await prisma.activationCode.createMany({
    data: codesData,
  });

  console.log('\n✅ Successfully generated activation codes:');
  console.log('------------------------------------------');
  codesData.forEach(c => {
    console.log(`🎟️  ${c.code}  (${c.durationDays} Days)`);
  });
  console.log('------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
