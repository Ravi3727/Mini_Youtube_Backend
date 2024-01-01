import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({   
    limit:"16kb"
}));
app.use(express.urlencoded({extended:true , limit:"16kb"})); 
app.use(express.static("public"));

//Isse me user controller me cookie access kr paa raha hun in both "req.cokkie or res.cookie" because we add cokkie middleware
app.use(cookieParser());


// routes

import userRouter from './routes/user.routes.js';

//routes decleration

app.use("/api/v1/users",userRouter);

export {app}