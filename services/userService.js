
const axios = require('axios');

// Set base URL from env (or hardcode for dev)
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_URL;

async function getUserById(userId, authHeader) {
  try {
    const response = await axios.get(`${USER_SERVICE_BASE_URL}/users/getUser?userId=${userId}`, {
      headers: {
        Authorization: authHeader,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error calling User Service:', error.message);
    throw new Error('Unable to fetch user');
  }
};

async function getUserDetailsBatch(authHeader, bodyParams) {
  try {
    const response = await axios.post(
      `${USER_SERVICE_BASE_URL}/users/getUsersByIds`,
      bodyParams,
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    return response.data.users; // Assuming the response has a 'users' field
  } catch (error) {
    console.error('Error calling User Service for batch:', error.message);
    throw new Error('Unable to fetch user details in batch');
  }
};

module.exports = {
  getUserById,
  getUserDetailsBatch
};
