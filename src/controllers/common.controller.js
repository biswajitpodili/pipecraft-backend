import { ApiResponse } from "../utils/ApiResponse.js";

const pingme = (req, res) => {
  res.status(200).json(new ApiResponse(200, "Pong! Server is up and running."));
};

export { pingme };
