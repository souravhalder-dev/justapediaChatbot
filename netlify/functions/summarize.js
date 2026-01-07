const fetch = require("node-fetch");
const cheerio = require("cheerio");

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

  try {
    const url = "https://justapedia.org/api.php";
    const params = new URLSearchParams({
      action: "parse",
      page: title,
      format: "json",
      prop: "text",
      redirects: 1,
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        "User-Agent": "JustapediaChatbot/1.0 (contact@example.com)",
      },
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify({ error: "Article not found or empty" }),
      };
    }

    const rawHtml = data.parse.text["*"];
    const $ = cheerio.load(rawHtml);

    // Remove unwanted elements
    const unwantedSelectors = [
      "script",
      "style",
      "table",
      "sup",
      "div.reflist",
      "div.navbox",
      "div.infobox",
      "div.metadata",
      "div.hatnote",
      "div.dablink",
      "div.relarticle",
      "div.tright",
      "div.tleft",
      "div.thumb",
      "span.mw-editsection",
      "div#toc",
      "div.toc",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ];

    unwantedSelectors.forEach((selector) => {
      $(selector).remove();
    });

    let text = $.root().text();

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    // Simple summary: take first 600 characters or first few sentences
    let summary = text.length > 600 ? text.substring(0, 600) + "..." : text;

    // Try to get first 3-4 sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length > 3) {
      summary = sentences.slice(0, 4).join(". ") + ".";
    }

    const articleUrl = `https://justapedia.org/wiki/${encodeURIComponent(
      title.replace(/ /g, "_")
    )}`;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        summary: summary,
        title: title,
        url: articleUrl,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
