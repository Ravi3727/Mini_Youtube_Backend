import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/sub.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  try {

    const userId = req.user._id;
    const existingSubscription = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });

    if (existingSubscription) {
      const deletedSubscription = await Subscription.findOneAndDelete({
        subscriber: userId,
        channel: channelId,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(200, deletedSubscription, "Unsubscribed successfully")
        );
    } else {
      const newSubscription = await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });

      return res
        .status(201)
        .json(new ApiResponse(201, newSubscription, "Subscribed successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "something went wrong", error.message);
    throw new ApiError(500, error.message);
  }
});
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  try {
    const subscribers = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriberDetails",
        },
      },
      {
        $project: {
          _id: 0,
          subscriberDetails: {
            _id: 1,
            username: 1,
          },
        },
      },
    ]);
    const subscriberDetails =
      subscribers && subscribers.length > 0
        ? subscribers.map((subscriber) => subscriber.subscriberDetails)
        : [];
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscriberDetails[0],
          "Subscribers retrieved successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "something went wrong", error.message);
  }
});
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  try {
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users",
          let: { channelUserId: "$channel" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$channelUserId"],
                },
              },
            },
            {
              $project: {
                _id: 0, // Exclude _id field
                username: 1,
                avatar: 1,
              },
            },
          ],
          as: "channelDetails",
        },
      },
      {
        $unwind: "$channelDetails",
      },
    ]);
    console.log("these are subscribed channels", subscribedChannels);
    const subscribedChannelsDetails =
      subscribedChannels && subscribedChannels.length > 0
        ? subscribedChannels.map((subscription) => subscription.channelDetails)
        : [];
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannelsDetails,
          "Subscribed channels retrieved successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "something went wrong", error.message);
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };