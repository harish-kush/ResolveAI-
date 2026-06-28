const axios = require('axios');
const cheerio = require('cheerio');
const AITrainingData = require('../models/AITrainingData');

class CrawlerService {
  constructor() {
    this.assetExtensions = new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.css', '.js',
      '.mp4', '.mov', '.avi', '.zip', '.rar', '.7z', '.exe', '.dmg', '.woff',
      '.woff2', '.ttf', '.eot'
    ]);
  }

  async crawlWebsite(url, organizationId, maxPages = 25) {
    const startUrl = this.normalizeUrl(url);
    const baseUrl = new URL(startUrl);
    const visited = new Set();
    const queued = new Set([startUrl]);
    const results = [];
    const skipped = [];
    const failed = [];
    const sitemapUrls = await this.getSitemapUrls(baseUrl.origin);
    const toVisit = [startUrl, ...sitemapUrls.slice(0, Math.max(maxPages * 2, 20))];

    for (const sitemapUrl of sitemapUrls) queued.add(sitemapUrl);

    while (toVisit.length > 0 && visited.size < maxPages) {
      const currentUrl = toVisit.shift();
      const normalized = this.normalizeUrl(currentUrl);
      if (!normalized || visited.has(normalized)) continue;

      if (!this.shouldCrawl(normalized, baseUrl)) {
        skipped.push({ url: normalized, reason: 'unsupported_or_external_url' });
        continue;
      }

      visited.add(normalized);

      try {
        const pageData = await this.crawlPage(normalized);
        if (!pageData || !pageData.content) {
          failed.push({ url: normalized, reason: 'no_extractable_content' });
          continue;
        }

        results.push(pageData);

        for (const link of pageData.links) {
          const nextUrl = this.normalizeUrl(link, normalized);
          if (!nextUrl || queued.has(nextUrl) || visited.has(nextUrl)) continue;
          if (!this.shouldCrawl(nextUrl, baseUrl)) continue;
          queued.add(nextUrl);
          toVisit.push(nextUrl);
        }
      } catch (error) {
        failed.push({ url: normalized, reason: error.message });
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
          metadata: {
            contentType: page.contentType,
            crawledAt: new Date().toISOString()
          },
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    return {
      pagesProcessed: results.length,
      pagesQueued: queued.size,
      pagesVisited: visited.size,
      pages: results.map(page => ({ url: page.url, title: page.title })),
      skipped: skipped.slice(0, 20),
      failed: failed.slice(0, 20)
    };
  }

  async getSitemapUrls(origin) {
    try {
      const response = await axios.get(`${origin}/sitemap.xml`, {
        timeout: 10000,
        responseType: 'text',
        headers: { 'User-Agent': 'ResolveAI-Bot/1.0' }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      return $('url > loc')
        .map((_, el) => this.normalizeUrl($(el).text()))
        .get()
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async crawlPage(url) {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: status => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'ResolveAI-Bot/1.0',
        'Accept': 'text/html,text/plain,text/markdown,application/xhtml+xml'
      }
    });

    const contentType = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();

    if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
      const content = this.cleanText(response.data).slice(0, 12000);
      return {
        url,
        title: this.titleFromUrl(url),
        content,
        links: [],
        contentType
      };
    }

    if (!contentType.includes('html') && !contentType.includes('xml') && contentType !== '') {
      return null;
    }

    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, header, iframe, noscript, svg, form').remove();

    const title = this.cleanText(
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      this.titleFromUrl(url)
    );

    const contentRoot = $('main').first().length
      ? $('main').first()
      : $('article').first().length
        ? $('article').first()
        : $('[role="main"]').first().length
          ? $('[role="main"]').first()
          : $('body').first();

    const content = this.cleanText(contentRoot.text()).slice(0, 12000);
    const links = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const nextUrl = this.normalizeUrl(href, url);
      if (nextUrl) links.push(nextUrl);
    });

    return { url, title, content, links, contentType: contentType || 'text/html' };
  }

  normalizeUrl(value, base) {
    try {
      if (!value || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('javascript:')) {
        return null;
      }

      const parsed = base ? new URL(value, base) : new URL(value);
      parsed.hash = '';
      parsed.searchParams.sort();
      if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      return parsed.href;
    } catch {
      return null;
    }
  }

  shouldCrawl(url, baseUrl) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== baseUrl.hostname) return false;
      const pathname = parsed.pathname.toLowerCase();
      return ![...this.assetExtensions].some(ext => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  cleanText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  titleFromUrl(url) {
    try {
      const parsed = new URL(url);
      const lastPart = parsed.pathname.split('/').filter(Boolean).pop();
      return lastPart ? lastPart.replace(/[-_]/g, ' ') : parsed.hostname;
    } catch {
      return 'Untitled page';
    }
  }
}

module.exports = new CrawlerService();
