import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface FileInfo {
  file_id: string;
  file_path: string;
  file_size: number;
  file_name?: string;
  mime_type?: string;
}

export class FileHandler {
  private uploadDir: string;
  private botToken: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.botToken = process.env.BOT_TOKEN || '';
    
    // Создаем директорию для загрузок если не существует
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Скачивание файла из Telegram
   */
  async downloadFile(fileId: string): Promise<{ filePath: string; buffer: Buffer }> {
    try {
      logger.info(`Downloading file: ${fileId}`);
      
      // Получаем информацию о файле
      const fileInfo = await axios.get(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`
      );
      
      const filePath = fileInfo.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      
      // Скачиваем файл
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
      });
      
      const buffer = Buffer.from(response.data);
      const localFilePath = path.join(this.uploadDir, path.basename(filePath));
      
      // Сохраняем файл локально
      fs.writeFileSync(localFilePath, buffer);
      
      logger.info(`File downloaded: ${localFilePath} (${buffer.length} bytes)`);
      
      return { filePath: localFilePath, buffer };
      
    } catch (error: any) {
      logger.error('Error downloading file:', error);
      throw new Error(`Ошибка скачивания файла: ${error.message}`);
    }
  }

  /**
   * Получение URL файла из Telegram
   */
  getFileUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
  }

  /**
   * Извлечение текста из различных типов файлов
   */
  async extractText(filePath: string, mimeType?: string): Promise<string> {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      // TXT файлы
      if (extension === '.txt' || mimeType?.includes('text/plain')) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      // JSON файлы
      if (extension === '.json' || mimeType?.includes('application/json')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.stringify(JSON.parse(content), null, 2);
      }
      
      // CSV файлы
      if (extension === '.csv' || mimeType?.includes('text/csv')) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      // HTML/XML файлы
      if (['.html', '.htm', '.xml'].includes(extension)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      // Markdown файлы
      if (extension === '.md' || mimeType?.includes('text/markdown')) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      
      // Для других типов файлов возвращаем информацию
      const stats = fs.statSync(filePath);
      return `[Файл: ${path.basename(filePath)}, размер: ${this.formatFileSize(stats.size)}, тип: ${mimeType || extension}]`;
      
    } catch (error: any) {
      logger.error('Error extracting text:', error);
      throw new Error(`Ошибка извлечения текста: ${error.message}`);
    }
  }

  /**
   * Очистка временных файлов
   */
  cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`File cleaned up: ${filePath}`);
      }
    } catch (error: any) {
      logger.error('Error cleaning up file:', error);
    }
  }

  /**
   * Очистка всех временных файлов старше указанного времени
   */
  cleanupOldFiles(maxAgeHours: number = 24): void {
    try {
      const files = fs.readdirSync(this.uploadDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      
      files.forEach(file => {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          logger.info(`Old file cleaned up: ${filePath}`);
        }
      });
    } catch (error: any) {
      logger.error('Error cleaning up old files:', error);
    }
  }

  /**
   * Проверка размера файла
   */
  checkFileSize(fileSize: number, maxSizeMB: number = 20): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
  }

  /**
   * Форматирование размера файла
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  /**
   * Определение типа файла по расширению
   */
  getFileType(fileName: string): 'text' | 'audio' | 'video' | 'image' | 'document' | 'unknown' {
    const extension = path.extname(fileName).toLowerCase();
    
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.html', '.htm', '.xml'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.oga', '.opus'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    
    if (textExtensions.includes(extension)) return 'text';
    if (audioExtensions.includes(extension)) return 'audio';
    if (videoExtensions.includes(extension)) return 'video';
    if (imageExtensions.includes(extension)) return 'image';
    if (documentExtensions.includes(extension)) return 'document';
    
    return 'unknown';
  }
}

