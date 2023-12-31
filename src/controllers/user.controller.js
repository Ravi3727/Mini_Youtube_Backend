import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req,res)=>{
    //Get user Details from frontend
    //Validations
    //Check if user is already exist(By username or email)
    //Chek for avatar
    //Check for images
    //upload them to cloudinary,avatar
    //create user obect then create entry in db
    //remove password and refresh token from response 
    //check for user creation
    //return response 

    const {fullName,username,password,email} = req.body;
    console.log("email ", email);

    if(!fullName || !username || !password || !email){
        throw new ApiError(400,"all feilds are required");
    }

    const existedUser = User.findOne({
        $or:[ {email} , {username}]
    })

    if(existedUser){
        throw new ApiError(409,"user email already exists");
    }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocatPath = req.files?.coverImage[0]?.path;

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required");
   }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocatPath);

   if(!avatar){
    throw new ApiError(400,"Avatar file is required");
   }


  const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowercase()
   })

   const createdUser = await User.findById(user._id).select(
    "-password  -refreshToken "
   )

   if(!createdUser){
    throw new ApiError(500,"Smething Went Wrong on creating user")
   }


   return res.status(201).json(
    new ApiResponse(200,createdUser,"User Registered Successfully")
   )

})


export {registerUser};
