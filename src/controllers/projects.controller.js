import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dynamoDB } from "../db/index.js";
import { ProjectModelSchema } from "../models/projects.modal.js";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUploadToS3.js";

/**
 * Project Controller
 *
 * 1. Create Project
 * 2. Get Projects
 * 3. Get Project by ID
 * 4. Update Project
 * 5. Delete Project
 */

const createProject = asyncHandler(async (req, res) => {
  const { name, client, scope } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to create projects");
  }

  // Generate unique project ID
  const projectId = "PRJ" + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Upload project image if provided
  let imageUrl = null;
  if (req.file) {
    imageUrl = await uploadFileToS3(
      req.file.path,
      `projects/${projectId}-${req.file.originalname}`,
      process.env.AWS_S3_BUCKET_NAME,
      req.file.mimetype
    );
  }

  // Parse and validate with Zod schema
  const project = ProjectModelSchema.parse({
    projectId,
    name,
    client,
    scope,
    image: imageUrl,
  });

  // Create project in DynamoDB
  const params = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
    Item: project,
  };

  await dynamoDB.put(params).promise();

  res.status(201).json(
    new ApiResponse(201, "Project created successfully", project)
  );
});

const getProjects = asyncHandler(async (req, res) => {
  const params = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
  };

  const result = await dynamoDB.scan(params).promise();

  res.status(200).json(
    new ApiResponse(200, "Projects retrieved successfully", result.Items)
  );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const params = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
    Key: {
      projectId: projectId,
    },
  };

  const result = await dynamoDB.get(params).promise();

  if (!result.Item) {
    throw new ApiError(404, "Project not found");
  }

  res.status(200).json(
    new ApiResponse(200, "Project retrieved successfully", result.Item)
  );
});

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, client, scope } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to update projects");
  }

  // Check if project exists
  const getParams = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
    Key: {
      projectId: projectId,
    },
  };

  const projectResult = await dynamoDB.get(getParams).promise();
  if (!projectResult.Item) {
    throw new ApiError(404, "Project not found");
  }

  const existingProject = projectResult.Item;
  let imageUrl = existingProject.image;

  // Handle image upload if new file provided
  if (req.file) {
    // Delete old image if exists
    if (existingProject.image) {
      const oldImageKey = existingProject.image.split("/").slice(-2).join("/");
      try {
        await deleteFileFromS3(oldImageKey, process.env.AWS_S3_BUCKET_NAME);
      } catch (error) {
        console.error("Error deleting old image from S3:", error);
      }
    }

    // Upload new image
    imageUrl = await uploadFileToS3(
      req.file.path,
      `projects/${projectId}-${req.file.originalname}`,
      process.env.AWS_S3_BUCKET_NAME,
      req.file.mimetype
    );
  }

  // Build update expression
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (name !== undefined) {
    updateExpressions.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = name;
  }

  if (client !== undefined) {
    updateExpressions.push("#client = :client");
    expressionAttributeNames["#client"] = "client";
    expressionAttributeValues[":client"] = client;
  }

  if (scope !== undefined) {
    updateExpressions.push("#scope = :scope");
    expressionAttributeNames["#scope"] = "scope";
    expressionAttributeValues[":scope"] = scope;
  }

  if (imageUrl !== existingProject.image) {
    updateExpressions.push("#image = :image");
    expressionAttributeNames["#image"] = "image";
    expressionAttributeValues[":image"] = imageUrl;
  }

  if (updateExpressions.length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  const updateParams = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
    Key: {
      projectId: projectId,
    },
    UpdateExpression: "set " + updateExpressions.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamoDB.update(updateParams).promise();

  res.status(200).json(
    new ApiResponse(200, "Project updated successfully", result.Attributes)
  );
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to delete projects");
  }

  // Check if project exists
  const getParams = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
    Key: {
      projectId: projectId,
    },
  };

  const projectResult = await dynamoDB.get(getParams).promise();
  if (!projectResult.Item) {
    throw new ApiError(404, "Project not found");
  }

  const project = projectResult.Item;

  // Delete project image from S3 if exists
  if (project.image) {
    const imageKey = project.image.split("/").slice(-2).join("/");
    try {
      await deleteFileFromS3(imageKey, process.env.AWS_S3_BUCKET_NAME);
    } catch (error) {
      console.error("Error deleting image from S3:", error);
    }
  }

  // Delete project from DynamoDB
  const deleteParams = {
    TableName: process.env.DYNAMODB_PROJECT_TABLE,
    Key: {
      projectId: projectId,
    },
  };

  await dynamoDB.delete(deleteParams).promise();

  res.status(200).json(
    new ApiResponse(200, "Project deleted successfully", {})
  );
});

export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};