import zlib from 'zlib';
import * as XLSX from 'xlsx';

export interface ExtractedAttachment {
  filename: string;
  contentType?: string;
  sizeBytes: number;
  success: boolean;
  text: string;
  itemCountEstimate: number;
  error?: string;
}

export class AttachmentExtractorService {
  // 单个附件上限 15MB，防止解压炸弹与内存溢出
  private static MAX_FILE_SIZE = 15 * 1024 * 1024;

  /**
   * 检查文件扩展名或 MIME 是否在白名单内
   */
  static isSupportedAttachment(filename: string, contentType?: string): boolean {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const supportedExts = new Set(['pdf', 'xlsx', 'xls', 'xlsm', 'csv', 'tsv', 'txt']);
    if (supportedExts.has(ext)) return true;

    const ct = (contentType || '').toLowerCase();
    if (
      ct.includes('pdf') ||
      ct.includes('spreadsheet') ||
      ct.includes('excel') ||
      ct.includes('csv') ||
      ct.includes('text/plain')
    ) {
      return true;
    }

    return false;
  }

  /**
   * 提取单份附件的文本内容 (支持 PDF / Excel / CSV / TXT)
   */
  static async extractAttachment(att: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }): Promise<ExtractedAttachment> {
    const filename = att.filename || 'unknown_attachment';
    const contentType = att.contentType || '';
    const buffer = att.content;
    const sizeBytes = buffer ? buffer.length : 0;

    if (!buffer || sizeBytes === 0) {
      return {
        filename,
        contentType,
        sizeBytes: 0,
        success: false,
        text: '',
        itemCountEstimate: 0,
        error: '附件文件内容为空'
      };
    }

    if (sizeBytes > this.MAX_FILE_SIZE) {
      return {
        filename,
        contentType,
        sizeBytes,
        success: false,
        text: '',
        itemCountEstimate: 0,
        error: `附件大小超过安全限制 (上限 15MB, 当前 ${(sizeBytes / (1024 * 1024)).toFixed(1)}MB)`
      };
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();

    // 1. PDF 附件抽取
    if (ext === 'pdf' || contentType.includes('pdf') || buffer.subarray(0, 5).toString('ascii').startsWith('%PDF')) {
      try {
        const text = await this.extractTextFromPDF(buffer);
        if (text && text.trim().length > 0) {
          const skuMatches = text.match(/\b[A-Z0-9]{2,}(?:[-_][A-Z0-9]+)+\b/g) || [];
          return {
            filename,
            contentType: 'application/pdf',
            sizeBytes,
            success: true,
            text: text.trim(),
            itemCountEstimate: skuMatches.length
          };
        }
        return {
          filename,
          contentType: 'application/pdf',
          sizeBytes,
          success: false,
          text: '',
          itemCountEstimate: 0,
          error: 'PDF 附件未检测到有效文本层 (可能为扫描图片件)'
        };
      } catch (err: any) {
        console.warn(`⚠️ [Attachment Extractor] 解析 PDF [${filename}] 异常:`, err.message);
        return {
          filename,
          contentType: 'application/pdf',
          sizeBytes,
          success: false,
          text: '',
          itemCountEstimate: 0,
          error: `PDF 解析失败: ${err.message}`
        };
      }
    }

    // 2. Excel 附件抽取 (.xlsx / .xls / .xlsm)
    if (['xlsx', 'xls', 'xlsm'].includes(ext) || contentType.includes('spreadsheet') || contentType.includes('excel')) {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetTexts: string[] = [];
        let totalSkus = 0;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const csv = XLSX.utils.sheet_to_csv(sheet).trim();
          if (csv) {
            sheetTexts.push(`[Sheet: ${sheetName}]\n${csv}`);
            const matches = csv.match(/\b[A-Z0-9]{2,}(?:[-_][A-Z0-9]+)+\b/g) || [];
            totalSkus += matches.length;
          }
        }

        const combinedText = sheetTexts.join('\n\n');
        if (combinedText.trim().length > 0) {
          return {
            filename,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            sizeBytes,
            success: true,
            text: combinedText,
            itemCountEstimate: totalSkus
          };
        }

        return {
          filename,
          contentType,
          sizeBytes,
          success: false,
          text: '',
          itemCountEstimate: 0,
          error: 'Excel 附件内容为空或无有效数据'
        };
      } catch (err: any) {
        console.warn(`⚠️ [Attachment Extractor] 解析 Excel [${filename}] 异常:`, err.message);
        return {
          filename,
          contentType,
          sizeBytes,
          success: false,
          text: '',
          itemCountEstimate: 0,
          error: `Excel 解析失败: ${err.message}`
        };
      }
    }

    // 3. 纯文本 / CSV 抽取
    if (['csv', 'tsv', 'txt'].includes(ext) || contentType.includes('csv') || contentType.includes('text/plain')) {
      const rawText = buffer.toString('utf-8');
      const matches = rawText.match(/\b[A-Z0-9]{2,}(?:[-_][A-Z0-9]+)+\b/g) || [];
      return {
        filename,
        contentType: 'text/plain',
        sizeBytes,
        success: true,
        text: rawText.trim(),
        itemCountEstimate: matches.length
      };
    }

    // 4. 不支持的附件格式
    return {
      filename,
      contentType,
      sizeBytes,
      success: false,
      text: '',
      itemCountEstimate: 0,
      error: `不支持的文件格式 (.${ext || 'unknown'})`
    };
  }

  /**
   * 批量提取多份附件
   */
  static async extractAllAttachments(
    attachments: Array<{ filename: string; content: Buffer; contentType?: string }>
  ): Promise<ExtractedAttachment[]> {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return [];
    }

    const results: ExtractedAttachment[] = [];
    for (const att of attachments) {
      try {
        const res = await this.extractAttachment(att);
        results.push(res);
      } catch (err: any) {
        results.push({
          filename: att.filename || 'unknown',
          contentType: att.contentType,
          sizeBytes: att.content?.length || 0,
          success: false,
          text: '',
          itemCountEstimate: 0,
          error: err.message
        });
      }
    }
    return results;
  }

  /**
   * PDF 文本提取核心逻辑 (多阶梯：优先 pdf-parse，原生 stream 解压降级兜底)
   */
  private static async extractTextFromPDF(buf: Buffer): Promise<string> {
    // 方案 1: pdf-parse (专业 PDF 解析库，处理多字体、编码与页面布局)
    try {
      const mod: any = await import('pdf-parse');
      const PDFParse = mod.PDFParse || mod.default?.PDFParse || mod.default;
      if (PDFParse) {
        const parser = new PDFParse({ data: buf });
        const res = await parser.getText();
        await parser.destroy().catch(() => {});
        const parsedText = (res?.text || (typeof res === 'string' ? res : '')).trim();
        if (parsedText.length > 0) {
          return parsedText;
        }
      }
    } catch (e: any) {
      // 若 pdf-parse 解析异常，平滑降级至方案 2
    }

    // 方案 2: 原生 PDF Stream 解压与 Tj/TJ 标记提取 (极速本地兜底，零外部依赖)
    return this.extractTextFromPDFStream(buf);
  }

  /**
   * 原生 PDF 流解压与字符抽取
   */
  private static extractTextFromPDFStream(buf: Buffer): string {
    const str = buf.toString('binary');
    const extractedLines: string[] = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;

    while ((m = streamRegex.exec(str)) !== null) {
      const raw = Buffer.from(m[1], 'binary');
      let content = '';
      try {
        content = zlib.inflateSync(raw).toString('utf8');
      } catch {
        content = raw.toString('utf8');
      }

      // 提取 [ (text) ] TJ 数组
      const tjRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let tm: RegExpExecArray | null;
      while ((tm = tjRegex.exec(content)) !== null) {
        const parts = tm[1].match(/(?:<([0-9a-fA-F]+)>|\((.*?)\)|(-?\d+))/g) || [];
        let line = '';
        for (const part of parts) {
          if (part.startsWith('<')) {
            const hex = part.slice(1, -1);
            line += Buffer.from(hex, 'hex').toString('utf8');
          } else if (part.startsWith('(')) {
            line += part.slice(1, -1);
          } else {
            const num = parseInt(part, 10);
            if (num < -200) line += ' ';
          }
        }
        if (line.trim()) extractedLines.push(line.trim());
      }

      // 提取 (text) Tj 单行文本
      const singleTjRegex = /\((.*?)\)\s*Tj/g;
      let sm: RegExpExecArray | null;
      while ((sm = singleTjRegex.exec(content)) !== null) {
        const textPart = sm[1].replace(/\\([()\\])/g, '$1').trim();
        if (textPart) {
          extractedLines.push(textPart);
        }
      }
    }

    return extractedLines.join('\n');
  }
}
