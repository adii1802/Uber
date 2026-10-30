const userModel = require('../models/user.model');

module.exports.createUser = async ({ firstname, lastname, email, password, phone }) => {
  if (!firstname || !email || !password) {
    throw new Error('All required fields must be provided');
  }

  const user = await userModel.create({
    fullname: {
      firstname,
      lastname: lastname || '',
    },
    email,
    password,
    phone: phone || '',
  });

  return user;
};
