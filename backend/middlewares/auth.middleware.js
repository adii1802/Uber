const userModel= require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blackListTokenModel= require('../models/blacklistToken.model');
const captainModel = require('../models/captain.model');

module.exports.authUser = async (req,res,next) => {
    const token=req.cookies.token || req.headers.authorization.split(' ')[1];
    if(!token){
        return res.status(401).json({message:'unauthorized access. No token provided.'});

    }
    const isBlacklisted= await blacklistTokenModel.findOne({ token });
    if(isBlacklisted){
        return res.status(401).json({message:'unauthorized access. Token is blacklisted.'});  
    }

    try{
        const decoded= jwt.verify(token,process.env.JWT_SECRET);
        const user=await userModel.findById(decoded.findById);
        req.user=user;
        return next();
    }catch(err){
        return res.status(400).json({message:'Invalid token.'});  
    }



} 
module.exports.authCaptain = async (req,res,next) => {
    const token=req.cookies.token || req.headers.authorization.split(' ')[1];
    if(!token){
        return res.status(401).json({message:'unauthorized access. No token provided.'});

    }
    const isBlacklisted= await blacklistTokenModel.findOne({ token });
    if(isBlacklisted){
        return res.status(401).json({message:'unauthorized access. Token is blacklisted.'});  
    }

    try{
        const decoded= jwt.verify(token,process.env.JWT_SECRET);
        const captain=await captainModel.findById(decoded.findById);
        req.captain=captain;
        return next();
    }catch(err){
        return res.status(400).json({message:'Invalid token.'});  
    }
}

