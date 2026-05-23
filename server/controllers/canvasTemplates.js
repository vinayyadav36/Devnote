import * as storage from '../utils/storage.js';
import crypto from 'crypto';

/**
 * Canvas Template Controller
 * Manages custom code postcard templates
 */
export const CanvasTemplateController = {
  /**
   * Save a new template
   */
  async saveTemplate(req, res) {
    try {
      const { name, headerBg, theme, padding, borderRadius, fontSize, showLineNumbers, maxHeight } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Template name is required' });
      }

      const templateId = `template_${crypto.randomBytes(8).toString('hex')}`;
      const template = {
        id: templateId,
        name,
        headerBg,
        theme,
        padding,
        borderRadius,
        fontSize,
        showLineNumbers,
        maxHeight,
        createdAt: new Date().toISOString()
      };

      // Store in templates collection
      await storage.atomicWriteFile(
        `templates/${templateId}.json`,
        template
      );

      return res.json({
        success: true,
        template
      });
    } catch (error) {
      console.error('Template save error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get all templates
   */
  async getTemplates(req, res) {
    try {
      const templates = await storage.getCollection('templates');

      return res.json({
        success: true,
        templates,
        count: templates.length
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get single template
   */
  async getTemplate(req, res) {
    try {
      const { id } = req.params;

      const content = await storage.readFile(`templates/${id}.json`);
      const template = JSON.parse(content);

      return res.json({
        success: true,
        template
      });
    } catch (error) {
      return res.status(404).json({ error: 'Template not found' });
    }
  },

  /**
   * Update template
   */
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const content = await storage.readFile(`templates/${id}.json`);
      const template = JSON.parse(content);

      const updated = {
        ...template,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await storage.atomicWriteFile(
        `templates/${id}.json`,
        updated
      );

      return res.json({
        success: true,
        template: updated
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * Delete template
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      await storage.deleteFile(`templates/${id}.json`);

      return res.json({
        success: true,
        message: 'Template deleted'
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

export default CanvasTemplateController;
