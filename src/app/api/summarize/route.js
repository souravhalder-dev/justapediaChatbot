import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Helper to split text into sentences (simple version)
function getSentences(text) {
  // Split by periods, but avoid common abbreviations (Mr., Dr., etc. - simplistic check)
  return text.match(/[^.!?]+[.!?]+/g) || [text];
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

    // 1. Clean up the DOM
    const unwantedSelectors = [
      "script", "style", "link", "meta",
      "table", "div.infobox", "div.navbox", "div.metadata", "div.reflist",
      "div.hatnote", "div.dablink", "div.relarticle", "div.tright", "div.tleft", "div.thumb",
      "span.mw-editsection", "sup.reference", "div#toc", "div.toc", ".mw-empty-elt"
    ];
    
    unwantedSelectors.forEach(selector => $(selector).remove());

    // 2. Sophisticated Extraction Logic
    let structuredContent = [];
    const root = $('.mw-parser-output').length ? $('.mw-parser-output') : $('body');
    
    let currentSection = {
      title: "Introduction",
      points: []
    };
    
    // Process elements sequentially
    root.children().each((i, el) => {
      const $el = $(el);
      
      // Handle Headings (New Sections)
      if ($el.is('h2')) {
        // Save previous section if it has content
        if (currentSection.points.length > 0) {
          structuredContent.push(currentSection);
        }
        
        // Start new section
        let sectionTitle = $el.text().trim();
        // Stop if we hit footer sections
        if (/^(See also|References|External links|Bibliography|Notes|Further reading)/i.test(sectionTitle)) {
          currentSection = null; // Stop processing
          return false; // Break the loop
        }
        
        currentSection = {
          title: sectionTitle,
          points: []
        };
      }
      
      // Handle Paragraphs (Content)
      if (currentSection && $el.is('p')) {
        let text = $el.text()
          .replace(/\[\d+\]/g, '') // Remove citations [1]
          .replace(/\[citation needed\]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (text.length > 30 && !text.startsWith("Coordinates:")) {
          // Intelligent Sentence Selection
          const sentences = getSentences(text);
          
          // For Introduction, take more detail (first 3 sentences of each paragraph)
          // For other sections, take the Topic Sentence (first sentence) + maybe one more if long
          const limit = currentSection.title === "Introduction" ? 3 : 1;
          
          sentences.slice(0, limit).forEach(sent => {
            const cleanSent = sent.trim();
            if (cleanSent.length > 15) { // Filter distinct noise
               currentSection.points.push(cleanSent);
            }
          });
        }
      }
      
      // Handle Lists (ul) - treat list items as points directly
      if (currentSection && $el.is('ul')) {
         $el.find('li').slice(0, 3).each((j, li) => { // Limit to top 3 list items per list to avoid spam
            let liText = $(li).text().replace(/\[\d+\]/g, '').trim();
            if (liText.length > 10) {
              currentSection.points.push(liText);
            }
         });
      }
    });
    
    // Push the last section
    if (currentSection && currentSection.points.length > 0) {
      structuredContent.push(currentSection);
    }

    // 3. Format Output
    // Limit total length to avoid overwhelming the user (e.g., top 8 sections)
    const limitedSections = structuredContent.slice(0, 8);
    
    let formattedSummary = "";
    
    limitedSections.forEach(section => {
      if (section.points.length === 0) return;
      
      // Uppercase title for emphasis
      formattedSummary += `${section.title.toUpperCase()}\n`;
      
      // Add bullets
      section.points.forEach(point => {
        formattedSummary += `• ${point}\n`;
      });
      
      formattedSummary += "\n"; // Spacing between sections
    });

    const articleUrl = `https://justapedia.org/wiki/${encodeURIComponent(data.parse.title.replace(/ /g, '_'))}`;

    return NextResponse.json({
      summary: formattedSummary.trim(),
      title: data.parse.title,
      url: articleUrl
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
