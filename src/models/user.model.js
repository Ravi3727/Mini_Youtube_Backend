import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar:{
        type: String,//Cloudinary
        required: true,
    },
    coverImage:{
        type: String,//Cloudinary
        required: true,
    }, 
    watchHistory:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    },
    password:{
        type: String,
        required: [true,'Password is required'],
    },
    refreshTocken:{
        type: String,
    }
},{timestamps:true})

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password,10)
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    await bcrypt.compare(password, this.password)
}


userSchema.methods.generateAccessToken = function(){
    jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName,
    },
    process.env.ACCESS_TOKEN_SCERET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken = function(){
    jwt.sign({
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SCERET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
)
}


userSchema.methods.generateRefreshToken = function(){}

export const User = mongoose.model("User",userSchema);