import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs"; import Event from '../models/eventModel.js';


export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: "30d",
            });
            res.cookie("x-auth-token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
            res.status(201).json({
                user,
                token,
                success: true,
                message: "Logged In Successfully!",
            });
        } else {
            res
                .status(400)
                .json({ message: "Invalid Email or Password!", success: false });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error });
    }
});
export const registerUser = asyncHandler(async (req, res) => {
    const { fName, lName, gender, dateOfBirth, email, phone, password } =
        req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    try {
        const prev = await User.findOne({ email });
        if (prev) {
            res.status(400).json({
                message: "User with this Email, Already Exists!",
                success: false,
            });
        } else {
            const user = await User.create({
                fName,
                lName,
                dateOfBirth,
                gender,
                email,
                phone,
                profileImage: "default-user.jpg",
                userName: email.split("@")[0],
                password: hashedPassword,
            });
            await user.save();
            res
                .status(201)
                .json({ message: "Registered Successfully!", success: true });
        }
    } catch (error) {
        res.status(500).json({ error });
    }
});
export const profile = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.status(200).json({ user, success: true });
    } catch (error) {
        res.status(500).json({ error, success: false });
    }
});
export const updateProfile = asyncHandler(async (req, res) => {
  console.log("updateing");
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, {
      new: true,
    }).select("-password");
    res.status(200).json({ user, success: true });
  } catch (error) {
    res.status(500).json({ error, success: false });
  }
});

//who to follow, check the interests of the user and suggest users with similar interests, if now interest suggest random users

export const whoToFollow = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.interests || user.interests.length === 0) {
      const users = await User.find({ _id: { $ne: user._id } }).select(
        "-password"
      );
      return res.status(200).json({ users, success: true });
    }

    // Get users with similar interests and not already followed
    const followersIds = user.followers.map((follower) => follower.toString());
    const users = await User.find({
      userName: { $ne: user.userName },
      interests: { $in: user.interests },
      _id: { $nin: followersIds },
    }).select("-password");

    res.status(200).json({ users, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message, success: false });
  }
});

export const followUser = asyncHandler(async (req, res) => {
  console.log("following");
    try {
        const { id } = req.params;

        const user = await User.findById(req.user.id);
        const targetUser = await User.findById(id);
    console.log(user, targetUser);

        if (!user || !targetUser) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }

        if (user.following.includes(id)) {
            return res
                .status(400)
                .json({ message: "Already following", success: false });
        }

        await user.updateOne({ $push: { following: id } });
        await targetUser.updateOne({ $push: { followers: req.user.id } });

        res.status(200).json({ message: "Followed successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

export const unfollowUser = asyncHandler(async (req, res) => {
    try {
        const { targetUserId } = req.params;

        const user = await User.findById(req.user.id);
        const targetUser = await User.findById(targetUserId);

        if (!user || !targetUser) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }

        if (!user.following.includes(targetUserId)) {
            return res.status(400).json({ message: "Not following", success: false });
        }

        await user.updateOne({ $pull: { following: targetUserId } });
        await targetUser.updateOne({ $pull: { followers: req.user.id } });

        res.status(200).json({ message: "Unfollowed successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

export const changeCover = asyncHandler(async (req, res) => {
    try {
        const { cover } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { cover },
            { new: true }
        );
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }
        res
            .status(200)
            .json({ message: "Cover updated successfully", user, success: true });
    } catch (error) { }
});
export const changeProfileImage = asyncHandler(async (req, res) => {
    try {
        const { profileImage } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profileImage },
            { new: true }
        );
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }
        res.status(200).json({
            message: "Profile Image updated successfully",
            user,
            success: true,
        });
    } catch (error) { }
});


export const getUserById = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.status(200).json({ user, success: true });
    } catch (error) {
        res.status(500).json({ error, success: false });
    }
});
export const getUserByUserName = asyncHandler(async (req, res) => {
    try {
        console.log(req.params.userName);
        const user = await User.findOne({ userName: req.params.userName });
        console.log(user);
        const currentUser = await User.findById(req.user.id);
        console.log(currentUser);
        //isFollowing
        //isBlocked

        const isFollowing = currentUser.following.includes(user._id);
        const isBlocked = currentUser.blockedUsers.includes(user._id);
        const isBlockedBy = user.blockedUsers.includes(currentUser._id);
        console.log(user, isFollowing, isBlocked, isBlockedBy);
        res
            .status(200)
            .json({ user, isFollowing, isBlocked, isBlockedBy, success: true });
    } catch (error) {
        res.status(500).json({ error, success: false });
    }
});

