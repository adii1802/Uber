 const mongoose = require('mongoose');

 function connectoDB() {
    mongoose.connect(process.env.DB_CONNECT, )
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
}

module.exports = connectoDB;
