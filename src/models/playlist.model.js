import mongoose, { Schema } from "mongoose";


const playlistSchema = new Schema({
    videos: [{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }],
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.Object,
        ref: "User"
    }
}, { timestamps: true })


export const Like = mongoose.model("Like", playlistSchema);