import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next)=> {
    try {
        const Token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "")

        if (!Token) {
            throw new ApiError(401, "Unauthorized request Invalid token")
        }

        //decode necessary info which we sent in user controller jwt token 
        const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SCERET)

        //_id hi kio because jab humne jwt token banaya tha tab yehi name use kiya tha
        //But isme kuch filed mujhe ahi chahiye so i use .select

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }


        //Abb agar confirm ho agay ah ki user aa gaya h to we add a new object to response "res"

        req.user = user;
        next();//next middleware pe chale jao ya aage baad jaoo

    } catch (error) {
        throw new ApiError(401, error?.message || "Error in Auth Middleware: " + error)
    }



})