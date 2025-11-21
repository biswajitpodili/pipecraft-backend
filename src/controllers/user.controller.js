import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dynamoDB } from "../db/index.js";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUploadToS3.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModalSchema from "../models/user.modal.js";

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, age, role } = req.body;

  const userId = "USR" + Math.random().toString(36).substr(2, 9).toUpperCase();
  const avatarUrl = req.file
    ? await uploadFileToS3(
        req.file.path,
        `avatars/${userId}-${req.file.originalname}`,
        process.env.AWS_S3_BUCKET_NAME,
        req.file.mimetype
      )
    : null;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = UserModalSchema.parse({
    userId,
    name,
    email,
    password: hashedPassword,
    avatar: avatarUrl,
    phone,
    age: age ? Number(age) : undefined,
    role,
  });

  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Item: user,
    ConditionExpression: "attribute_not_exists(email)",
  };

  await dynamoDB.put(params).promise();

  res.status(201).json(new ApiResponse(201, "User created successfully", user));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
    },
  };

  const result = await dynamoDB.scan(params).promise();

  if (!result.Items || result.Items.length === 0) {
    throw new ApiError(401, "Invalid email or password");
  }

  const user = result.Items[0];

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const accessToken = jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );

  const updateRefreshTokenParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: user.userId,
    },
    UpdateExpression: "set refreshToken = :refreshToken",
    ExpressionAttributeValues: {
      ":refreshToken": refreshToken,
    },
  };

  await dynamoDB.update(updateRefreshTokenParams).promise();

  const accessTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set to false for local development (HTTP)
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Use 'lax' for local development
    maxAge: 1 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  const refreshTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set to false for local development (HTTP)
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Use 'lax' for local development
    maxAge: 10 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(
      new ApiResponse(200, "Login successful", {
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          age: user.age,
          role: user.role,
        },
        accessToken,
        refreshToken,
      })
    );
});

const getUserProfile = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(200, "User profile retrieved successfully", req.user)
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const updateParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: req.user.userId,
    },
    UpdateExpression: "remove refreshToken",
  };
  await dynamoDB.update(updateParams).promise();

  const refreshTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set to false for local development (HTTP)
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Use 'lax' for local development
    maxAge: 10 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  const accessTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set to false for local development (HTTP)
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Use 'lax' for local development
    maxAge: 1 * 24 * 60 * 60 * 1000,
    path: "/",
  };
  res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("refreshToken", refreshTokenOptions)
    .json(new ApiResponse(200, "User Logged out", {}));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: req.user.userId,
    },
  };
  const result = await dynamoDB.get(params).promise();
  const user = result.Item;
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Old password is incorrect");
  }
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  const updateParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: req.user.userId,
    },
    UpdateExpression: "set password = :password",
    ExpressionAttributeValues: {
      ":password": hashedNewPassword,
    },
  };
  await dynamoDB.update(updateParams).promise();
  res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully", {}));
});

const generateRefreshAuthToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const params = {
      TableName: process.env.DYNAMODB_USER_TABLE,
      Key: {
        userId: decoded.userId,
      },
    };

    const result = await dynamoDB.get(params).promise();

    if (!result.Item) {
      throw new ApiError(401, "User not found");
    }

    if (result.Item.refreshToken !== refreshToken) {
      throw new ApiError(
        401,
        "Invalid refresh token or token has been expired"
      );
    }

    const accessToken = jwt.sign(
      {
        userId: result.Item.userId,
        email: result.Item.email,
        name: result.Item.name,
        role: result.Item.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    const refreshTokenOptions = {
      httpOnly: true,
      secure: true, // required for SameSite=None
      sameSite: "none", // needed for cross-site cookies
      maxAge: 10 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    // Cookie options for access token (15 minutes)
    const accessTokenOptions = {
      httpOnly: true,
      secure: true, // required for SameSite=None
      sameSite: "none", // needed for cross-site cookies
      maxAge: 1 * 24 * 60 * 60 * 1000,
      path: "/",
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, accessTokenOptions)
      .cookie("refreshToken", refreshToken, refreshTokenOptions)
      .json(
        new ApiResponse(200, "Access token generated successfully", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to update this user");
  }

  const getParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: userId,
    },
  };
  const userResult = await dynamoDB.get(getParams).promise();
  if (!userResult.Item) {
    throw new ApiError(404, "User not found");
  }
  const targetUser = userResult.Item;

  const { name, email, phone, age } = req.body;

  let avatarUrl = targetUser.avatar;

  if (req.file) {
    const oldAvatarKey = targetUser.avatar
      ? targetUser.avatar.split("/").slice(-2).join("/")
      : null;

    avatarUrl = await uploadFileToS3(
      req.file.path,
      `avatars/${userId}-${req.file.originalname}`,
      process.env.AWS_S3_BUCKET_NAME,
      req.file.mimetype
    );

    if (oldAvatarKey) {
      try {
        await deleteFileFromS3(oldAvatarKey, process.env.AWS_S3_BUCKET_NAME);
      } catch (error) {
        console.error("Error deleting old avatar from S3:", error);
      }
    }
  }

  if (email && email !== targetUser.email) {
    const emailCheckParams = {
      TableName: process.env.DYNAMODB_USER_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    };
    const emailCheckResult = await dynamoDB.scan(emailCheckParams).promise();
    if (emailCheckResult.Items && emailCheckResult.Items.length > 0) {
      throw new ApiError(400, "Email already exists");
    }
  }

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (name !== undefined) {
    updateExpressions.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = name;
  }

  if (email !== undefined) {
    updateExpressions.push("#email = :email");
    expressionAttributeNames["#email"] = "email";
    expressionAttributeValues[":email"] = email;
  }

  if (phone !== undefined) {
    updateExpressions.push("#phone = :phone");
    expressionAttributeNames["#phone"] = "phone";
    expressionAttributeValues[":phone"] = phone;
  }

  if (age !== undefined) {
    updateExpressions.push("#age = :age");
    expressionAttributeNames["#age"] = "age";
    expressionAttributeValues[":age"] = age ? Number(age) : undefined;
  }

  if (avatarUrl !== targetUser.avatar) {
    updateExpressions.push("#avatar = :avatar");
    expressionAttributeNames["#avatar"] = "avatar";
    expressionAttributeValues[":avatar"] = avatarUrl;
  }

  if (updateExpressions.length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  const updateParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: userId,
    },
    UpdateExpression: "set " + updateExpressions.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamoDB.update(updateParams).promise();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "User profile updated successfully",
        result.Attributes
      )
    );
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to delete this user");
  }

  const getParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: userId,
    },
  };
  const userResult = await dynamoDB.get(getParams).promise();
  if (!userResult.Item) {
    throw new ApiError(404, "User not found");
  }
  const user = userResult.Item;

  if (user.avatar) {
    const urlParts = user.avatar.split("/");
    const key = urlParts.slice(-2).join("/"); // e.g., avatars/USR123-file.jpg
    try {
      await deleteFileFromS3(key, process.env.AWS_S3_BUCKET_NAME);
    } catch (error) {
      console.error("Error deleting avatar from S3:", error);
    }
  }

  const deleteParams = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: userId,
    },
  };

  await dynamoDB.delete(deleteParams).promise();

  if (req.user.userId === userId) {
    const accessTokenOptions = {
      httpOnly: true,
    };

    const refreshTokenOptions = {
      httpOnly: true,
    };

    res
      .status(200)
      .clearCookie("accessToken", accessTokenOptions)
      .clearCookie("refreshToken", refreshTokenOptions)
      .json(new ApiResponse(200, "User deleted successfully", {}));
  } else {
    res.status(200).json(new ApiResponse(200, "User deleted successfully", {}));
  }
});

const listUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to list users");
  }

  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
  };

  const result = await dynamoDB.scan(params).promise();

  const users = result.Items.map((user) => {
    const { password, refreshToken, ...safeUser } = user;
    return safeUser;
  });

  res
    .status(200)
    .json(new ApiResponse(200, "Users retrieved successfully", users));
});

export {
  createUser,
  loginUser,
  getUserProfile,
  logoutUser,
  changePassword,
  generateRefreshAuthToken,
  updateUserProfile,
  deleteUser,
  listUsers,
};
