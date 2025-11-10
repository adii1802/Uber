const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const captainSchema = new mongoose.Schema({
    fullname:{
        firstname:{
            type:String,
            required:true ,
            minlength: [3,'firstname must be at least 3 characters long']
        },
        lastname:{
            type:String,
            minlength: [3,'lastname must be at least 3 characters long']
        }
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        match:[/\S+@\S+\.\S+/,'is invalid email']
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    socketId:{
        type:String,
    },
    status:{
        type:String,
        enum:['available','unavailable'],
        default:'unavailable'
    },

    vehical:{
        color:{
            type:String,
            required:true,
            minlength:[3,'color must be at least 3 characters long']
        },
        plate:{
            type:String,
            required:true,
            minlength:[3,'plate must be at least 3 characters long'],
        },
        capacity:{
            type:Number,
            required:true,
            min:[1,'capacity must be at least 1'],

        },
        vehicalType:{
            type:String,
            required:true,
            enum:['car','motorcycle','auto']
        }
    },
    location:{
        lat:{
            type:Number,

        },
        lng:{
            type:Number,
        }
    }
})

captainSchema.methods.generateAuthToken = function() {
    const token = jwt.sign({ _id: this._id, email: this.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

captainSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}   
captainSchema.statics.hashPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}
const captainModel= mongoose.model('Captain', captainSchema);

module.exports=captainModel;

