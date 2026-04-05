import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Admin user
  const existing = await prisma.adminUser.findUnique({ where: { username: config.admin.username } })
  if (!existing) {
    const hash = await bcrypt.hash(config.admin.password, 12)
    await prisma.adminUser.create({
      data: {
        username: config.admin.username,
        passwordHash: hash,
        email: config.admin.email,
      },
    })
    console.log(`Created admin user: ${config.admin.username}`)
  }

  // Default packages
  const packages = [
    {
      name: 'Starter',
      diskMb: BigInt(1024),
      bandwidthMb: BigInt(10240),
      maxDatabases: 3,
      maxEmailAccounts: 5,
      maxSubdomains: 5,
      maxAddonDomains: 1,
      maxParkedDomains: 3,
      maxFtpAccounts: 2,
      maxCronJobs: 3,
    },
    {
      name: 'Professional',
      diskMb: BigInt(5120),
      bandwidthMb: BigInt(51200),
      maxDatabases: 20,
      maxEmailAccounts: 50,
      maxSubdomains: 25,
      maxAddonDomains: 10,
      maxParkedDomains: 25,
      maxFtpAccounts: 10,
      maxCronJobs: 10,
    },
    {
      name: 'Unlimited',
      diskMb: BigInt(0),
      bandwidthMb: BigInt(0),
      maxDatabases: 0,
      maxEmailAccounts: 0,
      maxSubdomains: 0,
      maxAddonDomains: 0,
      maxParkedDomains: 0,
      maxFtpAccounts: 0,
      maxCronJobs: 0,
    },
  ]

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: {},
      create: pkg,
    })
  }
  console.log('Created default packages')

  // Default settings
  const settings = [
    { key: 'php_default_version', value: '8.3' },
    { key: 'mail_server', value: 'postfix' },
    { key: 'ftp_server', value: 'vsftpd' },
    { key: 'webserver', value: 'nginx' },
    { key: 'dns_server', value: 'bind9' },
    { key: 'ssl_provider', value: 'letsencrypt' },
    { key: 'backup_enabled', value: 'true' },
    { key: 'backup_retention_days', value: '7' },
    { key: 'max_login_attempts', value: '5' },
    { key: 'ban_duration_minutes', value: '30' },
    { key: 'bandwidth_overage_action', value: 'suspend' },
    { key: 'disk_overage_action', value: 'warn' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log('Created default settings')

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
