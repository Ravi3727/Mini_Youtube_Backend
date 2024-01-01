import mongoose, { Schema } from "mongoose"

const subSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,//jo subscribe krega 
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,//joo channel subscribe kiya subscriber ne
        ref: "User"
    }
}, { timestamp: true })

export const Subscription = mongoose.model("Subscription", subSchema)