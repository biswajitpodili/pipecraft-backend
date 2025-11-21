import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dynamoDB } from "../db/index.js";
import { CareerSchema } from "../models/career.modal.js";

/**
 * Career Controller
 *
 * 1. Create Job Posting
 * 2. Get Job Postings
 * 3. Update Job Posting
 * 4. Delete Job Posting
 */

const createJobPosting = asyncHandler(async (req, res) => {
  const {
    jobTitle,
    department,
    location,
    jobType,
    experienceLevel,
    description,
    responsibilities,
    requirements,
    qualifications,
    salary,
    isActive,
    numberOfPositions,
    applicationDeadline,
  } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to create job postings");
  }

  // Generate unique career ID
  const careerId = "CAR" + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Parse and validate with Zod schema
  const career = CareerSchema.parse({
    careerId,
    jobTitle,
    department,
    location,
    jobType,
    experienceLevel,
    description,
    responsibilities,
    requirements,
    qualifications,
    salary,
    isActive: isActive !== undefined ? isActive : true,
    numberOfPositions: numberOfPositions || 1,
    applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : undefined,
    createdAt: new Date().toISOString(),
  });

  // Create job posting in DynamoDB
  const params = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Item: career,
  };

  await dynamoDB.put(params).promise();

  res.status(201).json(
    new ApiResponse(201, "Job posting created successfully", career)
  );
});

const getJobPostings = asyncHandler(async (req, res) => {
  const { isActive, department, jobType, experienceLevel } = req.query;

  let params = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
  };

  // Build filter expressions
  const filterExpressions = [];
  const expressionAttributeValues = {};

  if (isActive !== undefined) {
    filterExpressions.push("isActive = :isActive");
    expressionAttributeValues[":isActive"] = isActive === "true";
  }

  if (department) {
    filterExpressions.push("department = :department");
    expressionAttributeValues[":department"] = department;
  }

  if (jobType) {
    filterExpressions.push("jobType = :jobType");
    expressionAttributeValues[":jobType"] = jobType;
  }

  if (experienceLevel) {
    filterExpressions.push("experienceLevel = :experienceLevel");
    expressionAttributeValues[":experienceLevel"] = experienceLevel;
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(" AND ");
    params.ExpressionAttributeValues = expressionAttributeValues;
  }

  const result = await dynamoDB.scan(params).promise();

  // Sort by createdAt descending (newest first)
  const sortedJobs = result.Items.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.status(200).json(
    new ApiResponse(200, "Job postings retrieved successfully", sortedJobs)
  );
});

const getJobPostingById = asyncHandler(async (req, res) => {
  const { careerId } = req.params;

  const params = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
  };

  const result = await dynamoDB.get(params).promise();

  if (!result.Item) {
    throw new ApiError(404, "Job posting not found");
  }

  res.status(200).json(
    new ApiResponse(200, "Job posting retrieved successfully", result.Item)
  );
});

const updateJobPosting = asyncHandler(async (req, res) => {
  const { careerId } = req.params;
  const {
    jobTitle,
    department,
    location,
    jobType,
    experienceLevel,
    description,
    responsibilities,
    requirements,
    qualifications,
    salary,
    isActive,
    numberOfPositions,
    applicationDeadline,
  } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to update job postings");
  }

  // Check if job posting exists
  const getParams = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
  };

  const careerResult = await dynamoDB.get(getParams).promise();
  if (!careerResult.Item) {
    throw new ApiError(404, "Job posting not found");
  }

  // Build update expression
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (jobTitle !== undefined) {
    updateExpressions.push("#jobTitle = :jobTitle");
    expressionAttributeNames["#jobTitle"] = "jobTitle";
    expressionAttributeValues[":jobTitle"] = jobTitle;
  }

  if (department !== undefined) {
    updateExpressions.push("#department = :department");
    expressionAttributeNames["#department"] = "department";
    expressionAttributeValues[":department"] = department;
  }

  if (location !== undefined) {
    updateExpressions.push("#location = :location");
    expressionAttributeNames["#location"] = "location";
    expressionAttributeValues[":location"] = location;
  }

  if (jobType !== undefined) {
    updateExpressions.push("#jobType = :jobType");
    expressionAttributeNames["#jobType"] = "jobType";
    expressionAttributeValues[":jobType"] = jobType;
  }

  if (experienceLevel !== undefined) {
    updateExpressions.push("#experienceLevel = :experienceLevel");
    expressionAttributeNames["#experienceLevel"] = "experienceLevel";
    expressionAttributeValues[":experienceLevel"] = experienceLevel;
  }

  if (description !== undefined) {
    updateExpressions.push("#description = :description");
    expressionAttributeNames["#description"] = "description";
    expressionAttributeValues[":description"] = description;
  }

  if (responsibilities !== undefined) {
    updateExpressions.push("#responsibilities = :responsibilities");
    expressionAttributeNames["#responsibilities"] = "responsibilities";
    expressionAttributeValues[":responsibilities"] = responsibilities;
  }

  if (requirements !== undefined) {
    updateExpressions.push("#requirements = :requirements");
    expressionAttributeNames["#requirements"] = "requirements";
    expressionAttributeValues[":requirements"] = requirements;
  }

  if (qualifications !== undefined) {
    updateExpressions.push("#qualifications = :qualifications");
    expressionAttributeNames["#qualifications"] = "qualifications";
    expressionAttributeValues[":qualifications"] = qualifications;
  }

  if (salary !== undefined) {
    updateExpressions.push("#salary = :salary");
    expressionAttributeNames["#salary"] = "salary";
    expressionAttributeValues[":salary"] = salary;
  }

  if (isActive !== undefined) {
    updateExpressions.push("#isActive = :isActive");
    expressionAttributeNames["#isActive"] = "isActive";
    expressionAttributeValues[":isActive"] = isActive;
  }

  if (numberOfPositions !== undefined) {
    updateExpressions.push("#numberOfPositions = :numberOfPositions");
    expressionAttributeNames["#numberOfPositions"] = "numberOfPositions";
    expressionAttributeValues[":numberOfPositions"] = numberOfPositions;
  }

  if (applicationDeadline !== undefined) {
    updateExpressions.push("#applicationDeadline = :applicationDeadline");
    expressionAttributeNames["#applicationDeadline"] = "applicationDeadline";
    expressionAttributeValues[":applicationDeadline"] = applicationDeadline ? new Date(applicationDeadline).toISOString() : null;
  }

  // Always update the updatedAt field
  updateExpressions.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  if (updateExpressions.length === 1) {
    throw new ApiError(400, "No fields to update");
  }

  const updateParams = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
    UpdateExpression: "set " + updateExpressions.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamoDB.update(updateParams).promise();

  res.status(200).json(
    new ApiResponse(200, "Job posting updated successfully", result.Attributes)
  );
});

const deleteJobPosting = asyncHandler(async (req, res) => {
  const { careerId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to delete job postings");
  }

  // Check if job posting exists
  const getParams = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
  };

  const careerResult = await dynamoDB.get(getParams).promise();
  if (!careerResult.Item) {
    throw new ApiError(404, "Job posting not found");
  }

  // Delete job posting
  const deleteParams = {
    TableName: process.env.DYNAMODB_CAREER_TABLE,
    Key: {
      careerId: careerId,
    },
  };

  await dynamoDB.delete(deleteParams).promise();

  res.status(200).json(
    new ApiResponse(200, "Job posting deleted successfully", {})
  );
});

export {
  createJobPosting,
  getJobPostings,
  getJobPostingById,
  updateJobPosting,
  deleteJobPosting,
};
