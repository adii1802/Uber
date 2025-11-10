const dotenv=require('dotenv')
dotenv.config();
const express = require('express');
const cors=require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const connectoDB = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainroutes = require('./routes/captain.routes');

connectoDB();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());


app.get('/' ,(req , res)=>{
    res.send('hellow world');
});
app.use('/users',userRoutes);
app.use('/captains',captainroutes);



 module.exports=app;