import json
import requests
from bs4 import BeautifulSoup
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer
import nltk
import sys
import re
import urllib.parse

# Download necessary NLTK data if needed
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')

def get_wiki_content(title):
    url = "https://justapedia.org/api.php"
    params = {
        "action": "parse",
        "page": title,
        "format": "json",
        "prop": "text",
        "redirects": 1
    }
    headers = {
        "User-Agent": "JustapediaChatbot/1.0 (contact@example.com)"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if "error" in data:
            return None
            
        raw_html = data["parse"]["text"]["*"]
        soup = BeautifulSoup(raw_html, "html.parser")
        
        # Remove unwanted elements
        unwanted_selectors = [
            "script", "style", "table", "sup", 
            "div.reflist", "div.navbox", "div.infobox", "div.metadata",
            "div.hatnote", "div.dablink", "div.relarticle", "div.tright", "div.tleft", "div.thumb",
            "span.mw-editsection", "div#toc", "div.toc", "h2", "h3", "h4", "h5", "h6"
        ]
        
        for selector in unwanted_selectors:
            for element in soup.select(selector):
                element.decompose()
            
        text = soup.get_text()
        
        # Clean up whitespace and filter out disambiguation lines that might remain
        lines = []
        heading_patterns = re.compile(r'^(Contents|See also|References|External links|Bibliography|Further reading)\b', re.IGNORECASE)
        for line in text.splitlines():
            stripped = line.strip()
            # Filter out common disambiguation phrases if they survived HTML cleaning
            if not stripped:
                continue
            if stripped.startswith("For other uses") or "redirects here" in stripped or stripped.startswith("See also"):
                continue
            if heading_patterns.match(stripped):
                continue
            # Skip lines that are just numeric TOC artifacts like "1 History 2 Geography ..."
            if re.match(r'^\d+(\s+\w+.*)?$', stripped):
                continue
            lines.append(stripped)
            
        clean_text = '\n'.join(lines)
        
        return clean_text
    except Exception as e:
        print(f"Error fetching content: {e}", file=sys.stderr)
        return None

def summarize_text(text, sentences_count=6):
    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LexRankSummarizer()
        summary = summarizer(parser.document, sentences_count)
        
        # Post-processing to clean up sentences
        cleaned_summary = []
        for sentence in summary:
            sent_str = str(sentence).strip()
            # Double check for unwanted phrases in the summary
            if sent_str.startswith("For other uses") or "disambiguation" in sent_str.lower():
                continue
            if "[edit | edit source]" in sent_str:
                sent_str = sent_str.replace("[edit | edit source]", "")
            cleaned_summary.append(sent_str)
            
        return " ".join(cleaned_summary)
    except Exception as e:
        print(f"Error summarizing text: {e}", file=sys.stderr)
        return text[:600] + "..."

def handler(event, context):
    # Get query parameters
    query_params = event.get('queryStringParameters') or {}
    title = query_params.get('title')
    
    if not title:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps({"error": "Title is required"})
        }
    
    content = get_wiki_content(title)
    if not content:
        return {
            'statusCode': 404,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps({"error": "Article not found or empty"})
        }
    
    summary_text = summarize_text(content)
    article_url = f"https://justapedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
    
    response_body = {
        "summary": summary_text,
        "title": title,
        "url": article_url
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps(response_body)
    }