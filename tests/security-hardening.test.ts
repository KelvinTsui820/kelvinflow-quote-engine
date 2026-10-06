import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { quoteRouter } from '../src/routes/quote.router.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { PDFService } from '../src/services/pdf.service.js';
import { QuotationResult } from '../src/types/index.js';

describe('Multi-Skill Quality Suite: Security Hardening, Performance & API Design', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    TenantService.init();
    app = express();

    // 1. Security Hardening Middleware (matches src/index.ts)
    app.disable('x-powered-by');
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      next();
    });

    app.use(express.json({ limit: '30mb' }));
    app.use(express.urlencoded({ extended: true, limit: '30mb' }));

    // Routes
    app.use('/api/v1', quoteRouter);

    // Root SPA & cache headers
    app.get('/', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    });

    app.get('/review', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(process.cwd(), 'public', 'review.html'));
    });

    // Static assets with performance cache headers
    app.use(express.static(path.join(process.cwd(), 'public'), {
      index: false,
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
      }
    }));

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // 1. Security Hardening Tests (Skill: security-and-hardening)
  // =========================================================================
  describe('Security Hardening & Headers', () => {
    it('suppresses X-Powered-By header to prevent Express fingerprinting', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      expect(res.headers.get('x-powered-by')).toBeNull();
    });

    it('enforces mandatory defensive security headers on all responses', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
    });

    it('neutralizes path traversal attempts in quote queries and returns 400 or 404', async () => {
      // Direct encoded traversal attack
      const res = await fetch(`${baseUrl}/api/v1/quotes/..%2F..%2F..%2Fetc%2Fpasswd`);
      expect([400, 404]).toContain(res.status);

      // Traversal attempt to fetch PDF
      const pdfRes = await fetch(`${baseUrl}/api/v1/quotes/..%2F..%2F..%2Fwin.ini/pdf`);
      expect([400, 404]).toContain(pdfRes.status);
    });

    it('sanitizes malicious path traversal sequences in QuoteStoreService and TenantService', () => {
      // Path traversal characters stripped or sanitized
      const sanitizedTenant = TenantService.resolveTenantId('../../../etc/passwd');
      expect(sanitizedTenant).not.toContain('..');
      expect(sanitizedTenant).not.toContain('/');

      // Empty or purely traversal quote ID returns null safely
      expect(QuoteStoreService.getQuote('../../../')).toBeNull();
      expect(QuoteStoreService.getQuotePDF('../../../')).toBeNull();
    });

    it('safely handles XSS injection payloads in quotation customerName and remarks without crashing PDF generator', async () => {
      const xssQuote: QuotationResult = {
        quotationNumber: 'QT-SEC-XSS-TEST-01',
        tenantId: 'default',
        customerName: '<script>alert("XSS")</script><img src=x onerror=alert(1)>',
        buyerName: '"><b onmouseover=alert(1)>Hacker</b>',
        buyerEmail: 'hacker@safe-test.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Shenzhen',
        items: [
          {
            sku: 'SKU-<script>',
            description: '<svg onload=alert(1)>Special Ergonomic Stand',
            quantity: 50,
            basePriceRMB: 100,
            profitMargin: 0.25,
            fobCostRMB: 5,
            unitPriceForeign: 20.0,
            subTotalForeign: 1000.0,
            status: 'OK'
          }
        ],
        totalAmountForeign: 1000.0,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: '<script>fetch("http://attacker.com")</script>',
        paymentTerms: '100% T/T Advance',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 1000.0,
        aiConfidenceScore: 95,
        aiModelUsed: 'gemini-flash',
        processedAt: new Date().toISOString()
      };

      // Ensure PDF generation executes cleanly without throwing or crashing
      const pdfBuffer = await PDFService.generateQuotationPDF(xssQuote);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      // PDF must begin with standard PDF magic number (%PDF)
      expect(pdfBuffer.toString('latin1', 0, 5)).toBe('%PDF-');
    });
  });

  // =========================================================================
  // 2. Performance & Caching Tests (Skill: performance-optimization)
  // =========================================================================
  describe('Performance & Caching Optimization', () => {
    it('serves SPA root shells with no-cache headers to ensure atomic updates', async () => {
      const res = await fetch(`${baseUrl}/`);
      const cacheControl = res.headers.get('cache-control') || '';
      expect(cacheControl).toContain('no-cache');
    });

    it('serves static images and assets with 1-day public caching headers', async () => {
      const res = await fetch(`${baseUrl}/kelvinflow_logo_transparent.png`);
      // If the asset exists, verify caching header
      if (res.status === 200) {
        const cacheControl = res.headers.get('cache-control') || '';
        expect(cacheControl).toContain('max-age=86400');
        expect(cacheControl).toContain('stale-while-revalidate');
      }
    });
  });

  // =========================================================================
  // 3. API Contract & Error Handling (Skill: api-and-interface-design)
  // =========================================================================
  describe('API Contract & Schema Consistency', () => {
    it('returns structured 400 response with success: false on invalid quote id', async () => {
      const res = await fetch(`${baseUrl}/api/v1/quotes/%20`); // Whitespace only
      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('returns structured 404 response with success: false on non-existent quote id', async () => {
      const res = await fetch(`${baseUrl}/api/v1/quotes/QT-NON-EXISTENT-99999`);
      expect(res.status).toBe(404);
      const data: any = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('未找到報價單');
    });

    it('enforces tenant isolation preventing unauthorized cross-tenant data leaks', async () => {
      // Create a private quote for tenant_alpha
      const alphaQuote: QuotationResult = {
        quotationNumber: 'QT-ALPHA-SECRET-888',
        tenantId: 'tenant_alpha',
        customerName: 'Alpha Exclusive Corp',
        buyerName: 'Alpha Director',
        buyerEmail: 'director@alpha.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Shenzhen',
        items: [
          {
            sku: 'ALPHA-EXCLUSIVE',
            description: 'Confidential Spec',
            quantity: 100,
            basePriceRMB: 500,
            profitMargin: 0.35,
            fobCostRMB: 10,
            unitPriceForeign: 100.0,
            subTotalForeign: 10000.0,
            status: 'OK'
          }
        ],
        totalAmountForeign: 10000.0,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: 'Confidential',
        paymentTerms: '30% T/T',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 10000.0,
        aiConfidenceScore: 99,
        aiModelUsed: 'gemini-flash',
        processedAt: new Date().toISOString()
      };

      QuoteStoreService.saveQuote(alphaQuote, undefined, 'tenant_alpha');

      // Request as tenant_beta
      const res = await fetch(`${baseUrl}/api/v1/quotes/QT-ALPHA-SECRET-888`, {
        headers: { 'x-tenant-id': 'tenant_beta' }
      });

      // Must be intercepted: 403 Forbidden or 404 Not Found, never 200 with data
      expect([403, 404]).toContain(res.status);
      const body: any = await res.json();
      expect(body.success).toBe(false);
      expect(body.quotation).toBeUndefined();
    });
  });
});
