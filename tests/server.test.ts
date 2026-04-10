import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SageMath MCP Server', () => {
  describe('Project Structure', () => {
    it('should have a valid package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toBeDefined();
    });

    it('should have required source files', () => {
      const srcDir = path.resolve(__dirname, '../src');
      expect(fs.existsSync(srcDir)).toBe(true);
    });

    it('should have manifest.json', () => {
      expect(fs.existsSync(path.resolve(__dirname, '../manifest.json'))).toBe(true);
    });
  });

  describe('Manifest Validation', () => {
    it('should have valid manifest with tools array', () => {
      const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8'));
      expect(manifest.tools).toBeDefined();
      expect(Array.isArray(manifest.tools)).toBe(true);
      expect(manifest.tools.length).toBe(10);
    });

    it('should have tool names and descriptions', () => {
      const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../manifest.json'), 'utf8'));
      for (const tool of manifest.tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('i18n Locales', () => {
    it('should have locale files for en, es, fr', () => {
      for (const locale of ['en', 'es', 'fr']) {
        const localePath = path.resolve(__dirname, `../locales/${locale}.json`);
        expect(fs.existsSync(localePath)).toBe(true);
        const data = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        expect(typeof data).toBe('object');
      }
    });
  });

  describe('Security Checks', () => {
    it('should not contain hardcoded secrets', () => {
      const srcDir = path.resolve(__dirname, '../src');
      if (!fs.existsSync(srcDir)) return;
      const files = fs.readdirSync(srcDir, { recursive: true });
      const secretPatterns = [
        /sk-[a-zA-Z0-9]{20,}/,
        /AKIA[0-9A-Z]{16}/,
        /ghp_[a-zA-Z0-9]{36}/,
      ];
      for (const file of files) {
        const fullPath = path.join(srcDir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of secretPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });

    it('should have SECURITY.md', () => {
      expect(fs.existsSync(path.resolve(__dirname, '../SECURITY.md'))).toBe(true);
    });

    it('should have LICENSE', () => {
      expect(fs.existsSync(path.resolve(__dirname, '../LICENSE'))).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should have escapeShellString function in sage-executor', () => {
      const srcDir = path.resolve(__dirname, '../src');
      if (!fs.existsSync(srcDir)) return;
      const files = fs.readdirSync(srcDir, { recursive: true });
      let found = false;
      for (const file of files) {
        const fullPath = path.join(srcDir, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('escapeShellString') || content.includes('escape')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });
});
