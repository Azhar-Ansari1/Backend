import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const genrateAccessAndrefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generaterefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while generating access and referesh tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {


    // get user details from frontend 
    // validation - not empty
    // check of user already exist: username, email
    // check for image , check for avatar
    // upload theme to cloudanary , avatar
    // create user object - create enter in db
    // remove password and refresh token field from response 
    // check for user creation
    // return res

    // get user details from frontend
    const { fullName, email, username, password } = req.body

    // console.log(req.body)
    // console.log("email", email);

    // validation - not empty 
    if (
        [fullName, email, username, password].some((fields) => fields?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    // check if user alreadu exist: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "Username and email already exist")
    }
    // check for image, check for avatar
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar file is required");
    }
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    // upload theam to cloudnary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(404, "Avatar file is required");
    }

    // create user object - create enter in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    // remove password and refresh token field from response 

    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // check for user creation
    if (!createUser) {
        throw new ApiError(500, "Something Went Wrong while registering the user")
    }
    // return res

    return res.status(201).json(
        new ApiResponse(200, createUser, "User Registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username and email
    // find the user
    // password check
    // access and referesh token
    //send cookie
    // return res
    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "username and password is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(404, " Invalid user credentials ")
    }

   const { accessToken, refreshToken} = await genrateAccessAndrefreshTokens(user._id)

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

     const options = {
        httpOnly: true,
        secure: true
     }

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )


})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
      const options = {
        httpOnly: true,
        secure: true
     }
     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new ApiResponse(200, {}, "User Logged Out"))
})
export {
    registerUser,
    loginUser,
    logoutUser
}