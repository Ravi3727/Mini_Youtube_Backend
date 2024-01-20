import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  try {
    const userId = req.user._id;
    const conditions = { likedBy: userId, video: videoId };
    const like = await Like.find(conditions);
    if (!like) {
      const newLike = await Like.create({ video: videoId, likedBy: userId });
      return res
        .status(200)
        .json(new ApiResponse(201, newLike, "Liked successfully"));
    } else {
      const removeLike = await Like.findOneAndRemove(conditions);
      return res
        .status(200)
        .json(new ApiResponse(201, removeLike, "Removed like successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Something went wrong", error.message);
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;
  try {
    const conditions = { likedBy: userId, tweet: tweetId };
    const like = await Like.findOne(conditions);
    if (!like) {
      const newLike = await Like.create({
        comment: commentId,
        likedBy: userId,
      });
      return res
        .status(200)
        .json(new ApiResponse(201, newLike, "Liked successfully"));
    } else {
      const removeLike = await Like.findOneAndRemove(conditions);
      return res
        .status(200)
        .json(new ApiResponse(201, removeLike, "Removed like successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Something went wrong", error.message);
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;
  try {
    const conditions = { likedBy: userId, tweet: tweetId };
    const like = await Like.findOne(conditions);

    if (!like) {
      const newLike = await Like.create({
        tweet: tweetId,
        likedBy: userId,
      });
      return res
        .status(200)
        .json(new ApiResponse(201, newLike, "Liked successfully"));
    } else {
      const removeLike = await Like.findOneAndRemove(conditions);
      return res
        .status(200)
        .json(new ApiResponse(201, removeLike, "Removed like successfully"));
    }
  } catch (error) {}
});

const getLikedVideos = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const likedVideos = await Like.find({ likedBy: userId });
    if (!likedVideos) {
      throw new ApiError(404, "No videos found");
    }
    res
      .status(201)
      .json(new ApiResponse(200, likedVideos, "Fetched successfull"));
  } catch (error) {}
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
