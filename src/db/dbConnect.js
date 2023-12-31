import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
const dbConnect = async () => {
    try{
       const connectionsInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n Mongodb connected: ${connectionsInstance.connection.host}`);
    }catch(e){
        console.log("Error connecting DB " + e);
        process.exit(1);
    }
}


export default dbConnect;