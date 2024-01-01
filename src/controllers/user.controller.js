import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        // Abb jab bhi hum save function call krte h ye User models ke sare feilds ko validate krta h but humne to token ke alava kuch nahi bheja to so ve pass a another statement 
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (e) {
        throw new ApiError(500, "Token generation failed")
    }
}

const registerUser = asyncHandler(async (req, res) => {
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

    const { fullName, username, password, email } = req.body;

    // if(!fullName || !username || !password || !email){
    //     throw new ApiError(400,"all feilds are required");
    // }
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(409, "user email already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;


    //    const coverImageLocatPath = req.files?.coverImage[0]?.path;

    let coverImageLocatPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocatPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocatPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }


    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password  -refreshToken "
    )

    if (!createdUser) {
        throw new ApiError(500, "Smething Went Wrong on creating user")
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    // req.body -> data
    //username or email
    //password
    //find user in database
    //access and refresh token
    //send cokkie



    const { email, password, username } = req.body;


    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required")
    }

    // find user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(400, "User does not exist")
    }

    //"User" mongoDB ka object h or user hamara local object h so we use this because isPasswordCorrect hamne define kiya h or is user ke liye define h iske liye nahi "User"
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }

    //Access ans Refresh token kaii baar banae hote h isiliye we make a seperate method fot this 

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)


    //send this token to the user through cokkies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const options = {
        //isee hamari cokkie koi frontend se edit nahi kr payega only server side se hi ye modefiable hogi
        httpOnly: true,
        secure: true
    }


    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(200,
            {
                //ye isilye dunbara bhejen h because user apne cokkie ko locally save kr sakta h or ye ek best practice h
                //ye AccessResponse me data feild bhi h 

                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})


const logoutUser = asyncHandler(async (req, res) => {
    //First we have to clear their "cokkkies" and jo humne user ke model me "refrehToken" bheja h usee bhi clear krna hoga 

    //But yahan hamare pass user to hi nahi to usee mongoose se find kese kare Or logout karana ke liye email to enter karayege nahi user se

    // Soo we use a MIDDELWAER(JANE SE PEHLE MILKE JANA)

    await User.findByIdAndUpdate(

        req.user._id,
        {
            //ye ek object leta h unn chizo ka jo update krni h
            $set: {
                refreshToken: undefined
            }
        },
        {
            //joo return me response milega usme hume new updated value milegi 
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }


    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User loggedOut successfully"))



})



const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Invalid refresh token")
    }


    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRE
        )

        const user = await User.findById(decodedToken._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token expired")
        }


        //Verification ho gaye h to abb user ko new token banake send kr doo

        const options = {
            httpOnly: true,
            secure: true,
        }

        const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res.status(200).cookie(newAccessToken, options)
            .cookie(newRefreshToken, options).json(
                new ApiResponse(
                    200,
                    { accessToken: newAccessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Token access denied")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    //password change kr raha h => loggedIn h  => auth middleware chala h => to request me user h 
    if (confirmPassword !== newPassword) {
        throw new ApiError(401, "Password mismatch")
    }

    const user = await User.findById(req.user?._id)

    //abb User model me mene ispasswordCorrect method banaya tha to we use that vo async tha isiliye await
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword, newPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old Password incorrect")
    }

    //set new password
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully"))
})


const getCurrentuser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"current user sent successfully")
})

//Text feilds updation
const updateAccountDetails = asyncHandler(async(req,res)=>{

    //files update ke liye new controller design karo jisee photos change krte vakt faltu me text update na ho
    const {fullName,email} = req.body

    if(!fullName || !email){
        throw new ApiError(404,"All fields are required")
    }

   const updatedUser =  User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
        
    ).select("-password")

        return res.status(200).json(new ApiResponse(200,updatedUser,"Accountdetails Updated Successfully"));
});

//Update avatar
const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalpath = req.file?.path

    if(!avatarLocalpath) {
        throw new ApiError(401,"Avatar not found")
    }

    const uploadAvatar = uploadOnCloudinary(avatarLocalpath)

    if(!uploadAvatar.url) {
        throw new ApiError(401,"Avatar not uploaded on cloudinary")
    }

    const avatartUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar :uploadAvatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,avatartUser,"Cover Image Updated Successfully"))

})




//Update user  cover image
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverLocalpath = req.file?.path

    if(!coverLocalpath) {
        throw new ApiError(401,"cover image not found")
    }

    const uploadCover = uploadOnCloudinary(coverLocalpath)

    if(!uploadCover.url) {
        throw new ApiError(401,"Cover image not uploaded on cloudinary")
    }

   const coverUser =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage :uploadCover.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,coverUser,"Cover Image Updated Successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentuser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
};
