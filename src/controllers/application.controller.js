import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dynamoDB } from "../db/index.js";
import { ApplicationSchema } from "../models/applications.modal.js";
import { uploadFileToS3 } from "../utils/fileUploadToS3.js";

/**
 * Application Controller
 *
 * 1. Submit Application
 * 2. Get Applications
 * 3. Get Application by ID
 * 4. Delete Application
 */

const submitApplication = asyncHandler(async (req, res) => {
  const {
    careerId,
    applicantName,
    applicantEmail,
    applicantPhone,
    coverLetter,
  } = req.body;

  // Check if career posting exists
  const careerParams = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
  };

  const careerResult = await dynamoDB.get(careerParams).promise();
  if (!careerResult.Item) {
    throw new ApiError(404, "Job posting not found");
  }

  // Check if job is still active
  if (!careerResult.Item.isActive) {
    throw new ApiError(
      400,
      "This job posting is no longer accepting applications"
    );
  }

  // Check if application deadline has passed
  if (careerResult.Item.applicationDeadline) {
    const deadline = new Date(careerResult.Item.applicationDeadline);
    if (deadline < new Date().toISOString()) {
      throw new ApiError(400, "Application deadline has passed");
    }
  }

  // Upload resume to S3
  if (!req.file) {
    throw new ApiError(400, "Resume file is required");
  }

  const applicationId =
    "APP" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const resumeUrl = await uploadFileToS3(
    req.file.path,
    `resumes/${applicationId}-${req.file.originalname}`,
    process.env.AWS_S3_BUCKET_NAME,
    req.file.mimetype
  );

  // Create application in DynamoDB
  const params = {
    TableName: process.env.DYNAMODB_APPLICATION_TABLE,
    Item: {
      applicationId,
      careerId,
      applicantName,
      applicantEmail,
      applicantPhone,
      resumeLink: resumeUrl,
      coverLetter,
      appliedAt: new Date().toISOString(),
    },
  };

  await dynamoDB.put(params).promise();

  res
    .status(201)
    .json(
      new ApiResponse(201, "Application submitted successfully", params.Item)
    );
});

const getApplications = asyncHandler(async (req, res) => {
  const { careerId } = req.query;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to view applications");
  }

  let params = {
    TableName: process.env.DYNAMODB_APPLICATION_TABLE,
  };

  // Filter by careerId if provided
  if (careerId) {
    params.FilterExpression = "careerId = :careerId";
    params.ExpressionAttributeValues = {
      ":careerId": careerId,
    };
  }

  const result = await dynamoDB.scan(params).promise();

  // Sort by appliedAt descending (newest first)
  const sortedApplications = result.Items.sort((a, b) => {
    return new Date(b.appliedAt) - new Date(a.appliedAt);
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Applications retrieved successfully",
        sortedApplications
      )
    );
});

const getApplicationById = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to view application");
  }

  const params = {
    TableName: process.env.DYNAMODB_APPLICATION_TABLE,
    Key: {
      applicationId: applicationId,
    },
  };

  const result = await dynamoDB.get(params).promise();

  if (!result.Item) {
    throw new ApiError(404, "Application not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, "Application retrieved successfully", result.Item)
    );
});

const deleteApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to delete application");
  }

  // Check if application exists
  const getParams = {
    TableName: process.env.DYNAMODB_APPLICATION_TABLE,
    Key: {
      applicationId: applicationId,
    },
  };

  const applicationResult = await dynamoDB.get(getParams).promise();
  if (!applicationResult.Item) {
    throw new ApiError(404, "Application not found");
  }

  // Delete application
  const deleteParams = {
    TableName: process.env.DYNAMODB_APPLICATION_TABLE,
    Key: {
      applicationId: applicationId,
    },
  };

  await dynamoDB.delete(deleteParams).promise();

  res
    .status(200)
    .json(new ApiResponse(200, "Application deleted successfully", {}));
});

const getApplicationsByCareer = asyncHandler(async (req, res) => {
  const { careerId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to view applications");
  }

  // Check if career exists
  const careerParams = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
  };

  const careerResult = await dynamoDB.get(careerParams).promise();
  if (!careerResult.Item) {
    throw new ApiError(404, "Job posting not found");
  }

  // Get applications for this career
  const params = {
    TableName: process.env.DYNAMODB_APPLICATION_TABLE,
    FilterExpression: "careerId = :careerId",
    ExpressionAttributeValues: {
      ":careerId": careerId,
    },
  };

  const result = await dynamoDB.scan(params).promise();

  // Sort by appliedAt descending (newest first)
  const sortedApplications = result.Items.sort((a, b) => {
    return new Date(b.appliedAt) - new Date(a.appliedAt);
  });

  res.status(200).json(
    new ApiResponse(200, "Applications retrieved successfully", {
      job: careerResult.Item,
      applications: sortedApplications,
      totalApplications: sortedApplications.length,
    })
  );
});

export {
  submitApplication,
  getApplications,
  getApplicationById,
  deleteApplication,
  getApplicationsByCareer,
};
