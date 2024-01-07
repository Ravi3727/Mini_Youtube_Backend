import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Subscription } from "../models/sub.model.js";
import mongoose from "mongoose";


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
            $unset: {
                refreshToken: 1
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

    console.log(process.env.REFRESH_TOKEN_SCERET
    )
    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SCERET
        )
        console.log(decodedToken)

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

        return res.status(200).cookie("newAccessToken", newAccessToken, options)
            .cookie("RefreshToken", newRefreshToken, options).json(
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


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200,req.user,"user fetched successfully")
    )
})

//Text feilds updation
const updateAccountDetails = asyncHandler(async (req, res) => {

    //files update ke liye new controller design karo jisee photos change krte vakt faltu me text update na ho
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(404, "All fields are required")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email : email
            }
        },
        { new: true }

    ).select("-password")

    return res.status(200).json(new ApiResponse(200, updatedUser, "Account details Updated Successfully"));
});

//Update avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalpath = req.file?.path

    if (!avatarLocalpath) {
        throw new ApiError(401, "Avatar not found")
    }

    const uploadAvatar = await uploadOnCloudinary(avatarLocalpath)

    if (!uploadAvatar.url) {
        throw new ApiError(401, "Avatar not uploaded on cloudinary")
    }

    const avatartUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: uploadAvatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, avatartUser, "Cover Image Updated Successfully"))

})

//Update user  cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverLocalpath = req.file?.path

    if (!coverLocalpath) {
        throw new ApiError(401, "cover image not found")
    }

    const uploadCover = await uploadOnCloudinary(coverLocalpath)

    if (!uploadCover.url) {
        throw new ApiError(401, "Cover image not uploaded on cloudinary")
    }

    const coverUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: uploadCover.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, coverUser, "Cover Image Updated Successfully"))
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    //jese YT me url pe channel name likhte h
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Please enter a YT username")
    }

    //Aggrigation pipeline ka work h database me store data ko kuch filters laga ke hume present krna 
    //if we have 100 data point and we apply a pipeline which filter on the basiis of some condition and return 50 data point then for another pipeline this 50 data point is the data 
    // not previous 100 data point
    //     const channel = await User.aggregate([
    //     //first pipeline
    //     {
    //         $match: {
    //             username: username?.toLowerCase()
                
    //         }
    //     },
    //     {
    //         //Ye two or more collections ke beech connection banata h
    //         //Ye h uss channel ko kitno ne subscribe kiya hua h
    //         $lookup: {
    //             from: "subscriptions",//Subscriptions model ka name in dtabase convert to this
    //             localField: "_id",
    //             foreignField: "channel",
    //             as: "subscribers"//Koi bhi name de sakte h
    //         },

    //         //ye h uss channnel ne kitno ko subscribe kiya hua h
    //         $lookup: {
    //             from: "subscriptions",//Subscriptions model ka name in dtabase convert to this
    //             localField: "_id",
    //             foreignField: "subscriber",
    //             as: "subscribedTo"
    //         },
    //         //ye dono feids alag-2 h to abb dono koi combine or connect krne ke liye ek or pipeline
    //         //addFields operator user ki feilds to rakhega hi or unme extra feilds bhi add kr dega
            
    //         $addFields: {
    //             SubscribersCount: {
    //                 //$ isiliye use kiya because ye ek feild h
    //                 //$size = count all from this field
    //                 $size: "$subscribers"
    //             },
    //             channelsSubscribersToCount: {
    //                 $size: "$subscribedTo"
    //             },
    //             //Subcribe vala button change krne ke liye 
    //             isSubscribed: {
    //                 $cond: {
    //                     if: { $in: [req.user?._id, "$subscribers.subscriber"] },
    //                     then: true,
    //                     else: false
    //                 }
    //             }
    //         },
    //         //Selcted things project krne ke liye
    //         $project: {
    //             fullName: 1, //Means isee project karo
    //             username: 1,
    //             SubscribersCount: 1,
    //             channelsSubscribersToCount: 1,
    //             isSubscribed: 1,
    //             avatar: 1,
    //             coverImage: 1,
    //             email: 1,
    //         },
    //     },
    // ])

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    console.log("Aggregation channel data " + channel)

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res.status(200).json(
        new ApiResponse(200,
            channel[0],
            "Channel fetched successfully"
        )
    )
})


const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                //aggregation piplines ka code directly hi jata h so _id ko hume actuall object("id") me convert krke compare krna hoga for this we use this syntax
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "Videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched Successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory,
};
