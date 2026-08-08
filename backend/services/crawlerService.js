const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const AITrainingData = require("../models/AITrainingData");

class CrawlerService {
  constructor() {
    this.assetExtensions = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".ico",
      ".css",
      ".js",
      ".mp4",
      ".mov",
      ".avi",
      ".zip",
      ".rar",
      ".7z",
      ".exe",
      ".dmg",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
    ]);
    this.browser = null;
    this.browserPromise = null;
  }

  async ensureBrowser() {
    if (this.browser) return this.browser;

    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
          timeout: 30000,
        })
        .then((browser) => {
          this.browser = browser;
          return browser;
        })
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }

    return this.browserPromise;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.browserPromise = null;
  }

  hasMeaningfulContent(content = "") {
    const cleaned = this.cleanText(content);
    return cleaned.length >= 200 && /\w/.test(cleaned);
  }

  async crawlWebsite(url, organizationId, maxPages = 25) {
    const startUrl = this.normalizeUrl(url);
    if (!startUrl) {
      return {
        pagesProcessed: 0,
        pagesQueued: 0,
        pagesVisited: 0,
        pages: [],
        skipped: [],
        failed: [{ url: url || "", reason: "invalid_url" }],
      };
    }

    let browser;

    try {
      browser = await this.ensureBrowser();
      const baseUrl = new URL(startUrl);
      const visited = new Set();
      const queued = new Set([startUrl]);
      const results = [];
      const skipped = [];
      const failed = [];
      const sitemapUrls = await this.getSitemapUrls(baseUrl.origin);
      const toVisit = [
        startUrl,
        ...sitemapUrls.slice(0, Math.max(maxPages * 2, 20)),
      ];

      for (const sitemapUrl of sitemapUrls) queued.add(sitemapUrl);

      while (toVisit.length > 0 && visited.size < maxPages) {
        const currentUrl = toVisit.shift();
        const normalized = this.normalizeUrl(currentUrl);
        if (!normalized || visited.has(normalized)) continue;

        if (!this.shouldCrawl(normalized, baseUrl)) {
          skipped.push({
            url: normalized,
            reason: "unsupported_or_external_url",
          });
          continue;
        }

        visited.add(normalized);

        try {
          const pageData = await this.crawlPage(normalized, browser);
          if (!pageData || !pageData.content) {
            failed.push({ url: normalized, reason: "no_extractable_content" });
            continue;
          }

          results.push(pageData);

          for (const link of pageData.links) {
            const nextUrl = this.normalizeUrl(link, normalized);
            if (!nextUrl || queued.has(nextUrl) || visited.has(nextUrl))
              continue;
            if (!this.shouldCrawl(nextUrl, baseUrl)) continue;
            queued.add(nextUrl);
            toVisit.push(nextUrl);
          }
        } catch (error) {
          failed.push({
            url: normalized,
            reason: error.message || "crawl_failed",
          });
        }
      }

      for (const page of results) {
        await AITrainingData.findOneAndUpdate(
          { organization: organizationId, url: page.url },
          {
            organization: organizationId,
            type: "webpage",
            title: page.title,
            content: page.content,
            source: "website_crawler",
            url: page.url,
            metadata: {
              contentType: page.contentType,
              crawledAt: new Date().toISOString(),
            },
            isActive: true,
          },
          { upsert: true, new: true },
        );
      }

      return {
        pagesProcessed: results.length,
        pagesQueued: queued.size,
        pagesVisited: visited.size,
        pages: results.map((page) => ({ url: page.url, title: page.title })),
        skipped: skipped.slice(0, 20),
        failed: failed.slice(0, 20),
      };
    } finally {
      await this.closeBrowser();
    }
  }

  async getSitemapUrls(origin) {
    try {
      const response = await axios.get(`${origin}/sitemap.xml`, {
        timeout: 10000,
        responseType: "text",
        headers: { "User-Agent": "ResolveAI-Bot/1.0" },
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      return $("url > loc")
        .map((_, el) => this.normalizeUrl($(el).text()))
        .get()
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async crawlPage(url, browser = null) {
    const axiosResult = await this.crawlPageWithAxios(url);
    if (axiosResult && this.hasMeaningfulContent(axiosResult.content)) {
      return axiosResult;
    }

    const fallbackBrowser = browser || (await this.ensureBrowser());
    const puppeteerResult = await this.crawlPageWithPuppeteer(
      url,
      fallbackBrowser,
    );

    if (puppeteerResult && this.hasMeaningfulContent(puppeteerResult.content)) {
      return puppeteerResult;
    }

    if (axiosResult) return axiosResult;
    return puppeteerResult || null;
  }

  async crawlPageWithAxios(url) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5,
        responseType: "text",
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          "User-Agent": "ResolveAI-Bot/1.0",
          Accept: "text/html,text/plain,text/markdown,application/xhtml+xml",
        },
      });

      const contentType = String(response.headers["content-type"] || "")
        .split(";")[0]
        .toLowerCase();

      if (
        contentType.includes("text/plain") ||
        contentType.includes("text/markdown")
      ) {
        const content = this.cleanText(response.data).slice(0, 12000);
        return {
          url,
          title: this.titleFromUrl(url),
          content,
          links: [],
          contentType,
        };
      }

      if (
        !contentType.includes("html") &&
        !contentType.includes("xml") &&
        contentType !== ""
      ) {
        return null;
      }

      const $ = cheerio.load(response.data);
      $(
        "script, style, nav, footer, header, iframe, noscript, svg, form",
      ).remove();

      const title = this.cleanText(
        $('meta[property="og:title"]').attr("content") ||
          $("title").text() ||
          $("h1").first().text() ||
          this.titleFromUrl(url),
      );

      const contentRoot = $("main").first().length
        ? $("main").first()
        : $("article").first().length
          ? $("article").first()
          : $('[role="main"]').first().length
            ? $('[role="main"]').first()
            : $("body").first();

      const content = this.cleanText(contentRoot.text()).slice(0, 12000);
      const links = [];

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        const nextUrl = this.normalizeUrl(href, url);
        if (nextUrl) links.push(nextUrl);
      });

      return {
        url,
        title,
        content,
        links,
        contentType: contentType || "text/html",
      };
    } catch (error) {
      return null;
    }
  }

  async crawlPageWithPuppeteer(url, browser) {
    let page;

    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 2200 });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page
        .waitForFunction(() => document.readyState === "complete", {
          timeout: 10000,
        })
        .catch(() => {});
      await page
        .waitForNetworkIdle({ idleTime: 500, timeout: 10000 })
        .catch(() => {});

      const extracted = await page.evaluate(() => {
        document
          .querySelectorAll(
            "script, style, nav, footer, header, iframe, noscript, svg, form",
          )
          .forEach((el) => el.remove());

        const title = (
          document
            .querySelector('meta[property="og:title"]')
            ?.getAttribute("content") ||
          document.title ||
          document.querySelector("h1")?.textContent ||
          ""
        ).trim();

        const root =
          document.querySelector("main") ||
          document.querySelector("article") ||
          document.querySelector('[role="main"]') ||
          document.body;

        const content = (root?.innerText || root?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        const links = [...document.querySelectorAll("a[href]")]
          .map((el) => el.href)
          .filter(Boolean);

        return { title, content, links };
      });

      const content = this.cleanText(extracted.content || "").slice(0, 12000);
      const title =
        this.cleanText(extracted.title || this.titleFromUrl(url)) ||
        this.titleFromUrl(url);
      const links = [
        ...new Set(
          (extracted.links || [])
            .map((link) => this.normalizeUrl(link, url))
            .filter(Boolean),
        ),
      ];

      if (!this.hasMeaningfulContent(content)) {
        return null;
      }

      return {
        url,
        title,
        content,
        links,
        contentType: "text/html",
      };
    } catch (error) {
      throw error;
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  }

  normalizeUrl(value, base) {
    try {
      if (
        !value ||
        value.startsWith("mailto:") ||
        value.startsWith("tel:") ||
        value.startsWith("javascript:")
      ) {
        return null;
      }

      const parsed = base ? new URL(value, base) : new URL(value);
      parsed.hash = "";
      parsed.searchParams.sort();
      if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
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
      return ![...this.assetExtensions].some((ext) => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  cleanText(value = "") {
    return String(value).replace(/\s+/g, " ").trim();
  }

  titleFromUrl(url) {
    try {
      const parsed = new URL(url);
      const lastPart = parsed.pathname.split("/").filter(Boolean).pop();
      return lastPart ? lastPart.replace(/[-_]/g, " ") : parsed.hostname;
    } catch {
      return "Untitled page";
    }
  }
}

module.exports = new CrawlerService();
