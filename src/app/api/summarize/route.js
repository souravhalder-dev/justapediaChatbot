import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Basic list of English stopwords
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'my', 'myself', 'nor', 'of', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'would',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

function getSentences(text) {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const segments = segmenter.segment(text);
  return Array.from(segments).map(s => s.segment.trim()).filter(s => s.length > 0);
}

function summarizeText(text, sentencesCount = 6) {
  const sentences = getSentences(text);
  if (sentences.length <= sentencesCount) {
    return text;
  }

  // Calculate word frequencies
  const wordFrequencies = {};
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  words.forEach(word => {
    if (!STOP_WORDS.has(word) && word.length > 2) {
      wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
    }
  });

  const maxFreq = Math.max(...Object.values(wordFrequencies), 1);
  
  // Normalize frequencies
  for (const word in wordFrequencies) {
    wordFrequencies[word] = wordFrequencies[word] / maxFreq;
  }

  // Score sentences
  const sentenceScores = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    let score = 0;
    sentenceWords.forEach(word => {
      if (wordFrequencies[word]) {
        score += wordFrequencies[word];
      }
    });
    // Boost early sentences slightly as they often contain key info
    if (index < 3) score *= 1.2;
    return { sentence, score, index };
  });

  // Sort by score and take top N
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, sentencesCount)
    // Sort back by original index to maintain flow
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence);

  // Post-processing cleanup
  const cleanedSummary = topSentences.filter(sent => {
    const lower = sent.toLowerCase();
    if (lower.startsWith("for other uses") || lower.includes("disambiguation")) return false;
    return true;
  }).map(sent => sent.replace("[edit | edit source]", ""));

  return cleanedSummary.join(" ");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const url = "https://justapedia.org/api.php";
    const params = new URLSearchParams({
      action: "parse",
      page: title,
      format: "json",
      prop: "text",
      redirects: "1"
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        "User-Agent": "JustapediaChatbot/1.0 (contact@example.com)"
      }
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.info || "API Error" }, { status: 404 });
    }

    const rawHtml = data.parse.text["*"];
    const $ = cheerio.load(rawHtml);

    // Remove unwanted elements
    const unwantedSelectors = [
      "script", "style", "table", "sup", 
      "div.reflist", "div.navbox", "div.infobox", "div.metadata",
      "div.hatnote", "div.dablink", "div.relarticle", "div.tright", "div.tleft", "div.thumb",
      "span.mw-editsection", "div#toc", "div.toc", "h2", "h3", "h4", "h5", "h6"
    ];
    
    unwantedSelectors.forEach(selector => $(selector).remove());

    let text = $.text();

    // Clean up whitespace and filter lines
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (!line) return false;
        if (line.startsWith("For other uses") || line.includes("redirects here") || line.startsWith("See also")) return false;
        // Skip common section headers if they remain
        if (/^(Contents|See also|References|External links|Bibliography|Further reading)\b/i.test(line)) return false;
        // Skip numeric TOC artifacts
        if (/^\d+(\s+\w+.*)?$/.test(line)) return false;
        return true;
      });

    const cleanText = lines.join('\n');
    const summaryText = summarizeText(cleanText);
    const articleUrl = `https://justapedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

    return NextResponse.json({
      summary: summaryText,
      title: data.parse.title,
      url: articleUrl
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
