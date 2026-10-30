const dotenv = require('dotenv');
dotenv.config();

const readline = require('readline');
const { connectDB, disconnectDB } = require('../db/db');
const adminModel = require('../models/admin.model');
const ROLES = require('../constants/roles');

/**
 * Prompt user in terminal with optional masked input for sensitive fields
 */
const promptQuestion = (query, isMasked = false) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (!isMasked) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    } else {
      process.stdout.write(query);
      const stdin = process.stdin;
      const isRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);
      stdin.resume();

      let password = '';
      const onData = (char) => {
        const c = char.toString('utf8');
        switch (c) {
          case '\n':
          case '\r':
          case '\u0004':
            stdin.removeListener('data', onData);
            if (stdin.setRawMode) stdin.setRawMode(isRaw);
            process.stdout.write('\n');
            rl.close();
            resolve(password.trim());
            break;
          case '\u0003': // Ctrl+C
            process.exit(1);
            break;
          case '\u0008':
          case '\x7f':
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            password += c;
            process.stdout.write('*');
            break;
        }
      };
      stdin.on('data', onData);
    }
  });
};

/**
 * Main Administrative Bootstrap Procedure
 * Supports both CLI execution and programmatic testing.
 */
const bootstrap = async (customCredentials = null, { disconnectOnFinish = null } = {}) => {
  const isCLI = require.main === module;
  const shouldDisconnect = disconnectOnFinish !== null ? disconnectOnFinish : isCLI;

  try {
    await connectDB();

    // Ensure database indexes including partial unique index on isSuperAdmin are created
    await adminModel.createIndexes();

    // Check if a super administrator already exists
    const existingSuperAdmin = await adminModel.findOne({ isSuperAdmin: true });
    if (existingSuperAdmin) {
      const msg = 'Bootstrap rejected: A Super Administrator already exists in the system.';
      if (isCLI) {
        console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`);
        if (shouldDisconnect) await disconnectDB();
        process.exit(1);
      }
      const err = new Error(msg);
      err.code = 'SUPERADMIN_EXISTS';
      throw err;
    }

    // Read credentials from custom input, environment variables, or interactive prompt
    let firstname = customCredentials?.firstname || process.env.BOOTSTRAP_ADMIN_FIRSTNAME;
    let lastname = customCredentials?.lastname || process.env.BOOTSTRAP_ADMIN_LASTNAME;
    let email = customCredentials?.email || process.env.BOOTSTRAP_ADMIN_EMAIL;
    let password = customCredentials?.password || process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password) {
      if (!isCLI) {
        throw new Error('Email and password must be provided for admin bootstrap.');
      }
      console.log('\n--- CargoRide Super Administrator Bootstrap ---');
      if (!firstname) {
        firstname = await promptQuestion('Enter Admin First Name: ');
      }
      if (!lastname) {
        lastname = await promptQuestion('Enter Admin Last Name (optional): ');
      }
      email = await promptQuestion('Enter Admin Email: ');
      password = await promptQuestion('Enter Admin Password (min 8 chars): ', true);
    }

    if (!firstname || firstname.length < 3) {
      const msg = 'Firstname must be at least 3 characters long.';
      if (isCLI) {
        console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`);
        if (shouldDisconnect) await disconnectDB();
        process.exit(1);
      }
      throw new Error(msg);
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!email || !emailRegex.test(email)) {
      const msg = 'Invalid administrative email address format.';
      if (isCLI) {
        console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`);
        if (shouldDisconnect) await disconnectDB();
        process.exit(1);
      }
      throw new Error(msg);
    }

    if (!password || password.length < 8) {
      const msg = 'Admin password must be at least 8 characters long.';
      if (isCLI) {
        console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`);
        if (shouldDisconnect) await disconnectDB();
        process.exit(1);
      }
      throw new Error(msg);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if an admin with this email exists
    const emailExists = await adminModel.findOne({ email: normalizedEmail });
    if (emailExists) {
      const msg = `An administrator with email "${normalizedEmail}" already exists.`;
      if (isCLI) {
        console.error(`\x1b[31m[ERROR] ${msg}\x1b[0m`);
        if (shouldDisconnect) await disconnectDB();
        process.exit(1);
      }
      const err = new Error(msg);
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    const hashedPassword = await adminModel.hashPassword(password);

    const superAdmin = await adminModel.create({
      fullname: {
        firstname: firstname.trim(),
        lastname: lastname ? lastname.trim() : '',
      },
      email: normalizedEmail,
      password: hashedPassword,
      role: ROLES.ADMIN,
      isSuperAdmin: true,
      isActive: true,
    });

    if (isCLI) {
      console.log(
        `\x1b[32m[SUCCESS] Super Administrator created successfully! (ID: ${superAdmin._id}, Email: ${superAdmin.email})\x1b[0m`
      );
      if (shouldDisconnect) await disconnectDB();
      process.exit(0);
    }

    if (shouldDisconnect) await disconnectDB();
    return superAdmin;
  } catch (error) {
    if (isCLI) {
      if (error.code === 11000) {
        console.error(
          '\x1b[31m[ERROR] Bootstrap rejected by database constraint: A Super Administrator already exists.\x1b[0m'
        );
      } else {
        console.error('\x1b[31m[FATAL] Bootstrap failed:\x1b[0m', error.message);
      }
      if (shouldDisconnect) await disconnectDB();
      process.exit(1);
    }
    if (shouldDisconnect) await disconnectDB();
    throw error;
  }
};

if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };
