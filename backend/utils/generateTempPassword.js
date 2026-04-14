const crypto = require('crypto');

/**
 * Generate a strong temporary password
 * @param {number} length - Password length (default 12)
 * @returns {string} Generated password
 */
const generateTempPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const all = uppercase + lowercase + numbers + special;

  // Ensure at least one of each type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
};

module.exports = generateTempPassword;
