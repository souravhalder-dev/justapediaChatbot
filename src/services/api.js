import axios from "axios";

const WIKI_API_URL = "https://justapedia.org/api.php";
const BACKEND_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "https://justapediachatbot.netlify.app/.netlify/functions/summarize";

export const searchArticles = async (query) => {
  try {
    const response = await axios.get(WIKI_API_URL, {
      params: {
        action: "opensearch",
        search: query,
        limit: 5,
        format: "json",
        origin: "*",
      },
    });
    // opensearch returns [query, [titles], [descriptions], [urls]]
    const titles = response.data[1];
    const urls = response.data[3];
    return titles.map((title, index) => ({
      title,
      url: urls[index],
    }));
  } catch (error) {
    console.error("Error searching articles:", error);
    return [];
  }
};

export const getArticleSummary = async (title) => {
  try {
    const response = await axios.get(BACKEND_URL, {
      params: {
        title: title,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting article summary:", error);
    return null;
  }
};
