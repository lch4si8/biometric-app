export const handler = async (event) => {
  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify({ message: 'POST /login - NotImplemented' }),
  };
};
