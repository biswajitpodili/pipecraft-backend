import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dynamoDB } from "../db/index.js";
import { ServiceModelSchema } from "../models/service.modal.js";

/**
 * Service Controller
 * 
 * 1. Create Service
 * 2. Get Services
 * 3. Update Service
 * 4. Delete Service
 */

const createService = asyncHandler(async (req, res) => {
  const { title, description, features, isActive } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to create services");
  }

  // Generate unique service ID
  const serviceId = "SRV" + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Parse and validate with Zod schema
  const service = ServiceModelSchema.parse({
    serviceId,
    title,
    description,
    features: features || [],
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date().toISOString(),
  });

  // Check if service with same title already exists
  const checkParams = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    FilterExpression: "title = :title",
    ExpressionAttributeValues: {
      ":title": title,
    },
  };

  const existingService = await dynamoDB.scan(checkParams).promise();
  if (existingService.Items && existingService.Items.length > 0) {
    throw new ApiError(400, "Service with this title already exists");
  }

  // Create service in DynamoDB
  const params = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    Item: service,
  };

  await dynamoDB.put(params).promise();

  res.status(201).json(
    new ApiResponse(201, "Service created successfully", service)
  );
});

const getServices = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  let params = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
  };

  // Filter by isActive if provided
  if (isActive !== undefined) {
    params.FilterExpression = "isActive = :isActive";
    params.ExpressionAttributeValues = {
      ":isActive": isActive === "true",
    };
  }

  const result = await dynamoDB.scan(params).promise();

  res.status(200).json(
    new ApiResponse(200, "Services retrieved successfully", result.Items)
  );
});

const getServiceById = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  const params = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    Key: {
      serviceId: serviceId,
    },
  };

  const result = await dynamoDB.get(params).promise();

  if (!result.Item) {
    throw new ApiError(404, "Service not found");
  }

  res.status(200).json(
    new ApiResponse(200, "Service retrieved successfully", result.Item)
  );
});

const updateService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { title, description, features, isActive } = req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to update services");
  }

  // Check if service exists
  const getParams = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    Key: {
      serviceId: serviceId,
    },
  };

  const serviceResult = await dynamoDB.get(getParams).promise();
  if (!serviceResult.Item) {
    throw new ApiError(404, "Service not found");
  }

  // Check if new title conflicts with existing service
  if (title && title !== serviceResult.Item.title) {
    const checkParams = {
      TableName: process.env.DYNAMODB_SERVICE_TABLE,
      FilterExpression: "title = :title",
      ExpressionAttributeValues: {
        ":title": title,
      },
    };
    const existingService = await dynamoDB.scan(checkParams).promise();
    if (existingService.Items && existingService.Items.length > 0) {
      throw new ApiError(400, "Service with this title already exists");
    }
  }

  // Build update expression
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (title !== undefined) {
    updateExpressions.push("#title = :title");
    expressionAttributeNames["#title"] = "title";
    expressionAttributeValues[":title"] = title;
  }

  if (description !== undefined) {
    updateExpressions.push("#description = :description");
    expressionAttributeNames["#description"] = "description";
    expressionAttributeValues[":description"] = description;
  }

  if (features !== undefined) {
    updateExpressions.push("#features = :features");
    expressionAttributeNames["#features"] = "features";
    expressionAttributeValues[":features"] = features;
  }

  if (isActive !== undefined) {
    updateExpressions.push("#isActive = :isActive");
    expressionAttributeNames["#isActive"] = "isActive";
    expressionAttributeValues[":isActive"] = isActive;
  }

  // Always update the updatedAt field
  updateExpressions.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  if (updateExpressions.length === 1) { // Only updatedAt
    throw new ApiError(400, "No fields to update");
  }

  const updateParams = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    Key: {
      serviceId: serviceId,
    },
    UpdateExpression: "set " + updateExpressions.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamoDB.update(updateParams).promise();

  res.status(200).json(
    new ApiResponse(200, "Service updated successfully", result.Attributes)
  );
});

const deleteService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to delete services");
  }

  // Check if service exists
  const getParams = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    Key: {
      serviceId: serviceId,
    },
  };

  const serviceResult = await dynamoDB.get(getParams).promise();
  if (!serviceResult.Item) {
    throw new ApiError(404, "Service not found");
  }

  // Delete service
  const deleteParams = {
    TableName: process.env.DYNAMODB_SERVICE_TABLE,
    Key: {
      serviceId: serviceId,
    },
  };

  await dynamoDB.delete(deleteParams).promise();

  res.status(200).json(
    new ApiResponse(200, "Service deleted successfully", {})
  );
});

export {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
};
