import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getUserWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verify } from "jsonwebtoken";


const router = Router();


router.route("/register").post(
    //ye apna middlewaer h jo form data ke saath files bhi letke jaa raha h (multer)
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)


//secured routes ye kuch ese routes h jo me only login user ko available hoge 

//logoutUser vala code chale se pehle i check jwt token for this use middleware
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/tokenRefresh").post(refreshAccessToken)

router.route("/changepassword").post(verifyJWT, changeCurrentPassword)

router.route("/current_user").get(verifyJWT, getCurrentUser)

router.route("/update_account").patch(verifyJWT, updateAccountDetails)

router.route("/update_avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/update_cover_image").patch(verifyJWT, upload.single("cover_image"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/watchhistory").get(verifyJWT, getUserWatchHistory)


export default router