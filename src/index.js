import dbConnect from './db/dbConnect.js';
import dotenv from 'dotenv';
import {app} from './app.js'


dotenv.config({
    path:'./.env'
})
const app = express();

dbConnect()
.then(()=>{
    app.listen(process.env.PORT || 4000,()=>{
        console.log("Server is running on PORT: " + process.env.PORT);
    })
})
.catch((err)=>{
    console.log("MongoDb connecion error !!!");
})
