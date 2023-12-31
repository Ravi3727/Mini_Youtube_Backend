import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.ALOUDINARY_API_SECRET 
});
 

const uploadOnCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        // file uploaded successfully
        fs.unlinkSync(localFilePath)
        return response;
    }catch(e){
        fs.unlinkSync(localFilePath)
        //locally saved temporary file as the upload operation failed
        return null;
    }
}



export {uploadOnCloudinary};