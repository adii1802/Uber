const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');

module.exports.registerCaptain = async (req, res,next ) => {

const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
}
const{ fullname, email, password, vehical } = req.body;
 const isCaptainAlreadyExist = await captainModel.findOne({ email });
if (isCaptainAlreadyExist) {
    return res.status(409).json({ error: 'Captain with this email already exists' });
}


const hashedPassword = await captainModel.hashPassword(password);

const captain= await captainService.createCaptain({
   firstname: fullname.firstname,
   lastname: fullname.lastname, 
    email,  
    password: hashedPassword,
    color: vehical.color,
    plate: vehical.plate,
    capacity: vehical.capacity,
    vehicalType: vehical.vehicalType
});
const token = captain.generateAuthToken();
res.status(201).json({ token , captain});

}