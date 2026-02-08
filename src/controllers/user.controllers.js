import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"


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

    console.log(req.body)
    console.log("email", email);

    // validation - not empty 
    if (
        [fullName, email, username, password].some((fields) => fields?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    // check if user alreadu exist: username, email
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "Username and email already exist")
    }
    // check for image, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar file is required");
    }

    // upload theam to cloudnary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(404, "Avatar file is required");
    }
    
        // create user object - create enter in db
      const user = await  User.create({
            fullname, 
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
        if(!createUser){
            throw new ApiError(500, "Something Went Wrong while registering the user")
        }
        // return res

        return res.status(201).json(
            new ApiResponse(200, createUser, "User Registered Successfully")
        )
})


export { registerUser }