export const changeDetails = asyncHandler(async (req, res) => {
    try {
        const { fName, lName, headline, city, country, websiteLink, phone } =
            req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { fName, lName, headline, city, country, websiteLink, phone },
            { new: true }
        );
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }
        res
            .status(200)
            .json({ message: "Details updated successfully", user, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

export const changeInterests = asyncHandler(async (req, res) => {
    try {
        const { interests } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { interests },
            { new: true }
        );
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }
        res
            .status(200)
            .json({ message: "Interests updated successfully", user, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

export const changeAbout = asyncHandler(async (req, res) => {
    try {
        const { about } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { about },
            { new: true }
        );
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found", success: false });
        }
        res
            .status(200)
            .json({ message: "About updated successfully", user, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

export const suggestUsers = asyncHandler(async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);

        if (!currentUser.interests || currentUser.interests.length === 0) {
            const users = await User.find({ _id: { $ne: currentUser._id } })
                .select("-password")
                .limit(5);
            return res.status(200).json({ users, success: true });
        }
        const followersIds = currentUser.followers.map((follower) => follower._id);
        const users = await User.find({
            userName: { $ne: currentUser.userName },
            interests: { $in: currentUser.interests },
            _id: { $nin: followersIds },
        })
            .select("-password")
            .limit(5);

        res.status(200).json({ users, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, success: false });
    }
});

export const searchUsers = asyncHandler(async (req, res) => {
    try {
        const { query } = req.params;
        const users = await User.find({
            $or: [
                { fName: { $regex: query, $options: "i" } },
                { lName: { $regex: query, $options: "i" } },
                { userName: { $regex: query, $options: "i" } },
            ],
        }).select("-password");

        res.status(200).json({ users, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, success: false });
    }
});

export const addEvent = asyncHandler(async (req, res) => {
    try {
        const {
            eventName,
            eventDescription,
            eventDetails,
            eventDate,
            eventTags,
            helping,
            eventPoster
        } = req.body;

        // Create a new Event document
        const newEvent = new Event({
            eventName,
            eventDescription,
            eventDetails,
            eventDate,
            eventTags,
            helping,
            eventPoster,
        });

        // Save the Event document
        const savedEvent = await newEvent.save();

        // Find the user by ID
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        // Initialize the events array if it doesn't exist
        if (!user.events) {
            user.events = [];
        }

        // Add the event reference to the user's events array
        user.events.push(savedEvent._id);

        // Save the updated user document
        await user.save();

        res.status(200).json({ message: 'Event added successfully', user, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error', success: false });
    }
});

export const joinEvent = asyncHandler(async (req, res) => {
    try {
        const { eventId } = req.params;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        if (!user.volunteering) {
            user.volunteering = [];
        }

        user.volunteering.push(eventId);
        await user.save();
        res.status(200).json({ message: 'Event joined successfully', user, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});


export const getAllEvents = asyncHandler(async (req, res) => {
    try {
        // Find all users
        const users = await User.find();

        // Initialize an array to store all events
        let events = [];

        // Iterate through each user and populate their events
        for (const user of users) {
            if (user.events && user.events.length > 0) {
                // Populate events for the current user
                const populatedEvents = await Event.find({ _id: { $in: user.events } });
                events.push(...populatedEvents);
            }
        }

        // Return all events
        res.status(200).json({ events, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, success: false });
    }
});

export const getEventById = asyncHandler(async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        res.status(200).json({ event, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error, success: false });
    }
});
