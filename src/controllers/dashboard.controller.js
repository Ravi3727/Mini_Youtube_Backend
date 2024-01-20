import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/sub.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    //Video views fetch karo
    let videoViews = await Video.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);
    console.log("these are video views", videoViews);
    const totalVideoViews = videoViews ? videoViews[0]?.totalViews : 0;
    //total subscribers ko count karo
    const totalSubscribers = await Subscription.countDocuments({
      channel: userId,
    });
    const totalVideos = await Video.countDocuments({ owner: userId });
    const videos = await Video.find({ owner: userId }, "_id");
    const totalLikes = await Like.countDocuments({
      video: { $in: videos.map((video) => video._id) },
    });
    console.log("Total Likes:", totalLikes);

    res
      .status(201)
      .json(
        new ApiResponse(
          200,
          { totalVideoViews, totalSubscribers, totalVideos, totalLikes },
          "fetched data"
        )
      );
  } catch (error) {
    throw new ApiError(500, error.message);
  }
}); 

const getChannelVideos = asyncHandler(async (req, res) => {
  try {
    const user = req.user._id;
    const channelVideos = await Video.find({ owner: user });
    if (!channelVideos) {
      return new ApiError(404, "videos not found");
    }
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          channelVideos,
          "Fetched Channel Videos Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, error.message);
  }
}); 

export { getChannelStats, getChannelVideos };