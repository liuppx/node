#!/usr/bin/env node
const path = require('path');
const {
  loadVault,
  decryptSecrets,
  encryptSecrets,
  replaceVault,
  readPassword,
} = require('./secret-vault.cjs');

function printUsage() {
  process.stdout.write(
    [
      'Usage:',
      '  node scripts/passwd-secret.cjs [--file run/secrets.enc.json]',
      '',
      'Description:',
      '  修改密钥仓解密密码，不修改任何密钥值。',
      '',
      'Password Input:',
      '  仅支持交互输入，不从环境变量、命令行参数或标准输入读取生产口令。',
      '',
    ].join('\n')
  );
}

function parseArgs(argv) {
  const options = { file: path.join('run', 'secrets.enc.json'), help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--file' || token === '-f') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing value for --file');
      }
      options.file = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

async function run() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    printUsage();
    process.exit(1);
    return;
  }

  if (options.help) {
    printUsage();
    return;
  }

  const oldPassword = await readPassword({ promptText: '请输入当前密钥文件密码' });
  if (!oldPassword) {
    throw new Error('当前密码不能为空');
  }
  const vault = loadVault(options.file);
  const secrets = decryptSecrets(vault, oldPassword);

  const newPassword = await readPassword({ promptText: '请输入新的密钥文件密码' });
  if (!newPassword) {
    throw new Error('新密码不能为空');
  }
  const confirmPassword = await readPassword({ promptText: '请再次输入新的密钥文件密码' });
  if (newPassword !== confirmPassword) {
    throw new Error('两次新密码输入不一致');
  }

  const filePath = replaceVault(options.file, encryptSecrets(secrets, newPassword));
  process.stdout.write(`Vault password updated: ${filePath}\n`);
  process.stdout.write(`Secret keys preserved: ${Object.keys(secrets).length}\n`);
}

run().catch((error) => {
  process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
