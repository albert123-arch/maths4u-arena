-- Optional first-admin seed for Maths4U Arena.
-- Replace ADMIN_EMAIL_HERE and PASSWORD_HASH_HERE before importing.
-- replace PASSWORD_HASH_HERE with bcrypt hash generated locally

INSERT INTO `User` (
  `id`,
  `email`,
  `passwordHash`,
  `name`,
  `role`,
  `createdAt`,
  `updatedAt`
) VALUES (
  'admin_seed_user',
  'ADMIN_EMAIL_HERE',
  'PASSWORD_HASH_HERE',
  'Maths4U Admin',
  'ADMIN',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `passwordHash` = VALUES(`passwordHash`),
  `name` = VALUES(`name`),
  `role` = 'ADMIN',
  `updatedAt` = CURRENT_TIMESTAMP(3);
