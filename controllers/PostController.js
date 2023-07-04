import PostModel from "../models/postModel.js";
import UserModel from "../models/userModel.js";
import CommentModel from "../models/commentModel.js";
import ReportModel from "../models/postsReportModel.js";
import mongoose from "mongoose";

// creating a post

export const createPost = async (req, res) => {
  console;
  const newPost = new PostModel(req.body);
  try {
    await newPost.save();

    const post = JSON.parse(JSON.stringify(newPost));
    post.userInfo = {};
    let users = await UserModel.find();
    users.forEach((user) => {
      if (user._id.toString() === post.userId.toString()) {
        post.userInfo.username = user.username;
        if (user.profilePicture)
          post.userInfo.profilePicture = user.profilePicture;
      }
    });
    post.comments = [];

    res.status(200).json(post);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

// get a post

export const getPost = async (req, res) => {
  const id = req.params.id;

  try {
    const post = await PostModel.findById(id);

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
};

// update post
export const updatePost = async (req, res) => {
  const postId = req.params.id;
  const { userId } = req.body;

  try {
    const post = await PostModel.findById(postId);
    if (post.userId === userId) {
      await post.updateOne({ $set: req.body });
      res.status(200).json("Post updated!");
    } else {
      res.status(403).json("Authentication failed");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// delete a post
export const deletePost = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;

  try {
    const post = await PostModel.findById(id);
    if (post.userId === userId) {
      await post.deleteOne();
      res.status(200).json(post);
    } else {
      res.status(403).json("Action forbidden");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

export const deleteComment = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;
  try {
    const comment = await CommentModel.findById(id);
    if (comment.userId.equals(mongoose.Types.ObjectId(userId))) {
      await comment.deleteOne();

      const user = await UserModel.findById(userId);
      const followingIds = user.following;
      followingIds.push(userId);

      const postsWithComments = await PostModel.aggregate([
        {
          $addFields: {
            userId: { $toObjectId: "$userId" },
          },
        },
        {
          $match: {
            userId: {
              $in: followingIds.map((id) => mongoose.Types.ObjectId(id)),
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "postId",
            as: "comments",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "comments.userId",
            foreignField: "_id",
            as: "commentUsers",
          },
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            desc: 1,
            likes: 1,
            image: 1,
            video: 1,
            status: 1,
            createdAt: 1,
            "userInfo.username": 1,
            "userInfo.profilePicture": 1,
            comments: {
              $map: {
                input: "$comments",
                as: "comment",
                in: {
                  $mergeObjects: [
                    "$$comment",
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$commentUsers",
                            cond: { $eq: ["$$this._id", "$$comment.userId"] },
                          },
                        },
                        0,
                      ],
                    },
                    { _id: "$$comment._id" },
                  ],
                },
              },
            },
          },
        },
      ]);

      const allPosts = postsWithComments.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      res.status(200).json(allPosts);
    } else {
      res.status(403).json("Action forbidden");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// like/dislike a post
export const likePost = async (req, res) => {
  const id = req.params.id;
  const { userId } = req.body;
  try {
    const post = await PostModel.findById(id);
    if (post.likes.includes(userId)) {
      await post.updateOne({ $pull: { likes: userId } });
      res.status(200).json("Post disliked");
    } else {
      await post.updateOne({ $push: { likes: userId } });
      res.status(200).json("Post liked");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// Get timeline posts
export const getTimelinePosts = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await UserModel.findById(userId);
    const followingIds = user.following;
    followingIds.push(userId);

    const postsWithComments = await PostModel.aggregate([
      {
        $addFields: {
          userId: { $toObjectId: "$userId" },
        },
      },
      {
        $match: {
          userId: {
            $in: followingIds.map((id) => mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.userId",
          foreignField: "_id",
          as: "commentUsers",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          desc: 1,
          likes: 1,
          image: 1,
          video: 1,
          status: 1,
          createdAt: 1,
          "userInfo.username": 1,
          "userInfo.profilePicture": 1,
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                $mergeObjects: [
                  "$$comment",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$commentUsers",
                          cond: { $eq: ["$$this._id", "$$comment.userId"] },
                        },
                      },
                      0,
                    ],
                  },
                  { _id: "$$comment._id" },
                ],
              },
            },
          },
        },
      },
    ]);

    const allPosts = postsWithComments.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json(allPosts);
  } catch (error) {
    res.status(500).json(error);
    console.log(error);
  }
};
export const addComment = async (req, res) => {
  req.body.userId = mongoose.Types.ObjectId(req.body.userId);
  req.body.postId = mongoose.Types.ObjectId(req.body.postId);
  const newComment = new CommentModel(req.body);
  const user = await UserModel.findById(req.body.userId);
  const followingIds = user.following;
  followingIds.push(req.body.userId);

  try {
    const comment = await newComment.save();
    // const post = await PostModel.findById(id);
    // res.status(200).json(post);
    const postsWithComments = await PostModel.aggregate([
      {
        $addFields: {
          userId: { $toObjectId: "$userId" },
        },
      },
      {
        $match: {
          userId: {
            $in: followingIds.map((id) => mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.userId",
          foreignField: "_id",
          as: "commentUsers",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          desc: 1,
          likes: 1,
          image: 1,
          video: 1,
          status: 1,
          createdAt: 1,
          "userInfo.username": 1,
          "userInfo.profilePicture": 1,
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                $mergeObjects: [
                  "$$comment",
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$commentUsers",
                          cond: { $eq: ["$$this._id", "$$comment.userId"] },
                        },
                      },
                      0,
                    ],
                  },
                  { _id: "$$comment._id" },
                ],
              },
            },
          },
        },
      },
    ]);
    const allPosts = postsWithComments.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json(allPosts);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

//report post
export const reportPost = async (req, res) => {
  const reportInfo = { userId: req.body.userId, reason: req.body.reason };

  const postExist = await ReportModel.findOne({ postId: req.body.postId });
  // const reportExist = await ReportModel.findOne({
  //   reports: { $elemMatch: { userId: req.body.userId } },
  // });
  // if(reportExist){
  //   res.status(200).json("Already Reported");
  // }else{
  if (!postExist) {
    const reportData = {
      postId: req.body.postId,
      postUserId: req.body.postUserId,
      reports: [reportInfo],
    };
    const newReport = new ReportModel(reportData);
    try {
      await newReport.save();
      res.status(200).json("Reported");
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  } else {
    const alreadyReported = postExist.reports.some((report) =>report.userId.equals(mongoose.Types.ObjectId(req.body.userId)));
    if (alreadyReported) {
      res.status(200).json("Already Reported");
    } else {
      try {
        const post = await ReportModel.findByIdAndUpdate(
          postExist._id,
          {
            $push: { reports: reportInfo },
          },
          { new: true }
        );
        if (post.reports.length > 10) {
          await PostModel.findByIdAndUpdate(req.body.postId, { status: false });
        }
        res.status(200).json("Reported");
      } catch (error) {
        console.log(error);
        res.status(500).json(error);
      }
    }
  }
};
