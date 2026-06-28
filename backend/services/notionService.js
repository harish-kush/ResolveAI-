const axios = require('axios');
const AITrainingData = require('../models/AITrainingData');

class NotionService {
  constructor() {
    this.apiKey = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
    this.version = process.env.NOTION_VERSION || '2022-06-28';
    this.baseUrl = 'https://api.notion.com/v1';
  }

  getClient() {
    if (!this.apiKey) {
      throw new Error('NOTION_API_KEY is required');
    }

    return axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': this.version,
        'Content-Type': 'application/json'
      }
    });
  }

  async syncWorkspace(organizationId, maxPages = 25) {
    const pages = await this.searchPages(maxPages);
    const synced = [];
    const failed = [];

    for (const page of pages) {
      try {
        const result = await this.syncPage(organizationId, page.id, page);
        synced.push(result);
      } catch (error) {
        failed.push({ id: page.id, title: this.getPageTitle(page), reason: error.message });
      }
    }

    return {
      pagesProcessed: synced.length,
      pagesFound: pages.length,
      pages: synced,
      failed
    };
  }

  async syncPage(organizationId, pageIdOrUrl, knownPage = null) {
    const pageId = this.extractPageId(pageIdOrUrl);
    if (!pageId) throw new Error('Valid Notion page ID or URL is required');

    const client = this.getClient();
    const page = knownPage || (await client.get(`/pages/${pageId}`)).data;
    const blocks = await this.getAllBlocks(pageId);
    const title = this.getPageTitle(page);
    const content = this.blocksToText(blocks);

    if (!content.trim()) {
      throw new Error(`No readable text found in Notion page: ${title}`);
    }

    const data = await AITrainingData.findOneAndUpdate(
      { organization: organizationId, url: page.url || `notion://${pageId}` },
      {
        organization: organizationId,
        type: 'notion',
        title,
        content,
        source: 'notion',
        url: page.url || `notion://${pageId}`,
        metadata: {
          notionPageId: page.id,
          lastEditedTime: page.last_edited_time,
          syncedAt: new Date().toISOString()
        },
        isActive: true
      },
      { upsert: true, new: true }
    );

    return { id: page.id, title: data.title, url: data.url };
  }

  async searchPages(maxPages = 25) {
    const client = this.getClient();
    const pages = [];
    let cursor = undefined;

    while (pages.length < maxPages) {
      const response = await client.post('/search', {
        filter: { property: 'object', value: 'page' },
        page_size: Math.min(100, maxPages - pages.length),
        start_cursor: cursor
      });

      pages.push(...response.data.results);
      if (!response.data.has_more || !response.data.next_cursor) break;
      cursor = response.data.next_cursor;
    }

    return pages.slice(0, maxPages);
  }

  async getAllBlocks(blockId, depth = 0) {
    if (depth > 3) return [];

    const client = this.getClient();
    const blocks = [];
    let cursor = undefined;

    do {
      const response = await client.get(`/blocks/${blockId}/children`, {
        params: {
          page_size: 100,
          start_cursor: cursor
        }
      });

      for (const block of response.data.results) {
        blocks.push(block);
        if (block.has_children) {
          const children = await this.getAllBlocks(block.id, depth + 1);
          blocks.push(...children);
        }
      }

      cursor = response.data.next_cursor;
      if (!response.data.has_more) break;
    } while (cursor);

    return blocks;
  }

  blocksToText(blocks) {
    return blocks
      .map(block => this.blockToText(block))
      .filter(Boolean)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 20000);
  }

  blockToText(block) {
    const type = block.type;
    const value = block[type];
    if (!value) return '';

    if (type === 'child_page') return `# ${value.title || 'Untitled page'}`;
    if (type === 'child_database') return `# ${value.title || 'Untitled database'}`;
    if (type === 'divider') return '---';

    const text = this.richTextToPlain(value.rich_text || value.caption || []);
    if (!text) return '';

    switch (type) {
      case 'heading_1':
        return `# ${text}`;
      case 'heading_2':
        return `## ${text}`;
      case 'heading_3':
        return `### ${text}`;
      case 'bulleted_list_item':
        return `- ${text}`;
      case 'numbered_list_item':
        return `1. ${text}`;
      case 'to_do':
        return `- [${value.checked ? 'x' : ' '}] ${text}`;
      case 'quote':
        return `> ${text}`;
      case 'callout':
        return `Note: ${text}`;
      default:
        return text;
    }
  }

  richTextToPlain(richText = []) {
    return richText.map(part => part.plain_text || '').join('').trim();
  }

  getPageTitle(page) {
    const properties = page.properties || {};
    for (const prop of Object.values(properties)) {
      if (prop.type === 'title' && Array.isArray(prop.title)) {
        const title = this.richTextToPlain(prop.title);
        if (title) return title;
      }
    }
    return 'Untitled Notion page';
  }

  extractPageId(value = '') {
    const match = String(value).match(/[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (!match) return null;
    const raw = match[0].replace(/-/g, '');
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  }
}

module.exports = new NotionService();
