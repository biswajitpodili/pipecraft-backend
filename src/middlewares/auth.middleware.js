import { dynamoDB } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken || req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      throw new ApiError(401, "No token provided");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decodedToken;

    const userParams = {
      TableName: process.env.DYNAMODB_USER_TABLE,
      Key: {
        userId: decodedToken.userId,
      },
    };
    const user = await dynamoDB.get(userParams).promise();
    req.user = {
      userId: user.Item.userId,
      email: user.Item.email,
      name: user.Item.name,
      role: user.Item.role,
      age: user.Item.age,
      avatar: user.Item.avatar,
      phone: user.Item.phone,
    };
    next();
  } catch (error) {
    next(new ApiError(401, "Invalid token"));
  }
});

export default verifyJWT;
