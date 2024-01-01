import { Router } from "express";
import { registerUser, loginUser, logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


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



export default router