import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { dynamoDB } from "../db/index.js";
import { ContactSchema } from "../models/contact.modal.js";

/**
 * Contact Controller
 *
 * 1. Create Contact
 * 2. Get Contacts
 * 3. Update Contact
 * 4. Delete Contact
 */

const createContact = asyncHandler(async (req, res) => {
  const { name, email, phone, companyName, serviceInterested, message } =
    req.body;

  // Generate unique contact ID
  const contactId =
    "CNT" + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Parse and validate with Zod schema
  // const contact = ContactSchema.parse({
  //   contactId,
  //   name,
  //   email,
  //   phone,
  //   companyName,
  //   serviceInterested,
  //   message,
  //   createdAt: new Date().toISOString(),
  // });

  // if (!contact) {
  //   throw new ApiError(400, "Invalid contact data");
  // }

  // Create contact in DynamoDB
  const params = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
    Item: {
      contactId: contactId,
      name: name,
      email: email,
      phone: phone,
      companyName: companyName,
      serviceInterested: serviceInterested,
      message: message,
      createdAt: new Date().toISOString(),
    },
  };
  await dynamoDB.put(params).promise();

  res
    .status(201)
    .json(new ApiResponse(201, "Contact created successfully", params.Item));
});

const getContacts = asyncHandler(async (req, res) => {
  
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to view contacts");
  }

  const params = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
  };

  const result = await dynamoDB.scan(params).promise();

  // Sort by createdAt descending (newest first)
  const sortedContacts = result.Items.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, "Contacts retrieved successfully", sortedContacts)
    );
});

const getContactById = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to view contact");
  }

  const params = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
    Key: {
      contactId: contactId,
    },
  };

  const result = await dynamoDB.get(params).promise();

  if (!result.Item) {
    throw new ApiError(404, "Contact not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Contact retrieved successfully", result.Item));
});

const updateContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const { name, email, phone, companyName, serviceInterested, message } =
    req.body;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to update contact");
  }

  // Check if contact exists
  const getParams = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
    Key: {
      contactId: contactId,
    },
  };

  const contactResult = await dynamoDB.get(getParams).promise();
  if (!contactResult.Item) {
    throw new ApiError(404, "Contact not found");
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

  if (companyName !== undefined) {
    updateExpressions.push("#companyName = :companyName");
    expressionAttributeNames["#companyName"] = "companyName";
    expressionAttributeValues[":companyName"] = companyName;
  }

  if (serviceInterested !== undefined) {
    updateExpressions.push("#serviceInterested = :serviceInterested");
    expressionAttributeNames["#serviceInterested"] = "serviceInterested";
    expressionAttributeValues[":serviceInterested"] = serviceInterested;
  }

  if (message !== undefined) {
    updateExpressions.push("#message = :message");
    expressionAttributeNames["#message"] = "message";
    expressionAttributeValues[":message"] = message;
  }

  // Always update the updatedAt field
  updateExpressions.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  if (updateExpressions.length === 1) {
    // Only updatedAt
    throw new ApiError(400, "No fields to update");
  }

  const updateParams = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
    Key: {
      contactId: contactId,
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
      new ApiResponse(200, "Contact updated successfully", result.Attributes)
    );
});

const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to delete contact");
  }

  // Check if contact exists
  const getParams = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
    Key: {
      contactId: contactId,
    },
  };

  const contactResult = await dynamoDB.get(getParams).promise();
  if (!contactResult.Item) {
    throw new ApiError(404, "Contact not found");
  }

  // Delete contact
  const deleteParams = {
    TableName: process.env.DYNAMODB_CONTACT_TABLE,
    Key: {
      contactId: contactId,
    },
  };

  await dynamoDB.delete(deleteParams).promise();

  res
    .status(200)
    .json(new ApiResponse(200, "Contact deleted successfully", {}));
});

export {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
};
