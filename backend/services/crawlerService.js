const axios = require('axios');
const cheerio = require('cheerio');
const AITrainingData = require('../models/AITrainingData');

class CrawlerService {
  async crawlWebsite(url, organizationId, maxPages = 10) {
    const visited = new Set();
    const results = [];
    const toVisit = [url];

    while (toVisit.length > 0 && visited.size < maxPages) {
      const currentUrl = toVisit.shift();
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const pageData = await this.crawlPage(currentUrl);
        if (pageData) {
          results.push(pageData);
          const baseUrl = new URL(url);
          pageData.links
            .filter(link => {
              try {
                const linkUrl = new URL(link, currentUrl);
                return linkUrl.hostname === baseUrl.hostname && !visited.has(linkUrl.href);
              } catch { return false; }
            })
            .slice(0, 5)
            .forEach(link => {
              try { toVisit.push(new URL(link, currentUrl).href); } catch {}
            });
        }
      } catch (error) {
        console.error(`Crawl error for ${currentUrl}:`, error.message);
      }
    }

    for (const page of results) {
      await AITrainingData.findOneAndUpdate(
        { organization: organizationId, url: page.url },
        {
          organization: organizationId,
          type: 'webpage',
          title: page.title,
          content: page.content,
          source: 'website_crawler',
          url: page.url,
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    return { pagesProcessed: results.length, pages: results.map(p => ({ url: p.url, title: p.title })) };
  }

  async crawlPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'ResolveAI-Bot/1.0' }
      });
      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, header, iframe, noscript').remove();
      const title = $('title').text().trim() || $('h1').first().text().trim() || url;
      const content = $('main, article, .content, #content, body')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);
      const links = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          links.push(href);
        }
      });
      return { url, title, content, links };
    } catch (error) {
      return null;
    }
  }
}

module.exports = new CrawlerService();
