require('dotenv').config();

const bcrypt = require('bcryptjs');
const { prisma, init } = require('../backend/database');

const ROLES = ['STAFF'];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function usage() {
  console.log(`
Create a branch user:
  npm run user:create -- --name "Staff Name" --email staff@example.com --password staff123 --role STAFF --branch-code 001

Options:
  --name         User's display name
  --email        Login email
  --password     Login password
  --role         STAFF
  --branch-code  Branch code from the Branches screen
  --branch-id    Branch UUID, if you already know it
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const missing = ['name', 'email', 'password'].filter((key) => !args[key]);
  if (!args['branch-code'] && !args['branch-id']) missing.push('branch-code or branch-id');
  if (missing.length) {
    throw new Error(`Missing required option(s): ${missing.join(', ')}`);
  }

  const role = args.role || 'STAFF';
  if (!ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Use one of: ${ROLES.join(', ')}`);
  }

  await init();
  
  const branch = args['branch-id']
    ? await prisma.branch.findUnique({ where: { id: args['branch-id'] } })
    : await prisma.branch.findUnique({ where: { code: args['branch-code'].toUpperCase() } });

  if (!branch) {
    throw new Error(`Branch not found for ${args['branch-id'] ? 'id' : 'code'} "${args['branch-id'] || args['branch-code']}"`);
  }

  const password_hash = await bcrypt.hash(args.password, 10);

  const user = await prisma.user.create({
    data: {
      name: args.name,
      email: args.email,
      password_hash,
      role,
      branch_id: branch.id,
    }
  });

  console.log(`Created ${role} "${user.email}" for branch ${branch.code} (${branch.name}).`);
}

main()
  .catch((err) => {
    if (err.code === 'P2002') {
      console.error('A user with that email already exists.');
    } else {
      console.error(err.message);
    }
    usage();
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
