exports.handler = async (event, context) => {
  const queryParams = event.queryStringParameters || {};
  const title = queryParams.title;

  if (!title) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({ error: "Title is required" }),
    };
  }

  // Test response
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify({
      summary: `Test summary for ${title}`,
      title: title,
      url: `https://justapedia.org/wiki/${title.replace(/ /g, '_')}`,
    }),
  };
};
